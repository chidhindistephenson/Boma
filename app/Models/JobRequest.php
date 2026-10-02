<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

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
        'preferred_date',
        'budget_min',
        'budget_max',
        'city',
        'area',
        'location_notes',
        'latitude',
        'longitude',
        'status',
        'customer_last_read_at',
        'provider_last_read_at',
        'chat_muted_at',
        'chat_muted_by_user_id',
        'chat_removed_at',
        'chat_removed_by_user_id',
        'chat_moderation_notes',
    ];

    protected function casts(): array
    {
        return [
            'budget_min' => 'integer',
            'budget_max' => 'integer',
            'customer_last_read_at' => 'datetime',
            'provider_last_read_at' => 'datetime',
            'chat_muted_at' => 'datetime',
            'chat_removed_at' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
            'preferred_date' => 'date',
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

    public function latestMessage(): HasOne
    {
        return $this->hasOne(JobRequestMessage::class)->latestOfMany();
    }

    public function conversationReports(): HasMany
    {
        return $this->hasMany(JobRequestConversationReport::class);
    }

    public function chatMutedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'chat_muted_by_user_id');
    }

    public function chatRemovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'chat_removed_by_user_id');
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

    public function proposals(): HasMany
    {
        return $this->hasMany(JobRequestProposal::class)->latest();
    }

    public function isVisibleTo(?User $viewer): bool
    {
        if (! $viewer) {
            return false;
        }

        if ($viewer->isAdmin()) {
            return true;
        }

        if ($this->status === 'open' && $viewer->isProvider()) {
            return $this->matchesProvider($viewer);
        }

        if ($viewer->id === $this->customer_id) {
            return true;
        }

        return $this->provider_id !== null && $viewer->id === $this->provider_id;
    }

    public function matchesProvider(User $provider): bool
    {
        $provider->loadMissing('providerProfile');

        if (
            ! $provider->isDirectoryVisible(true)
            || ! $provider->providerProfile
            || ! $provider->hasVerifiedTradeCategory($this->trade_category)
        ) {
            return false;
        }

        if (
            $this->latitude !== null
            && $this->longitude !== null
            && $provider->latitude !== null
            && $provider->longitude !== null
        ) {
            $earthRadiusKm = 6371;
            $latitudeDelta = deg2rad($provider->latitude - $this->latitude);
            $longitudeDelta = deg2rad($provider->longitude - $this->longitude);
            $a = sin($latitudeDelta / 2) ** 2
                + cos(deg2rad($this->latitude))
                * cos(deg2rad($provider->latitude))
                * sin($longitudeDelta / 2) ** 2;
            $distance = $earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a));

            return $distance <= ($provider->providerProfile->service_radius_km
                ?? config('localserve.search.default_radius_km'));
        }

        return mb_strtolower($provider->city) === mb_strtolower($this->city);
    }

    public function canPropose(User $provider): bool
    {
        return $this->status === 'open' && $this->matchesProvider($provider);
    }

    public function scopeOpenForProvider(Builder $query, User $provider): void
    {
        $provider->loadMissing('providerProfile');

        $categories = $provider->verifiedTradeCategoryNames();

        $query->where('status', 'open');

        if ($categories === []) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereIn('trade_category', $categories);

        if ($provider->latitude === null || $provider->longitude === null) {
            $query->whereRaw('LOWER(city) = ?', [mb_strtolower($provider->city)]);

            return;
        }

        $radiusMeters = ($provider->providerProfile?->service_radius_km
            ?? config('localserve.search.default_radius_km')) * 1000;

        $query->where(function (Builder $location) use ($provider, $radiusMeters): void {
            $location
                ->where(function (Builder $coordinates) use ($provider, $radiusMeters): void {
                    $coordinates
                        ->whereNotNull('latitude')
                        ->whereNotNull('longitude');

                    if (DB::connection()->getDriverName() === 'pgsql') {
                        $coordinates->whereRaw(
                            'earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(?, ?)) <= ?',
                            [$provider->latitude, $provider->longitude, $radiusMeters],
                        );
                    } else {
                        $radiusKm = $radiusMeters / 1000;
                        $latitudeDelta = $radiusKm / 111;
                        $longitudeDelta = $radiusKm / max(111 * cos(deg2rad($provider->latitude)), 1);

                        $coordinates
                            ->whereBetween('latitude', [
                                $provider->latitude - $latitudeDelta,
                                $provider->latitude + $latitudeDelta,
                            ])
                            ->whereBetween('longitude', [
                                $provider->longitude - $longitudeDelta,
                                $provider->longitude + $longitudeDelta,
                            ]);
                    }
                })
                ->orWhere(function (Builder $cityFallback) use ($provider): void {
                    $cityFallback
                        ->where(function (Builder $missingCoordinates): void {
                            $missingCoordinates
                                ->whereNull('latitude')
                                ->orWhereNull('longitude');
                        })
                        ->whereRaw('LOWER(city) = ?', [mb_strtolower($provider->city)]);
                });
        });
    }

    public function canMessage(?User $viewer): bool
    {
        if (
            ! $viewer
            || $this->provider_id === null
            || $this->chat_muted_at !== null
            || $this->chat_removed_at !== null
        ) {
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
        if (
            $viewer?->id !== $this->customer_id
            || $this->provider_id === null
            || $this->status !== 'closed'
        ) {
            return false;
        }

        if (! $this->relationLoaded('payment')) {
            $this->load('payment');
        }

        if (! $this->relationLoaded('review')) {
            $this->load('review');
        }

        return $this->payment?->status === 'confirmed'
            && (! $this->review || (! $this->review->responded_at && ! $this->review->moderated_at));
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

    public function canReleasePayment(?User $viewer): bool
    {
        if (
            ! $viewer
            || ! ($viewer->id === $this->customer_id || $viewer->isAdmin())
            || ! in_array($this->status, ['accepted', 'closed'], true)
        ) {
            return false;
        }

        if (! $this->relationLoaded('payment')) {
            $this->load('payment');
        }

        if ($viewer->id === $this->customer_id) {
            return $this->payment?->status === 'confirmed'
                && $this->payment?->escrow_status === 'held';
        }

        return $this->payment?->status === 'confirmed'
            && in_array($this->payment?->escrow_status, ['held', 'disputed'], true);
    }

    public function canDisputePayment(?User $viewer): bool
    {
        if (
            ! $viewer
            || ! in_array($viewer->id, [$this->customer_id, $this->provider_id], true)
            || ! in_array($this->status, ['accepted', 'closed'], true)
        ) {
            return false;
        }

        if (! $this->relationLoaded('payment')) {
            $this->load('payment');
        }

        return $this->payment?->status === 'confirmed'
            && $this->payment?->escrow_status === 'held';
    }

    public function canRefundPayment(?User $viewer): bool
    {
        if (
            ! $viewer
            || ! $viewer->isAdmin()
            || ! in_array($this->status, ['accepted', 'closed'], true)
        ) {
            return false;
        }

        if (! $this->relationLoaded('payment')) {
            $this->load('payment');
        }

        return $this->payment?->status === 'confirmed'
            && in_array($this->payment?->escrow_status, ['held', 'disputed'], true);
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
