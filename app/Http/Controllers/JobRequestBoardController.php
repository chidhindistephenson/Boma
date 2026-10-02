<?php

namespace App\Http\Controllers;

use App\Models\JobRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class JobRequestBoardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $provider = $request->user()->loadMissing('providerProfile');

        abort_unless($provider->isProvider() && $provider->isDirectoryVisible(true), 403);

        $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'urgency' => ['nullable', 'string', Rule::in(array_keys(config('localserve.request.urgency_options')))],
        ]);

        $filters = [
            'q' => trim($request->string('q')->toString()),
            'urgency' => trim($request->string('urgency')->toString()),
        ];

        $baseQuery = JobRequest::query()->openForProvider($provider);

        $jobRequests = (clone $baseQuery)
            ->with([
                'customer',
                'proposals' => fn ($query) => $query->where('provider_id', $provider->id),
            ])
            ->when($filters['urgency'] !== '', fn (Builder $query) => $query->where('urgency', $filters['urgency']))
            ->when($filters['q'] !== '', function (Builder $query) use ($filters): void {
                $like = '%'.mb_strtolower($filters['q']).'%';

                $query->where(function (Builder $search) use ($like): void {
                    $search
                        ->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(description) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(city) LIKE ?', [$like])
                        ->orWhereRaw("LOWER(COALESCE(area, '')) LIKE ?", [$like]);
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (JobRequest $jobRequest): array => [
                'id' => $jobRequest->id,
                'title' => $jobRequest->title,
                'description' => $jobRequest->description,
                'category' => $jobRequest->trade_category,
                'urgency' => $jobRequest->urgency,
                'preferredDate' => $jobRequest->preferred_date?->toDateString(),
                'budgetMin' => $jobRequest->budget_min,
                'budgetMax' => $jobRequest->budget_max,
                'locationLabel' => implode(', ', array_values(array_filter([
                    $jobRequest->area,
                    $jobRequest->city,
                ]))),
                'customerFirstName' => str($jobRequest->customer->name)->before(' ')->toString(),
                'proposal' => $this->proposalPayload($jobRequest, $provider),
                'createdAt' => $jobRequest->created_at->toDateTimeString(),
            ]);

        return Inertia::render('Requests/Board', [
            'filters' => $filters,
            'urgencyOptions' => config('localserve.request.urgency_options'),
            'jobRequests' => $jobRequests,
            'summary' => [
                'matched' => (clone $baseQuery)->count(),
                'proposed' => $provider->jobRequestProposals()->where('status', 'pending')->count(),
                'accepted' => $provider->jobRequestProposals()->where('status', 'accepted')->count(),
            ],
        ]);
    }

    private function proposalPayload(JobRequest $jobRequest, User $provider): ?array
    {
        $proposal = $jobRequest->proposals->firstWhere('provider_id', $provider->id);

        return $proposal ? [
            'id' => $proposal->id,
            'amount' => $proposal->amount,
            'timelineDays' => $proposal->timeline_days,
            'status' => $proposal->status,
        ] : null;
    }
}
