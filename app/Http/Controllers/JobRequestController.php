<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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
            'attention' => ['nullable', 'boolean'],
        ]);

        $filters = [
            'q' => trim($request->string('q')->toString()),
            'status' => trim($request->string('status')->toString()),
            'urgency' => trim($request->string('urgency')->toString()),
            'attention' => $request->boolean('attention'),
        ];

        if ($viewer->isCustomer()) {
            return $this->renderCustomerIndex($viewer, $filters);
        }

        return $this->renderProviderIndex($viewer, $filters);
    }

    public function show(Request $request, JobRequest $jobRequest, WalletService $wallets): Response
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
            'payment.paymentMethod',
            'payment.reviewedBy',
            'payment.releasedBy',
            'payment.refundedBy',
            'payment.disputedBy',
            'proposals.provider.providerProfile',
            'proposals.provider.receivedProviderReviews',
        ]);

        $walletCollection = $wallets->walletsFor($viewer);
        $wallet = $walletCollection->firstWhere('currency', config('localserve.payment.wallet_currency'))
            ?? $walletCollection->first();

        return Inertia::render('Requests/Show', [
            'jobRequest' => [
                'id' => $jobRequest->id,
                'title' => $jobRequest->title,
                'description' => $jobRequest->description,
                'tradeCategory' => $jobRequest->trade_category,
                'urgency' => $jobRequest->urgency,
                'preferredDate' => $jobRequest->preferred_date?->toDateString(),
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
                    'id' => $jobRequest->review->id,
                    'rating' => $jobRequest->review->rating,
                    'headline' => $jobRequest->review->headline,
                    'body' => $jobRequest->review->body,
                    'providerResponse' => $jobRequest->review->provider_response,
                    'respondedAt' => $jobRequest->review->responded_at?->toDateTimeString(),
                    'moderationStatus' => $jobRequest->review->moderation_status,
                    'moderationNotes' => $jobRequest->review->moderation_notes,
                    'createdAt' => $jobRequest->review->created_at->toDateTimeString(),
                    'customerName' => $jobRequest->review->reviewerFirstName(),
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
                    'platformFeeAmount' => $jobRequest->payment->platform_fee_amount,
                    'providerNetAmount' => $jobRequest->payment->provider_net_amount
                        ?? max(0, $jobRequest->payment->amount - $jobRequest->payment->platform_fee_amount),
                    'currency' => $jobRequest->payment->currency,
                    'channel' => $jobRequest->payment->channel
                        ?? (in_array($jobRequest->payment->method, config('localserve.payment.electronic_methods'), true)
                            ? 'electronic'
                            : 'manual'),
                    'method' => $jobRequest->payment->method,
                    'paymentMethod' => $jobRequest->payment->paymentMethod ? [
                        'id' => $jobRequest->payment->paymentMethod->id,
                        'brand' => $jobRequest->payment->paymentMethod->brand,
                        'lastFour' => $jobRequest->payment->paymentMethod->last_four,
                    ] : null,
                    'gatewayProvider' => $jobRequest->payment->gateway_provider,
                    'gatewayStatus' => $jobRequest->payment->gateway_status,
                    'gatewayTransactionId' => $jobRequest->payment->gateway_transaction_id,
                    'gatewayAuthorizationCode' => $jobRequest->payment->gateway_authorization_code,
                    'gatewayMerchantReference' => $jobRequest->payment->gateway_merchant_reference,
                    'gatewayRedirectUrl' => $jobRequest->payment->gateway_redirect_url,
                    'gatewayResultReceivedAt' => $jobRequest->payment->gateway_result_received_at?->toDateTimeString(),
                    'reference' => $jobRequest->payment->reference,
                    'payerName' => $jobRequest->payment->payer_name,
                    'payerEmail' => $jobRequest->payment->payer_email,
                    'payerPhone' => $jobRequest->payment->payer_phone,
                    'notes' => $jobRequest->payment->notes,
                    'status' => $jobRequest->payment->status,
                    'escrowStatus' => $jobRequest->payment->escrow_status,
                    'escrowHeldAt' => $jobRequest->payment->escrow_held_at?->toDateTimeString(),
                    'releaseDueAt' => $jobRequest->payment->release_due_at?->toDateTimeString(),
                    'releasedAt' => $jobRequest->payment->released_at?->toDateTimeString(),
                    'releasedByName' => $jobRequest->payment->releasedBy?->name,
                    'releaseReason' => $jobRequest->payment->release_reason,
                    'refundedAt' => $jobRequest->payment->refunded_at?->toDateTimeString(),
                    'refundedByName' => $jobRequest->payment->refundedBy?->name,
                    'refundReason' => $jobRequest->payment->refund_reason,
                    'disputedAt' => $jobRequest->payment->disputed_at?->toDateTimeString(),
                    'disputedByName' => $jobRequest->payment->disputedBy?->name,
                    'disputeReason' => $jobRequest->payment->dispute_reason,
                    'paidAt' => $jobRequest->payment->paid_at->toDateTimeString(),
                    'processedAt' => $jobRequest->payment->processed_at?->toDateTimeString(),
                    'proofOriginalName' => $jobRequest->payment->proof_original_name,
                    'proofSizeBytes' => $jobRequest->payment->proof_size_bytes,
                    'proofUrl' => $jobRequest->payment->hasProof()
                        ? route('requests.payment.proof', $jobRequest)
                        : null,
                    'confirmedAt' => $jobRequest->payment->confirmed_at?->toDateTimeString(),
                    'revisionRequestedAt' => $jobRequest->payment->revision_requested_at?->toDateTimeString(),
                    'reviewedByName' => $jobRequest->payment->reviewedBy?->name,
                    'reviewNotes' => $jobRequest->payment->review_notes,
                    'receiptUrl' => route('requests.payment.receipt', $jobRequest),
                    'updatedAt' => $jobRequest->payment->updated_at->toDateTimeString(),
                ] : null,
                'messages' => $jobRequest->messages
                    ->sortBy('created_at')
                    ->values()
                    ->map(function ($message) use ($jobRequest): array {
                        return [
                            'id' => $message->id,
                            'body' => $message->body,
                            'attachment' => $message->attachment_path ? [
                                'url' => route('requests.messages.media', [$jobRequest, $message]),
                                'name' => $message->attachment_original_name,
                                'mimeType' => $message->attachment_mime_type,
                                'sizeBytes' => $message->attachment_size_bytes,
                                'isImage' => str_starts_with(
                                    $message->attachment_mime_type ?? '',
                                    'image/',
                                ),
                            ] : null,
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
                'proposals' => $this->visibleProposals($jobRequest, $viewer),
            ],
            'permissions' => [
                'canMessage' => $jobRequest->canMessage($viewer),
                'canAccept' => $jobRequest->canBeAcceptedBy($viewer),
                'canDecline' => $jobRequest->canBeDeclinedBy($viewer),
                'canClose' => $jobRequest->canBeClosedBy($viewer),
                'canReview' => $jobRequest->canBeReviewedBy($viewer),
                'canRespondToReview' => $viewer->id === $jobRequest->provider_id
                    && $jobRequest->review?->moderation_status === 'published'
                    && $jobRequest->review?->provider_response === null,
                'canManageQuote' => $jobRequest->canBeQuotedBy($viewer),
                'canRespondToQuote' => $jobRequest->canQuoteBeRespondedToBy($viewer),
                'canManageSchedule' => $jobRequest->canManageSchedule($viewer),
                'canRespondToSchedule' => $jobRequest->canRespondToSchedule($viewer),
                'canCancelSchedule' => $jobRequest->canCancelSchedule($viewer),
                'canCompleteSchedule' => $jobRequest->canCompleteSchedule($viewer),
                'canManagePayment' => $jobRequest->canManagePayment($viewer),
                'canRespondToPayment' => $jobRequest->canRespondToPayment($viewer),
                'canReleasePayment' => $jobRequest->canReleasePayment($viewer),
                'canDisputePayment' => $jobRequest->canDisputePayment($viewer),
                'canRefundPayment' => $jobRequest->canRefundPayment($viewer),
                'canCreateFollowUp' => $jobRequest->canCreateFollowUp($viewer),
                'canPropose' => $viewer->isProvider() && $jobRequest->canPropose($viewer),
                'canRespondToProposals' => $viewer->id === $jobRequest->customer_id
                    && $jobRequest->status === 'open',
            ],
            'paymentMethodOptions' => config('localserve.payment.method_options'),
            'paymentChannelOptions' => config('localserve.payment.channel_options'),
            'wallet' => [
                'balance' => $wallet->balance,
                'currency' => $wallet->currency,
            ],
            'wallets' => $walletCollection->map(fn ($wallet): array => [
                'balance' => $wallet->balance,
                'currency' => $wallet->currency,
                'label' => config("localserve.payment.currencies.{$wallet->currency}", $wallet->currency),
            ])->values()->all(),
            'currencyOptions' => config('localserve.payment.currencies'),
            'savedPaymentMethods' => $viewer->paymentMethods()
                ->orderByDesc('is_default')
                ->latest('id')
                ->get()
                ->map(fn ($method): array => [
                    'id' => $method->id,
                    'brand' => $method->brand,
                    'label' => $method->label,
                    'lastFour' => $method->last_four,
                    'expMonth' => $method->exp_month,
                    'expYear' => $method->exp_year,
                    'isDefault' => $method->is_default,
                ])
                ->all(),
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

        return $this->renderCreatePage($request, $provider, null, true);
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
            'preferred_date' => ['required', 'date', 'after_or_equal:today'],
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
                ->with('providerProfile.verifiedTradeCategories')
                ->findOrFail($validated['provider_id']);

            abort_unless($provider->isDirectoryVisible(false), 404);

            if (! $provider->hasVerifiedTradeCategory($validated['trade_category'])) {
                throw ValidationException::withMessages([
                    'trade_category' => 'Choose a verified trade offered by this provider.',
                ]);
            }
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
            'preferred_date' => $validated['preferred_date'],
            'budget_min' => $validated['budget_min'] ?? null,
            'budget_max' => $validated['budget_max'] ?? null,
            'city' => $validated['city'],
            'area' => $validated['area'] ?? null,
            'location_notes' => ($validated['location_notes'] ?? null) ?: null,
            'latitude' => $customer->latitude,
            'longitude' => $customer->longitude,
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
        } else {
            foreach ($this->matchingProviders($jobRequest) as $matchingProvider) {
                InAppNotification::notifyUser(
                    $matchingProvider,
                    'request_board_match',
                    'New matching job request',
                    "A {$jobRequest->trade_category} request was posted in {$jobRequest->city}: {$jobRequest->title}.",
                    route('requests.show', $jobRequest),
                    'View opportunity',
                    ['job_request_id' => $jobRequest->id],
                );
            }
        }

        return Redirect::route('requests.show', $jobRequest);
    }

    private function renderCreatePage(
        Request $request,
        ?User $selectedProvider = null,
        ?JobRequest $sourceRequest = null,
        bool $lockProvider = false,
    ): Response {
        $customer = $request->user();

        abort_unless($customer->isCustomer(), 403);

        $customer->loadMissing('customerProfile');
        $selectedProvider?->loadMissing('providerProfile.verifiedTradeCategories');
        $sourceRequest?->loadMissing('provider.providerProfile');

        $providers = $customer->shortlistedProviders()
            ->directoryVisible(false)
            ->with('providerProfile.verifiedTradeCategories')
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

        $prefilledTradeCategory = $this->defaultTradeCategoryForRequest(
            $prefilledProvider,
            $sourceRequest?->trade_category,
            $customer->customerProfile?->default_trade_category,
        );

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
            'lockedProvider' => $lockProvider,
            'defaultValues' => [
                'sourceJobRequestId' => $sourceRequest?->id,
                'providerId' => $prefilledProvider?->id,
                'tradeCategory' => $prefilledTradeCategory,
                'title' => $sourceRequest?->title ?? '',
                'description' => $sourceRequest?->description ?? '',
                'city' => $sourceRequest?->city ?? $customer->city,
                'area' => $sourceRequest?->area ?? $customer->area,
                'urgency' => $sourceRequest?->urgency
                    ?? $customer->customerProfile?->default_urgency
                    ?? array_key_first(config('localserve.request.urgency_options')),
                'preferredDate' => $sourceRequest?->preferred_date?->isFuture()
                    ? $sourceRequest->preferred_date->toDateString()
                    : now()->addDay()->toDateString(),
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
        $tradeCategories = $this->verifiedTradeCategoriesForProvider($provider);

        return [
            'id' => $provider->id,
            'businessName' => $provider->providerProfile->business_name,
            'category' => $tradeCategories[0] ?? $provider->providerProfile->trade_category,
            'tradeCategories' => $tradeCategories,
            'locationLabel' => implode(', ', array_values(array_filter([
                $provider->area,
                $provider->city,
            ]))),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function verifiedTradeCategoriesForProvider(User $provider): array
    {
        $provider->loadMissing('providerProfile.verifiedTradeCategories');

        return $provider->verifiedTradeCategoryNames();
    }

    private function defaultTradeCategoryForRequest(
        ?User $provider,
        ?string $sourceTradeCategory,
        ?string $customerDefaultTradeCategory,
    ): string {
        if (! $provider) {
            return $sourceTradeCategory
                ?? $customerDefaultTradeCategory
                ?? '';
        }

        $providerTradeCategories = $this->verifiedTradeCategoriesForProvider($provider);

        foreach ([$sourceTradeCategory, $customerDefaultTradeCategory] as $candidate) {
            if ($candidate && in_array($candidate, $providerTradeCategories, true)) {
                return $candidate;
            }
        }

        return $providerTradeCategories[0] ?? '';
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
                'proposals',
            ])
            ->when($filters['status'] !== '', fn ($query) => $query->where('status', $filters['status']))
            ->when($filters['urgency'] !== '', fn ($query) => $query->where('urgency', $filters['urgency']))
            ->when($filters['attention'], function ($query) use ($customer): void {
                $this->applyCustomerAttentionFilter($query, $customer);
            })
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
            ->whereHas('payment', fn ($query) => $query->where('status', 'confirmed'))
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
                'pendingProposals' => $customer->customerJobRequests()
                    ->whereHas('proposals', fn ($query) => $query->where('status', 'pending'))
                    ->withCount(['proposals as pending_proposals_count' => fn ($query) => $query->where('status', 'pending')])
                    ->get()
                    ->sum('pending_proposals_count'),
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
            ->when($filters['attention'], function ($query) use ($provider): void {
                $this->applyProviderAttentionFilter($query, $provider);
            })
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

    private function applyCustomerAttentionFilter($query, User $customer): void
    {
        $query->where(function ($attention) use ($customer): void {
            $attention
                ->whereHas('messages', function ($messages) use ($customer): void {
                    $messages
                        ->where('sender_id', '!=', $customer->id)
                        ->where(function ($unread): void {
                            $unread
                                ->whereNull('job_requests.customer_last_read_at')
                                ->orWhereColumn(
                                    'job_request_messages.created_at',
                                    '>',
                                    'job_requests.customer_last_read_at',
                                );
                        });
                })
                ->orWhereHas('proposals', fn ($proposals) => $proposals->where('status', 'pending'))
                ->orWhereHas('quote', fn ($quote) => $quote->where('status', 'pending'))
                ->orWhereHas('schedule', fn ($schedule) => $schedule->where('status', 'proposed'))
                ->orWhereHas('payment', fn ($payment) => $payment->where('status', 'revision_requested'))
                ->orWhere(function ($reviewable): void {
                    $reviewable
                        ->where('status', 'closed')
                        ->whereNotNull('provider_id')
                        ->whereHas('payment', fn ($payment) => $payment->where('status', 'confirmed'))
                        ->whereDoesntHave('review');
                });
        });
    }

    private function applyProviderAttentionFilter($query, User $provider): void
    {
        $query->where(function ($attention) use ($provider): void {
            $attention
                ->whereIn('status', ['targeted', 'in_conversation'])
                ->orWhereHas('messages', function ($messages) use ($provider): void {
                    $messages
                        ->where('sender_id', '!=', $provider->id)
                        ->where(function ($unread): void {
                            $unread
                                ->whereNull('job_requests.provider_last_read_at')
                                ->orWhereColumn(
                                    'job_request_messages.created_at',
                                    '>',
                                    'job_requests.provider_last_read_at',
                                );
                        });
                })
                ->orWhereHas('payment', fn ($payment) => $payment->where('status', 'submitted'));
        });
    }

    private function customerJobRequestPayload(JobRequest $jobRequest, User $customer): array
    {
        return [
            'id' => $jobRequest->id,
            'title' => $jobRequest->title,
            'category' => $jobRequest->trade_category,
            'status' => $jobRequest->status,
            'urgency' => $jobRequest->urgency,
            'preferredDate' => $jobRequest->preferred_date?->toDateString(),
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
            'proposalCount' => $jobRequest->proposals->where('status', 'pending')->count(),
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

    private function visibleProposals(JobRequest $jobRequest, User $viewer): array
    {
        $proposals = $viewer->id === $jobRequest->customer_id || $viewer->isAdmin()
            ? $jobRequest->proposals
            : $jobRequest->proposals->where('provider_id', $viewer->id);

        return $proposals->map(function ($proposal): array {
            $reviewCount = $proposal->provider->receivedProviderReviews->count();
            $averageRating = $reviewCount
                ? round((float) $proposal->provider->receivedProviderReviews->avg('rating'), 1)
                : null;

            return [
                'id' => $proposal->id,
                'providerId' => $proposal->provider_id,
                'providerName' => $proposal->provider->providerProfile?->business_name
                    ?? $proposal->provider->name,
                'verificationStatus' => $proposal->provider->providerProfile?->verification_status,
                'averageRating' => $averageRating,
                'reviewCount' => $reviewCount,
                'amount' => $proposal->amount,
                'timelineDays' => $proposal->timeline_days,
                'summary' => $proposal->summary,
                'notes' => $proposal->notes,
                'validUntil' => $proposal->valid_until?->toDateString(),
                'status' => $proposal->status,
                'createdAt' => $proposal->created_at->toDateTimeString(),
            ];
        })->values()->all();
    }

    private function matchingProviders(JobRequest $jobRequest)
    {
        $query = User::query()
            ->directoryVisible(true)
            ->with('providerProfile')
            ->join('provider_profiles', 'provider_profiles.user_id', '=', 'users.id')
            ->where('provider_profiles.trade_category', $jobRequest->trade_category)
            ->select('users.*');

        if ($jobRequest->latitude !== null && $jobRequest->longitude !== null) {
            return $query
                ->where(function ($location) use ($jobRequest): void {
                    $location
                        ->where(function ($coordinates) use ($jobRequest): void {
                            $coordinates
                                ->whereNotNull('users.latitude')
                                ->whereNotNull('users.longitude');

                            if (DB::connection()->getDriverName() === 'pgsql') {
                                $coordinates->whereRaw(
                                    'earth_distance(ll_to_earth(users.latitude, users.longitude), ll_to_earth(?, ?)) <= COALESCE(provider_profiles.service_radius_km, ?) * 1000',
                                    [
                                        $jobRequest->latitude,
                                        $jobRequest->longitude,
                                        config('localserve.search.default_radius_km'),
                                    ],
                                );
                            } else {
                                $radiusKm = config('localserve.search.default_radius_km');
                                $latitudeDelta = $radiusKm / 111;
                                $longitudeDelta = $radiusKm / max(111 * cos(deg2rad($jobRequest->latitude)), 1);

                                $coordinates
                                    ->whereBetween('users.latitude', [
                                        $jobRequest->latitude - $latitudeDelta,
                                        $jobRequest->latitude + $latitudeDelta,
                                    ])
                                    ->whereBetween('users.longitude', [
                                        $jobRequest->longitude - $longitudeDelta,
                                        $jobRequest->longitude + $longitudeDelta,
                                    ]);
                            }
                        })
                        ->orWhere(function ($cityFallback) use ($jobRequest): void {
                            $cityFallback
                                ->where(function ($missingCoordinates): void {
                                    $missingCoordinates
                                        ->whereNull('users.latitude')
                                        ->orWhereNull('users.longitude');
                                })
                                ->whereRaw('LOWER(users.city) = ?', [mb_strtolower($jobRequest->city)]);
                        });
                })
                ->get();
        }

        return $query
            ->whereRaw('LOWER(users.city) = ?', [mb_strtolower($jobRequest->city)])
            ->get();
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
