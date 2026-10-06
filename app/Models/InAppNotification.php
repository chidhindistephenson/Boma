<?php

namespace App\Models;

use App\Events\InAppNotificationCreated;
use App\Notifications\BomaActivityNotification;
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

    public function category(): string
    {
        return self::categoryForType($this->type);
    }

    public static function categoryForType(string $type): string
    {
        if (str_contains($type, 'message')) {
            return 'messages';
        }

        if (str_contains($type, 'payment') || str_contains($type, 'payout') || str_contains($type, 'subscription')) {
            return 'payments';
        }

        if (str_contains($type, 'review')) {
            return 'reviews';
        }

        if (
            str_contains($type, 'verification')
            || str_contains($type, 'account')
            || str_contains($type, 'conversation_')
        ) {
            return 'account';
        }

        return 'requests';
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
        $notification = self::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'action_url' => $actionUrl,
            'action_label' => $actionLabel,
            'data' => $data,
        ]);

        broadcast(new InAppNotificationCreated($notification))->toOthers();

        $preference = $user->notificationPreference()->firstOrCreate();
        if ($preference->allowsEmailFor($type)) {
            $user->notify(new BomaActivityNotification($notification));
        }

        return $notification;
    }
}
