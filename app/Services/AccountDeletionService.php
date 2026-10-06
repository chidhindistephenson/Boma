<?php

namespace App\Services;

use App\Models\ProviderPortfolioItem;
use App\Models\ProviderVerificationDocument;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AccountDeletionService
{
    /**
     * Anonymise personal account data while preserving operational and financial history.
     */
    public function anonymize(User $user, ?User $actor = null, string $reason = 'user_requested'): User
    {
        $filesToDelete = [];

        $user = DB::transaction(function () use ($user, $actor, $reason, &$filesToDelete): User {
            $user = User::query()
                ->with([
                    'customerProfile',
                    'providerProfile.verificationDocuments',
                    'providerProfile.portfolioItems',
                    'providerProfile.services',
                    'providerProfile.tradeCategories',
                ])
                ->lockForUpdate()
                ->findOrFail($user->id);

            if ($user->isDeletedAccount()) {
                return $user;
            }

            if ($user->profile_photo_path) {
                $filesToDelete[] = $user->profile_photo_path;
            }

            $this->purgeCustomerPersonalData($user);
            $this->purgeProviderPersonalData($user, $filesToDelete);

            $user->apiRefreshTokens()->delete();
            $user->paymentMethods()->delete();
            $user->socialAccounts()->delete();
            $user->notificationPreference()->delete();
            $user->inAppNotifications()->delete();
            $user->shortlistedProviders()->detach();
            $user->shortlistedByCustomers()->detach();

            DB::table('sessions')
                ->where('user_id', $user->id)
                ->delete();

            $now = now();
            $retentionDays = max(0, (int) config('localserve.privacy.deleted_account_retention_days', 2555));

            $user->forceFill([
                'name' => 'Deleted user '.$user->id,
                'email' => "deleted-user-{$user->id}@anonymous.boma.local",
                'phone' => '0000000000',
                'status' => 'deleted',
                'city' => 'Retained',
                'area' => null,
                'latitude' => null,
                'longitude' => null,
                'profile_photo_path' => null,
                'password' => Hash::make(Str::random(64)),
                'remember_token' => null,
                'email_verified_at' => null,
                'suspended_at' => null,
                'suspended_by_user_id' => null,
                'suspension_reason' => null,
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'deletion_requested_at' => $user->deletion_requested_at ?? $now,
                'anonymized_at' => $now,
                'retention_until' => $now->copy()->addDays($retentionDays),
                'deletion_reason' => $reason,
            ])->save();

            return $user->refresh();
        });

        foreach (array_unique(array_filter($filesToDelete)) as $path) {
            Storage::disk('local')->delete($path);
        }

        return $user;
    }

    /**
     * @return array{anonymized:int}
     */
    public function enforceRetention(): array
    {
        $anonymized = 0;

        User::query()
            ->where('status', '!=', 'deleted')
            ->whereNotNull('deletion_requested_at')
            ->whereNull('anonymized_at')
            ->where('deletion_requested_at', '<=', now())
            ->chunkById(100, function ($users) use (&$anonymized): void {
                foreach ($users as $user) {
                    $this->anonymize($user, null, 'retention_policy');
                    $anonymized++;
                }
            });

        return ['anonymized' => $anonymized];
    }

    private function purgeCustomerPersonalData(User $user): void
    {
        $user->customerProfile?->forceFill([
            'default_trade_category' => null,
            'default_urgency' => array_key_first(config('localserve.request.urgency_options')),
            'default_budget_min' => null,
            'default_budget_max' => null,
            'location_notes' => null,
        ])->save();
    }

    /**
     * @param array<int, string> $filesToDelete
     */
    private function purgeProviderPersonalData(User $user, array &$filesToDelete): void
    {
        $profile = $user->providerProfile;

        if (! $profile) {
            return;
        }

        $profile->verificationDocuments->each(function (ProviderVerificationDocument $document) use (&$filesToDelete): void {
            $filesToDelete[] = $document->storage_path;
            $document->delete();
        });

        $profile->portfolioItems->each(function (ProviderPortfolioItem $item) use (&$filesToDelete): void {
            $filesToDelete[] = $item->storage_path;
            $item->delete();
        });

        $profile->services()->delete();
        $profile->tradeCategories()->delete();

        $profile->forceFill([
            'business_name' => 'Deleted provider '.$user->id,
            'headline' => null,
            'bio' => 'This provider account has been deleted.',
            'years_experience' => null,
            'base_price_from' => null,
            'response_time_label' => null,
            'service_radius_km' => null,
            'verification_status' => 'rejected',
            'verification_submitted_at' => null,
            'verification_notes' => null,
            'verification_review_notes' => null,
            'verified_at' => null,
            'reviewed_at' => null,
            'reviewed_by_user_id' => null,
            'availability_status' => 'offline',
            'subscription_tier' => config('localserve.subscriptions.fallback_plan', 'basic_trial'),
            'trial_ends_at' => null,
        ])->save();
    }
}
