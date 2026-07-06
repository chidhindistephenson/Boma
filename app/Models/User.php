<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'role',
        'status',
        'suspended_at',
        'suspended_by_user_id',
        'suspension_reason',
        'city',
        'area',
        'profile_photo_path',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'suspended_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function suspendedBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'suspended_by_user_id');
    }

    public function customerProfile(): HasOne
    {
        return $this->hasOne(CustomerProfile::class);
    }

    public function providerProfile(): HasOne
    {
        return $this->hasOne(ProviderProfile::class);
    }

    public function shortlistedProviders(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'shortlisted_providers',
            'customer_id',
            'provider_id',
        )->withTimestamps();
    }

    public function shortlistedByCustomers(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'shortlisted_providers',
            'provider_id',
            'customer_id',
        )->withTimestamps();
    }

    public function customerJobRequests(): HasMany
    {
        return $this->hasMany(JobRequest::class, 'customer_id');
    }

    public function providerJobRequests(): HasMany
    {
        return $this->hasMany(JobRequest::class, 'provider_id');
    }

    public function providerServices(): HasManyThrough
    {
        return $this->hasManyThrough(
            ProviderService::class,
            ProviderProfile::class,
            'user_id',
            'provider_profile_id',
            'id',
            'id',
        );
    }

    public function jobRequestMessages(): HasMany
    {
        return $this->hasMany(JobRequestMessage::class, 'sender_id');
    }

    public function inAppNotifications(): HasMany
    {
        return $this->hasMany(InAppNotification::class)
            ->latest('id');
    }

    public function writtenProviderReviews(): HasMany
    {
        return $this->hasMany(ProviderReview::class, 'customer_id');
    }

    public function receivedProviderReviews(): HasMany
    {
        return $this->hasMany(ProviderReview::class, 'provider_id')
            ->latest('id');
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    public function isProvider(): bool
    {
        return $this->role === 'provider';
    }

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }

    public function scopeDirectoryVisible(Builder $query, bool $verifiedOnly = false): void
    {
        $query
            ->where('role', 'provider')
            ->where('status', 'active')
            ->whereNull('suspended_at')
            ->whereNotNull('email_verified_at')
            ->whereHas('providerProfile', function (Builder $profileQuery) use ($verifiedOnly): void {
                if ($verifiedOnly) {
                    $profileQuery->where('verification_status', 'verified');
                }
            });
    }

    public function isDirectoryVisible(bool $verifiedOnly = false): bool
    {
        if (
            ! $this->isProvider()
            || $this->status !== 'active'
            || $this->isSuspended()
            || ! $this->email_verified_at
        ) {
            return false;
        }

        if (! $this->relationLoaded('providerProfile')) {
            $this->load('providerProfile');
        }

        if (! $this->providerProfile) {
            return false;
        }

        return ! $verifiedOnly || $this->providerProfile->verification_status === 'verified';
    }
}
