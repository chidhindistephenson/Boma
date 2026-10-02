<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProviderService extends Model
{
    protected $fillable = [
        'provider_profile_id',
        'title',
        'short_description',
        'price_from',
        'turnaround_label',
        'is_featured',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_featured' => 'boolean',
        ];
    }

    public function providerProfile(): BelongsTo
    {
        return $this->belongsTo(ProviderProfile::class);
    }

    public function portfolioItems(): HasMany
    {
        return $this->hasMany(ProviderPortfolioItem::class);
    }
}
