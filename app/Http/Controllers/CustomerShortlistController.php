<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CustomerShortlistController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $customer = $request->user();

        abort_unless($customer->isCustomer(), 403);

        $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', Rule::in(config('localserve.trade_categories'))],
            'city' => ['nullable', 'string', 'max:120'],
            'availability' => [
                'nullable',
                'string',
                Rule::in(['any', ...config('localserve.provider.availability_options')]),
            ],
        ]);

        $filters = [
            'q' => trim($request->string('q')->toString()),
            'category' => trim($request->string('category')->toString()),
            'city' => trim($request->string('city')->toString()),
            'availability' => $request->string('availability')->toString() ?: 'any',
        ];

        $baseQuery = $customer->shortlistedProviders()->directoryVisible(false);

        $cityOptions = (clone $baseQuery)
            ->select('users.city')
            ->whereNotNull('users.city')
            ->distinct()
            ->orderBy('users.city')
            ->pluck('users.city')
            ->all();

        $providers = (clone $baseQuery)
            ->with(['providerProfile.services'])
            ->withCount('receivedProviderReviews')
            ->withAvg('receivedProviderReviews as average_rating', 'rating')
            ->when($filters['category'] !== '', function (Builder $query) use ($filters): void {
                $query->whereHas('providerProfile', function (Builder $providerQuery) use ($filters): void {
                    $providerQuery->where('trade_category', $filters['category']);
                });
            })
            ->when($filters['city'] !== '', function (Builder $query) use ($filters): void {
                $query->whereRaw('LOWER(users.city) = ?', [Str::lower($filters['city'])]);
            })
            ->when($filters['availability'] !== 'any', function (Builder $query) use ($filters): void {
                $query->whereHas('providerProfile', function (Builder $providerQuery) use ($filters): void {
                    $providerQuery->where('availability_status', $filters['availability']);
                });
            })
            ->when($filters['q'] !== '', function (Builder $query) use ($filters): void {
                $like = '%'.Str::lower($filters['q']).'%';

                $query->where(function (Builder $searchQuery) use ($like): void {
                    $searchQuery
                        ->whereRaw('LOWER(users.name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(users.city) LIKE ?', [$like])
                        ->orWhereRaw("LOWER(COALESCE(users.area, '')) LIKE ?", [$like])
                        ->orWhereHas('providerProfile', function (Builder $providerQuery) use ($like): void {
                            $providerQuery
                                ->whereRaw('LOWER(business_name) LIKE ?', [$like])
                                ->orWhereRaw("LOWER(COALESCE(headline, '')) LIKE ?", [$like])
                                ->orWhereRaw('LOWER(trade_category) LIKE ?', [$like]);
                        })
                        ->orWhereHas('providerProfile.services', function (Builder $serviceQuery) use ($like): void {
                            $serviceQuery
                                ->whereRaw('LOWER(title) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(short_description) LIKE ?', [$like]);
                        });
                });
            })
            ->latest('shortlisted_providers.created_at')
            ->paginate(9)
            ->withQueryString()
            ->through(function (User $provider): array {
                $profile = $provider->providerProfile;

                return [
                    'id' => $provider->id,
                    'providerName' => $provider->name,
                    'businessName' => $profile->business_name,
                    'headline' => $profile->headline,
                    'category' => $profile->trade_category,
                    'locationLabel' => implode(', ', array_values(array_filter([
                        $provider->area,
                        $provider->city,
                    ]))),
                    'availabilityStatus' => $profile->availability_status,
                    'verificationStatus' => $profile->verification_status,
                    'basePriceFrom' => $profile->base_price_from,
                    'responseTimeLabel' => $profile->response_time_label,
                    'averageRating' => $provider->average_rating !== null
                        ? round((float) $provider->average_rating, 1)
                        : null,
                    'reviewCount' => $provider->received_provider_reviews_count,
                    'featuredServices' => $profile->services
                        ->take(2)
                        ->pluck('title')
                        ->values()
                        ->all(),
                    'shortlistedAt' => $provider->pivot?->created_at?->toDateTimeString(),
                ];
            });

        return Inertia::render('Customers/Shortlist', [
            'filters' => $filters,
            'categories' => config('localserve.trade_categories'),
            'cities' => $cityOptions,
            'availabilityOptions' => config('localserve.provider.availability_options'),
            'providers' => $providers,
        ]);
    }
}
