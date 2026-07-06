<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class JobRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $viewer = $request->user();

        abort_unless($viewer->isCustomer() || $viewer->isProvider(), 403);

        $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', Rule::in(array_keys(config('localserve.request.status_options')))],
            'urgency' => ['nullable', 'string', Rule::in(array_keys(config('localserve.request.urgency_options')))],
        ]);

        $filters = [
            'q' => trim($request->string('q')->toString()),
            'status' => trim($request->string('status')->toString()),
            'urgency' => trim($request->string('urgency')->toString()),
        ];

        if ($viewer->isCustomer()) {
            return $this->renderCustomerIndex($viewer, $filters);
        }

        return $this->renderProviderIndex($viewer, $filters);
    }

    public function show(Request $request, JobRequest $jobRequest): Response
    {
        $viewer = $request->user();

        abort_unless($jobRequest->isVisibleTo($viewer), 403);

        $jobRequest->markAsReadFor($viewer);

        $jobRequest->load([
            'customer',
            'provider.providerProfile',
            'sourceRequest.provider.providerProfile',
            'messages.sender.providerProfile',
            'review.customer',
            'quote',
            'schedule.proposedBy.providerProfile',
            'payment',
        ]);

        return Inertia::render('Requests/Show', [
            'jobRequest' => [
                'id' => $jobRequest->id,
                'title' => $jobRequest->title,
                'description' => $jobRequest->description,
                'tradeCategory' => $jobRequest->trade_category,
                'urgency' => $jobRequest->urgency,
                'status' => $jobRequest->status,
                'budgetMin' => $jobRequest->budget_min,
                'budgetMax' => $jobRequest->budget_max,
                'locationLabel' => implode(', ', array_values(array_filter([
                    $jobRequest->area,
                    $jobRequest->city,
                ]))),
                'locationNotes' => $jobRequest->location_notes,
                'createdAt' => $jobRequest->created_at->toDateTimeString(),
                'customer' => [
                    'id' => $jobRequest->customer->id,
                    'name' => $jobRequest->customer->name,
                ],
                'provider' => $jobRequest->provider ? [
                    'id' => $jobRequest->provider->id,
                    'businessName' => $jobRequest->provider->providerProfile?->business_name,
                    'providerName' => $jobRequest->provider->name,
                ] : null,
                'sourceRequest' => $jobRequest->sourceRequest ? [
                    'id' => $jobRequest->sourceRequest->id,
                    'title' => $jobRequest->sourceRequest->title,
                    'status' => $jobRequest->sourceRequest->status,
                    'providerLabel' => $jobRequest->sourceRequest->provider?->providerProfile?->business_name
                        ?? $jobRequest->sourceRequest->provider?->name
                        ?? 'Open request',
                    'createdAt' => $jobRequest->sourceRequest->created_at->toDateTimeString(),
                ] : null,
                'review' => $jobRequest->review ? [
                    'rating' => $jobRequest->review->rating,
                    'headline' => $jobRequest->review->headline,
                    'body' => $jobRequest->review->body,
                    'createdAt' => $jobRequest->review->created_at->toDateTimeString(),
                    'customerName' => $jobRequest->review->customer->name,
                ] : null,
                'quote' => $jobRequest->quote ? [
                    'id' => $jobRequest->quote->id,
                    'amount' => $jobRequest->quote->amount,
                    'timelineDays' => $jobRequest->quote->timeline_days,
                    'status' => $jobRequest->quote->status,
                    'summary' => $jobRequest->quote->summary,
                    'notes' => $jobRequest->quote->notes,
                    'validUntil' => $jobRequest->quote->valid_until?->toDateString(),
                    'respondedAt' => $jobRequest->quote->responded_at?->toDateTimeString(),
                    'createdAt' => $jobRequest->quote->created_at->toDateTimeString(),
                    'updatedAt' => $jobRequest->quote->updated_at->toDateTimeString(),
                ] : null,
                'schedule' => $jobRequest->schedule ? [
                    'id' => $jobRequest->schedule->id,
                    'scheduledFor' => $jobRequest->schedule->scheduled_for->toDateTimeString(),
                    'durationHours' => $jobRequest->schedule->duration_hours,
                    'status' => $jobRequest->schedule->status,
                    'notes' => $jobRequest->schedule->notes,
                    'proposedByName' => $jobRequest->schedule->proposedBy?->providerProfile?->business_name
                        ?? $jobRequest->schedule->proposedBy?->name,
                    'confirmedAt' => $jobRequest->schedule->confirmed_at?->toDateTimeString(),
                    'completedAt' => $jobRequest->schedule->completed_at?->toDateTimeString(),
                    'cancelledAt' => $jobRequest->schedule->cancelled_at?->toDateTimeString(),
                    'updatedAt' => $jobRequest->schedule->updated_at->toDateTimeString(),
                ] : null,
                'payment' => $jobRequest->payment ? [
                    'id' => $jobRequest->payment->id,
                    'amount' => $jobRequest->payment->amount,
                    'method' => $jobRequest->payment->method,
                    'reference' => $jobRequest->payment->reference,
                    'notes' => $jobRequest->payment->notes,
                    'status' => $jobRequest->payment->status,
                    'paidAt' => $jobRequest->payment->paid_at->toDateTimeString(),
                    'confirmedAt' => $jobRequest->payment->confirmed_at?->toDateTimeString(),
                    'revisionRequestedAt' => $jobRequest->payment->revision_requested_at?->toDateTimeString(),
                    'updatedAt' => $jobRequest->payment->updated_at->toDateTimeString(),
                ] : null,
                'messages' => $jobRequest->messages
                    ->sortBy('created_at')
                    ->values()
                    ->map(function ($message): array {
                        return [
                            'id' => $message->id,
                            'body' => $message->body,
                            'createdAt' => $message->created_at->toDateTimeString(),
                            'sender' => [
                                'id' => $message->sender->id,
                                'name' => $message->sender->name,
                                'role' => $message->sender->role,
                                'businessName' => $message->sender->providerProfile?->business_name,
                            ],
                        ];
                    })
                    ->all(),
            ],
            'permissions' => [
                'canMessage' => $jobRequest->canMessage($viewer),
                'canAccept' => $jobRequest->canBeAcceptedBy($viewer),
                'canDecline' => $jobRequest->canBeDeclinedBy($viewer),
                'canClose' => $jobRequest->canBeClosedBy($viewer),
                'canReview' => $jobRequest->canBeReviewedBy($viewer),
                'canManageQuote' => $jobRequest->canBeQuotedBy($viewer),
                'canRespondToQuote' => $jobRequest->canQuoteBeRespondedToBy($viewer),
                'canManageSchedule' => $jobRequest->canManageSchedule($viewer),
                'canRespondToSchedule' => $jobRequest->canRespondToSchedule($viewer),
                'canCancelSchedule' => $jobRequest->canCancelSchedule($viewer),
                'canCompleteSchedule' => $jobRequest->canCompleteSchedule($viewer),
                'canManagePayment' => $jobRequest->canManagePayment($viewer),
                'canRespondToPayment' => $jobRequest->canRespondToPayment($viewer),
                'canCreateFollowUp' => $jobRequest->canCreateFollowUp($viewer),
            ],
            'paymentMethodOptions' => config('localserve.payment.method_options'),
        ]);
    }

    public function create(Request $request): Response
    {
        return $this->renderCreatePage($request);
    }

    public function createForProvider(Request $request, User $provider): Response
    {
        $provider->load('providerProfile');

        abort_unless($provider->isDirectoryVisible(false), 404);

        return $this->renderCreatePage($request, $provider);
    }

    public function createFollowUp(Request $request, JobRequest $jobRequest): Response
    {
        $customer = $request->user();

        abort_unless($customer->isCustomer(), 403);
        abort_unless($jobRequest->canCreateFollowUp($customer), 403);

        $request->validate([
            'provider_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $selectedProvider = null;

        if ($request->filled('provider_id')) {
            $selectedProvider = User::query()
                ->with('providerProfile')
                ->findOrFail((int) $request->integer('provider_id'));

            abort_unless($selectedProvider->isDirectoryVisible(false), 404);
        }

        $jobRequest->loadMissing('provider.providerProfile');

        if (
            ! $selectedProvider
            && $jobRequest->provider
            && $jobRequest->status !== 'declined'
            && $jobRequest->provider->isDirectoryVisible(false)
        ) {
            $selectedProvider = $jobRequest->provider;
        }

        return $this->renderCreatePage($request, $selectedProvider, $jobRequest);
    }

    public function store(Request $request): RedirectResponse
    {
        $customer = $request->user();

        abort_unless($customer->isCustomer(), 403);

        $validated = $request->validate([
            'provider_id' => ['nullable', 'integer', 'exists:users,id'],
            'source_job_request_id' => ['nullable', 'integer', 'exists:job_requests,id'],
            'trade_category' => ['required', 'string', Rule::in(config('localserve.trade_categories'))],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:2000'],
            'urgency' => ['required', 'string', Rule::in(array_keys(config('localserve.request.urgency_options')))],
            'budget_min' => ['nullable', 'integer', 'min:0'],
            'budget_max' => ['nullable', 'integer', 'min:0', 'gte:budget_min'],
            'city' => ['required', 'string', 'max:120'],
            'area' => ['nullable', 'string', 'max:120'],
            'location_notes' => ['nullable', 'string', 'max:1200'],
        ]);

        $provider = null;
        $sourceRequest = null;

        if (! empty($validated['provider_id'])) {
            $provider = User::query()
                ->with('providerProfile')
                ->findOrFail($validated['provider_id']);

            abort_unless($provider->isDirectoryVisible(false), 404);
        }

        if (! empty($validated['source_job_request_id'])) {
            $sourceRequest = JobRequest::query()
                ->with('provider.providerProfile')
                ->findOrFail($validated['source_job_request_id']);

            abort_unless($sourceRequest->canCreateFollowUp($customer), 403);
        }

        $jobRequest = JobRequest::create([
            'customer_id' => $customer->id,
            'provider_id' => $provider?->id,
            'source_job_request_id' => $sourceRequest?->id,
            'trade_category' => $validated['trade_category'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'urgency' => $validated['urgency'],
            'budget_min' => $validated['budget_min'] ?? null,
            'budget_max' => $validated['budget_max'] ?? null,
            'city' => $validated['city'],
            'area' => $validated['area'] ?? null,
            'location_notes' => ($validated['location_notes'] ?? null) ?: null,
            'status' => $provider ? 'targeted' : 'open',
            'customer_last_read_at' => now(),
        ]);

        if ($provider) {
            InAppNotification::notifyUser(
                $provider,
                'request_targeted',
                'New targeted request',
                "{$customer->name} sent you a new request: {$jobRequest->title}.",
                route('requests.show', $jobRequest),
                'Open request',
                [
                    'job_request_id' => $jobRequest->id,
                    'customer_id' => $customer->id,
                ],
            );
        }

        return Redirect::route('requests.show', $jobRequest);
    }

    private function renderCreatePage(
        Request $request,
        ?User $selectedProvider = null,
        ?JobRequest $sourceRequest = null,
    ): Response
    {
        $customer = $request->user();

        abort_unless($customer->isCustomer(), 403);

        $customer->loadMissing('customerProfile');
        $sourceRequest?->loadMissing('provider.providerProfile');

        $providers = $customer->shortlistedProviders()
            ->directoryVisible(false)
            ->with('providerProfile')
            ->latest('shortlisted_providers.created_at')
            ->get()
            ->map(fn (User $provider): array => $this->providerOption($provider))
            ->values();

        if ($selectedProvider && ! $providers->contains(fn (array $provider): bool => $provider['id'] === $selectedProvider->id)) {
            $providers->prepend($this->providerOption($selectedProvider));
        }

        $sourceProvider = $sourceRequest?->provider;

        if (
            $sourceProvider
            && $sourceProvider->isDirectoryVisible(false)
            && ! $providers->contains(fn (array $provider): bool => $provider['id'] === $sourceProvider->id)
        ) {
            $providers->prepend($this->providerOption($sourceProvider));
        }

        $prefilledProvider = $selectedProvider
            ?? ($sourceRequest?->status !== 'declined' ? $sourceProvider : null);

        return Inertia::render('Requests/Create', [
            'tradeCategories' => config('localserve.trade_categories'),
            'urgencyOptions' => collect(config('localserve.request.urgency_options'))
                ->map(fn (string $label, string $value): array => [
                    'value' => $value,
                    'label' => $label,
                ])
                ->values()
                ->all(),
            'providers' => $providers->all(),
            'defaultValues' => [
                'sourceJobRequestId' => $sourceRequest?->id,
                'providerId' => $prefilledProvider?->id,
                'tradeCategory' => $sourceRequest?->trade_category
                    ?? $prefilledProvider?->providerProfile?->trade_category
                    ?? $customer->customerProfile?->default_trade_category
                    ?? '',
                'title' => $sourceRequest?->title ?? '',
                'description' => $sourceRequest?->description ?? '',
                'city' => $sourceRequest?->city ?? $customer->city,
                'area' => $sourceRequest?->area ?? $customer->area,
                'urgency' => $sourceRequest?->urgency
                    ?? $customer->customerProfile?->default_urgency
                    ?? array_key_first(config('localserve.request.urgency_options')),
                'budgetMin' => $sourceRequest?->budget_min ?? $customer->customerProfile?->default_budget_min,
                'budgetMax' => $sourceRequest?->budget_max ?? $customer->customerProfile?->default_budget_max,
                'locationNotes' => $sourceRequest?->location_notes ?? $customer->customerProfile?->location_notes ?? '',
                'preferredRadiusKm' => $customer->customerProfile?->preferred_radius_km
                    ?? config('localserve.search.default_radius_km'),
            ],
            'sourceRequest' => $sourceRequest ? [
                'id' => $sourceRequest->id,
                'title' => $sourceRequest->title,
                'status' => $sourceRequest->status,
                'providerLabel' => $sourceRequest->provider?->providerProfile?->business_name
                    ?? $sourceRequest->provider?->name
                    ?? 'Open request',
                'createdAt' => $sourceRequest->created_at->toDateTimeString(),
            ] : null,
        ]);
    }

    private function providerOption(User $provider): array
    {
        return [
            'id' => $provider->id,
            'businessName' => $provider->providerProfile->business_name,
            'category' => $provider->providerProfile->trade_category,
            'locationLabel' => implode(', ', array_values(array_filter([
                $provider->area,
                $provider->city,
            ]))),
        ];
    }

    private function renderCustomerIndex(User $customer, array $filters): Response
    {
        $jobRequests = $customer->customerJobRequests()
            ->with([
                'provider.providerProfile',
                'sourceRequest.provider.providerProfile',
                'messages',
                'review',
                'quote',
                'schedule',
                'payment',
            ])
            ->when($filters['status'] !== '', fn ($query) => $query->where('status', $filters['status']))
            ->when($filters['urgency'] !== '', fn ($query) => $query->where('urgency', $filters['urgency']))
            ->when($filters['q'] !== '', function ($query) use ($filters): void {
                $like = '%'.strtolower($filters['q']).'%';

                $query->where(function ($searchQuery) use ($like): void {
                    $searchQuery
                        ->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(description) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(trade_category) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(city) LIKE ?', [$like])
                        ->orWhereRaw("LOWER(COALESCE(area, '')) LIKE ?", [$like])
                        ->orWhereHas('provider.providerProfile', function ($providerQuery) use ($like): void {
                            $providerQuery->whereRaw('LOWER(business_name) LIKE ?', [$like]);
                        });
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (JobRequest $jobRequest): array => $this->customerJobRequestPayload($jobRequest, $customer));

        $summaryBaseQuery = $customer->customerJobRequests();
        $summaryMessages = $customer->customerJobRequests()->with('messages')->latest()->get();
        $pendingReviewCount = $customer->customerJobRequests()
            ->where('status', 'closed')
            ->whereNotNull('provider_id')
            ->whereDoesntHave('review')
            ->count();

        return Inertia::render('Requests/Index', [
            'viewerRole' => 'customer',
            'filters' => $filters,
            'statusOptions' => config('localserve.request.status_options'),
            'urgencyOptions' => config('localserve.request.urgency_options'),
            'jobRequests' => $jobRequests,
            'summary' => [
                'total' => (clone $summaryBaseQuery)->count(),
                'active' => (clone $summaryBaseQuery)
                    ->whereIn('status', ['open', 'targeted', 'in_conversation', 'accepted'])
                    ->count(),
                'closed' => (clone $summaryBaseQuery)->where('status', 'closed')->count(),
                'unreadMessages' => $summaryMessages->sum(
                    fn (JobRequest $jobRequest): int => $jobRequest->unreadCountFor($customer)
                ),
                'pendingReviews' => $pendingReviewCount,
                'pendingQuotes' => $customer->customerJobRequests()
                    ->whereHas('quote', fn ($query) => $query->where('status', 'pending'))
                    ->count(),
                'acceptedQuotes' => $customer->customerJobRequests()
                    ->whereHas('quote', fn ($query) => $query->where('status', 'accepted'))
                    ->count(),
                'pendingSchedules' => $customer->customerJobRequests()
                    ->whereHas('schedule', fn ($query) => $query->where('status', 'proposed'))
                    ->count(),
                'confirmedSchedules' => $customer->customerJobRequests()
                    ->whereHas('schedule', fn ($query) => $query->where('status', 'confirmed'))
                    ->count(),
                'pendingPayments' => $customer->customerJobRequests()
                    ->whereHas('payment', fn ($query) => $query->where('status', 'submitted'))
                    ->count(),
                'paymentsNeedingUpdate' => $customer->customerJobRequests()
                    ->whereHas('payment', fn ($query) => $query->where('status', 'revision_requested'))
                    ->count(),
                'confirmedPayments' => $customer->customerJobRequests()
                    ->whereHas('payment', fn ($query) => $query->where('status', 'confirmed'))
                    ->count(),
            ],
        ]);
    }

    private function renderProviderIndex(User $provider, array $filters): Response
    {
        $jobRequests = $provider->providerJobRequests()
            ->with([
                'customer',
                'provider.providerProfile',
                'sourceRequest.provider.providerProfile',
                'messages',
                'review',
                'quote',
                'schedule',
                'payment',
            ])
            ->when($filters['status'] !== '', fn ($query) => $query->where('status', $filters['status']))
            ->when($filters['urgency'] !== '', fn ($query) => $query->where('urgency', $filters['urgency']))
            ->when($filters['q'] !== '', function ($query) use ($filters): void {
                $like = '%'.strtolower($filters['q']).'%';

                $query->where(function ($searchQuery) use ($like): void {
                    $searchQuery
                        ->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(description) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(trade_category) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(city) LIKE ?', [$like])
                        ->orWhereRaw("LOWER(COALESCE(area, '')) LIKE ?", [$like])
                        ->orWhereHas('customer', function ($customerQuery) use ($like): void {
                            $customerQuery
                                ->whereRaw('LOWER(name) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
                        });
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (JobRequest $jobRequest): array => $this->providerJobRequestPayload($jobRequest, $provider));

        $summaryBaseQuery = $provider->providerJobRequests();
        $summaryMessages = $provider->providerJobRequests()->with('messages')->latest()->get();

        return Inertia::render('Requests/Index', [
            'viewerRole' => 'provider',
            'filters' => $filters,
            'statusOptions' => config('localserve.request.status_options'),
            'urgencyOptions' => config('localserve.request.urgency_options'),
            'jobRequests' => $jobRequests,
            'summary' => [
                'total' => (clone $summaryBaseQuery)->count(),
                'active' => (clone $summaryBaseQuery)
                    ->whereIn('status', ['targeted', 'in_conversation', 'accepted'])
                    ->count(),
                'closed' => (clone $summaryBaseQuery)->where('status', 'closed')->count(),
                'unreadMessages' => $summaryMessages->sum(
                    fn (JobRequest $jobRequest): int => $jobRequest->unreadCountFor($provider)
                ),
                'pendingRequests' => $provider->providerJobRequests()
                    ->whereIn('status', ['targeted', 'in_conversation'])
                    ->count(),
                'acceptedRequests' => $provider->providerJobRequests()
                    ->where('status', 'accepted')
                    ->count(),
                'declinedRequests' => $provider->providerJobRequests()
                    ->where('status', 'declined')
                    ->count(),
                'pendingQuotes' => $provider->providerJobRequests()
                    ->whereHas('quote', fn ($query) => $query->where('status', 'pending'))
                    ->count(),
                'acceptedQuotes' => $provider->providerJobRequests()
                    ->whereHas('quote', fn ($query) => $query->where('status', 'accepted'))
                    ->count(),
                'pendingSchedules' => $provider->providerJobRequests()
                    ->whereHas('schedule', fn ($query) => $query->where('status', 'proposed'))
                    ->count(),
                'confirmedSchedules' => $provider->providerJobRequests()
                    ->whereHas('schedule', fn ($query) => $query->where('status', 'confirmed'))
                    ->count(),
                'pendingPayments' => $provider->providerJobRequests()
                    ->whereHas('payment', fn ($query) => $query->where('status', 'submitted'))
                    ->count(),
                'confirmedPayments' => $provider->providerJobRequests()
                    ->whereHas('payment', fn ($query) => $query->where('status', 'confirmed'))
                    ->count(),
            ],
        ]);
    }

    private function customerJobRequestPayload(JobRequest $jobRequest, User $customer): array
    {
        return [
            'id' => $jobRequest->id,
            'title' => $jobRequest->title,
            'category' => $jobRequest->trade_category,
            'status' => $jobRequest->status,
            'urgency' => $jobRequest->urgency,
            'providerLabel' => $jobRequest->provider?->providerProfile?->business_name
                ?? 'Open request',
            'sourceRequestId' => $jobRequest->sourceRequest?->id,
            'sourceRequestTitle' => $jobRequest->sourceRequest?->title,
            'sourceProviderLabel' => $jobRequest->sourceRequest?->provider?->providerProfile?->business_name
                ?? $jobRequest->sourceRequest?->provider?->name,
            'locationLabel' => implode(', ', array_values(array_filter([
                $jobRequest->area,
                $jobRequest->city,
            ]))),
            'messageCount' => $jobRequest->messages->count(),
            'unreadCount' => $jobRequest->unreadCountFor($customer),
            'canReview' => $jobRequest->canBeReviewedBy($customer),
            'hasReview' => $jobRequest->review !== null,
            'reviewRating' => $jobRequest->review?->rating,
            'hasQuote' => $jobRequest->quote !== null,
            'quoteStatus' => $jobRequest->quote?->status,
            'quoteAmount' => $jobRequest->quote?->amount,
            'quoteNeedsResponse' => $jobRequest->canQuoteBeRespondedToBy($customer),
            'hasSchedule' => $jobRequest->schedule !== null,
            'scheduleStatus' => $jobRequest->schedule?->status,
            'scheduledFor' => $jobRequest->schedule?->scheduled_for?->toDateTimeString(),
            'scheduleNeedsResponse' => $jobRequest->canRespondToSchedule($customer),
            'hasPayment' => $jobRequest->payment !== null,
            'paymentStatus' => $jobRequest->payment?->status,
            'paymentAmount' => $jobRequest->payment?->amount,
            'paymentNeedsUpdate' => $jobRequest->payment?->status === 'revision_requested',
            'createdAt' => $jobRequest->created_at->toDateTimeString(),
        ];
    }

    private function providerJobRequestPayload(JobRequest $jobRequest, User $provider): array
    {
        return [
            'id' => $jobRequest->id,
            'title' => $jobRequest->title,
            'category' => $jobRequest->trade_category,
            'status' => $jobRequest->status,
            'urgency' => $jobRequest->urgency,
            'customerName' => $jobRequest->customer->name,
            'providerLabel' => $jobRequest->provider?->providerProfile?->business_name
                ?? 'Open request',
            'sourceRequestId' => $jobRequest->sourceRequest?->id,
            'sourceRequestTitle' => $jobRequest->sourceRequest?->title,
            'locationLabel' => implode(', ', array_values(array_filter([
                $jobRequest->area,
                $jobRequest->city,
            ]))),
            'messageCount' => $jobRequest->messages->count(),
            'unreadCount' => $jobRequest->unreadCountFor($provider),
            'hasReview' => $jobRequest->review !== null,
            'reviewRating' => $jobRequest->review?->rating,
            'hasQuote' => $jobRequest->quote !== null,
            'quoteStatus' => $jobRequest->quote?->status,
            'quoteAmount' => $jobRequest->quote?->amount,
            'quoteNeedsResponse' => false,
            'hasSchedule' => $jobRequest->schedule !== null,
            'scheduleStatus' => $jobRequest->schedule?->status,
            'scheduledFor' => $jobRequest->schedule?->scheduled_for?->toDateTimeString(),
            'scheduleNeedsResponse' => false,
            'hasPayment' => $jobRequest->payment !== null,
            'paymentStatus' => $jobRequest->payment?->status,
            'paymentAmount' => $jobRequest->payment?->amount,
            'paymentNeedsUpdate' => false,
            'canReview' => false,
            'createdAt' => $jobRequest->created_at->toDateTimeString(),
        ];
    }
}
