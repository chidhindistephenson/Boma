<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminConversationController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->isAdmin(), 403);

        $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', Rule::in(['all', 'reported', 'muted', 'removed', 'active'])],
        ]);

        $filters = [
            'q' => trim($request->string('q')->toString()),
            'status' => $request->string('status')->toString() ?: 'reported',
        ];

        $conversations = JobRequest::query()
            ->whereNotNull('provider_id')
            ->whereHas('messages')
            ->with([
                'customer',
                'provider.providerProfile',
                'latestMessage.sender',
                'conversationReports.reporter',
                'chatMutedBy',
                'chatRemovedBy',
            ])
            ->withCount(['messages', 'conversationReports as pending_reports_count' => fn (Builder $query) => $query
                ->where('status', 'pending')])
            ->when($filters['status'] === 'reported', fn (Builder $query) => $query
                ->whereHas('conversationReports', fn (Builder $reports) => $reports->where('status', 'pending')))
            ->when($filters['status'] === 'muted', fn (Builder $query) => $query
                ->whereNotNull('chat_muted_at')->whereNull('chat_removed_at'))
            ->when($filters['status'] === 'removed', fn (Builder $query) => $query
                ->whereNotNull('chat_removed_at'))
            ->when($filters['status'] === 'active', fn (Builder $query) => $query
                ->whereNull('chat_muted_at')->whereNull('chat_removed_at'))
            ->when($filters['q'] !== '', function (Builder $query) use ($filters): void {
                $like = '%'.Str::lower($filters['q']).'%';

                $query->where(function (Builder $search) use ($like): void {
                    $search
                        ->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereHas('customer', fn (Builder $customer) => $customer
                            ->whereRaw('LOWER(name) LIKE ?', [$like]))
                        ->orWhereHas('provider.providerProfile', fn (Builder $provider) => $provider
                            ->whereRaw('LOWER(business_name) LIKE ?', [$like]));
                });
            })
            ->orderByDesc('pending_reports_count')
            ->latest('updated_at')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (JobRequest $conversation): array => [
                'id' => $conversation->id,
                'title' => $conversation->title,
                'category' => $conversation->trade_category,
                'customerName' => $conversation->customer->name,
                'providerName' => $conversation->provider->providerProfile?->business_name
                    ?? $conversation->provider->name,
                'messageCount' => $conversation->messages_count,
                'lastMessage' => $conversation->latestMessage?->body
                    ?: ($conversation->latestMessage?->attachment_path ? 'Attachment' : 'No text'),
                'lastMessageAt' => $conversation->latestMessage?->created_at?->toISOString(),
                'pendingReportCount' => $conversation->pending_reports_count,
                'reports' => $conversation->conversationReports->map(fn ($report): array => [
                    'id' => $report->id,
                    'reason' => config('localserve.chat.report_reasons.'.$report->reason, $report->reason),
                    'details' => $report->details,
                    'status' => $report->status,
                    'reporterName' => $report->reporter->name,
                    'createdAt' => $report->created_at->toISOString(),
                ])->all(),
                'isMuted' => $conversation->chat_muted_at !== null,
                'isRemoved' => $conversation->chat_removed_at !== null,
                'moderationNotes' => $conversation->chat_moderation_notes,
                'moderatedByName' => $conversation->chatRemovedBy?->name
                    ?? $conversation->chatMutedBy?->name,
                'requestUrl' => route('requests.show', $conversation),
            ]);

        return Inertia::render('Admin/Conversations/Index', [
            'filters' => $filters,
            'conversations' => $conversations,
            'summary' => [
                'reported' => JobRequest::query()->whereHas(
                    'conversationReports',
                    fn (Builder $query) => $query->where('status', 'pending'),
                )->count(),
                'muted' => JobRequest::query()->whereNotNull('chat_muted_at')->whereNull('chat_removed_at')->count(),
                'removed' => JobRequest::query()->whereNotNull('chat_removed_at')->count(),
            ],
        ]);
    }

    public function update(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $admin = $request->user();
        abort_unless($admin->isAdmin(), 403);
        abort_unless($jobRequest->provider_id !== null && $jobRequest->messages()->exists(), 404);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['mute', 'restore', 'remove', 'dismiss'])],
            'moderation_notes' => [
                Rule::requiredIf(in_array($request->string('action')->toString(), ['mute', 'remove'], true)),
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        DB::transaction(function () use ($jobRequest, $admin, $validated): void {
            $action = $validated['action'];
            $updates = [
                'chat_moderation_notes' => filled($validated['moderation_notes'] ?? null)
                    ? $validated['moderation_notes']
                    : null,
            ];

            if ($action === 'mute') {
                $updates += ['chat_muted_at' => now(), 'chat_muted_by_user_id' => $admin->id];
            } elseif ($action === 'remove') {
                $updates += [
                    'chat_muted_at' => now(),
                    'chat_muted_by_user_id' => $admin->id,
                    'chat_removed_at' => now(),
                    'chat_removed_by_user_id' => $admin->id,
                ];
            } elseif ($action === 'restore') {
                $updates += [
                    'chat_muted_at' => null,
                    'chat_muted_by_user_id' => null,
                    'chat_removed_at' => null,
                    'chat_removed_by_user_id' => null,
                ];
            }

            $jobRequest->update($updates);
            $jobRequest->conversationReports()
                ->where('status', 'pending')
                ->update(['status' => 'reviewed', 'updated_at' => now()]);
        });

        $jobRequest->loadMissing(['customer', 'provider.providerProfile']);
        foreach ([$jobRequest->customer, $jobRequest->provider] as $participant) {
            InAppNotification::notifyUser(
                $participant,
                'conversation_moderated',
                'Conversation safety review completed',
                $this->moderationMessage($validated['action'], $jobRequest->title),
                $validated['action'] === 'remove' ? route('inbox.index') : route('inbox.show', $jobRequest),
                'Open inbox',
                ['job_request_id' => $jobRequest->id, 'action' => $validated['action']],
            );
        }

        return Redirect::back()->with('success', 'Conversation moderation updated.');
    }

    private function moderationMessage(string $action, string $title): string
    {
        return match ($action) {
            'mute' => "Messaging on {$title} was paused after a safety review.",
            'remove' => "The conversation on {$title} was removed after a safety review.",
            'restore' => "Messaging on {$title} has been restored.",
            default => "The report on {$title} was reviewed and dismissed.",
        };
    }
}
