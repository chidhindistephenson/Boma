<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Models\ProviderReview;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProviderReviewController extends Controller
{
    public function upsert(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $customer = $request->user();

        $jobRequest->loadMissing(['payment', 'provider']);

        abort_unless($jobRequest->canBeReviewedBy($customer), 403);

        $existingReview = $jobRequest->review()->first();

        abort_if(
            $existingReview
            && ($existingReview->responded_at || $existingReview->moderated_at),
            403,
            'This review is locked because it has already received a response or moderation decision.',
        );

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'headline' => ['nullable', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:1200'],
        ]);

        $isFlagged = $this->containsBlockedLanguage(
            ($validated['headline'] ?? '').' '.$validated['body'],
        ) || (bool) $existingReview?->reports()->exists();

        $review = $jobRequest->review()->updateOrCreate(
            ['job_request_id' => $jobRequest->id],
            [
                'customer_id' => $customer->id,
                'provider_id' => $jobRequest->provider_id,
                'rating' => $validated['rating'],
                'headline' => filled($validated['headline'] ?? null)
                    ? $validated['headline']
                    : null,
                'body' => $validated['body'],
                'moderation_status' => $isFlagged ? 'flagged' : 'published',
                'flag_reason' => $isFlagged
                    ? 'Automated language screening or an existing report requires admin review.'
                    : null,
            ],
        );

        if ($jobRequest->provider) {
            InAppNotification::notifyUser(
                $jobRequest->provider,
                'provider_review',
                $isFlagged ? 'Review awaiting moderation' : 'New customer review',
                $isFlagged
                    ? "A review on {$jobRequest->title} is awaiting an admin decision."
                    : "{$customer->name} published a review on {$jobRequest->title}.",
                route('requests.show', $jobRequest),
                'Read review',
                [
                    'job_request_id' => $jobRequest->id,
                    'customer_id' => $customer->id,
                ],
            );
        }

        if ($isFlagged) {
            $this->notifyAdmins($review, 'Automated review flag');
        }

        return Redirect::back();
    }

    public function respond(Request $request, ProviderReview $review): RedirectResponse
    {
        $provider = $request->user();

        $review->loadMissing(['provider.providerProfile', 'customer', 'jobRequest']);

        abort_unless($provider->id === $review->provider_id, 403);
        abort_unless($review->moderation_status === 'published', 403);
        abort_if($review->provider_response !== null, 403, 'A provider can respond to a review only once.');

        $validated = $request->validate([
            'response' => ['required', 'string', 'max:1200'],
        ]);

        if ($this->containsBlockedLanguage($validated['response'])) {
            throw ValidationException::withMessages([
                'response' => 'Remove abusive language before publishing your response.',
            ]);
        }

        $review->update([
            'provider_response' => $validated['response'],
            'responded_at' => now(),
        ]);

        InAppNotification::notifyUser(
            $review->customer,
            'provider_review_response',
            'Provider responded to your review',
            ($review->provider->providerProfile?->business_name ?? $review->provider->name)
            .' responded to your review.',
            route('requests.show', $review->jobRequest),
            'Read response',
            ['provider_review_id' => $review->id],
        );

        return Redirect::back();
    }

    public function report(Request $request, ProviderReview $review): RedirectResponse
    {
        $reporter = $request->user();

        abort_if($reporter->isAdmin() || $reporter->id === $review->customer_id, 403);
        abort_unless($review->moderation_status === 'published', 403);

        $validated = $request->validate([
            'reason' => [
                'required',
                'string',
                Rule::in(array_keys(config('localserve.reviews.report_reasons'))),
            ],
            'details' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($review->reports()->where('reporter_id', $reporter->id)->exists()) {
            throw ValidationException::withMessages([
                'reason' => 'You have already reported this review.',
            ]);
        }

        DB::transaction(function () use ($review, $reporter, $validated): void {
            $review->reports()->create([
                'reporter_id' => $reporter->id,
                'reason' => $validated['reason'],
                'details' => filled($validated['details'] ?? null)
                    ? $validated['details']
                    : null,
            ]);

            $review->update([
                'moderation_status' => 'flagged',
                'flag_reason' => 'Reported by a marketplace user.',
                'moderated_at' => null,
                'moderated_by_user_id' => null,
                'moderation_notes' => null,
            ]);
        });

        $this->notifyAdmins($review, 'Customer or provider report');

        return Redirect::back();
    }

    private function containsBlockedLanguage(string $content): bool
    {
        $normalized = Str::lower($content);

        foreach (config('localserve.reviews.blocked_terms', []) as $term) {
            if (preg_match('/(?<![\pL\pN])'.preg_quote(Str::lower($term), '/').'(?![\pL\pN])/u', $normalized)) {
                return true;
            }
        }

        return false;
    }

    private function notifyAdmins(ProviderReview $review, string $source): void
    {
        foreach (User::query()->where('role', 'admin')->where('status', 'active')->get() as $admin) {
            InAppNotification::notifyUser(
                $admin,
                'provider_review_flagged',
                'Review needs moderation',
                "{$source}: review #{$review->id} is waiting in the moderation queue.",
                route('admin.reviews.index', ['status' => 'flagged']),
                'Moderate review',
                ['provider_review_id' => $review->id],
            );
        }
    }
}
