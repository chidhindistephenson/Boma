<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\JobRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $shortlistedProviders = [];
        $customerJobRequests = [];
        $providerJobRequests = [];
        $providerSummary = null;
        $platformSummary = null;
        $adminQueues = null;

        if ($user->isCustomer()) {
            $shortlistedProviders = $user->shortlistedProviders()
                ->directoryVisible(false)
                ->with('providerProfile')
                ->withCount('receivedProviderReviews')
                ->withAvg('receivedProviderReviews as average_rating', 'rating')
                ->latest('shortlisted_providers.created_at')
                ->limit(5)
                ->get()
                ->map(function (User $provider): array {
                    return [
                        'id' => $provider->id,
                        'businessName' => $provider->providerProfile->business_name,
                        'category' => $provider->providerProfile->trade_category,
                        'locationLabel' => implode(', ', array_values(array_filter([
                            $provider->area,
                            $provider->city,
                        ]))),
                        'availabilityStatus' => $provider->providerProfile->availability_status,
                        'verificationStatus' => $provider->providerProfile->verification_status,
                        'averageRating' => $provider->average_rating !== null
                            ? round((float) $provider->average_rating, 1)
                            : null,
                        'reviewCount' => $provider->received_provider_reviews_count,
                    ];
                })
                ->all();

            $customerJobRequests = $user->customerJobRequests()
                ->with([
                    'provider.providerProfile',
                    'sourceRequest.provider.providerProfile',
                    'messages',
                    'review',
                    'quote',
                    'schedule',
                    'payment',
                ])
                ->latest()
                ->limit(5)
                ->get()
                ->map(function (JobRequest $jobRequest) use ($user): array {
                    return [
                        'id' => $jobRequest->id,
                        'title' => $jobRequest->title,
                        'category' => $jobRequest->trade_category,
                        'status' => $jobRequest->status,
                        'urgency' => $jobRequest->urgency,
                        'locationLabel' => implode(', ', array_values(array_filter([
                            $jobRequest->area,
                            $jobRequest->city,
                        ]))),
                        'providerLabel' => $jobRequest->provider?->providerProfile?->business_name
                            ?? 'Open request',
                        'sourceRequestId' => $jobRequest->sourceRequest?->id,
                        'sourceRequestTitle' => $jobRequest->sourceRequest?->title,
                        'messageCount' => $jobRequest->messages->count(),
                        'unreadCount' => $jobRequest->unreadCountFor($user),
                        'canReview' => $jobRequest->canBeReviewedBy($user),
                        'hasReview' => $jobRequest->review !== null,
                        'reviewRating' => $jobRequest->review?->rating,
                        'hasQuote' => $jobRequest->quote !== null,
                        'quoteStatus' => $jobRequest->quote?->status,
                        'quoteAmount' => $jobRequest->quote?->amount,
                        'quoteNeedsResponse' => $jobRequest->canQuoteBeRespondedToBy($user),
                        'hasSchedule' => $jobRequest->schedule !== null,
                        'scheduleStatus' => $jobRequest->schedule?->status,
                        'scheduledFor' => $jobRequest->schedule?->scheduled_for?->toDateTimeString(),
                        'scheduleNeedsResponse' => $jobRequest->canRespondToSchedule($user),
                        'hasPayment' => $jobRequest->payment !== null,
                        'paymentStatus' => $jobRequest->payment?->status,
                        'paymentAmount' => $jobRequest->payment?->amount,
                        'paymentNeedsUpdate' => $jobRequest->payment?->status === 'revision_requested',
                    ];
                })
                ->all();
        }

        if ($user->isProvider()) {
            $user->loadMissing('providerProfile.services');
            $user->loadCount('shortlistedByCustomers');
            $reviewCount = $user->receivedProviderReviews()->count();
            $averageRating = $reviewCount > 0
                ? round((float) $user->receivedProviderReviews()->avg('rating'), 1)
                : null;
            $recentReviews = $user->receivedProviderReviews()
                ->with('customer')
                ->latest()
                ->limit(3)
                ->get()
                ->map(function ($review): array {
                    return [
                        'id' => $review->id,
                        'rating' => $review->rating,
                        'headline' => $review->headline,
                        'body' => $review->body,
                        'customerName' => $review->customer->name,
                        'createdAt' => $review->created_at->toDateTimeString(),
                    ];
                })
                ->all();

            $providerJobRequests = $user->providerJobRequests()
                ->with(['customer', 'sourceRequest', 'messages', 'quote', 'schedule', 'payment'])
                ->latest()
                ->limit(5)
                ->get()
                ->map(function (JobRequest $jobRequest) use ($user): array {
                    return [
                        'id' => $jobRequest->id,
                        'title' => $jobRequest->title,
                        'category' => $jobRequest->trade_category,
                        'status' => $jobRequest->status,
                        'urgency' => $jobRequest->urgency,
                        'customerName' => $jobRequest->customer->name,
                        'sourceRequestId' => $jobRequest->sourceRequest?->id,
                        'sourceRequestTitle' => $jobRequest->sourceRequest?->title,
                        'locationLabel' => implode(', ', array_values(array_filter([
                            $jobRequest->area,
                            $jobRequest->city,
                        ]))),
                        'messageCount' => $jobRequest->messages->count(),
                        'unreadCount' => $jobRequest->unreadCountFor($user),
                        'hasQuote' => $jobRequest->quote !== null,
                        'quoteStatus' => $jobRequest->quote?->status,
                        'quoteAmount' => $jobRequest->quote?->amount,
                        'hasSchedule' => $jobRequest->schedule !== null,
                        'scheduleStatus' => $jobRequest->schedule?->status,
                        'scheduledFor' => $jobRequest->schedule?->scheduled_for?->toDateTimeString(),
                        'hasPayment' => $jobRequest->payment !== null,
                        'paymentStatus' => $jobRequest->payment?->status,
                        'paymentAmount' => $jobRequest->payment?->amount,
                    ];
                })
                ->all();

            $providerSummary = [
                'serviceCount' => $user->providerProfile?->services->count() ?? 0,
                'shortlistedByCustomersCount' => $user->shortlisted_by_customers_count,
                'profileVisible' => $user->isDirectoryVisible(true),
                'basePriceFrom' => $user->providerProfile?->base_price_from,
                'responseTimeLabel' => $user->providerProfile?->response_time_label,
                'availabilityStatus' => $user->providerProfile?->availability_status,
                'reviewCount' => $reviewCount,
                'averageRating' => $averageRating,
                'recentReviews' => $recentReviews,
                'quotesPendingResponse' => $user->providerJobRequests()
                    ->whereHas('quote', fn ($query) => $query->where('status', 'pending'))
                    ->count(),
                'acceptedQuotes' => $user->providerJobRequests()
                    ->whereHas('quote', fn ($query) => $query->where('status', 'accepted'))
                    ->count(),
                'proposedSchedules' => $user->providerJobRequests()
                    ->whereHas('schedule', fn ($query) => $query->where('status', 'proposed'))
                    ->count(),
                'confirmedSchedules' => $user->providerJobRequests()
                    ->whereHas('schedule', fn ($query) => $query->where('status', 'confirmed'))
                    ->count(),
                'paymentsPendingConfirmation' => $user->providerJobRequests()
                    ->whereHas('payment', fn ($query) => $query->where('status', 'submitted'))
                    ->count(),
                'confirmedPayments' => $user->providerJobRequests()
                    ->whereHas('payment', fn ($query) => $query->where('status', 'confirmed'))
                    ->count(),
            ];
        }

        if ($user->isAdmin()) {
            $pendingProviders = User::query()
                ->where('role', 'provider')
                ->whereHas('providerProfile', fn ($query) => $query->where('verification_status', 'pending'))
                ->with(['providerProfile.verificationDocuments', 'providerProfile.services'])
                ->withCount('shortlistedByCustomers')
                ->orderByDesc('provider_profiles.verification_submitted_at')
                ->join('provider_profiles', 'provider_profiles.user_id', '=', 'users.id')
                ->select('users.*')
                ->limit(4)
                ->get()
                ->map(function (User $provider): array {
                    return [
                        'id' => $provider->id,
                        'providerName' => $provider->name,
                        'businessName' => $provider->providerProfile?->business_name ?? $provider->name,
                        'tradeCategory' => $provider->providerProfile?->trade_category,
                        'locationLabel' => implode(', ', array_values(array_filter([
                            $provider->area,
                            $provider->city,
                        ]))),
                        'submittedAt' => $provider->providerProfile?->verification_submitted_at?->toDateTimeString(),
                        'documentCount' => $provider->providerProfile?->verificationDocuments?->count() ?? 0,
                        'shortlistedByCustomersCount' => $provider->shortlisted_by_customers_count,
                        'serviceCount' => $provider->providerProfile?->services?->count() ?? 0,
                    ];
                })
                ->all();

            $requestAlerts = JobRequest::query()
                ->with(['customer', 'provider.providerProfile', 'quote', 'payment'])
                ->where(function ($query): void {
                    $query
                        ->whereNull('provider_id')
                        ->orWhere(function ($targetedQuery): void {
                            $targetedQuery
                                ->whereNotNull('provider_id')
                                ->whereIn('status', ['targeted', 'in_conversation'])
                                ->whereDoesntHave('quote');
                        })
                        ->orWhereHas('payment', fn ($paymentQuery) => $paymentQuery->where('status', 'submitted'));
                })
                ->latest()
                ->limit(5)
                ->get()
                ->map(function (JobRequest $jobRequest): array {
                    $alertLabel = 'Open and unassigned';

                    if ($jobRequest->payment?->status === 'submitted') {
                        $alertLabel = 'Payment awaiting confirmation';
                    } elseif ($jobRequest->provider_id !== null && $jobRequest->quote === null) {
                        $alertLabel = 'Targeted without quote';
                    }

                    return [
                        'id' => $jobRequest->id,
                        'title' => $jobRequest->title,
                        'status' => $jobRequest->status,
                        'urgency' => $jobRequest->urgency,
                        'customerName' => $jobRequest->customer->name,
                        'providerLabel' => $jobRequest->provider?->providerProfile?->business_name
                            ?? 'Open request',
                        'locationLabel' => implode(', ', array_values(array_filter([
                            $jobRequest->area,
                            $jobRequest->city,
                        ]))),
                        'alertLabel' => $alertLabel,
                        'createdAt' => $jobRequest->created_at->toDateTimeString(),
                    ];
                })
                ->all();

            $recentModeration = User::query()
                ->with('suspendedBy')
                ->whereNotNull('suspended_at')
                ->latest('suspended_at')
                ->limit(4)
                ->get()
                ->map(function (User $moderatedUser): array {
                    return [
                        'id' => $moderatedUser->id,
                        'name' => $moderatedUser->name,
                        'role' => $moderatedUser->role,
                        'status' => $moderatedUser->status,
                        'suspendedAt' => $moderatedUser->suspended_at?->toDateTimeString(),
                        'suspendedByName' => $moderatedUser->suspendedBy?->name,
                        'suspensionReason' => $moderatedUser->suspension_reason,
                    ];
                })
                ->all();

            $platformSummary = [
                'verifiedProviders' => User::query()->directoryVisible(true)->count(),
                'totalUsers' => User::query()->count(),
                'activeCustomers' => User::query()
                    ->where('role', 'customer')
                    ->where('status', 'active')
                    ->count(),
                'suspendedUsers' => User::query()->whereNotNull('suspended_at')->count(),
                'shortlists' => DB::table('shortlisted_providers')->count(),
                'categories' => User::query()
                    ->directoryVisible(true)
                    ->join('provider_profiles', 'provider_profiles.user_id', '=', 'users.id')
                    ->distinct('provider_profiles.trade_category')
                    ->count('provider_profiles.trade_category'),
                'jobRequests' => JobRequest::query()->count(),
                'unassignedRequests' => JobRequest::query()->whereNull('provider_id')->count(),
                'targetedWithoutQuote' => JobRequest::query()
                    ->whereNotNull('provider_id')
                    ->whereIn('status', ['targeted', 'in_conversation'])
                    ->whereDoesntHave('quote')
                    ->count(),
                'paymentsAwaitingConfirmation' => JobRequest::query()
                    ->whereHas('payment', fn ($query) => $query->where('status', 'submitted'))
                    ->count(),
                'pendingProviderVerifications' => User::query()
                    ->where('role', 'provider')
                    ->whereHas('providerProfile', fn ($query) => $query->where('verification_status', 'pending'))
                    ->count(),
                'rejectedProviders' => User::query()
                    ->where('role', 'provider')
                    ->whereHas('providerProfile', fn ($query) => $query->where('verification_status', 'rejected'))
                    ->count(),
            ];

            $adminQueues = [
                'pendingProviders' => $pendingProviders,
                'requestAlerts' => $requestAlerts,
                'recentModeration' => $recentModeration,
            ];
        }

        return Inertia::render('Dashboard', [
            'platformSummary' => $platformSummary,
            'shortlistedProviders' => $shortlistedProviders,
            'customerJobRequests' => $customerJobRequests,
            'providerJobRequests' => $providerJobRequests,
            'providerSummary' => $providerSummary,
            'adminQueues' => $adminQueues,
        ]);
    }
}
