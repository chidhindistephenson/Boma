<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderTradeCategory extends Model
{
    protected $fillable = [
        'provider_profile_id',
        'trade_category',
        'verification_status',
        'submitted_at',
        'verified_at',
        'reviewed_at',
        'reviewed_by_user_id',
        'review_notes',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'verified_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function providerProfile(): BelongsTo
    {
        return $this->belongsTo(ProviderProfile::class);
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }
}
