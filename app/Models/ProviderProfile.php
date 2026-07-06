<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProviderProfile extends Model
{
    protected $fillable = [
        'business_name',
        'headline',
        'trade_category',
        'bio',
        'years_experience',
        'base_price_from',
        'response_time_label',
        'service_radius_km',
        'verification_status',
        'verification_submitted_at',
        'verification_notes',
        'verification_review_notes',
        'verified_at',
        'reviewed_at',
        'reviewed_by_user_id',
        'availability_status',
        'subscription_tier',
        'trial_ends_at',
    ];

    protected function casts(): array
    {
        return [
            'verification_submitted_at' => 'datetime',
            'verified_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'trial_ends_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    public function verificationDocuments(): HasMany
    {
        return $this->hasMany(ProviderVerificationDocument::class)
            ->latest();
    }

    public function verificationEvents(): HasMany
    {
        return $this->hasMany(ProviderVerificationEvent::class)
            ->latest('id');
    }

    public function services(): HasMany
    {
        return $this->hasMany(ProviderService::class)
            ->orderByDesc('is_featured')
            ->orderBy('sort_order')
            ->orderBy('title');
    }
}
