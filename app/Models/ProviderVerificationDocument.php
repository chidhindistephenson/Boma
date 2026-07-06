<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderVerificationDocument extends Model
{
    protected $fillable = [
        'provider_profile_id',
        'uploaded_by_user_id',
        'document_type',
        'label',
        'original_name',
        'storage_path',
        'mime_type',
        'size_bytes',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
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
