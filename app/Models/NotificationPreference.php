<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    protected $attributes = [
        'email_messages' => true,
        'email_requests' => true,
        'email_payments' => true,
        'email_reviews' => true,
        'email_account' => true,
    ];

    protected $fillable = [
        'user_id',
        'email_messages',
        'email_requests',
        'email_payments',
        'email_reviews',
        'email_account',
    ];

    protected function casts(): array
    {
        return [
            'email_messages' => 'boolean',
            'email_requests' => 'boolean',
            'email_payments' => 'boolean',
            'email_reviews' => 'boolean',
            'email_account' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function allowsEmailFor(string $notificationType): bool
    {
        return (bool) $this->{'email_'.InAppNotification::categoryForType($notificationType)};
    }
}
