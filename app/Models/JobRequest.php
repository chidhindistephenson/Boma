<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class JobRequest extends Model
{
    protected $fillable = [
        'customer_id',
        'provider_id',
        'source_job_request_id',
        'trade_category',
        'title',
        'description',
        'urgency',
        'budget_min',
        'budget_max',
        'city',
        'area',
        'location_notes',
        'status',
        'customer_last_read_at',
        'provider_last_read_at',
    ];

    protected function casts(): array
    {
        return [
            'budget_min' => 'integer',
            'budget_max' => 'integer',
            'customer_last_read_at' => 'datetime',
            'provider_last_read_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }

    public function sourceRequest(): BelongsTo
    {
        return $this->belongsTo(self::class, 'source_job_request_id');
    }

    public function followUpRequests(): HasMany
    {
        return $this->hasMany(self::class, 'source_job_request_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(JobRequestMessage::class)->latest();
    }

    public function review(): HasOne
    {
        return $this->hasOne(ProviderReview::class);
    }

    public function quote(): HasOne
    {
        return $this->hasOne(JobRequestQuote::class);
    }

    public function schedule(): HasOne
    {
        return $this->hasOne(JobRequestSchedule::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(JobRequestPayment::class);
    }

    public function isVisibleTo(?User $viewer): bool
    {
        if (! $viewer) {
            return false;
        }

        if ($viewer->isAdmin()) {
            return true;
        }

        if ($viewer->id === $this->customer_id) {
            return true;
        }

        return $this->provider_id !== null && $viewer->id === $this->provider_id;
    }

    public function canMessage(?User $viewer): bool
    {
        if (! $viewer || $this->provider_id === null) {
            return false;
        }

        if (in_array($this->status, ['declined', 'closed'], true)) {
            return false;
        }

        return $viewer->id === $this->customer_id || $viewer->id === $this->provider_id;
    }

    public function canBeAcceptedBy(?User $viewer): bool
    {
        return $viewer?->id === $this->provider_id
            && in_array($this->status, ['targeted', 'in_conversation'], true);
    }

    public function canBeDeclinedBy(?User $viewer): bool
    {
        return $viewer?->id === $this->provider_id
            && in_array($this->status, ['targeted', 'in_conversation'], true);
    }

    public function canBeClosedBy(?User $viewer): bool
    {
        if (! $viewer || $this->status === 'closed') {
            return false;
        }

        if ($viewer->isAdmin()) {
            return true;
        }

        if ($viewer->id === $this->customer_id) {
            return true;
        }

        return $this->provider_id !== null && $viewer->id === $this->provider_id;
    }

    public function canBeReviewedBy(?User $viewer): bool
    {
        return $viewer?->id === $this->customer_id
            && $this->provider_id !== null
            && $this->status === 'closed';
    }

    public function canBeQuotedBy(?User $viewer): bool
    {
        if (
            ! $viewer
            || $this->provider_id === null
            || $viewer->id !== $this->provider_id
            || in_array($this->status, ['open', 'declined', 'closed'], true)
        ) {
            return false;
        }

        if (! $this->relationLoaded('quote')) {
            $this->load('quote');
        }

        return $this->quote?->status !== 'accepted';
    }

    public function canQuoteBeRespondedToBy(?User $viewer): bool
    {
        if (
            ! $viewer
            || $viewer->id !== $this->customer_id
            || in_array($this->status, ['declined', 'closed'], true)
        ) {
            return false;
        }

        if (! $this->relationLoaded('quote')) {
            $this->load('quote');
        }

        return $this->quote?->status === 'pending';
    }

    public function canManageSchedule(?User $viewer): bool
    {
        if (
            ! $viewer
            || $viewer->id !== $this->provider_id
            || $this->status !== 'accepted'
        ) {
            return false;
        }

        if (! $this->relationLoaded('schedule')) {
            $this->load('schedule');
        }

        return $this->schedule?->status !== 'completed';
    }

    public function canRespondToSchedule(?User $viewer): bool
    {
        if (
            ! $viewer
            || $viewer->id !== $this->customer_id
            || $this->status !== 'accepted'
        ) {
            return false;
        }

        if (! $this->relationLoaded('schedule')) {
            $this->load('schedule');
        }

        return $this->schedule?->status === 'proposed';
    }

    public function canCancelSchedule(?User $viewer): bool
    {
        if (
            ! $viewer
            || ! in_array($viewer->id, [$this->customer_id, $this->provider_id], true)
            || $this->status !== 'accepted'
        ) {
            return false;
        }

        if (! $this->relationLoaded('schedule')) {
            $this->load('schedule');
        }

        return in_array($this->schedule?->status, ['proposed', 'confirmed'], true);
    }

    public function canCompleteSchedule(?User $viewer): bool
    {
        if (
            ! $viewer
            || $viewer->id !== $this->provider_id
            || $this->status !== 'accepted'
        ) {
            return false;
        }

        if (! $this->relationLoaded('schedule')) {
            $this->load('schedule');
        }

        return $this->schedule?->status === 'confirmed';
    }

    public function canManagePayment(?User $viewer): bool
    {
        if (
            ! $viewer
            || $viewer->id !== $this->customer_id
            || $this->provider_id === null
            || ! in_array($this->status, ['accepted', 'closed'], true)
        ) {
            return false;
        }

        if (! $this->relationLoaded('quote')) {
            $this->load('quote');
        }

        if ($this->quote?->status !== 'accepted') {
            return false;
        }

        if (! $this->relationLoaded('payment')) {
            $this->load('payment');
        }

        return $this->payment?->status !== 'confirmed';
    }

    public function canRespondToPayment(?User $viewer): bool
    {
        if (
            ! $viewer
            || $viewer->id !== $this->provider_id
            || ! in_array($this->status, ['accepted', 'closed'], true)
        ) {
            return false;
        }

        if (! $this->relationLoaded('quote')) {
            $this->load('quote');
        }

        if ($this->quote?->status !== 'accepted') {
            return false;
        }

        if (! $this->relationLoaded('payment')) {
            $this->load('payment');
        }

        return $this->payment?->status === 'submitted';
    }

    public function canCreateFollowUp(?User $viewer): bool
    {
        return $viewer?->id === $this->customer_id;
    }

    public function unreadCountFor(?User $viewer): int
    {
        if (! $viewer || ! ($viewer->id === $this->customer_id || $viewer->id === $this->provider_id)) {
            return 0;
        }

        $messages = $this->relationLoaded('messages')
            ? $this->messages
            : $this->messages()->get();

        $lastReadAt = $viewer->id === $this->customer_id
            ? $this->customer_last_read_at
            : $this->provider_last_read_at;

        return $messages
            ->filter(function (JobRequestMessage $message) use ($viewer, $lastReadAt): bool {
                if ($message->sender_id === $viewer->id) {
                    return false;
                }

                return ! $lastReadAt || $message->created_at->gt($lastReadAt);
            })
            ->count();
    }

    public function markAsReadFor(?User $viewer): void
    {
        if (! $viewer) {
            return;
        }

        if ($viewer->id === $this->customer_id) {
            $this->forceFill(['customer_last_read_at' => now()])->saveQuietly();

            return;
        }

        if ($this->provider_id !== null && $viewer->id === $this->provider_id) {
            $this->forceFill(['provider_last_read_at' => now()])->saveQuietly();
        }
    }
}
