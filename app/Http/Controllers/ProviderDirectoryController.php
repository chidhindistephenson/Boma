<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProviderDirectoryController extends Controller
{
    public function __invoke(Request $request): Response
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
        ]);

        $filters = [
            'q' => trim($request->string('q')->toString()),
            'category' => trim($request->string('category')->toString()),
            'city' => trim($request->string('city')->toString()),
            'availability' => $request->string('availability')->toString() ?: 'any',
            'verified' => $request->boolean('verified', true),
        ];

        $baseQuery = User::query()->directoryVisible($filters['verified']);

        $cityOptions = (clone $baseQuery)
            ->select('city')
            ->whereNotNull('city')
            ->distinct()
            ->orderBy('city')
            ->pluck('city')
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
                                ->orWhereRaw('LOWER(trade_category) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(bio) LIKE ?', [$like]);
                        })
                        ->orWhereHas('providerProfile.services', function (Builder $serviceQuery) use ($like): void {
                            $serviceQuery
                                ->whereRaw('LOWER(title) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(short_description) LIKE ?', [$like])
                                ->orWhereRaw("LOWER(COALESCE(turnaround_label, '')) LIKE ?", [$like]);
                        });
                });
            })
            ->latest('users.created_at')
            ->paginate(9)
            ->withQueryString()
            ->through(function (User $user): array {
                $profile = $user->providerProfile;
                $locationParts = array_values(array_filter([$user->area, $user->city]));

                return [
                    'id' => $user->id,
                    'providerName' => $user->name,
                    'businessName' => $profile->business_name,
                    'headline' => $profile->headline,
                    'category' => $profile->trade_category,
                    'bio' => $profile->bio,
                    'city' => $user->city,
                    'area' => $user->area,
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
            });

        return Inertia::render('Providers/Index', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
            'categories' => config('localserve.trade_categories'),
            'cities' => $cityOptions,
            'availabilityOptions' => config('localserve.provider.availability_options'),
            'filters' => $filters,
            'providers' => $providers,
        ]);
    }
}
