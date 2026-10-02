<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProviderVerificationDocument extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PENDING_REPLACEMENT = 'pending_replacement';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_SUPERSEDED = 'superseded';

    protected $fillable = [
        'provider_profile_id',
        'uploaded_by_user_id',
        'replaces_document_id',
        'document_type',
        'label',
        'original_name',
        'storage_path',
        'mime_type',
        'size_bytes',
        'verification_status',
        'approved_at',
        'reviewed_at',
        'reviewed_by_user_id',
        'review_notes',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'approved_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function providerProfile(): BelongsTo
    {
        return $this->belongsTo(ProviderProfile::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    public function replacesDocument(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaces_document_id');
    }

    public function replacements(): HasMany
    {
        return $this->hasMany(self::class, 'replaces_document_id');
    }

    public function isApprovedEvidence(): bool
    {
        return $this->verification_status === self::STATUS_APPROVED;
    }

    public function canBeReplaced(): bool
    {
        return $this->verification_status === self::STATUS_APPROVED;
    }

    public function canBeRemovedByProvider(): bool
    {
        return in_array($this->verification_status, [
            self::STATUS_PENDING,
            self::STATUS_PENDING_REPLACEMENT,
            self::STATUS_REJECTED,
        ], true);
    }

    public function isPendingAdminReview(): bool
    {
        return in_array($this->verification_status, [
            self::STATUS_PENDING,
            self::STATUS_PENDING_REPLACEMENT,
        ], true);
    }

    public function isVisibleTo(?User $viewer): bool
    {
        if (! $viewer || ! $this->providerProfile) {
            return false;
        }

        if ($viewer->isAdmin()) {
            return true;
        }

        return $viewer->id === $this->providerProfile->user_id;
    }
}
