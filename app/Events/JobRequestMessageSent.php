<?php

namespace App\Events;

use App\Models\JobRequestMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Queue\SerializesModels;

class JobRequestMessageSent implements ShouldBroadcastNow, ShouldDispatchAfterCommit, ShouldRescue
{
    use InteractsWithSockets, SerializesModels;

    public function __construct(public JobRequestMessage $message)
    {
        $this->message->loadMissing(['sender.providerProfile', 'jobRequest']);
    }

    public function broadcastOn(): array
    {
        $jobRequest = $this->message->jobRequest;
        $recipientId = $this->message->sender_id === $jobRequest->customer_id
            ? $jobRequest->provider_id
            : $jobRequest->customer_id;

        return array_values(array_filter([
            new PrivateChannel('job-request.'.$this->message->job_request_id),
            $recipientId ? new PrivateChannel('user.'.$recipientId) : null,
        ]));
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'jobRequestId' => $this->message->job_request_id,
            'message' => [
                'id' => $this->message->id,
                'body' => $this->message->body,
                'attachment' => $this->message->attachment_path ? [
                    'url' => route('requests.messages.media', [
                        $this->message->job_request_id,
                        $this->message,
                    ]),
                    'name' => $this->message->attachment_original_name,
                    'mimeType' => $this->message->attachment_mime_type,
                    'sizeBytes' => $this->message->attachment_size_bytes,
                    'isImage' => str_starts_with(
                        $this->message->attachment_mime_type ?? '',
                        'image/',
                    ),
                ] : null,
                'createdAt' => $this->message->created_at->toDateTimeString(),
                'sender' => [
                    'id' => $this->message->sender->id,
                    'name' => $this->message->sender->name,
                    'role' => $this->message->sender->role,
                    'businessName' => $this->message->sender->providerProfile?->business_name,
                ],
            ],
        ];
    }
}
