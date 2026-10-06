<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Services\AccountDeletionService;
use App\Services\SubscriptionService;
use App\Services\SystemSettingsService;
use App\Services\WalletService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(
        Request $request,
        WalletService $wallets,
        SystemSettingsService $settings,
        SubscriptionService $subscriptions,
    ): Response
    {
        $user = $request->user()->load([
            'providerProfile.tradeCategories.reviewedBy',
            'providerProfile.verificationDocuments.reviewedBy',
            'providerProfile.verificationDocuments.replacesDocument',
            'providerProfile.verificationEvents.actor',
            'providerProfile.portfolioItems.providerService',
            'providerProfile.activeSubscription.plan',
            'paymentMethods',
            'wallet.transactions',
            'payoutRequests.reviewedBy',
            'walletDepositRequests.reviewedBy',
            'walletDepositRequests.paymentMethod',
        ]);
        $walletCollection = $wallets->walletsFor($user)->load([
            'transactions' => fn ($query) => $query->latest('id')->limit(8),
        ]);
        $wallet = $walletCollection->firstWhere('currency', config('localserve.payment.wallet_currency'))
            ?? $walletCollection->first();

        return Inertia::render('Profile/Edit', [
            'activeSection' => $this->activeSection($request, $user->role),
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'tradeCategories' => config('localserve.trade_categories'),
            'requestUrgencyOptions' => config('localserve.request.urgency_options'),
            'availabilityOptions' => config('localserve.provider.availability_options'),
            'responseTimeOptions' => config('localserve.provider.response_time_options'),
            'verificationDocumentTypes' => config('localserve.provider.verification_document_types'),
            'providerTradeCategories' => $user->isProvider() && $user->providerProfile
                ? $user->providerProfile->tradeCategories->map(function ($category): array {
                    return [
                        'id' => $category->id,
                        'tradeCategory' => $category->trade_category,
                        'verificationStatus' => $category->verification_status,
                        'submittedAt' => $category->submitted_at?->toDateTimeString(),
                        'verifiedAt' => $category->verified_at?->toDateTimeString(),
                        'reviewedAt' => $category->reviewed_at?->toDateTimeString(),
                        'reviewedByName' => $category->reviewedBy?->name,
                        'reviewNotes' => $category->review_notes,
                    ];
                })->all()
                : [],
            'providerVerificationDocuments' => $user->isProvider() && $user->providerProfile
                ? $user->providerProfile->verificationDocuments->map(function ($document): array {
                    return [
                        'id' => $document->id,
                        'documentType' => $document->document_type,
                        'label' => $document->label,
                        'originalName' => $document->original_name,
                        'sizeBytes' => $document->size_bytes,
                        'verificationStatus' => $document->verification_status,
                        'approvedAt' => $document->approved_at?->toDateTimeString(),
                        'reviewedAt' => $document->reviewed_at?->toDateTimeString(),
                        'reviewedByName' => $document->reviewedBy?->name,
                        'reviewNotes' => $document->review_notes,
                        'replacesDocumentId' => $document->replaces_document_id,
                        'replacesOriginalName' => $document->replacesDocument?->original_name,
                        'uploadedAt' => $document->created_at->toDateTimeString(),
                    ];
                })->all()
                : [],
            'providerVerificationTimeline' => $user->isProvider() && $user->providerProfile
                ? $user->providerProfile->verificationEvents
                    ->take(10)
                    ->map(fn ($event): array => $event->toTimelineEntry())
                    ->all()
                : [],
            'providerPortfolioItems' => $user->isProvider() && $user->providerProfile
                ? $user->providerProfile->portfolioItems->map(fn ($item): array => [
                    'id' => $item->id,
                    'title' => $item->title,
                    'description' => $item->description,
                    'mediaType' => $item->media_type,
                    'mediaUrl' => route('providers.portfolio.media', [$user, $item]),
                    'serviceId' => $item->provider_service_id,
                    'serviceTitle' => $item->providerService?->title,
                    'originalName' => $item->original_name,
                    'sizeBytes' => $item->size_bytes,
                    'sortOrder' => $item->sort_order,
                    'createdAt' => $item->created_at->toDateTimeString(),
                ])->values()->all()
                : [],
            'wallet' => [
                'balance' => $wallet->balance,
                'currency' => $wallet->currency,
                'transactions' => $wallet->transactions->map(fn ($transaction): array => [
                    'id' => $transaction->id,
                    'type' => $transaction->type,
                    'direction' => $transaction->direction,
                    'amount' => $transaction->amount,
                    'currency' => $transaction->currency,
                    'balanceAfter' => $transaction->balance_after,
                    'reference' => $transaction->reference,
                    'description' => $transaction->description,
                    'createdAt' => $transaction->created_at->toDateTimeString(),
                ])->all(),
            ],
            'wallets' => $walletCollection->map(fn ($wallet): array => [
                'id' => $wallet->id,
                'balance' => $wallet->balance,
                'currency' => $wallet->currency,
                'label' => config("localserve.payment.currencies.{$wallet->currency}", $wallet->currency),
                'transactions' => $wallet->transactions->map(fn ($transaction): array => [
                    'id' => $transaction->id,
                    'type' => $transaction->type,
                    'direction' => $transaction->direction,
                    'amount' => $transaction->amount,
                    'currency' => $transaction->currency,
                    'balanceAfter' => $transaction->balance_after,
                    'reference' => $transaction->reference,
                    'description' => $transaction->description,
                    'createdAt' => $transaction->created_at->toDateTimeString(),
                ])->all(),
            ])->values()->all(),
            'currencyOptions' => config('localserve.payment.currencies'),
            'twoFactor' => [
                'enabled' => $user->hasTwoFactorEnabled(),
                'mandatory' => $user->isAdmin(),
                'recoveryCodes' => session('recovery_codes', []),
            ],
            'paymentMethods' => $user->paymentMethods
                ->sortByDesc('is_default')
                ->values()
                ->map(fn ($method): array => [
                    'id' => $method->id,
                    'brand' => $method->brand,
                    'label' => $method->label,
                    'lastFour' => $method->last_four,
                    'expMonth' => $method->exp_month,
                    'expYear' => $method->exp_year,
                    'isDefault' => $method->is_default,
                ])->all(),
            'payoutRequests' => $user->isProvider()
                ? $user->payoutRequests()
                    ->with('reviewedBy')
                    ->latest('id')
                    ->limit(8)
                    ->get()
                    ->map(fn ($payout): array => [
                        'id' => $payout->id,
                        'amount' => $payout->amount,
                        'currency' => $payout->currency,
                        'destinationType' => $payout->destination_type,
                        'destinationLabel' => $payout->destination_label,
                        'accountReference' => $payout->account_reference,
                        'status' => $payout->status,
                        'reviewNotes' => $payout->review_notes,
                        'reviewedByName' => $payout->reviewedBy?->name,
                        'reviewedAt' => $payout->reviewed_at?->toDateTimeString(),
                        'paidAt' => $payout->paid_at?->toDateTimeString(),
                        'settlementReference' => $payout->settlement_reference,
                        'settlementNotes' => $payout->settlement_notes,
                        'createdAt' => $payout->created_at->toDateTimeString(),
                    ])
                    ->all()
                : [],
            'walletDepositRequests' => $user->walletDepositRequests()
                ->with('reviewedBy')
                ->latest('id')
                ->limit(8)
                ->get()
                ->map(fn ($deposit): array => [
                    'id' => $deposit->id,
                    'amount' => $deposit->amount,
                    'currency' => $deposit->currency,
                    'source' => $deposit->source,
                    'reference' => $deposit->reference,
                    'status' => $deposit->status,
                    'paymentMethod' => $deposit->paymentMethod ? [
                        'brand' => $deposit->paymentMethod->brand,
                        'label' => $deposit->paymentMethod->label,
                        'lastFour' => $deposit->paymentMethod->last_four,
                    ] : null,
                    'gatewayProvider' => $deposit->gateway_provider,
                    'gatewayStatus' => $deposit->gateway_status,
                    'gatewayRedirectUrl' => $deposit->gateway_redirect_url,
                    'reviewNotes' => $deposit->review_notes,
                    'reviewedByName' => $deposit->reviewedBy?->name,
                    'reviewedAt' => $deposit->reviewed_at?->toDateTimeString(),
                    'createdAt' => $deposit->created_at->toDateTimeString(),
                ])
                ->all(),
            'payoutDestinationOptions' => config('localserve.payout.destination_options'),
            'subscriptionPlans' => $user->isProvider()
                ? $subscriptions->plans()->map(fn ($plan): array => [
                    'id' => $plan->id,
                    'code' => $plan->code,
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'price' => $plan->price,
                    'currency' => $plan->currency,
                    'billingInterval' => $plan->billing_interval,
                    'trialDays' => $plan->trial_days,
                    'serviceLimit' => $plan->service_limit,
                    'portfolioLimit' => $plan->portfolio_limit,
                    'featuredServiceLimit' => $plan->featured_service_limit,
                    'tradeCategoryLimit' => $plan->trade_category_limit,
                    'hasPremiumAnalytics' => $plan->has_premium_analytics,
                ])->all()
                : [],
            'providerSubscription' => $user->isProvider() && $user->providerProfile
                ? [
                    'entitlements' => $subscriptions->entitlements($user->providerProfile),
                    'current' => $user->providerProfile->activeSubscription ? [
                        'id' => $user->providerProfile->activeSubscription->id,
                        'planCode' => $user->providerProfile->activeSubscription->plan?->code,
                        'planName' => $user->providerProfile->activeSubscription->plan?->name,
                        'status' => $user->providerProfile->activeSubscription->status,
                        'amount' => $user->providerProfile->activeSubscription->amount,
                        'currency' => $user->providerProfile->activeSubscription->currency,
                        'currentPeriodEndsAt' => $user->providerProfile->activeSubscription->current_period_ends_at?->toDateTimeString(),
                        'cancelledAt' => $user->providerProfile->activeSubscription->cancelled_at?->toDateTimeString(),
                        'autoRenews' => $user->providerProfile->activeSubscription->auto_renews,
                    ] : null,
                ]
                : null,
        ]);
    }

    private function activeSection(Request $request, string $role): string
    {
        $available = ['profile', 'billing', 'security', 'danger'];

        if (in_array($role, ['customer', 'provider'], true)) {
            $available[] = 'preferences';
        }

        if ($role === 'provider') {
            $available[] = 'verification';
        }

        $requested = (string) $request->query('section', 'profile');

        return in_array($requested, $available, true) ? $requested : 'profile';
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request, SystemSettingsService $settings): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'city' => $validated['city'],
            'area' => $validated['area'] ?? null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
        ]);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        DB::transaction(function () use ($user, $validated, $settings): void {
            $user->save();

            if ($user->isProvider()) {
                $currentProviderProfile = $user->providerProfile;

                $profile = $user->providerProfile()->updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'business_name' => $validated['business_name'],
                        'headline' => ($validated['headline'] ?? null) ?: null,
                        'trade_category' => $validated['trade_category'],
                        'bio' => $validated['bio'],
                        'availability_status' => $validated['availability_status']
                            ?? $currentProviderProfile?->availability_status
                            ?? 'available',
                        'years_experience' => $validated['years_experience'] ?? null,
                        'base_price_from' => $validated['base_price_from'] ?? null,
                        'response_time_label' => $validated['response_time_label'] ?? null,
                        'service_radius_km' => $validated['service_radius_km'] ?? null,
                        'verification_notes' => $currentProviderProfile?->verification_status === 'verified'
                            ? $currentProviderProfile->verification_notes
                            : ($validated['verification_notes'] ?? null),
                    ],
                );

                $profile->tradeCategories()->firstOrCreate(
                    ['trade_category' => $validated['trade_category']],
                    [
                        'verification_status' => 'pending',
                        'submitted_at' => now(),
                    ],
                );

                return;
            }

            if ($user->isCustomer()) {
                $user->customerProfile()->updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'preferred_radius_km' => $validated['preferred_radius_km']
                            ?? $user->customerProfile?->preferred_radius_km
                            ?? $settings->defaultSearchRadiusKm(),
                        'default_trade_category' => ($validated['default_trade_category'] ?? null) ?: null,
                        'default_urgency' => $validated['default_urgency']
                            ?? $user->customerProfile?->default_urgency
                            ?? array_key_first(config('localserve.request.urgency_options')),
                        'default_budget_min' => $validated['default_budget_min'] ?? null,
                        'default_budget_max' => $validated['default_budget_max'] ?? null,
                        'location_notes' => ($validated['location_notes'] ?? null) ?: null,
                    ],
                );
            }
        });

        return Redirect::route('profile.edit', array_filter([
            'section' => $validated['section'] ?? null,
        ]));
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request, AccountDeletionService $accounts): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();
        $accounts->anonymize($user, $user, 'user_requested');

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
