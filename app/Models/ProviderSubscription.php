<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderSubscription extends Model
{
    protected $fillable = [
        'provider_profile_id',
        'subscription_plan_id',
        'wallet_transaction_id',
        'status',
        'amount',
        'currency',
        'starts_at',
        'trial_ends_at',
        'current_period_ends_at',
        'grace_ends_at',
        'cancelled_at',
        'auto_renews',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'starts_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'current_period_ends_at' => 'datetime',
            'grace_ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'auto_renews' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function providerProfile(): BelongsTo
    {
        return $this->belongsTo(ProviderProfile::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class);
    }

    public function isUsable(): bool
    {
        if (! in_array($this->status, ['trialing', 'active', 'past_due'], true)) {
            return false;
        }

        if ($this->status === 'past_due') {
            return $this->grace_ends_at !== null && $this->grace_ends_at->isFuture();
        }

        if ($this->current_period_ends_at === null) {
            return true;
        }

        return $this->current_period_ends_at->isFuture();
    }
}
