<?php

namespace App\Services;

use App\Models\ProviderProfile;
use App\Models\ProviderSubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class SubscriptionService
{
    public function __construct(private readonly WalletService $wallets) {}

    public function plans()
    {
        return SubscriptionPlan::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('price')
            ->get();
    }

    public function currentPlan(ProviderProfile $profile): ?SubscriptionPlan
    {
        $profile->loadMissing('activeSubscription.plan');

        if ($profile->activeSubscription?->isUsable()) {
            return $profile->activeSubscription->plan;
        }

        return SubscriptionPlan::query()
            ->where('code', $profile->subscription_tier ?: 'basic_trial')
            ->first()
            ?? SubscriptionPlan::query()->orderBy('sort_order')->first();
    }

    public function entitlements(ProviderProfile $profile): array
    {
        $plan = $this->currentPlan($profile);

        return [
            'planCode' => $plan?->code ?? 'none',
            'planName' => $plan?->name ?? 'No plan',
            'serviceLimit' => $plan?->service_limit ?? 0,
            'portfolioLimit' => $plan?->portfolio_limit ?? 0,
            'featuredServiceLimit' => $plan?->featured_service_limit ?? 0,
            'tradeCategoryLimit' => $plan?->trade_category_limit ?? 1,
            'hasPremiumAnalytics' => (bool) ($plan?->has_premium_analytics ?? false),
        ];
    }

    public function subscribe(User $provider, SubscriptionPlan $plan): ProviderSubscription
    {
        $profile = $provider->providerProfile;

        if (! $provider->isProvider() || ! $profile) {
            throw ValidationException::withMessages([
                'plan' => 'Only provider accounts can manage subscriptions.',
            ]);
        }

        if (! $plan->is_active) {
            throw ValidationException::withMessages([
                'plan' => 'Choose an active subscription plan.',
            ]);
        }

        return DB::transaction(function () use ($provider, $profile, $plan): ProviderSubscription {
            $transaction = null;

            if ($plan->price > 0) {
                try {
                    $transaction = $this->wallets->debit(
                        $provider,
                        $plan->price,
                        'subscription_payment',
                        "Boma {$plan->name} subscription",
                        ['subscription_plan_id' => $plan->id, 'plan_code' => $plan->code],
                        $plan->currency,
                    );
                } catch (RuntimeException $exception) {
                    throw ValidationException::withMessages([
                        'plan' => $exception->getMessage(),
                    ]);
                }
            }

            $profile->subscriptions()
                ->whereIn('status', ['trialing', 'active', 'past_due'])
                ->update([
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                    'auto_renews' => false,
                ]);

            $subscription = $profile->subscriptions()->create([
                'subscription_plan_id' => $plan->id,
                'wallet_transaction_id' => $transaction?->id,
                'status' => $plan->trial_days > 0 && $plan->price === 0 ? 'trialing' : 'active',
                'amount' => $plan->price,
                'currency' => $plan->currency,
                'starts_at' => now(),
                'trial_ends_at' => $plan->trial_days > 0 ? now()->addDays($plan->trial_days) : null,
                'current_period_ends_at' => now()->addMonth(),
                'auto_renews' => true,
                'metadata' => [
                    'service_limit' => $plan->service_limit,
                    'featured_service_limit' => $plan->featured_service_limit,
                    'portfolio_limit' => $plan->portfolio_limit,
                    'trade_category_limit' => $plan->trade_category_limit,
                ],
            ]);

            $profile->forceFill([
                'subscription_tier' => $plan->code,
                'trial_ends_at' => $subscription->trial_ends_at,
            ])->save();

            return $subscription;
        });
    }

    public function cancel(ProviderProfile $profile): void
    {
        $profile->subscriptions()
            ->whereIn('status', ['trialing', 'active', 'past_due'])
            ->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'auto_renews' => false,
            ]);
    }

    public function ensureServiceLimit(ProviderProfile $profile): void
    {
        $limit = $this->entitlements($profile)['serviceLimit'];

        if ($profile->services()->count() >= $limit) {
            throw ValidationException::withMessages([
                'title' => "Your current subscription allows {$limit} service package(s). Upgrade to add more.",
            ]);
        }
    }

    public function ensureFeaturedServiceLimit(ProviderProfile $profile, bool $willFeature, ?int $exceptServiceId = null): void
    {
        if (! $willFeature) {
            return;
        }

        $limit = $this->entitlements($profile)['featuredServiceLimit'];
        $query = $profile->services()->where('is_featured', true);

        if ($exceptServiceId) {
            $query->whereKeyNot($exceptServiceId);
        }

        if ($query->count() >= $limit) {
            throw ValidationException::withMessages([
                'is_featured' => "Your current subscription allows {$limit} featured service(s). Upgrade for more featured placement.",
            ]);
        }
    }

    public function ensurePortfolioLimit(ProviderProfile $profile): void
    {
        $limit = $this->entitlements($profile)['portfolioLimit'];

        if ($profile->portfolioItems()->count() >= $limit) {
            throw ValidationException::withMessages([
                'media' => "Your current subscription allows {$limit} portfolio item(s). Upgrade to upload more work.",
            ]);
        }
    }

    public function ensureTradeCategoryLimit(ProviderProfile $profile, string $tradeCategory): void
    {
        if ($profile->tradeCategories()->where('trade_category', $tradeCategory)->exists()) {
            return;
        }

        $limit = $this->entitlements($profile)['tradeCategoryLimit'];

        if ($profile->tradeCategories()->count() >= $limit) {
            throw ValidationException::withMessages([
                'trade_category' => "Your current subscription allows {$limit} trade categor".($limit === 1 ? 'y' : 'ies').'. Upgrade to add more.',
            ]);
        }
    }
}
