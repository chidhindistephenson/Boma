<?php

namespace App\Http\Middleware;

use App\Http\Controllers\NotificationController;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user()?->loadMissing([
            'customerProfile',
            'providerProfile.reviewedBy',
            'providerProfile.services',
        ]);

        if ($user?->isCustomer()) {
            $user->loadCount('shortlistedProviders');
        }

        if ($user?->isProvider()) {
            $user->loadCount('shortlistedByCustomers');
        }

        $notificationSummary = $user ? [
            'unreadCount' => $user->inAppNotifications()->whereNull('read_at')->count(),
            'recent' => $user->inAppNotifications()
                ->limit(5)
                ->get()
                ->map(fn ($notification): array => NotificationController::notificationPayload($notification))
                ->all(),
        ] : [
            'unreadCount' => 0,
            'recent' => [],
        ];

        return [
            ...parent::share($request),
            'auth' => [
                'notifications' => $notificationSummary,
                'messages' => [
                    'unreadCount' => $user?->unreadConversationMessageCount() ?? 0,
                ],
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'status' => $user->status,
                    'city' => $user->city,
                    'area' => $user->area,
                    'latitude' => $user->latitude,
                    'longitude' => $user->longitude,
                    'profilePhotoUrl' => $user->profilePhotoUrl(),
                    'createdAt' => $user->created_at?->toDateTimeString(),
                    'email_verified_at' => $user->email_verified_at,
                    'shortlistedProvidersCount' => $user->isCustomer()
                        ? $user->shortlisted_providers_count
                        : 0,
                    'shortlistedByCustomersCount' => $user->isProvider()
                        ? $user->shortlisted_by_customers_count
                        : 0,
                    'customerProfile' => $user->customerProfile ? [
                        'preferredRadiusKm' => $user->customerProfile->preferred_radius_km,
                        'defaultTradeCategory' => $user->customerProfile->default_trade_category,
                        'defaultUrgency' => $user->customerProfile->default_urgency,
                        'defaultBudgetMin' => $user->customerProfile->default_budget_min,
                        'defaultBudgetMax' => $user->customerProfile->default_budget_max,
                        'locationNotes' => $user->customerProfile->location_notes,
                    ] : null,
                    'providerProfile' => $user->providerProfile ? [
                        'businessName' => $user->providerProfile->business_name,
                        'headline' => $user->providerProfile->headline,
                        'tradeCategory' => $user->providerProfile->trade_category,
                        'bio' => $user->providerProfile->bio,
                        'yearsExperience' => $user->providerProfile->years_experience,
                        'basePriceFrom' => $user->providerProfile->base_price_from,
                        'responseTimeLabel' => $user->providerProfile->response_time_label,
                        'serviceRadiusKm' => $user->providerProfile->service_radius_km,
                        'verificationStatus' => $user->providerProfile->verification_status,
                        'verificationSubmittedAt' => $user->providerProfile->verification_submitted_at?->toDateTimeString(),
                        'verificationNotes' => $user->providerProfile->verification_notes,
                        'verificationReviewNotes' => $user->providerProfile->verification_review_notes,
                        'availabilityStatus' => $user->providerProfile->availability_status,
                        'verifiedAt' => $user->providerProfile->verified_at?->toDateTimeString(),
                        'reviewedAt' => $user->providerProfile->reviewed_at?->toDateTimeString(),
                        'reviewedByName' => $user->providerProfile->reviewedBy?->name,
                        'subscriptionTier' => $user->providerProfile->subscription_tier,
                        'trialEndsAt' => $user->providerProfile->trial_ends_at,
                        'servicesCount' => $user->providerProfile->services->count(),
                    ] : null,
                ] : null,
            ],
        ];
    }
}
