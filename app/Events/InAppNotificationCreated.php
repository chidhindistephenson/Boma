<?php

namespace App\Events;

use App\Models\InAppNotification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Queue\SerializesModels;

class InAppNotificationCreated implements ShouldBroadcastNow, ShouldRescue
{
    use InteractsWithSockets, SerializesModels;

    public function __construct(public InAppNotification $notification) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('user.'.$this->notification->user_id)];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    public function broadcastWith(): array
    {
        return [
            'notification' => [
                'id' => $this->notification->id,
                'type' => $this->notification->type,
                'category' => $this->notification->category(),
                'title' => $this->notification->title,
                'body' => $this->notification->body,
                'actionUrl' => $this->notification->action_url,
                'actionLabel' => $this->notification->action_label,
                'isRead' => false,
                'readAt' => null,
                'createdAt' => $this->notification->created_at->toISOString(),
                'createdLabel' => 'Just now',
            ],
        ];
    }
}
