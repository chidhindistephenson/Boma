<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;

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
        'latitude',
        'longitude',
        'profile_photo_path',
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
        'deletion_requested_at',
        'anonymized_at',
        'retention_until',
        'deletion_reason',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
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
            'latitude' => 'float',
            'longitude' => 'float',
            'password' => 'hashed',
            'two_factor_recovery_codes' => 'array',
            'two_factor_confirmed_at' => 'datetime',
            'deletion_requested_at' => 'datetime',
            'anonymized_at' => 'datetime',
            'retention_until' => 'datetime',
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

    public function jobRequestProposals(): HasMany
    {
        return $this->hasMany(JobRequestProposal::class, 'provider_id');
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

    public function notificationPreference(): HasOne
    {
        return $this->hasOne(NotificationPreference::class);
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(UserWallet::class);
    }

    public function wallets(): HasMany
    {
        return $this->hasMany(UserWallet::class);
    }

    public function walletTransactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function walletDepositRequests(): HasMany
    {
        return $this->hasMany(WalletDepositRequest::class);
    }

    public function apiRefreshTokens(): HasMany
    {
        return $this->hasMany(ApiRefreshToken::class);
    }

    public function payoutRequests(): HasMany
    {
        return $this->hasMany(PayoutRequest::class, 'provider_id');
    }

    public function paymentMethods(): HasMany
    {
        return $this->hasMany(UserPaymentMethod::class);
    }

    public function socialAccounts(): HasMany
    {
        return $this->hasMany(UserSocialAccount::class);
    }

    public function conversationReports(): HasMany
    {
        return $this->hasMany(JobRequestConversationReport::class, 'reporter_id');
    }

    public function unreadConversationMessageCount(): int
    {
        if (! $this->isCustomer() && ! $this->isProvider()) {
            return 0;
        }

        $participantColumn = $this->isCustomer() ? 'customer_id' : 'provider_id';
        $lastReadColumn = $this->isCustomer()
            ? 'customer_last_read_at'
            : 'provider_last_read_at';

        return DB::table('job_request_messages')
            ->join('job_requests', 'job_requests.id', '=', 'job_request_messages.job_request_id')
            ->where("job_requests.{$participantColumn}", $this->id)
            ->whereNull('job_requests.chat_removed_at')
            ->where('job_request_messages.sender_id', '!=', $this->id)
            ->where(function ($query) use ($lastReadColumn): void {
                $query
                    ->whereNull("job_requests.{$lastReadColumn}")
                    ->orWhereColumn(
                        'job_request_messages.created_at',
                        '>',
                        "job_requests.{$lastReadColumn}",
                    );
            })
            ->count();
    }

    public function writtenProviderReviews(): HasMany
    {
        return $this->hasMany(ProviderReview::class, 'customer_id');
    }

    public function receivedProviderReviews(): HasMany
    {
        return $this->hasMany(ProviderReview::class, 'provider_id')
            ->published()
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

    public function isDeletedAccount(): bool
    {
        return $this->status === 'deleted' || $this->anonymized_at !== null;
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_secret !== null && $this->two_factor_confirmed_at !== null;
    }

    public function requiresTwoFactor(): bool
    {
        return $this->isAdmin() || $this->hasTwoFactorEnabled();
    }

    public function profilePhotoUrl(): ?string
    {
        if (! $this->profile_photo_path) {
            return null;
        }

        return route('users.avatar', ['user' => $this->id, 'v' => $this->updated_at?->timestamp]);
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

    /**
     * @return array<int, string>
     */
    public function verifiedTradeCategoryNames(): array
    {
        if (! $this->providerProfile) {
            return [];
        }

        $categories = $this->providerProfile->relationLoaded('verifiedTradeCategories')
            ? $this->providerProfile->verifiedTradeCategories
            : $this->providerProfile->verifiedTradeCategories()->get();

        $names = $categories
            ->pluck('trade_category')
            ->filter()
            ->values()
            ->all();

        if ($names === [] && $this->providerProfile->verification_status === 'verified') {
            return [$this->providerProfile->trade_category];
        }

        return $names;
    }

    public function hasVerifiedTradeCategory(string $tradeCategory): bool
    {
        return in_array($tradeCategory, $this->verifiedTradeCategoryNames(), true);
    }
}
