<?php

namespace Tests\Feature\Queue;

use App\Models\Office;
use App\Models\QueueService;
use App\Models\QueueTicket;
use App\Models\ServiceWindow;
use App\Models\User;
use Database\Seeders\QueueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class QueueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(QueueSeeder::class);
    }

    public function test_guests_cannot_access_the_registrar_queue(): void
    {
        $this->get(route('queue.index'))
            ->assertRedirect(route('login'));
    }

    public function test_authenticated_staff_can_view_the_registrar_queue(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('queue.index'))
            ->assertOk();
    }

    public function test_staff_cannot_open_queue_settings(): void
    {
        $this->actingAs(User::factory()->create(['role' => User::ROLE_STAFF]))
            ->get(route('queue.settings'))
            ->assertForbidden();
    }

    public function test_supervisor_can_assign_a_queue_window(): void
    {
        $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
        $staff = User::factory()->create(['role' => User::ROLE_STAFF]);
        $window = ServiceWindow::query()->where('code', 'window-1')->firstOrFail();

        $this->actingAs($supervisor)
            ->patch(route('queue.settings.windows.update', $window), [
                'assigned_user_id' => $staff->id,
            ])
            ->assertRedirect(route('queue.settings'));

        $this->assertDatabaseHas('service_windows', [
            'id' => $window->id,
            'assigned_user_id' => $staff->id,
        ]);
    }

    public function test_supervisor_can_update_a_staff_role(): void
    {
        $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
        $staff = User::factory()->create(['role' => User::ROLE_STAFF]);

        $this->actingAs($supervisor)
            ->patch(route('queue.settings.users.role', $staff), [
                'role' => User::ROLE_SUPERVISOR,
            ])
            ->assertRedirect(route('queue.settings'));

        $this->assertDatabaseHas('users', [
            'id' => $staff->id,
            'role' => User::ROLE_SUPERVISOR,
        ]);
    }

    public function test_staff_cannot_call_a_ticket_at_another_staff_members_window(): void
    {
        $staff = User::factory()->create(['role' => User::ROLE_STAFF]);
        $otherStaff = User::factory()->create(['role' => User::ROLE_STAFF]);
        $window = ServiceWindow::query()->where('code', 'window-1')->firstOrFail();
        $window->update(['assigned_user_id' => $otherStaff->id]);

        $this->post(route('kiosk.tickets.store'), [
            'service_window_id' => $window->id,
        ]);

        $this->actingAs($staff)
            ->post(route('queue.call-next'), [
                'service_window_id' => $window->id,
            ])
            ->assertForbidden();
    }

    public function test_students_can_open_the_public_kiosk(): void
    {
        $this->get(route('kiosk'))
            ->assertOk();
    }

    public function test_students_can_issue_a_ticket_without_logging_in(): void
    {
        $window = ServiceWindow::query()->where('code', 'window-1')->firstOrFail();

        $this->post(route('kiosk.tickets.store'), [
            'service_window_id' => $window->id,
        ])
            ->assertRedirect(route('kiosk', [
                'ticket' => 'W1-001',
                'ticket_id' => 1,
            ]));

        $this->assertDatabaseHas('queue_tickets', [
            'service_window_id' => $window->id,
            'number' => 1,
            'status' => QueueTicket::WAITING,
        ]);
    }

    public function test_students_can_issue_a_ticket_for_an_office_service_and_counter(): void
    {
        $office = Office::query()->where('code', 'cashier')->firstOrFail();
        $service = QueueService::query()
            ->where('office_id', $office->id)
            ->where('code', 'tuition-payments')
            ->firstOrFail();
        $window = ServiceWindow::query()->where('code', 'cashier')->firstOrFail();

        $this->post(route('kiosk.tickets.store'), [
            'office_id' => $office->id,
            'queue_service_id' => $service->id,
            'service_window_id' => $window->id,
        ])->assertRedirect(route('kiosk', [
            'ticket' => 'PAY-001',
            'ticket_id' => 1,
        ]));

        $this->assertDatabaseHas('queue_tickets', [
            'queue_service_id' => $service->id,
            'service_window_id' => $window->id,
            'status' => QueueTicket::WAITING,
        ]);
    }

    public function test_staff_assigned_to_an_office_cannot_operate_another_office(): void
    {
        $cashier = Office::query()->where('code', 'cashier')->firstOrFail();
        $registrarWindow = ServiceWindow::query()->where('code', 'window-1')->firstOrFail();
        $staff = User::factory()->create([
            'role' => User::ROLE_STAFF,
            'office_id' => $cashier->id,
        ]);

        $this->post(route('kiosk.tickets.store'), [
            'service_window_id' => $registrarWindow->id,
        ]);

        $this->actingAs($staff)
            ->post(route('queue.call-next'), [
                'service_window_id' => $registrarWindow->id,
            ])
            ->assertForbidden();
    }

    public function test_each_window_has_an_independent_daily_sequence(): void
    {
        $windowOne = ServiceWindow::query()->where('code', 'window-1')->firstOrFail();
        $windowTwo = ServiceWindow::query()->where('code', 'window-2')->firstOrFail();

        $this->post(route('kiosk.tickets.store'), [
            'service_window_id' => $windowOne->id,
        ]);
        $this->post(route('kiosk.tickets.store'), [
            'service_window_id' => $windowOne->id,
        ])->assertRedirect(route('kiosk', [
            'ticket' => 'W1-002',
            'ticket_id' => 2,
        ]));
        $this->post(route('kiosk.tickets.store'), [
            'service_window_id' => $windowTwo->id,
        ])->assertRedirect(route('kiosk', [
            'ticket' => 'W2-001',
            'ticket_id' => 3,
        ]));

        $this->assertSame(
            [1, 2],
            QueueTicket::query()
                ->where('service_window_id', $windowOne->id)
                ->whereDate('queue_date', today())
                ->orderBy('number')
                ->pluck('number')
                ->all(),
        );
    }

    public function test_each_window_sequence_resets_on_the_next_campus_day(): void
    {
        $window = ServiceWindow::query()->where('code', 'window-1')->firstOrFail();

        Carbon::setTestNow(now()->subDay());

        try {
            $this->post(route('kiosk.tickets.store'), [
                'service_window_id' => $window->id,
            ])->assertRedirect(route('kiosk', [
                'ticket' => 'W1-001',
                'ticket_id' => 1,
            ]));

            Carbon::setTestNow(now()->addDay());

            $this->post(route('kiosk.tickets.store'), [
                'service_window_id' => $window->id,
            ])->assertRedirect(route('kiosk', [
                'ticket' => 'W1-001',
                'ticket_id' => 2,
            ]));
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_students_must_select_an_active_window(): void
    {
        $this->post(route('kiosk.tickets.store'), [])->assertSessionHasErrors('service_window_id');
    }

    public function test_students_can_poll_their_ticket_status(): void
    {
        $user = User::factory()->create();
        $window = ServiceWindow::query()->where('code', 'window-1')->firstOrFail();

        $this->post(route('kiosk.tickets.store'), [
            'service_window_id' => $window->id,
        ]);
        $ticket = QueueTicket::query()->firstOrFail();

        $this->getJson(route('kiosk.tickets.status', $ticket))
            ->assertOk()
            ->assertJsonPath('display_number', 'W1-001')
            ->assertJsonPath('status', QueueTicket::WAITING);

        $this->actingAs($user)
            ->post(route('queue.call-next'), [
                'service_window_id' => $window->id,
            ]);

        $this->getJson(route('kiosk.tickets.status', $ticket))
            ->assertOk()
            ->assertJsonPath('status', QueueTicket::CALLED)
            ->assertJsonPath('window.name', 'Window 1');
    }

    public function test_window_calls_oldest_ticket_and_allows_status_transitions(): void
    {
        $user = User::factory()->create();
        $window = ServiceWindow::query()->where('code', 'window-1')->firstOrFail();

        $this->post(route('kiosk.tickets.store'), ['service_window_id' => $window->id]);
        $this->post(route('kiosk.tickets.store'), ['service_window_id' => $window->id]);

        $this->actingAs($user)
            ->post(route('queue.call-next'), [
                'service_window_id' => $window->id,
            ])
            ->assertRedirect(route('queue.index'));

        $ticket = QueueTicket::query()->where('number', 1)->firstOrFail();
        $this->assertSame(QueueTicket::CALLED, $ticket->status);
        $this->assertSame($window->id, $ticket->service_window_id);

        $this->actingAs($user)
            ->patch(route('queue.tickets.status', $ticket), ['status' => QueueTicket::SERVING])
            ->assertRedirect(route('queue.index'));
        $this->actingAs($user)
            ->patch(route('queue.tickets.status', $ticket), ['status' => QueueTicket::COMPLETED])
            ->assertRedirect(route('queue.index'));

        $this->assertDatabaseHas('queue_tickets', [
            'id' => $ticket->id,
            'status' => QueueTicket::COMPLETED,
        ]);
    }

    public function test_window_cannot_call_a_second_ticket_while_one_is_active(): void
    {
        $user = User::factory()->create();
        $window = ServiceWindow::query()->where('code', 'window-1')->firstOrFail();

        $this->post(route('kiosk.tickets.store'), ['service_window_id' => $window->id]);
        $this->post(route('kiosk.tickets.store'), ['service_window_id' => $window->id]);
        $this->actingAs($user)
            ->post(route('queue.call-next'), [
                'service_window_id' => $window->id,
            ]);

        $this->actingAs($user)
            ->post(route('queue.call-next'), [
                'service_window_id' => $window->id,
            ])
            ->assertSessionHasErrors('service_window_id');

        $this->assertSame(1, QueueTicket::query()->where('status', QueueTicket::CALLED)->count());
        $this->assertSame(1, QueueTicket::query()->where('status', QueueTicket::WAITING)->count());
    }

    public function test_staff_can_skip_and_manually_recall_a_ticket(): void
    {
        $user = User::factory()->create();
        $window = ServiceWindow::query()->where('code', 'window-1')->firstOrFail();

        $this->post(route('kiosk.tickets.store'), ['service_window_id' => $window->id]);

        $this->actingAs($user)
            ->post(route('queue.call-next'), ['service_window_id' => $window->id]);

        $ticket = QueueTicket::query()->firstOrFail();

        $this->actingAs($user)
            ->patch(route('queue.tickets.status', $ticket), ['status' => QueueTicket::SKIPPED])
            ->assertRedirect(route('queue.index'));

        $this->assertDatabaseHas('queue_tickets', [
            'id' => $ticket->id,
            'status' => QueueTicket::SKIPPED,
        ]);

        $this->actingAs($user)
            ->patch(route('queue.tickets.status', $ticket), ['status' => QueueTicket::WAITING])
            ->assertRedirect(route('queue.index'));

        $this->assertDatabaseHas('queue_tickets', [
            'id' => $ticket->id,
            'status' => QueueTicket::WAITING,
        ]);
    }

    public function test_public_display_reports_waiting_tickets(): void
    {
        $window = ServiceWindow::query()->where('code', 'window-3')->firstOrFail();

        $this->post(route('kiosk.tickets.store'), ['service_window_id' => $window->id]);

        $this->getJson(route('queue.display.data'))
            ->assertOk()
            ->assertJsonPath('windows.2.code', 'window-3')
            ->assertJsonPath('windows.2.waiting_tickets.0.display_number', 'W3-001');
    }
}
