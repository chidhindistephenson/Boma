<?php

namespace App\Http\Controllers;

use App\Events\JobRequestConversationRead;
use App\Models\JobRequest;
use App\Models\JobRequestMessage;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class InboxController extends Controller
{
    public function index(Request $request, ?JobRequest $jobRequest = null): Response
    {
        $viewer = $request->user();
        abort_unless($viewer->isCustomer() || $viewer->isProvider(), 403);

        $request->validate(['q' => ['nullable', 'string', 'max:120']]);
        $search = trim($request->string('q')->toString());

        $query = $this->conversationQuery($viewer)
            ->with(['customer', 'provider.providerProfile', 'latestMessage.sender'])
            ->withCount([
                'messages',
                'messages as unread_messages_count' => function (Builder $messages) use ($viewer): void {
                    $lastReadColumn = $viewer->isCustomer()
                        ? 'customer_last_read_at'
                        : 'provider_last_read_at';

                    $messages
                        ->where('sender_id', '!=', $viewer->id)
                        ->where(function (Builder $unread) use ($lastReadColumn): void {
                            $unread
                                ->whereNull("job_requests.{$lastReadColumn}")
                                ->orWhereColumn(
                                    'job_request_messages.created_at',
                                    '>',
                                    "job_requests.{$lastReadColumn}",
                                );
                        });
                },
            ])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $like = '%'.Str::lower($search).'%';

                $query->where(function (Builder $searchQuery) use ($like): void {
                    $searchQuery
                        ->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(trade_category) LIKE ?', [$like])
                        ->orWhereHas('customer', fn (Builder $customer) => $customer
                            ->whereRaw('LOWER(name) LIKE ?', [$like]))
                        ->orWhereHas('provider.providerProfile', fn (Builder $provider) => $provider
                            ->whereRaw('LOWER(business_name) LIKE ?', [$like]));
                });
            })
            ->orderByDesc(
                JobRequestMessage::query()
                    ->select('created_at')
                    ->whereColumn('job_request_id', 'job_requests.id')
                    ->latest('created_at')
                    ->limit(1),
            );

        $threads = $query->paginate(30)->withQueryString();

        if ($jobRequest?->exists) {
            $this->authorizeConversation($jobRequest, $viewer);
        } else {
            $firstThreadId = $threads->getCollection()->first()?->id;
            $jobRequest = $firstThreadId
                ? JobRequest::query()->findOrFail($firstThreadId)
                : null;
        }

        $selectedThread = $jobRequest
            ? $this->selectedThreadPayload($jobRequest, $viewer)
            : null;

        $threads->through(fn (JobRequest $thread): array => $this->threadPayload($thread, $viewer));

        return Inertia::render('Inbox/Index', [
            'filters' => ['q' => $search],
            'threads' => $threads,
            'selectedThread' => $selectedThread,
            'reportReasons' => config('localserve.chat.report_reasons'),
        ]);
    }

    public function messages(Request $request, JobRequest $jobRequest): JsonResponse
    {
        $viewer = $request->user();
        $this->authorizeConversation($jobRequest, $viewer);

        $validated = $request->validate([
            'before' => ['required', 'integer', 'min:1'],
        ]);

        return response()->json($this->messagePage(
            $jobRequest,
            $viewer,
            (int) $validated['before'],
        ));
    }

    private function conversationQuery(User $viewer): Builder
    {
        $participantColumn = $viewer->isCustomer() ? 'customer_id' : 'provider_id';

        return JobRequest::query()
            ->where($participantColumn, $viewer->id)
            ->whereNotNull('provider_id')
            ->whereNull('chat_removed_at')
            ->whereHas('messages');
    }

    private function authorizeConversation(JobRequest $jobRequest, User $viewer): void
    {
        abort_unless(
            $jobRequest->chat_removed_at === null
            && $jobRequest->provider_id !== null
            && ($viewer->id === $jobRequest->customer_id || $viewer->id === $jobRequest->provider_id)
            && $jobRequest->messages()->exists(),
            403,
        );
    }

    private function selectedThreadPayload(JobRequest $jobRequest, User $viewer): array
    {
        $jobRequest->loadMissing(['customer', 'provider.providerProfile']);
        $unreadCount = $jobRequest->unreadCountFor($viewer);

        if ($unreadCount > 0) {
            $jobRequest->markAsReadFor($viewer);
            $readAt = $viewer->id === $jobRequest->customer_id
                ? $jobRequest->customer_last_read_at
                : $jobRequest->provider_last_read_at;

            broadcast(new JobRequestConversationRead(
                $jobRequest,
                $viewer,
                $readAt->toISOString(),
            ))->toOthers();
        }

        $messagePage = $this->messagePage($jobRequest, $viewer);
        $other = $viewer->id === $jobRequest->customer_id
            ? $jobRequest->provider
            : $jobRequest->customer;
        $otherReadAt = $viewer->id === $jobRequest->customer_id
            ? $jobRequest->provider_last_read_at
            : $jobRequest->customer_last_read_at;

        return [
            'id' => $jobRequest->id,
            'title' => $jobRequest->title,
            'category' => $jobRequest->trade_category,
            'status' => $jobRequest->status,
            'otherParticipant' => [
                'id' => $other->id,
                'name' => $other->isProvider()
                    ? ($other->providerProfile?->business_name ?? $other->name)
                    : $other->name,
                'role' => $other->role,
            ],
            'messages' => $messagePage['messages'],
            'hasOlderMessages' => $messagePage['hasOlderMessages'],
            'otherReadAt' => $otherReadAt?->toISOString(),
            'canMessage' => $jobRequest->canMessage($viewer),
            'isMuted' => $jobRequest->chat_muted_at !== null,
            'moderationNote' => $jobRequest->chat_moderation_notes,
            'hasReported' => $jobRequest->conversationReports()
                ->where('reporter_id', $viewer->id)
                ->where('status', 'pending')
                ->exists(),
            'requestUrl' => route('requests.show', $jobRequest),
        ];
    }

    private function threadPayload(JobRequest $jobRequest, User $viewer): array
    {
        $other = $viewer->id === $jobRequest->customer_id
            ? $jobRequest->provider
            : $jobRequest->customer;
        $lastMessage = $jobRequest->latestMessage;

        return [
            'id' => $jobRequest->id,
            'title' => $jobRequest->title,
            'category' => $jobRequest->trade_category,
            'status' => $jobRequest->status,
            'otherName' => $other->isProvider()
                ? ($other->providerProfile?->business_name ?? $other->name)
                : $other->name,
            'lastMessage' => $lastMessage?->body
                ?: ($lastMessage?->attachment_path ? 'Attachment: '.$lastMessage->attachment_original_name : ''),
            'lastMessageAt' => $lastMessage?->created_at?->toISOString(),
            'messageCount' => $jobRequest->messages_count,
            'unreadCount' => (int) $jobRequest->unread_messages_count,
            'isMuted' => $jobRequest->chat_muted_at !== null,
        ];
    }

    private function messagePage(
        JobRequest $jobRequest,
        User $viewer,
        ?int $before = null,
    ): array {
        $messages = $jobRequest->messages()
            ->with('sender.providerProfile')
            ->when($before, fn ($query) => $query->where('id', '<', $before))
            ->latest('id')
            ->limit(31)
            ->get();
        $hasOlderMessages = $messages->count() > 30;
        $messages = $messages->take(30)->reverse()->values();

        return [
            'messages' => $this->messagePayloads($messages, $viewer, $jobRequest),
            'hasOlderMessages' => $hasOlderMessages,
        ];
    }

    private function messagePayloads(
        Collection $messages,
        User $viewer,
        JobRequest $jobRequest,
    ): array {
        return $messages->map(fn (JobRequestMessage $message): array => [
            'id' => $message->id,
            'body' => $message->body,
            'isOwn' => $message->sender_id === $viewer->id,
            'createdAt' => $message->created_at->toISOString(),
            'attachment' => $message->attachment_path ? [
                'url' => route('requests.messages.media', [$jobRequest, $message]),
                'name' => $message->attachment_original_name,
                'mimeType' => $message->attachment_mime_type,
                'sizeBytes' => $message->attachment_size_bytes,
                'isImage' => str_starts_with($message->attachment_mime_type ?? '', 'image/'),
            ] : null,
        ])->all();
    }
}
