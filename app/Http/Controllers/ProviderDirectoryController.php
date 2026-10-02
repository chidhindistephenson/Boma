<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\SystemSettingsService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProviderDirectoryController extends Controller
{
    public function __invoke(Request $request, SystemSettingsService $settings): Response
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', Rule::in(config('localserve.trade_categories'))],
            'city' => ['nullable', 'string', 'max:120'],
            'availability' => [
                'nullable',
                'string',
                Rule::in(['any', ...config('localserve.provider.availability_options')]),
            ],
            'verified' => ['nullable', 'boolean'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'radius' => ['nullable', 'integer', 'min:1', 'max:250'],
            'sort' => ['nullable', 'string', Rule::in(['newest', 'distance', 'rating'])],
        ]);

        $latitude = $request->filled('latitude') ? $request->float('latitude') : null;
        $longitude = $request->filled('longitude') ? $request->float('longitude') : null;
        $hasSearchLocation = $latitude !== null && $longitude !== null;
        $requestedSort = $request->string('sort')->toString() ?: 'newest';

        $filters = [
            'q' => trim($request->string('q')->toString()),
            'category' => trim($request->string('category')->toString()),
            'city' => trim($request->string('city')->toString()),
            'availability' => $request->string('availability')->toString() ?: 'any',
            'verified' => $request->boolean('verified', true),
            'latitude' => $latitude,
            'longitude' => $longitude,
            'radius' => $request->integer('radius', $settings->defaultSearchRadiusKm()),
            'sort' => $requestedSort === 'distance' && ! $hasSearchLocation
                ? 'newest'
                : $requestedSort,
        ];

        $baseQuery = User::query()->directoryVisible($filters['verified']);

        $cityOptions = (clone $baseQuery)
            ->select('city')
            ->whereNotNull('city')
            ->distinct()
            ->orderBy('city')
            ->pluck('city')
            ->all();

        $directoryQuery = (clone $baseQuery)
            ->with(['providerProfile.services', 'providerProfile.verifiedTradeCategories'])
            ->when($filters['category'] !== '', function (Builder $query) use ($filters): void {
                $query->whereHas('providerProfile', function (Builder $providerQuery) use ($filters): void {
                    $providerQuery->where(function (Builder $categoryScope) use ($filters): void {
                        $categoryScope
                            ->whereHas('verifiedTradeCategories', function (Builder $categoryQuery) use ($filters): void {
                                $categoryQuery->where('trade_category', $filters['category']);
                            })
                            ->orWhere(function (Builder $legacyCategoryQuery) use ($filters): void {
                                $legacyCategoryQuery
                                    ->where('verification_status', 'verified')
                                    ->where('trade_category', $filters['category'])
                                    ->whereDoesntHave('verifiedTradeCategories');
                            });
                    });
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
                                ->orWhereRaw('LOWER(trade_category) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(bio) LIKE ?', [$like])
                                ->orWhereHas('verifiedTradeCategories', function (Builder $categoryQuery) use ($like): void {
                                    $categoryQuery->whereRaw('LOWER(trade_category) LIKE ?', [$like]);
                                });
                        })
                        ->orWhereHas('providerProfile.services', function (Builder $serviceQuery) use ($like): void {
                            $serviceQuery
                                ->whereRaw('LOWER(title) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(short_description) LIKE ?', [$like])
                                ->orWhereRaw("LOWER(COALESCE(turnaround_label, '')) LIKE ?", [$like]);
                        });
                });
            });

        if ($hasSearchLocation) {
            [$distanceSql, $distanceBindings] = $this->distanceExpression($latitude, $longitude);

            $directoryQuery
                ->whereNotNull('users.latitude')
                ->whereNotNull('users.longitude')
                ->select('users.*')
                ->selectRaw("{$distanceSql} AS distance_km", $distanceBindings);

            if (DB::getDriverName() === 'pgsql') {
                $directoryQuery->whereRaw(
                    'earth_box(ll_to_earth(?, ?), ?) @> ll_to_earth(users.latitude, users.longitude)',
                    [$latitude, $longitude, $filters['radius'] * 1000],
                );
            }

            $directoryQuery->whereRaw(
                "{$distanceSql} <= ?",
                [...$distanceBindings, $filters['radius']],
            );
        }

        $directoryQuery
            ->withCount('receivedProviderReviews')
            ->withAvg('receivedProviderReviews as average_rating', 'rating');

        match ($filters['sort']) {
            'distance' => $directoryQuery->orderBy('distance_km')->orderBy('users.name'),
            'rating' => $directoryQuery
                ->orderByDesc('average_rating')
                ->orderByDesc('received_provider_reviews_count')
                ->orderBy('users.name'),
            default => $directoryQuery->latest('users.created_at'),
        };

        $mapProviders = (clone $directoryQuery)
            ->whereNotNull('users.latitude')
            ->whereNotNull('users.longitude')
            ->limit(100)
            ->get()
            ->map(fn (User $user): array => $this->providerPayload($user))
            ->values()
            ->all();

        $providers = (clone $directoryQuery)
            ->paginate(9)
            ->withQueryString()
            ->through(fn (User $user): array => $this->providerPayload($user));

        return Inertia::render('Providers/Index', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
            'categories' => config('localserve.trade_categories'),
            'cities' => $cityOptions,
            'availabilityOptions' => config('localserve.provider.availability_options'),
            'filters' => $filters,
            'providers' => $providers,
            'mapProviders' => $mapProviders,
        ]);
    }

    /**
     * @return array{0: string, 1: array<int, float>}
     */
    private function distanceExpression(float $latitude, float $longitude): array
    {
        if (DB::getDriverName() === 'pgsql') {
            return [
                '(earth_distance(ll_to_earth(users.latitude, users.longitude), ll_to_earth(?, ?)) / 1000.0)',
                [$latitude, $longitude],
            ];
        }

        return [
            '(111.0 * (abs(users.latitude - ?) + abs(users.longitude - ?)))',
            [$latitude, $longitude],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function providerPayload(User $user): array
    {
        $profile = $user->providerProfile;
        $locationParts = array_values(array_filter([$user->area, $user->city]));
        $tradeCategories = $user->verifiedTradeCategoryNames();

        return [
            'id' => $user->id,
            'providerName' => $user->name,
            'businessName' => $profile->business_name,
            'headline' => $profile->headline,
            'category' => $profile->trade_category,
            'categories' => $tradeCategories,
            'bio' => $profile->bio,
            'city' => $user->city,
            'area' => $user->area,
            'latitude' => $user->latitude !== null ? round($user->latitude, 3) : null,
            'longitude' => $user->longitude !== null ? round($user->longitude, 3) : null,
            'distanceKm' => isset($user->distance_km)
                ? round((float) $user->distance_km, 1)
                : null,
            'locationLabel' => implode(', ', $locationParts),
            'verificationStatus' => $profile->verification_status,
            'availabilityStatus' => $profile->availability_status,
            'yearsExperience' => $profile->years_experience,
            'basePriceFrom' => $profile->base_price_from,
            'responseTimeLabel' => $profile->response_time_label,
            'serviceRadiusKm' => $profile->service_radius_km,
            'featuredServices' => $profile->services
                ->take(2)
                ->pluck('title')
                ->values()
                ->all(),
            'averageRating' => $user->average_rating !== null
                ? round((float) $user->average_rating, 1)
                : null,
            'reviewCount' => $user->received_provider_reviews_count,
            'servicesCount' => $profile->services->count(),
            'verifiedAt' => $profile->verified_at?->toDateString(),
        ];
    }
}
