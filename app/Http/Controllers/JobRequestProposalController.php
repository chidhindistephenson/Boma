<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Models\JobRequestProposal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class JobRequestProposalController extends Controller
{
    public function upsert(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $provider = $request->user();

        abort_unless($provider->isProvider() && $jobRequest->canPropose($provider), 403);

        $validated = $request->validate($this->rules());
        $existing = $jobRequest->proposals()->where('provider_id', $provider->id)->first();

        abort_if(
            $existing && ! in_array($existing->status, ['pending', 'withdrawn'], true),
            403,
        );

        $proposal = $jobRequest->proposals()->updateOrCreate(
            ['provider_id' => $provider->id],
            [
                ...$validated,
                'notes' => ($validated['notes'] ?? null) ?: null,
                'valid_until' => $validated['valid_until'] ?? null,
                'status' => 'pending',
                'responded_at' => null,
            ],
        );

        InAppNotification::notifyUser(
            $jobRequest->customer,
            $existing ? 'request_proposal_updated' : 'request_proposal_created',
            $existing ? 'Proposal updated' : 'New proposal received',
            ($provider->providerProfile?->business_name ?? $provider->name)
            ." sent a proposal for {$jobRequest->title}.",
            route('requests.show', $jobRequest),
            'Compare proposals',
            ['job_request_id' => $jobRequest->id, 'proposal_id' => $proposal->id],
        );

        return Redirect::route('requests.show', $jobRequest);
    }

    public function withdraw(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $provider = $request->user();
        $proposal = $jobRequest->proposals()->where('provider_id', $provider->id)->firstOrFail();

        abort_unless($jobRequest->status === 'open' && $proposal->status === 'pending', 403);

        $proposal->update(['status' => 'withdrawn', 'responded_at' => now()]);

        InAppNotification::notifyUser(
            $jobRequest->customer,
            'request_proposal_withdrawn',
            'Proposal withdrawn',
            ($provider->providerProfile?->business_name ?? $provider->name)
            ." withdrew their proposal for {$jobRequest->title}.",
            route('requests.show', $jobRequest),
            'Open request',
            ['job_request_id' => $jobRequest->id, 'proposal_id' => $proposal->id],
        );

        return Redirect::route('request-board.index');
    }

    public function respond(
        Request $request,
        JobRequest $jobRequest,
        JobRequestProposal $proposal,
    ): RedirectResponse {
        $customer = $request->user();

        abort_unless($customer->id === $jobRequest->customer_id, 403);
        abort_unless($proposal->job_request_id === $jobRequest->id, 404);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['accept', 'decline'])],
        ]);

        $losingProposals = $validated['action'] === 'accept'
            ? $jobRequest->proposals()
                ->with('provider.providerProfile')
                ->whereKeyNot($proposal->id)
                ->where('status', 'pending')
                ->get()
            : collect();

        DB::transaction(function () use ($jobRequest, $proposal, $validated): void {
            $lockedRequest = JobRequest::query()->lockForUpdate()->findOrFail($jobRequest->id);
            $lockedProposal = JobRequestProposal::query()->lockForUpdate()->findOrFail($proposal->id);

            abort_unless($lockedRequest->status === 'open' && $lockedProposal->status === 'pending', 403);

            if ($validated['action'] === 'decline') {
                $lockedProposal->update(['status' => 'declined', 'responded_at' => now()]);

                return;
            }

            $lockedProposal->update(['status' => 'accepted', 'responded_at' => now()]);
            $lockedRequest->proposals()
                ->whereKeyNot($lockedProposal->id)
                ->where('status', 'pending')
                ->update(['status' => 'declined', 'responded_at' => now()]);
            $lockedRequest->update([
                'provider_id' => $lockedProposal->provider_id,
                'status' => 'accepted',
                'provider_last_read_at' => now(),
            ]);
            $lockedRequest->quote()->create([
                'provider_id' => $lockedProposal->provider_id,
                'amount' => $lockedProposal->amount,
                'timeline_days' => $lockedProposal->timeline_days,
                'summary' => $lockedProposal->summary,
                'notes' => $lockedProposal->notes,
                'valid_until' => $lockedProposal->valid_until,
                'status' => 'accepted',
                'responded_at' => now(),
            ]);
        });

        $proposal->refresh()->loadMissing('provider.providerProfile');

        InAppNotification::notifyUser(
            $proposal->provider,
            $proposal->status === 'accepted' ? 'request_proposal_accepted' : 'request_proposal_declined',
            $proposal->status === 'accepted' ? 'Proposal accepted' : 'Proposal declined',
            "{$customer->name} {$proposal->status} your proposal for {$jobRequest->title}.",
            route('requests.show', $jobRequest),
            'Open request',
            ['job_request_id' => $jobRequest->id, 'proposal_id' => $proposal->id],
        );

        foreach ($losingProposals as $losingProposal) {
            InAppNotification::notifyUser(
                $losingProposal->provider,
                'request_proposal_not_selected',
                'Another proposal was selected',
                "The customer selected another provider for {$jobRequest->title}.",
                route('request-board.index'),
                'View job board',
                ['job_request_id' => $jobRequest->id, 'proposal_id' => $losingProposal->id],
            );
        }

        return Redirect::route('requests.show', $jobRequest);
    }

    private function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'timeline_days' => ['required', 'integer', 'min:1', 'max:365'],
            'summary' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1200'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:today'],
        ];
    }
}
