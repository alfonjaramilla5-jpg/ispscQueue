<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'description', 'is_active', 'sort_order'])]
class Office extends Model
{
    /**
     * @return HasMany<QueueService, $this>
     */
    public function services(): HasMany
    {
        return $this->hasMany(QueueService::class);
    }

    /**
     * @return HasMany<ServiceWindow, $this>
     */
    public function windows(): HasMany
    {
        return $this->hasMany(ServiceWindow::class);
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
