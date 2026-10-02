<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class ConversationReportController extends Controller
{
    public function __invoke(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $reporter = $request->user();

        abort_unless(
            $jobRequest->chat_removed_at === null
            && ($reporter->id === $jobRequest->customer_id || $reporter->id === $jobRequest->provider_id),
            403,
        );

        $validated = $request->validate([
            'reason' => [
                'required',
                'string',
                Rule::in(array_keys(config('localserve.chat.report_reasons'))),
            ],
            'details' => ['nullable', 'string', 'max:1000'],
        ]);

        $jobRequest->conversationReports()->updateOrCreate(
            ['reporter_id' => $reporter->id],
            [
                'reason' => $validated['reason'],
                'details' => filled($validated['details'] ?? null)
                    ? $validated['details']
                    : null,
                'status' => 'pending',
            ],
        );

        User::query()->where('role', 'admin')->each(function (User $admin) use ($jobRequest): void {
            InAppNotification::notifyUser(
                $admin,
                'conversation_reported',
                'Conversation requires review',
                "A participant reported the conversation on {$jobRequest->title}.",
                route('admin.conversations.index', ['status' => 'reported']),
                'Review conversation',
                ['job_request_id' => $jobRequest->id],
            );
        });

        return Redirect::back()->with('success', 'Conversation reported for review.');
    }
}
