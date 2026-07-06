<?php

namespace App\Http\Controllers;

use App\Models\JobRequest;
use App\Models\JobRequestQuote;
use App\Models\ProviderReview;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminAnalyticsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $admin = $request->user();

        abort_unless($admin->isAdmin(), 403);

        $periodOptions = $this->periodOptions();

        $request->validate([
            'period' => ['nullable', 'string', Rule::in(array_keys($periodOptions))],
            'category' => ['nullable', 'string', Rule::in(['all', ...config('localserve.trade_categories')])],
        ]);

        $filters = [
            'period' => $request->string('period')->toString() ?: '30d',
            'category' => $request->string('category')->toString() ?: 'all',
        ];

        $window = $this->resolveWindow($filters['period']);
        $rangeStart = $window['rangeStart'];

        $requests = JobRequest::query()
            ->with(['quote', 'review'])
            ->withCount('messages')
            ->when($rangeStart, fn ($query) => $query->where('created_at', '>=', $rangeStart))
            ->when(
                $filters['category'] !== 'all',
                fn ($query) => $query->where('trade_category', $filters['category'])
            )
            ->get();

        $quotes = JobRequestQuote::query()
            ->when($rangeStart, fn ($query) => $query->where('created_at', '>=', $rangeStart))
            ->when($filters['category'] !== 'all', function ($query) use ($filters): void {
                $query->whereHas('jobRequest', fn ($jobRequestQuery) => $jobRequestQuery
                    ->where('trade_category', $filters['category']));
            })
            ->get();

        $reviews = ProviderReview::query()
            ->when($rangeStart, fn ($query) => $query->where('created_at', '>=', $rangeStart))
            ->when($filters['category'] !== 'all', function ($query) use ($filters): void {
                $query->whereHas('jobRequest', fn ($jobRequestQuery) => $jobRequestQuery
                    ->where('trade_category', $filters['category']));
            })
            ->get();

        $providerIds = $requests
            ->pluck('provider_id')
            ->merge($quotes->pluck('provider_id'))
            ->merge($reviews->pluck('provider_id'))
            ->filter()
            ->unique()
            ->values();

        $providers = User::query()
            ->whereKey($providerIds)
            ->with('providerProfile')
            ->get()
            ->keyBy('id');

        $targetedRequests = $requests->filter(fn (JobRequest $jobRequest): bool => $jobRequest->provider_id !== null);
        $closedTargetedRequests = $targetedRequests->filter(
            fn (JobRequest $jobRequest): bool => $jobRequest->status === 'closed'
        );
        $acceptedQuotes = $quotes->where('status', 'accepted');

        $summary = [
            'periodLabel' => $periodOptions[$filters['period']],
            'requestCount' => $requests->count(),
            'targetedRequestCount' => $targetedRequests->count(),
            'quoteCoverageRate' => $this->percentage($quotes->count(), $targetedRequests->count()),
            'quoteAcceptanceRate' => $this->percentage($acceptedQuotes->count(), $quotes->count()),
            'averageQuoteAmount' => $quotes->count() > 0 ? (int) round((float) $quotes->avg('amount')) : null,
            'reviewCompletionRate' => $this->percentage($reviews->count(), $closedTargetedRequests->count()),
        ];

        $statusBreakdown = collect(config('localserve.request.status_options'))
            ->map(fn (string $label, string $status): array => [
                'status' => $status,
                'label' => $label,
                'count' => $requests->where('status', $status)->count(),
            ])
            ->values()
            ->all();

        $quoteBreakdown = collect([
            'pending' => 'Pending',
            'accepted' => 'Accepted',
            'declined' => 'Declined',
        ])->map(fn (string $label, string $status): array => [
            'status' => $status,
            'label' => $label,
            'count' => $quotes->where('status', $status)->count(),
        ])->values()->all();

        $categoryBreakdown = collect(config('localserve.trade_categories'))
            ->map(function (string $category) use ($requests, $quotes): ?array {
                $categoryRequests = $requests->where('trade_category', $category);

                if ($categoryRequests->isEmpty()) {
                    return null;
                }

                $categoryTargeted = $categoryRequests->filter(
                    fn (JobRequest $jobRequest): bool => $jobRequest->provider_id !== null
                );
                $requestIds = $categoryRequests->pluck('id');
                $categoryQuotes = $quotes->whereIn('job_request_id', $requestIds);

                return [
                    'category' => $category,
                    'requestCount' => $categoryRequests->count(),
                    'targetedRequestCount' => $categoryTargeted->count(),
                    'quoteCoverageRate' => $this->percentage($categoryQuotes->count(), $categoryTargeted->count()),
                    'acceptedQuotes' => $categoryQuotes->where('status', 'accepted')->count(),
                    'averageQuoteAmount' => $categoryQuotes->count() > 0
                        ? (int) round((float) $categoryQuotes->avg('amount'))
                        : null,
                ];
            })
            ->filter()
            ->sortByDesc('requestCount')
            ->values()
            ->take(6)
            ->all();

        $cityBreakdown = $requests
            ->groupBy(fn (JobRequest $jobRequest): string => $jobRequest->city ?: 'Unknown')
            ->map(function (Collection $cityRequests, string $city) use ($quotes): array {
                $requestIds = $cityRequests->pluck('id');
                $cityQuotes = $quotes->whereIn('job_request_id', $requestIds);

                return [
                    'city' => $city,
                    'requestCount' => $cityRequests->count(),
                    'activeCount' => $cityRequests->filter(
                        fn (JobRequest $jobRequest): bool => in_array(
                            $jobRequest->status,
                            ['open', 'targeted', 'in_conversation', 'accepted'],
                            true,
                        )
                    )->count(),
                    'closedCount' => $cityRequests->where('status', 'closed')->count(),
                    'acceptedQuotes' => $cityQuotes->where('status', 'accepted')->count(),
                ];
            })
            ->sortByDesc('requestCount')
            ->values()
            ->take(6)
            ->all();

        $providerPerformance = $providerIds
            ->map(function (int $providerId) use ($providers, $requests, $quotes, $reviews): ?array {
                $provider = $providers->get($providerId);

                if (! $provider) {
                    return null;
                }

                $providerRequests = $requests->where('provider_id', $providerId);
                $providerQuotes = $quotes->where('provider_id', $providerId);
                $providerReviews = $reviews->where('provider_id', $providerId);

                return [
                    'id' => $providerId,
                    'businessName' => $provider->providerProfile?->business_name ?? $provider->name,
                    'category' => $provider->providerProfile?->trade_category,
                    'requestCount' => $providerRequests->count(),
                    'acceptedQuotes' => $providerQuotes->where('status', 'accepted')->count(),
                    'reviewCount' => $providerReviews->count(),
                    'averageRating' => $providerReviews->count() > 0
                        ? round((float) $providerReviews->avg('rating'), 1)
                        : null,
                    'quoteAcceptanceRate' => $this->percentage(
                        $providerQuotes->where('status', 'accepted')->count(),
                        $providerQuotes->count(),
                    ),
                ];
            })
            ->filter()
            ->sortByDesc(fn (array $provider): int => (
                ($provider['acceptedQuotes'] * 10000)
                + ($provider['reviewCount'] * 100)
                + $provider['requestCount']
            ))
            ->values()
            ->take(6)
            ->all();

        $operationalHealth = [
            'verifiedProviders' => User::query()->directoryVisible(true)->count(),
            'pendingProviderVerifications' => User::query()
                ->where('role', 'provider')
                ->whereHas('providerProfile', fn ($query) => $query->where('verification_status', 'pending'))
                ->count(),
            'rejectedProviders' => User::query()
                ->where('role', 'provider')
                ->whereHas('providerProfile', fn ($query) => $query->where('verification_status', 'rejected'))
                ->count(),
            'suspendedUsers' => User::query()->whereNotNull('suspended_at')->count(),
            'targetedWithoutQuoteCount' => $targetedRequests
                ->filter(fn (JobRequest $jobRequest): bool => $jobRequest->quote === null)
                ->count(),
            'unreviewedClosedRequestCount' => $closedTargetedRequests->filter(
                fn (JobRequest $jobRequest): bool => $jobRequest->review === null
            )->count(),
            'averageMessagesPerRequest' => $requests->count() > 0
                ? round((float) $requests->avg('messages_count'), 1)
                : 0,
            'averageQuoteLeadDays' => $quotes->count() > 0
                ? round((float) $quotes->avg('timeline_days'), 1)
                : null,
        ];

        $trend = $this->buildTrend($window, $requests, $quotes, $reviews);

        return Inertia::render('Admin/Analytics/Index', [
            'filters' => $filters,
            'periodOptions' => collect($periodOptions)
                ->map(fn (string $label, string $value): array => [
                    'value' => $value,
                    'label' => $label,
                ])
                ->values()
                ->all(),
            'categories' => config('localserve.trade_categories'),
            'summary' => $summary,
            'statusBreakdown' => $statusBreakdown,
            'quoteBreakdown' => $quoteBreakdown,
            'categoryBreakdown' => $categoryBreakdown,
            'cityBreakdown' => $cityBreakdown,
            'providerPerformance' => $providerPerformance,
            'operationalHealth' => $operationalHealth,
            'trend' => $trend,
        ]);
    }

    private function periodOptions(): array
    {
        return [
            '7d' => 'Last 7 days',
            '30d' => 'Last 30 days',
            '90d' => 'Last 90 days',
            '365d' => 'Last 12 months',
            'all' => 'All time',
        ];
    }

    private function resolveWindow(string $period): array
    {
        $now = now();

        return match ($period) {
            '7d' => [
                'rangeStart' => $now->copy()->startOfDay()->subDays(6),
                'trendStart' => $now->copy()->startOfDay()->subDays(6),
                'interval' => 'day',
            ],
            '30d' => [
                'rangeStart' => $now->copy()->startOfDay()->subDays(29),
                'trendStart' => $now->copy()->startOfDay()->subDays(29),
                'interval' => 'week',
            ],
            '90d' => [
                'rangeStart' => $now->copy()->startOfDay()->subDays(89),
                'trendStart' => $now->copy()->startOfDay()->subDays(89),
                'interval' => 'week',
            ],
            '365d' => [
                'rangeStart' => $now->copy()->startOfDay()->subDays(364),
                'trendStart' => $now->copy()->startOfMonth()->subMonths(11),
                'interval' => 'month',
            ],
            default => [
                'rangeStart' => null,
                'trendStart' => $now->copy()->startOfMonth()->subMonths(11),
                'interval' => 'month',
            ],
        };
    }

    private function buildTrend(
        array $window,
        Collection $requests,
        Collection $quotes,
        Collection $reviews,
    ): array {
        $now = now();
        $cursor = $window['trendStart']->copy();
        $interval = $window['interval'];
        $buckets = [];

        while ($cursor->lte($now)) {
            $bucketStart = $cursor->copy();
            $bucketEnd = match ($interval) {
                'day' => $bucketStart->copy()->endOfDay(),
                'week' => $bucketStart->copy()->addDays(6)->endOfDay(),
                default => $bucketStart->copy()->endOfMonth(),
            };

            if ($bucketEnd->gt($now)) {
                $bucketEnd = $now->copy();
            }

            $bucketRequests = $requests->filter(
                fn (JobRequest $jobRequest): bool => $this->isWithinRange($jobRequest->created_at, $bucketStart, $bucketEnd)
            );
            $bucketQuotes = $quotes->filter(
                fn (JobRequestQuote $quote): bool => $this->isWithinRange($quote->created_at, $bucketStart, $bucketEnd)
            );
            $bucketReviews = $reviews->filter(
                fn (ProviderReview $review): bool => $this->isWithinRange($review->created_at, $bucketStart, $bucketEnd)
            );

            $buckets[] = [
                'label' => $this->bucketLabel($bucketStart, $bucketEnd, $interval),
                'requestCount' => $bucketRequests->count(),
                'quoteCount' => $bucketQuotes->count(),
                'acceptedQuoteCount' => $bucketQuotes->where('status', 'accepted')->count(),
                'reviewCount' => $bucketReviews->count(),
            ];

            $cursor = match ($interval) {
                'day' => $cursor->addDay(),
                'week' => $cursor->addWeek(),
                default => $cursor->addMonth()->startOfMonth(),
            };
        }

        $maxActivity = collect($buckets)
            ->map(fn (array $bucket): int => max(
                $bucket['requestCount'],
                $bucket['quoteCount'],
                $bucket['acceptedQuoteCount'],
                $bucket['reviewCount'],
            ))
            ->max() ?: 1;

        return collect($buckets)
            ->map(fn (array $bucket): array => [
                ...$bucket,
                'requestHeight' => (int) round(($bucket['requestCount'] / $maxActivity) * 100),
                'quoteHeight' => (int) round(($bucket['quoteCount'] / $maxActivity) * 100),
                'acceptedQuoteHeight' => (int) round(($bucket['acceptedQuoteCount'] / $maxActivity) * 100),
                'reviewHeight' => (int) round(($bucket['reviewCount'] / $maxActivity) * 100),
            ])
            ->all();
    }

    private function bucketLabel(CarbonInterface $start, CarbonInterface $end, string $interval): string
    {
        return match ($interval) {
            'day' => $start->format('M j'),
            'week' => $start->format('M j').' - '.$end->format('M j'),
            default => $start->format('M Y'),
        };
    }

    private function isWithinRange(
        CarbonInterface $value,
        CarbonInterface $start,
        CarbonInterface $end,
    ): bool {
        return $value->between($start, $end, true);
    }

    private function percentage(int $numerator, int $denominator): ?int
    {
        if ($denominator === 0) {
            return null;
        }

        return (int) round(($numerator / $denominator) * 100);
    }
}
