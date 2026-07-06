<?php

namespace App\Http\Controllers;

use App\Models\JobRequest;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminRequestController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $admin = $request->user();

        abort_unless($admin->isAdmin(), 403);

        $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', Rule::in(['all', ...array_keys(config('localserve.request.status_options'))])],
            'urgency' => ['nullable', 'string', Rule::in(['all', ...array_keys(config('localserve.request.urgency_options'))])],
            'category' => ['nullable', 'string', Rule::in(['all', ...config('localserve.trade_categories')])],
            'assignment' => ['nullable', 'string', Rule::in(['all', 'targeted', 'open'])],
        ]);

        $filters = [
            'q' => trim($request->string('q')->toString()),
            'status' => $request->string('status')->toString() ?: 'all',
            'urgency' => $request->string('urgency')->toString() ?: 'all',
            'category' => $request->string('category')->toString() ?: 'all',
            'assignment' => $request->string('assignment')->toString() ?: 'all',
        ];

        $baseQuery = JobRequest::query();

        $jobRequests = JobRequest::query()
            ->with(['customer', 'provider.providerProfile', 'messages', 'quote', 'schedule', 'payment'])
            ->when($filters['status'] !== 'all', fn (Builder $query) => $query->where('status', $filters['status']))
            ->when($filters['urgency'] !== 'all', fn (Builder $query) => $query->where('urgency', $filters['urgency']))
            ->when($filters['category'] !== 'all', fn (Builder $query) => $query->where('trade_category', $filters['category']))
            ->when($filters['assignment'] === 'targeted', fn (Builder $query) => $query->whereNotNull('provider_id'))
            ->when($filters['assignment'] === 'open', fn (Builder $query) => $query->whereNull('provider_id'))
            ->when($filters['q'] !== '', function (Builder $query) use ($filters): void {
                $like = '%'.Str::lower($filters['q']).'%';

                $query->where(function (Builder $searchQuery) use ($like): void {
                    $searchQuery
                        ->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(description) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(trade_category) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(city) LIKE ?', [$like])
                        ->orWhereRaw("LOWER(COALESCE(area, '')) LIKE ?", [$like])
                        ->orWhereHas('customer', function (Builder $customerQuery) use ($like): void {
                            $customerQuery
                                ->whereRaw('LOWER(name) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
                        })
                        ->orWhereHas('provider.providerProfile', function (Builder $providerQuery) use ($like): void {
                            $providerQuery->whereRaw('LOWER(business_name) LIKE ?', [$like]);
                        });
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(function (JobRequest $jobRequest): array {
                $lastMessage = $jobRequest->messages->sortByDesc('created_at')->first();

                return [
                    'id' => $jobRequest->id,
                    'title' => $jobRequest->title,
                    'category' => $jobRequest->trade_category,
                    'status' => $jobRequest->status,
                    'urgency' => $jobRequest->urgency,
                    'customerName' => $jobRequest->customer->name,
                    'providerLabel' => $jobRequest->provider?->providerProfile?->business_name
                        ?? 'Open request',
                    'locationLabel' => implode(', ', array_values(array_filter([
                        $jobRequest->area,
                        $jobRequest->city,
                    ]))),
                    'messageCount' => $jobRequest->messages->count(),
                    'quoteStatus' => $jobRequest->quote?->status,
                    'quoteAmount' => $jobRequest->quote?->amount,
                    'scheduleStatus' => $jobRequest->schedule?->status,
                    'scheduledFor' => $jobRequest->schedule?->scheduled_for?->toDateTimeString(),
                    'paymentStatus' => $jobRequest->payment?->status,
                    'paymentAmount' => $jobRequest->payment?->amount,
                    'lastMessageAt' => $lastMessage?->created_at?->toDateTimeString(),
                    'createdAt' => $jobRequest->created_at->toDateTimeString(),
                ];
            });

        return Inertia::render('Admin/Requests/Index', [
            'filters' => $filters,
            'categories' => config('localserve.trade_categories'),
            'statusOptions' => config('localserve.request.status_options'),
            'urgencyOptions' => config('localserve.request.urgency_options'),
            'jobRequests' => $jobRequests,
            'summary' => [
                'total' => (clone $baseQuery)->count(),
                'active' => (clone $baseQuery)
                    ->whereIn('status', ['open', 'targeted', 'in_conversation', 'accepted'])
                    ->count(),
                'closed' => (clone $baseQuery)->where('status', 'closed')->count(),
                'unassigned' => (clone $baseQuery)->whereNull('provider_id')->count(),
            ],
        ]);
    }
}
