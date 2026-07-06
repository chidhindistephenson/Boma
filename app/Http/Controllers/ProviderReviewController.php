<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class ProviderReviewController extends Controller
{
    public function upsert(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $customer = $request->user();

        abort_unless($jobRequest->canBeReviewedBy($customer), 403);

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'headline' => ['nullable', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:1200'],
        ]);

        $jobRequest->review()->updateOrCreate(
            ['job_request_id' => $jobRequest->id],
            [
                'customer_id' => $customer->id,
                'provider_id' => $jobRequest->provider_id,
                'rating' => $validated['rating'],
                'headline' => filled($validated['headline'] ?? null)
                    ? $validated['headline']
                    : null,
                'body' => $validated['body'],
            ],
        );

        if ($jobRequest->provider) {
            InAppNotification::notifyUser(
                $jobRequest->provider,
                'provider_review',
                'New customer review',
                "{$customer->name} published a review on {$jobRequest->title}.",
                route('requests.show', $jobRequest),
                'Read review',
                [
                    'job_request_id' => $jobRequest->id,
                    'customer_id' => $customer->id,
                ],
            );
        }

        return Redirect::back();
    }
}
