<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon $queue_date
 * @property Carbon|null $called_at
 * @property Carbon|null $serving_at
 * @property Carbon|null $completed_at
 * @property Carbon|null $skipped_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'queue_service_id',
    'service_window_id',
    'served_by',
    'student_number',
    'queue_date',
    'number',
    'status',
    'called_at',
    'serving_at',
    'completed_at',
    'skipped_at',
])]
class QueueTicket extends Model
{
    public const WAITING = 'waiting';

    public const CALLED = 'called';

    public const SERVING = 'serving';

    public const COMPLETED = 'completed';

    public const SKIPPED = 'skipped';

    public const CANCELLED = 'cancelled';

    /**
     * @return BelongsTo<QueueService, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(QueueService::class, 'queue_service_id');
    }

    /**
     * @return BelongsTo<ServiceWindow, $this>
     */
    public function window(): BelongsTo
    {
        return $this->belongsTo(ServiceWindow::class, 'service_window_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(User::class, 'served_by');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'queue_date' => 'date',
            'called_at' => 'datetime',
            'serving_at' => 'datetime',
            'completed_at' => 'datetime',
            'skipped_at' => 'datetime',
        ];
    }
}
