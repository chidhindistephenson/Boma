<?php

namespace App\Events;

use App\Models\JobRequest;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Queue\SerializesModels;

class JobRequestConversationRead implements ShouldBroadcastNow, ShouldRescue
{
    use InteractsWithSockets, SerializesModels;

    public function __construct(
        public JobRequest $jobRequest,
        public User $reader,
        public string $readAt,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('job-request.'.$this->jobRequest->id)];
    }

    public function broadcastAs(): string
    {
        return 'conversation.read';
    }

    public function broadcastWith(): array
    {
        return [
            'jobRequestId' => $this->jobRequest->id,
            'readerId' => $this->reader->id,
            'readAt' => $this->readAt,
        ];
    }
}
