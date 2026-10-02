<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\ProviderReview;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminReviewController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->isAdmin(), 403);

        $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', Rule::in(['all', 'flagged', 'published', 'removed'])],
            'rating' => ['nullable', 'integer', 'between:1,5'],
        ]);

        $filters = [
            'q' => trim($request->string('q')->toString()),
            'status' => $request->string('status')->toString() ?: 'flagged',
            'rating' => $request->integer('rating') ?: null,
        ];

        $reviews = ProviderReview::query()
            ->with([
                'customer',
                'provider.providerProfile',
                'jobRequest',
                'reports.reporter',
                'moderatedBy',
            ])
            ->withCount('reports')
            ->when($filters['status'] !== 'all', fn (Builder $query) => $query->where('moderation_status', $filters['status']))
            ->when($filters['rating'], fn (Builder $query, int $rating) => $query->where('rating', $rating))
            ->when($filters['q'] !== '', function (Builder $query) use ($filters): void {
                $like = '%'.Str::lower($filters['q']).'%';

                $query->where(function (Builder $search) use ($like): void {
                    $search
                        ->whereRaw("LOWER(COALESCE(headline, '')) LIKE ?", [$like])
                        ->orWhereRaw('LOWER(body) LIKE ?', [$like])
                        ->orWhereHas('customer', fn (Builder $customer) => $customer->whereRaw('LOWER(name) LIKE ?', [$like]))
                        ->orWhereHas('provider.providerProfile', fn (Builder $provider) => $provider->whereRaw('LOWER(business_name) LIKE ?', [$like]));
                });
            })
            ->orderByRaw("CASE WHEN moderation_status = 'flagged' THEN 0 ELSE 1 END")
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ProviderReview $review): array => [
                'id' => $review->id,
                'rating' => $review->rating,
                'headline' => $review->headline,
                'body' => $review->body,
                'providerResponse' => $review->provider_response,
                'status' => $review->moderation_status,
                'flagReason' => $review->flag_reason,
                'moderationNotes' => $review->moderation_notes,
                'customerName' => $review->customer->name,
                'providerName' => $review->provider->providerProfile?->business_name
                    ?? $review->provider->name,
                'jobRequestId' => $review->job_request_id,
                'jobTitle' => $review->jobRequest->title,
                'reportCount' => $review->reports_count,
                'reports' => $review->reports->map(fn ($report): array => [
                    'id' => $report->id,
                    'reason' => config('localserve.reviews.report_reasons.'.$report->reason, $report->reason),
                    'details' => $report->details,
                    'reporterName' => $report->reporter->name,
                    'createdAt' => $report->created_at->toDateTimeString(),
                ])->all(),
                'moderatedByName' => $review->moderatedBy?->name,
                'moderatedAt' => $review->moderated_at?->toDateTimeString(),
                'createdAt' => $review->created_at->toDateTimeString(),
            ]);

        return Inertia::render('Admin/Reviews/Index', [
            'filters' => $filters,
            'reviews' => $reviews,
            'summary' => [
                'total' => ProviderReview::query()->count(),
                'flagged' => ProviderReview::query()->where('moderation_status', 'flagged')->count(),
                'published' => ProviderReview::query()->where('moderation_status', 'published')->count(),
                'removed' => ProviderReview::query()->where('moderation_status', 'removed')->count(),
            ],
        ]);
    }

    public function update(Request $request, ProviderReview $review): RedirectResponse
    {
        $admin = $request->user();

        abort_unless($admin->isAdmin(), 403);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['publish', 'remove'])],
            'moderation_notes' => [
                Rule::requiredIf($request->string('action')->toString() === 'remove'),
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $status = $validated['action'] === 'publish' ? 'published' : 'removed';

        $review->update([
            'moderation_status' => $status,
            'moderation_notes' => filled($validated['moderation_notes'] ?? null)
                ? $validated['moderation_notes']
                : null,
            'moderated_at' => now(),
            'moderated_by_user_id' => $admin->id,
        ]);

        $review->loadMissing(['customer', 'provider.providerProfile', 'jobRequest']);

        foreach ([$review->customer, $review->provider] as $recipient) {
            InAppNotification::notifyUser(
                $recipient,
                'provider_review_moderated',
                $status === 'published' ? 'Review approved' : 'Review removed',
                $status === 'published'
                    ? "The review on {$review->jobRequest->title} is now public."
                    : "The review on {$review->jobRequest->title} was removed after moderation.",
                route('requests.show', $review->jobRequest),
                'View request',
                ['provider_review_id' => $review->id, 'status' => $status],
            );
        }

        return Redirect::back();
    }
}
