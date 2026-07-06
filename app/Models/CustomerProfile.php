<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerProfile extends Model
{
    protected $fillable = [
        'preferred_radius_km',
        'default_trade_category',
        'default_urgency',
        'default_budget_min',
        'default_budget_max',
        'location_notes',
    ];

    protected function casts(): array
    {
        return [
            'preferred_radius_km' => 'integer',
            'default_budget_min' => 'integer',
            'default_budget_max' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
