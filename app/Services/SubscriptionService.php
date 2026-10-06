<?php

namespace App\Services;

use App\Models\ProviderProfile;
use App\Models\ProviderSubscription;
use App\Models\InAppNotification;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class SubscriptionService
{
    public function __construct(
        private readonly WalletService $wallets,
        private readonly FinancialAuditService $audit,
    ) {}

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

            $this->audit->recordSubscription($subscription, 'subscription_activated');

            return $subscription;
        });
    }

    public function cancel(ProviderProfile $profile): void
    {
        $activeSubscriptions = $profile->subscriptions()
            ->whereIn('status', ['trialing', 'active', 'past_due'])
            ->get();

        $profile->subscriptions()
            ->whereIn('status', ['trialing', 'active', 'past_due'])
            ->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'auto_renews' => false,
            ]);

        $profile->forceFill([
            'subscription_tier' => config('localserve.subscriptions.fallback_plan', 'basic_trial'),
            'trial_ends_at' => null,
        ])->save();

        $activeSubscriptions->each(function (ProviderSubscription $subscription): void {
            $this->audit->recordSubscription($subscription->fresh(), 'subscription_cancelled_manual');
        });
    }

    /**
     * @return array{reminded:int, renewed:int, past_due:int, cancelled:int}
     */
    public function processRenewals(): array
    {
        $summary = [
            'reminded' => 0,
            'renewed' => 0,
            'past_due' => 0,
            'cancelled' => 0,
        ];

        $this->sendRenewalReminders($summary);
        $this->renewDueSubscriptions($summary);
        $this->cancelExpiredGraceSubscriptions($summary);

        return $summary;
    }

    /**
     * @param array{reminded:int, renewed:int, past_due:int, cancelled:int} $summary
     */
    private function sendRenewalReminders(array &$summary): void
    {
        $reminderDays = max(1, (int) config('localserve.subscriptions.renewal_reminder_days', 3));
        $windowEnd = now()->addDays($reminderDays);

        ProviderSubscription::query()
            ->with(['providerProfile.user', 'plan'])
            ->whereIn('status', ['trialing', 'active'])
            ->where('auto_renews', true)
            ->whereNotNull('current_period_ends_at')
            ->whereBetween('current_period_ends_at', [now(), $windowEnd])
            ->chunkById(100, function ($subscriptions) use (&$summary): void {
                foreach ($subscriptions as $subscription) {
                    $periodKey = $subscription->current_period_ends_at?->toDateString();
                    $metadata = $subscription->metadata ?? [];

                    if (($metadata['renewal_reminded_for'] ?? null) === $periodKey) {
                        continue;
                    }

                    $user = $subscription->providerProfile?->user;

                    if (! $user) {
                        continue;
                    }

                    InAppNotification::notifyUser(
                        $user,
                        'subscription_renewal_reminder',
                        'Subscription renewal coming up',
                        "{$subscription->plan?->name} renews on {$subscription->current_period_ends_at->toFormattedDateString()}. Keep enough {$subscription->currency} in your wallet.",
                        route('profile.edit', ['section' => 'billing']),
                        'Review billing',
                        [
                            'provider_subscription_id' => $subscription->id,
                            'subscription_plan_id' => $subscription->subscription_plan_id,
                        ],
                    );

                    $subscription->forceFill([
                        'metadata' => [
                            ...$metadata,
                            'renewal_reminded_for' => $periodKey,
                            'renewal_reminded_at' => now()->toDateTimeString(),
                        ],
                    ])->save();

                    $summary['reminded']++;
                }
            });
    }

    /**
     * @param array{reminded:int, renewed:int, past_due:int, cancelled:int} $summary
     */
    private function renewDueSubscriptions(array &$summary): void
    {
        ProviderSubscription::query()
            ->with(['providerProfile.user', 'plan'])
            ->whereIn('status', ['trialing', 'active'])
            ->where('auto_renews', true)
            ->whereNotNull('current_period_ends_at')
            ->where('current_period_ends_at', '<=', now())
            ->chunkById(100, function ($subscriptions) use (&$summary): void {
                foreach ($subscriptions as $subscription) {
                    $this->renewOne($subscription, $summary);
                }
            });
    }

    /**
     * @param array{reminded:int, renewed:int, past_due:int, cancelled:int} $summary
     */
    private function renewOne(ProviderSubscription $subscription, array &$summary): void
    {
        $user = $subscription->providerProfile?->user;
        $plan = $subscription->plan;

        if (! $user || ! $plan) {
            return;
        }

        try {
            $transaction = null;

            if ($plan->price > 0) {
                $transaction = $this->wallets->debit(
                    $user,
                    $plan->price,
                    'subscription_renewal',
                    "Boma {$plan->name} subscription renewal",
                    [
                        'provider_subscription_id' => $subscription->id,
                        'subscription_plan_id' => $plan->id,
                        'plan_code' => $plan->code,
                    ],
                    $plan->currency,
                );
            }

            $metadata = $subscription->metadata ?? [];
            $subscription->forceFill([
                'wallet_transaction_id' => $transaction?->id ?? $subscription->wallet_transaction_id,
                'status' => 'active',
                'amount' => $plan->price,
                'currency' => $plan->currency,
                'current_period_ends_at' => $this->nextPeriodEnd($plan, now()),
                'grace_ends_at' => null,
                'metadata' => [
                    ...$metadata,
                    'last_renewed_at' => now()->toDateTimeString(),
                    'renewal_failures' => 0,
                ],
            ])->save();

            $subscription->providerProfile->forceFill([
                'subscription_tier' => $plan->code,
                'trial_ends_at' => null,
            ])->save();

            $this->audit->recordSubscription($subscription, 'subscription_renewed');

            InAppNotification::notifyUser(
                $user,
                'subscription_renewed',
                'Subscription renewed',
                "{$plan->name} renewed successfully. Your new period ends {$subscription->fresh()->current_period_ends_at->toFormattedDateString()}.",
                route('profile.edit', ['section' => 'billing']),
                'View subscription',
                ['provider_subscription_id' => $subscription->id],
            );

            $summary['renewed']++;
        } catch (RuntimeException $exception) {
            $this->markPastDue($subscription, $exception->getMessage());
            $summary['past_due']++;
        }
    }

    private function markPastDue(ProviderSubscription $subscription, string $reason): void
    {
        $graceDays = max(1, (int) config('localserve.subscriptions.grace_days', 7));
        $metadata = $subscription->metadata ?? [];
        $failures = (int) ($metadata['renewal_failures'] ?? 0) + 1;

        $subscription->forceFill([
            'status' => 'past_due',
            'grace_ends_at' => now()->addDays($graceDays),
            'metadata' => [
                ...$metadata,
                'renewal_failures' => $failures,
                'last_renewal_failure_at' => now()->toDateTimeString(),
                'last_renewal_failure_reason' => $reason,
            ],
        ])->save();

        $user = $subscription->providerProfile?->user;

        if ($user) {
            InAppNotification::notifyUser(
                $user,
                'subscription_payment_failed',
                'Subscription payment failed',
                "We could not renew {$subscription->plan?->name}. Add funds before {$subscription->grace_ends_at->toFormattedDateString()} to avoid losing premium features.",
                route('profile.edit', ['section' => 'billing']),
                'Fund wallet',
                ['provider_subscription_id' => $subscription->id],
            );
        }
    }

    /**
     * @param array{reminded:int, renewed:int, past_due:int, cancelled:int} $summary
     */
    private function cancelExpiredGraceSubscriptions(array &$summary): void
    {
        ProviderSubscription::query()
            ->with(['providerProfile.user', 'plan'])
            ->where('status', 'past_due')
            ->whereNotNull('grace_ends_at')
            ->where('grace_ends_at', '<=', now())
            ->chunkById(100, function ($subscriptions) use (&$summary): void {
                foreach ($subscriptions as $subscription) {
                    $subscription->forceFill([
                        'status' => 'cancelled',
                        'cancelled_at' => now(),
                        'auto_renews' => false,
                    ])->save();

                    $subscription->providerProfile->forceFill([
                        'subscription_tier' => config('localserve.subscriptions.fallback_plan', 'basic_trial'),
                        'trial_ends_at' => null,
                    ])->save();

                    $this->audit->recordSubscription($subscription, 'subscription_cancelled_grace_expired');

                    $user = $subscription->providerProfile?->user;

                    if ($user) {
                        InAppNotification::notifyUser(
                            $user,
                            'subscription_cancelled',
                            'Subscription cancelled',
                            "{$subscription->plan?->name} was cancelled after the grace period ended. Your account has moved to the basic plan.",
                            route('profile.edit', ['section' => 'billing']),
                            'Choose plan',
                            ['provider_subscription_id' => $subscription->id],
                        );
                    }

                    $summary['cancelled']++;
                }
            });
    }

    private function nextPeriodEnd(SubscriptionPlan $plan, Carbon $from): Carbon
    {
        return $plan->billing_interval === 'yearly'
            ? $from->copy()->addYear()
            : $from->copy()->addMonth();
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
