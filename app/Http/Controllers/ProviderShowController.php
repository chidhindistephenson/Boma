<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProviderShowController extends Controller
{
    public function __invoke(Request $request, User $provider): Response
    {
        $provider->load([
            'providerProfile.services',
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

        $relatedProviders = User::query()
            ->directoryVisible(true)
            ->with('providerProfile.services')
            ->withCount('receivedProviderReviews')
            ->withAvg('receivedProviderReviews as average_rating', 'rating')
            ->whereKeyNot($provider->id)
            ->whereHas('providerProfile', function ($query) use ($provider): void {
                $query->where('trade_category', $provider->providerProfile->trade_category);
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
                'businessName' => $provider->providerProfile->business_name,
                'headline' => $provider->providerProfile->headline,
                'category' => $provider->providerProfile->trade_category,
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
                'reviews' => $provider->receivedProviderReviews
                    ->take(5)
                    ->map(fn ($review): array => [
                        'id' => $review->id,
                        'rating' => $review->rating,
                        'headline' => $review->headline,
                        'body' => $review->body,
                        'customerName' => $review->customer->name,
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
            'relatedProviders' => $relatedProviders,
        ]);
    }
}
