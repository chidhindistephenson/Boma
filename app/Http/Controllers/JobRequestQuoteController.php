<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class JobRequestQuoteController extends Controller
{
    public function upsert(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $viewer = $request->user();

        $jobRequest->loadMissing(['customer', 'provider.providerProfile', 'quote']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->canBeQuotedBy($viewer), 403);

        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'timeline_days' => ['required', 'integer', 'min:1', 'max:365'],
            'summary' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1200'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:today'],
        ]);

        $isUpdate = $jobRequest->quote !== null;

        $quote = $jobRequest->quote()->updateOrCreate(
            [],
            [
                'provider_id' => $viewer->id,
                'amount' => $validated['amount'],
                'timeline_days' => $validated['timeline_days'],
                'status' => 'pending',
                'summary' => $validated['summary'],
                'notes' => ($validated['notes'] ?? null) ?: null,
                'valid_until' => $validated['valid_until'] ?? null,
                'responded_at' => null,
            ],
        );

        if ($jobRequest->status === 'targeted') {
            $jobRequest->update(['status' => 'in_conversation']);
        }

        InAppNotification::notifyUser(
            $jobRequest->customer,
            $isUpdate ? 'request_quote_updated' : 'request_quote_created',
            $isUpdate ? 'Quote updated' : 'New quote received',
            ($jobRequest->provider?->providerProfile?->business_name ?? $jobRequest->provider?->name ?? 'A provider')
            .' sent a quote for '.$jobRequest->title.'.',
            route('requests.show', $jobRequest),
            'Review quote',
            [
                'job_request_id' => $jobRequest->id,
                'quote_id' => $quote->id,
            ],
        );

        return Redirect::route('requests.show', $jobRequest);
    }
}
