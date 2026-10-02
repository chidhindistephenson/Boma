<?php

namespace App\Http\Controllers;

use App\Models\JobRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProviderShowController extends Controller
{
    public function __invoke(Request $request, User $provider): Response
    {
        $provider->load([
            'providerProfile.verifiedTradeCategories',
            'providerProfile.services',
            'providerProfile.portfolioItems.providerService',
            'receivedProviderReviews.customer',
        ])->loadCount('receivedProviderReviews');

        $averageRating = $provider->received_provider_reviews_count > 0
            ? round((float) $provider->receivedProviderReviews()->avg('rating'), 1)
            : null;

        $viewer = $request->user();
        $isOwnerPreview = (bool) ($viewer && $viewer->id === $provider->id);
        $isPubliclyVisible = $provider->isDirectoryVisible(false);

        abort_unless($isPubliclyVisible || $isOwnerPreview, 404);

        $canRevealContact = $viewer
            && ($viewer->isCustomer() || $viewer->isAdmin() || $viewer->id === $provider->id);
        $canShortlist = (bool) ($viewer && $viewer->isCustomer());
        $isShortlisted = $canShortlist
            ? $viewer->shortlistedProviders()->whereKey($provider->id)->exists()
            : false;
        $chatRequest = $canShortlist
            ? JobRequest::query()
                ->where('customer_id', $viewer->id)
                ->where('provider_id', $provider->id)
                ->whereIn('status', ['targeted', 'in_conversation', 'accepted'])
                ->latest('id')
                ->first()
            : null;
        $chatMessages = $chatRequest
            ? $chatRequest->messages()
                ->with('sender')
                ->limit(100)
                ->get()
                ->sortBy('id')
                ->values()
            : collect();

        if ($chatRequest && $request->boolean('chat')) {
            $chatRequest->markAsReadFor($viewer);
        }

        $relatedProviders = User::query()
            ->directoryVisible(true)
            ->with(['providerProfile.services', 'providerProfile.verifiedTradeCategories'])
            ->withCount('receivedProviderReviews')
            ->withAvg('receivedProviderReviews as average_rating', 'rating')
            ->whereKeyNot($provider->id)
            ->whereHas('providerProfile', function ($query) use ($provider): void {
                $query->whereHas('verifiedTradeCategories', function ($categoryQuery) use ($provider): void {
                    $categoryQuery->whereIn(
                        'trade_category',
                        $provider->verifiedTradeCategoryNames(),
                    );
                });
            })
            ->latest('users.created_at')
            ->limit(3)
            ->get()
            ->map(function (User $relatedProvider): array {
                return [
                    'id' => $relatedProvider->id,
                    'businessName' => $relatedProvider->providerProfile->business_name,
                    'category' => $relatedProvider->providerProfile->trade_category,
                    'locationLabel' => implode(', ', array_values(array_filter([
                        $relatedProvider->area,
                        $relatedProvider->city,
                    ]))),
                    'availabilityStatus' => $relatedProvider->providerProfile->availability_status,
                    'basePriceFrom' => $relatedProvider->providerProfile->base_price_from,
                    'averageRating' => $relatedProvider->average_rating !== null
                        ? round((float) $relatedProvider->average_rating, 1)
                        : null,
                    'reviewCount' => $relatedProvider->received_provider_reviews_count,
                ];
            })
            ->all();

        return Inertia::render('Providers/Show', [
            'provider' => [
                'id' => $provider->id,
                'providerName' => $provider->name,
                'profilePhotoUrl' => $provider->profilePhotoUrl(),
                'businessName' => $provider->providerProfile->business_name,
                'headline' => $provider->providerProfile->headline,
                'category' => $provider->providerProfile->trade_category,
                'categories' => $provider->verifiedTradeCategoryNames(),
                'bio' => $provider->providerProfile->bio,
                'city' => $provider->city,
                'area' => $provider->area,
                'locationLabel' => implode(', ', array_values(array_filter([
                    $provider->area,
                    $provider->city,
                ]))),
                'phone' => $canRevealContact ? $provider->phone : null,
                'email' => $canRevealContact ? $provider->email : null,
                'availabilityStatus' => $provider->providerProfile->availability_status,
                'verificationStatus' => $provider->providerProfile->verification_status,
                'yearsExperience' => $provider->providerProfile->years_experience,
                'basePriceFrom' => $provider->providerProfile->base_price_from,
                'responseTimeLabel' => $provider->providerProfile->response_time_label,
                'serviceRadiusKm' => $provider->providerProfile->service_radius_km,
                'verifiedAt' => $provider->providerProfile->verified_at?->toDateString(),
                'memberSince' => $provider->created_at->toDateString(),
                'averageRating' => $averageRating,
                'reviewCount' => $provider->received_provider_reviews_count,
                'services' => $provider->providerProfile->services->map(fn ($service): array => [
                    'id' => $service->id,
                    'title' => $service->title,
                    'shortDescription' => $service->short_description,
                    'priceFrom' => $service->price_from,
                    'turnaroundLabel' => $service->turnaround_label,
                    'isFeatured' => $service->is_featured,
                ])->all(),
                'portfolioItems' => $provider->providerProfile->portfolioItems->map(fn ($item): array => [
                    'id' => $item->id,
                    'title' => $item->title,
                    'description' => $item->description,
                    'mediaType' => $item->media_type,
                    'mediaUrl' => route('providers.portfolio.media', [$provider, $item]),
                    'serviceId' => $item->provider_service_id,
                    'serviceTitle' => $item->providerService?->title,
                    'originalName' => $item->original_name,
                    'sizeBytes' => $item->size_bytes,
                    'createdAt' => $item->created_at->toDateTimeString(),
                ])->all(),
                'reviews' => $provider->receivedProviderReviews
                    ->take(12)
                    ->map(fn ($review): array => [
                        'id' => $review->id,
                        'rating' => $review->rating,
                        'headline' => $review->headline,
                        'body' => $review->body,
                        'providerResponse' => $review->provider_response,
                        'respondedAt' => $review->responded_at?->toDateTimeString(),
                        'customerName' => $review->reviewerFirstName(),
                        'canReport' => (bool) ($viewer
                            && ! $viewer->isAdmin()
                            && $viewer->id !== $review->customer_id),
                        'createdAt' => $review->created_at->toDateTimeString(),
                    ])
                    ->values()
                    ->all(),
            ],
            'canRevealContact' => $canRevealContact,
            'canShortlist' => $canShortlist,
            'isShortlisted' => $isShortlisted,
            'isOwnerPreview' => $isOwnerPreview,
            'isPubliclyVisible' => $isPubliclyVisible,
            'chatThread' => $chatRequest ? [
                'id' => $chatRequest->id,
                'canMessage' => $chatRequest->canMessage($viewer),
                'isMuted' => $chatRequest->chat_muted_at !== null,
                'otherReadAt' => $chatRequest->provider_last_read_at?->toISOString(),
                'messages' => $chatMessages->map(fn ($message): array => [
                    'id' => $message->id,
                    'body' => $message->body,
                    'isOwn' => $message->sender_id === $viewer->id,
                    'attachment' => $message->attachment_path ? [
                        'url' => route('requests.messages.media', [$chatRequest, $message]),
                        'name' => $message->attachment_original_name,
                        'mimeType' => $message->attachment_mime_type,
                        'sizeBytes' => $message->attachment_size_bytes,
                        'isImage' => str_starts_with(
                            $message->attachment_mime_type ?? '',
                            'image/',
                        ),
                    ] : null,
                    'createdAt' => $message->created_at->toDateTimeString(),
                ])->all(),
            ] : null,
            'shouldOpenChat' => $canShortlist && $request->boolean('chat'),
            'relatedProviders' => $relatedProviders,
            'reviewReportReasons' => config('localserve.reviews.report_reasons'),
        ]);
    }
}
