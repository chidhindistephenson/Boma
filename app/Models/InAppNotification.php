<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InAppNotification extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'body',
        'action_url',
        'action_label',
        'data',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function markAsRead(): void
    {
        if ($this->read_at !== null) {
            return;
        }

        $this->forceFill(['read_at' => now()])->saveQuietly();
    }

    public static function notifyUser(
        User $user,
        string $type,
        string $title,
        ?string $body = null,
        ?string $actionUrl = null,
        ?string $actionLabel = null,
        array $data = [],
    ): self {
        return self::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'action_url' => $actionUrl,
            'action_label' => $actionLabel,
            'data' => $data,
        ]);
    }
}
