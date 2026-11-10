<?php

namespace App\Http\Controllers;

use App\Models\Office;
use App\Models\QueueService;
use App\Models\QueueTicket;
use App\Models\ServiceWindow;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    /**
     * Show the public student queue kiosk.
     */
    public function kiosk(Request $request): Response
    {
        $offices = Office::query()
            ->where('is_active', true)
            ->with([
                'services' => fn ($query) => $query
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('name'),
                'windows' => fn ($query) => $query
                    ->where('is_active', true)
                    ->orderBy('id'),
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return Inertia::render('queue/kiosk', [
            'issued_ticket' => $request->query('ticket'),
            'issued_ticket_id' => $request->integer('ticket_id') ?: null,
            'offices' => $offices
                ->map(fn (Office $office): array => $this->officeData($office))
                ->values(),
        ]);
    }

    /**
     * Issue a queue number for the window selected by the student.
     */
    public function issueFromKiosk(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'office_id' => ['nullable', 'integer', 'exists:offices,id'],
            'queue_service_id' => ['nullable', 'integer', 'exists:queue_services,id'],
            'service_window_id' => ['required', 'integer', 'exists:service_windows,id'],
        ]);

        $ticket = $this->createTicket(
            (int) $validated['service_window_id'],
            isset($validated['queue_service_id'])
                ? (int) $validated['queue_service_id']
                : null,
            isset($validated['office_id']) ? (int) $validated['office_id'] : null,
        );
        $displayNumber = $this->displayNumber($ticket);

        return to_route('kiosk', [
            'ticket' => $displayNumber,
            'ticket_id' => $ticket->id,
        ]);
    }

    /**
     * Return the current status of a student's public ticket page.
     */
    public function ticketStatus(QueueTicket $ticket): JsonResponse
    {
        abort_unless(
            $ticket->queue_date->toDateString() === today()->toDateString(),
            404,
        );

        $ticket->load(['window.office', 'service']);

        return response()->json($this->ticketData($ticket));
    }

    /**
     * Show the registrar queue workspace.
     */
    public function index(Request $request): Response
    {
        $user = $this->queueUser($request);
        $today = today()->toDateString();
        $windowsQuery = $this->constrainVisibleWindows(
            ServiceWindow::query()
                ->where('is_active', true)
                ->with(['assignedUser', 'office'])
                ->orderBy('office_id')
                ->orderBy('id'),
            $user,
        );

        return Inertia::render('queue/workspace', [
            'date' => $today,
            'can_manage' => $user->canManageQueue(),
            'windows' => $windowsQuery
                ->get()
                ->map(function (ServiceWindow $window) use ($today, $user): array {
                    $currentTicket = QueueTicket::query()
                        ->with(['window.office', 'service'])
                        ->where('service_window_id', $window->id)
                        ->whereDate('queue_date', $today)
                        ->whereIn('status', [QueueTicket::CALLED, QueueTicket::SERVING])
                        ->latest('called_at')
                        ->first();

                    $waitingTickets = QueueTicket::query()
                        ->with(['window.office', 'service'])
                        ->where('service_window_id', $window->id)
                        ->whereDate('queue_date', $today)
                        ->where('status', QueueTicket::WAITING)
                        ->orderBy('number')
                        ->get()
                        ->map(fn (QueueTicket $ticket): array => $this->ticketData($ticket))
                        ->values();

                    $skippedTickets = QueueTicket::query()
                        ->with(['window.office', 'service'])
                        ->where('service_window_id', $window->id)
                        ->whereDate('queue_date', $today)
                        ->where('status', QueueTicket::SKIPPED)
                        ->latest('skipped_at')
                        ->get()
                        ->map(fn (QueueTicket $ticket): array => $this->ticketData($ticket))
                        ->values();

                    return [
                        ...$this->windowSummary($window),
                        'assigned_user' => $window->assignedUser ? [
                            'id' => $window->assignedUser->id,
                            'name' => $window->assignedUser->name,
                        ] : null,
                        'can_operate' => $this->canAccessWindow($user, $window),
                        'current_ticket' => $currentTicket
                            ? $this->ticketData($currentTicket)
                            : null,
                        'waiting_tickets' => $waitingTickets,
                        'skipped_tickets' => $skippedTickets,
                    ];
                })
                ->values(),
            'recent_tickets' => $this->constrainVisibleTickets(
                QueueTicket::query()
                    ->with(['window.office', 'service'])
                    ->whereDate('queue_date', $today)
                    ->where('status', QueueTicket::COMPLETED),
                $user,
            )
                ->latest('completed_at')
                ->limit(10)
                ->get()
                ->map(fn (QueueTicket $ticket): array => $this->ticketData($ticket))
                ->values(),
        ]);
    }

    /**
     * Show queue configuration for supervisors and administrators.
     */
    public function settings(Request $request): Response
    {
        $this->managerUser($request);

        $offices = Office::query()
            ->with([
                'services' => fn ($query) => $query
                    ->orderBy('sort_order')
                    ->orderBy('name'),
                'windows' => fn ($query) => $query
                    ->with('assignedUser')
                    ->orderBy('id'),
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return Inertia::render('queue/settings', [
            'offices' => $offices
                ->map(fn (Office $office): array => $this->officeSettingsData($office))
                ->values(),
            'windows' => ServiceWindow::query()
                ->with(['assignedUser', 'office'])
                ->orderBy('office_id')
                ->orderBy('id')
                ->get()
                ->map(fn (ServiceWindow $window): array => [
                    'id' => $window->id,
                    'code' => $window->code,
                    'name' => $window->name,
                    'office_id' => $window->office_id,
                    'office' => $window->office ? [
                        'id' => $window->office->id,
                        'name' => $window->office->name,
                    ] : null,
                    'assigned_user_id' => $window->assigned_user_id,
                    'assigned_user' => $window->assignedUser ? [
                        'id' => $window->assignedUser->id,
                        'name' => $window->assignedUser->name,
                    ] : null,
                ])
                ->values(),
            'staff' => User::query()
                ->whereIn('role', [User::ROLE_ADMIN, User::ROLE_SUPERVISOR, User::ROLE_STAFF])
                ->with('office')
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'role'])
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'office_id' => $user->office_id,
                    'office' => $user->office ? [
                        'id' => $user->office->id,
                        'name' => $user->office->name,
                    ] : null,
                ])
                ->values(),
        ]);
    }

    /**
     * Assign or unassign a staff member from a service window.
     */
    public function updateWindowAssignment(Request $request, ServiceWindow $window): RedirectResponse
    {
        $this->managerUser($request);

        $validated = $request->validate([
            'assigned_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);
        $assignedUser = null;

        if ($validated['assigned_user_id'] !== null) {
            $assignedUser = User::query()
                ->whereKey($validated['assigned_user_id'])
                ->firstOrFail();
        }

        if ($assignedUser && ! $assignedUser->canOperateQueue()) {
            throw ValidationException::withMessages([
                'assigned_user_id' => 'Only queue users can be assigned to a service window.',
            ]);
        }

        if ($assignedUser && $assignedUser->office_id !== null
            && (int) $assignedUser->office_id !== (int) $window->office_id) {
            throw ValidationException::withMessages([
                'assigned_user_id' => 'The staff member belongs to another office.',
            ]);
        }

        $window->update(['assigned_user_id' => $assignedUser?->id]);

        return to_route('queue.settings')->with('success', "{$window->name} assignment updated.");
    }

    /**
     * Update a queue user's role.
     */
    public function updateUserRole(Request $request, User $user): RedirectResponse
    {
        $manager = $this->managerUser($request);

        $validated = $request->validate([
            'role' => ['required', Rule::in([
                User::ROLE_ADMIN,
                User::ROLE_SUPERVISOR,
                User::ROLE_STAFF,
            ])],
        ]);

        if ($validated['role'] === User::ROLE_ADMIN && ! $manager->isAdmin()) {
            abort(403, 'Only administrators can assign the administrator role.');
        }

        if ($manager->is($user) && $validated['role'] !== $manager->role) {
            throw ValidationException::withMessages([
                'role' => 'You cannot change your own role.',
            ]);
        }

        $user->update(['role' => $validated['role']]);

        return to_route('queue.settings')->with('success', "{$user->name}'s role updated.");
    }

    /**
     * Create a configurable campus office.
     */
    public function storeOffice(Request $request): RedirectResponse
    {
        $this->managerUser($request);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:40', 'alpha_dash', 'unique:offices,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        Office::query()->create([
            ...$validated,
            'is_active' => true,
            'sort_order' => (int) Office::query()->max('sort_order') + 1,
        ]);

        return to_route('queue.settings')->with('success', 'Office created.');
    }

    /**
     * Create a service offered by an office.
     */
    public function storeService(Request $request): RedirectResponse
    {
        $this->managerUser($request);

        $validated = $request->validate([
            'office_id' => ['required', 'integer', 'exists:offices,id'],
            'code' => ['required', 'string', 'max:40', 'alpha_dash', 'unique:queue_services,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'prefix' => ['required', 'string', 'max:8', 'alpha_dash'],
        ]);

        abort_unless(
            Office::query()->whereKey($validated['office_id'])->where('is_active', true)->exists(),
            422,
            'This office is not active.',
        );

        QueueService::query()->create([
            ...$validated,
            'prefix' => strtoupper($validated['prefix']),
            'is_active' => true,
            'sort_order' => (int) QueueService::query()
                ->where('office_id', $validated['office_id'])
                ->max('sort_order') + 1,
        ]);

        return to_route('queue.settings')->with('success', 'Service created.');
    }

    /**
     * Create a service window for an office.
     */
    public function storeWindow(Request $request): RedirectResponse
    {
        $this->managerUser($request);

        $validated = $request->validate([
            'office_id' => ['required', 'integer', 'exists:offices,id'],
            'code' => ['required', 'string', 'max:30', 'alpha_dash', 'unique:service_windows,code'],
            'name' => ['required', 'string', 'max:255'],
            'assigned_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        abort_unless(
            Office::query()->whereKey($validated['office_id'])->where('is_active', true)->exists(),
            422,
            'This office is not active.',
        );

        $assignedUser = isset($validated['assigned_user_id'])
            ? User::query()->whereKey((int) $validated['assigned_user_id'])->firstOrFail()
            : null;

        if ($assignedUser && ! $assignedUser->canOperateQueue()) {
            throw ValidationException::withMessages([
                'assigned_user_id' => 'Only queue users can be assigned to a service window.',
            ]);
        }

        if ($assignedUser && $assignedUser->office_id !== null
            && (int) $assignedUser->office_id !== (int) $validated['office_id']) {
            throw ValidationException::withMessages([
                'assigned_user_id' => 'The staff member belongs to another office.',
            ]);
        }

        ServiceWindow::query()->create([
            ...$validated,
            'assigned_user_id' => $assignedUser?->id,
            'is_active' => true,
        ]);

        return to_route('queue.settings')->with('success', 'Queue window created.');
    }

    /**
     * Assign a queue staff member to an office.
     */
    public function updateUserOffice(Request $request, User $user): RedirectResponse
    {
        $this->managerUser($request);

        $validated = $request->validate([
            'office_id' => ['nullable', 'integer', 'exists:offices,id'],
        ]);

        $user->update(['office_id' => $validated['office_id'] ?? null]);

        return to_route('queue.settings')->with('success', "{$user->name}'s office updated.");
    }

    /**
     * Create the next ticket for an active window using a daily sequence.
     */
    private function createTicket(int $windowId, ?int $serviceId = null, ?int $officeId = null): QueueTicket
    {
        $today = today()->toDateString();

        return DB::transaction(function () use ($windowId, $serviceId, $officeId, $today): QueueTicket {
            $window = ServiceWindow::query()
                ->whereKey($windowId)
                ->where('is_active', true)
                ->lockForUpdate()
                ->first();

            if (! $window) {
                throw ValidationException::withMessages([
                    'service_window_id' => 'This queue window is not active.',
                ]);
            }

            if ($officeId !== null && (int) $window->office_id !== $officeId) {
                throw ValidationException::withMessages([
                    'office_id' => 'The selected window does not belong to this office.',
                ]);
            }

            if ($serviceId !== null) {
                $service = QueueService::query()
                    ->whereKey($serviceId)
                    ->where('is_active', true)
                    ->where('office_id', $window->office_id)
                    ->first();

                if (! $service) {
                    throw ValidationException::withMessages([
                        'queue_service_id' => 'The selected service is not available in this office.',
                    ]);
                }
            }

            $numberQuery = QueueTicket::query()
                ->whereDate('queue_date', $today)
                ->lockForUpdate();

            if ($serviceId !== null) {
                $numberQuery->where('queue_service_id', $serviceId);
            } else {
                $numberQuery->where('service_window_id', $window->id);
            }

            $lastNumber = $numberQuery->max('number') ?? 0;

            return QueueTicket::query()->create([
                'service_window_id' => $window->id,
                'queue_service_id' => $serviceId,
                'queue_date' => $today,
                'number' => $lastNumber + 1,
                'status' => QueueTicket::WAITING,
            ])->load('window');
        });
    }

    /**
     * Call the oldest waiting ticket for a window.
     */
    public function callNext(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'service_window_id' => ['required', 'integer', 'exists:service_windows,id'],
        ]);
        $user = $this->queueUser($request);
        $today = today()->toDateString();

        DB::transaction(function () use ($validated, $today, $user): void {
            $window = ServiceWindow::query()
                ->whereKey($validated['service_window_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->first();

            if (! $window) {
                throw ValidationException::withMessages([
                    'service_window_id' => 'This service window is not active.',
                ]);
            }

            $this->ensureWindowAccess($user, $window);

            $hasActiveTicket = QueueTicket::query()
                ->where('service_window_id', $window->id)
                ->whereDate('queue_date', $today)
                ->whereIn('status', [QueueTicket::CALLED, QueueTicket::SERVING])
                ->exists();

            if ($hasActiveTicket) {
                throw ValidationException::withMessages([
                    'service_window_id' => 'Finish the current ticket before calling another one.',
                ]);
            }

            $ticket = QueueTicket::query()
                ->where('service_window_id', $window->id)
                ->whereDate('queue_date', $today)
                ->where('status', QueueTicket::WAITING)
                ->orderBy('number')
                ->lockForUpdate()
                ->first();

            if (! $ticket) {
                throw ValidationException::withMessages([
                    'service_window_id' => 'There are no waiting tickets for this window.',
                ]);
            }

            $ticket->update([
                'served_by' => $user->id,
                'status' => QueueTicket::CALLED,
                'called_at' => now(),
            ]);
        });

        return to_route('queue.index')->with('success', 'The next ticket has been called.');
    }

    /**
     * Move a ticket through the permitted registrar workflow.
     */
    public function updateStatus(Request $request, QueueTicket $ticket): RedirectResponse
    {
        $user = $this->queueUser($request);
        $ticket->loadMissing('window');
        $this->ensureTicketAccess($user, $ticket);
        $validated = $request->validate([
            'status' => ['required', Rule::in([
                QueueTicket::WAITING,
                QueueTicket::SERVING,
                QueueTicket::COMPLETED,
                QueueTicket::SKIPPED,
                QueueTicket::CANCELLED,
            ])],
        ]);
        $status = $validated['status'];

        if ($ticket->queue_date->toDateString() !== today()->toDateString()) {
            throw ValidationException::withMessages([
                'status' => 'Only tickets from today can be updated.',
            ]);
        }

        $transitions = [
            QueueTicket::WAITING => [QueueTicket::CANCELLED],
            QueueTicket::CALLED => [QueueTicket::SERVING, QueueTicket::SKIPPED],
            QueueTicket::SERVING => [QueueTicket::COMPLETED, QueueTicket::SKIPPED],
            QueueTicket::SKIPPED => [QueueTicket::WAITING],
        ];

        if (! in_array($status, $transitions[$ticket->status] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => "A {$ticket->status} ticket cannot be marked {$status}.",
            ]);
        }

        $updates = ['status' => $status];

        if ($status === QueueTicket::WAITING) {
            $updates += [
                'called_at' => null,
                'serving_at' => null,
                'completed_at' => null,
                'skipped_at' => null,
            ];
        } elseif ($status === QueueTicket::SERVING) {
            $updates['serving_at'] = now();
        } elseif ($status === QueueTicket::COMPLETED) {
            $updates['completed_at'] = now();
        } elseif ($status === QueueTicket::SKIPPED) {
            $updates['skipped_at'] = now();
        }

        $ticket->update($updates);

        return to_route('queue.index')->with(
            'success',
            $status === QueueTicket::WAITING
                ? 'The ticket was recalled.'
                : 'Ticket status updated.',
        );
    }

    /**
     * Show the public queue display.
     */
    public function display(): Response
    {
        return Inertia::render('queue/public-display', $this->displaySnapshot());
    }

    /**
     * Return the public queue display data for polling screens.
     */
    public function displayData(): JsonResponse
    {
        return response()->json($this->displaySnapshot());
    }

    /**
     * @return array<string, mixed>
     */
    private function displaySnapshot(): array
    {
        $today = today()->toDateString();

        return [
            'date' => $today,
            'windows' => ServiceWindow::query()
                ->where('is_active', true)
                ->orderBy('id')
                ->get()
                ->map(function (ServiceWindow $window) use ($today): array {
                    $currentTicket = QueueTicket::query()
                        ->with(['window.office', 'service'])
                        ->where('service_window_id', $window->id)
                        ->whereDate('queue_date', $today)
                        ->whereIn('status', [QueueTicket::CALLED, QueueTicket::SERVING])
                        ->latest('called_at')
                        ->first();

                    $waitingTickets = QueueTicket::query()
                        ->with(['window.office', 'service'])
                        ->where('service_window_id', $window->id)
                        ->whereDate('queue_date', $today)
                        ->where('status', QueueTicket::WAITING)
                        ->orderBy('number')
                        ->get()
                        ->map(fn (QueueTicket $ticket): array => $this->ticketData($ticket))
                        ->values();

                    return [
                        ...$this->windowSummary($window),
                        'current_ticket' => $currentTicket
                            ? $this->ticketData($currentTicket)
                            : null,
                        'waiting_tickets' => $waitingTickets,
                    ];
                })
                ->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function ticketData(QueueTicket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'display_number' => $this->displayNumber($ticket),
            'number' => $ticket->number,
            'status' => $ticket->status,
            'service' => $ticket->service ? [
                'code' => $ticket->service->code,
                'name' => $ticket->service->name,
                'prefix' => $ticket->service->prefix,
            ] : null,
            'window' => $ticket->window ? [
                'code' => $ticket->window->code,
                'name' => $ticket->window->name,
                'office' => $ticket->window->office ? [
                    'code' => $ticket->window->office->code,
                    'name' => $ticket->window->office->name,
                ] : null,
            ] : null,
            'called_at' => $ticket->called_at?->toIso8601String(),
            'updated_at' => $ticket->updated_at?->toIso8601String(),
        ];
    }

    private function queueUser(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User && $user->canOperateQueue(), 403);

        return $user;
    }

    private function managerUser(Request $request): User
    {
        $user = $this->queueUser($request);

        abort_unless($user->canManageQueue(), 403);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function officeData(Office $office): array
    {
        return [
            'id' => $office->id,
            'code' => $office->code,
            'name' => $office->name,
            'description' => $office->description,
            'services' => $office->services
                ->where('is_active', true)
                ->map(fn (QueueService $service): array => [
                    'id' => $service->id,
                    'code' => $service->code,
                    'name' => $service->name,
                    'description' => $service->description,
                    'prefix' => $service->prefix,
                ])
                ->values(),
            'windows' => $office->windows
                ->where('is_active', true)
                ->map(function (ServiceWindow $window) use ($office): array {
                    $window->setRelation('office', $office);

                    return $this->windowSummary($window);
                })
                ->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function officeSettingsData(Office $office): array
    {
        return [
            'id' => $office->id,
            'code' => $office->code,
            'name' => $office->name,
            'description' => $office->description,
            'is_active' => $office->is_active,
            'services' => $office->services->map(fn (QueueService $service): array => [
                'id' => $service->id,
                'code' => $service->code,
                'name' => $service->name,
                'description' => $service->description,
                'prefix' => $service->prefix,
                'is_active' => $service->is_active,
            ])->values(),
            'windows' => $office->windows->map(fn (ServiceWindow $window): array => [
                'id' => $window->id,
                'code' => $window->code,
                'name' => $window->name,
                'is_active' => $window->is_active,
                'assigned_user_id' => $window->assigned_user_id,
                'assigned_user' => $window->assignedUser ? [
                    'id' => $window->assignedUser->id,
                    'name' => $window->assignedUser->name,
                ] : null,
            ])->values(),
        ];
    }

    /**
     * Restrict non-manager staff to their assigned windows or office.
     * A null office keeps the original unassigned-window behavior for legacy users.
     *
     * @param  Builder<ServiceWindow>  $query
     * @return Builder<ServiceWindow>
     */
    private function constrainVisibleWindows(Builder $query, User $user): Builder
    {
        if ($user->canManageQueue()) {
            return $query;
        }

        return $query->where(function (Builder $query) use ($user): void {
            $query->where('assigned_user_id', $user->id);

            if ($user->office_id === null) {
                $query->orWhereNull('assigned_user_id');

                return;
            }

            $query->orWhere(function (Builder $query) use ($user): void {
                $query
                    ->whereNull('assigned_user_id')
                    ->where('office_id', $user->office_id);
            });
        });
    }

    /**
     * @param  Builder<QueueTicket>  $query
     * @return Builder<QueueTicket>
     */
    private function constrainVisibleTickets(Builder $query, User $user): Builder
    {
        if ($user->canManageQueue()) {
            return $query;
        }

        return $query->whereHas('window', function (Builder $query) use ($user): void {
            $this->constrainVisibleWindows($query, $user);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function windowSummary(ServiceWindow $window): array
    {
        return [
            'id' => $window->id,
            'code' => $window->code,
            'name' => $window->name,
            'prefix' => $this->windowPrefix($window),
            'office_id' => $window->office_id,
            'office' => $window->office ? [
                'id' => $window->office->id,
                'code' => $window->office->code,
                'name' => $window->office->name,
            ] : null,
        ];
    }

    private function canAccessWindow(User $user, ServiceWindow $window): bool
    {
        return $user->canManageQueue()
            || $window->assigned_user_id === null
                && ($user->office_id === null || (int) $window->office_id === (int) $user->office_id)
            || $window->assigned_user_id === $user->id;
    }

    private function ensureWindowAccess(User $user, ServiceWindow $window): void
    {
        abort_unless(
            $this->canAccessWindow($user, $window),
            403,
            'This queue window is assigned to another staff member.',
        );
    }

    private function ensureTicketAccess(User $user, QueueTicket $ticket): void
    {
        if ($ticket->window) {
            $this->ensureWindowAccess($user, $ticket->window);
        }
    }

    private function displayNumber(QueueTicket $ticket): string
    {
        $prefix = $ticket->service ? $ticket->service->prefix : null;
        $prefix ??= $ticket->window ? $this->windowPrefix($ticket->window) : 'Q';

        return $prefix.'-'.str_pad((string) $ticket->number, 3, '0', STR_PAD_LEFT);
    }

    private function windowPrefix(ServiceWindow $window): string
    {
        if (preg_match('/(\d+)$/', $window->code, $matches) === 1) {
            return 'W'.$matches[1];
        }

        return strtoupper($window->code);
    }
}
