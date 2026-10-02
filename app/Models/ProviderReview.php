<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProviderReview extends Model
{
    protected $fillable = [
        'job_request_id',
        'customer_id',
        'provider_id',
        'rating',
        'headline',
        'body',
        'provider_response',
        'responded_at',
        'moderation_status',
        'flag_reason',
        'moderation_notes',
        'moderated_at',
        'moderated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'responded_at' => 'datetime',
            'moderated_at' => 'datetime',
        ];
    }

    public function jobRequest(): BelongsTo
    {
        return $this->belongsTo(JobRequest::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }

    public function moderatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by_user_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(ProviderReviewReport::class);
    }

    public function scopePublished(Builder $query): void
    {
        $query->where('moderation_status', 'published');
    }

    public function reviewerFirstName(): string
    {
        return Str::before(trim($this->customer->name), ' ');
    }
}
