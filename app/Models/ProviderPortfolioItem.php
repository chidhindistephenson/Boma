<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderPortfolioItem extends Model
{
    protected $fillable = [
        'provider_profile_id',
        'provider_service_id',
        'title',
        'description',
        'media_type',
        'original_name',
        'storage_path',
        'mime_type',
        'size_bytes',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function providerProfile(): BelongsTo
    {
        return $this->belongsTo(ProviderProfile::class);
    }

    public function providerService(): BelongsTo
    {
        return $this->belongsTo(ProviderService::class);
    }
}
