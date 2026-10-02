<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'price',
        'currency',
        'billing_interval',
        'trial_days',
        'service_limit',
        'portfolio_limit',
        'featured_service_limit',
        'trade_category_limit',
        'has_premium_analytics',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'trial_days' => 'integer',
            'service_limit' => 'integer',
            'portfolio_limit' => 'integer',
            'featured_service_limit' => 'integer',
            'trade_category_limit' => 'integer',
            'has_premium_analytics' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(ProviderSubscription::class);
    }
}
