<?php

namespace App\Notifications;

use App\Models\InAppNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BomaActivityNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public InAppNotification $activity)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->activity->title.' - Boma')
            ->greeting('Hello '.$notifiable->name.',')
            ->line($this->activity->body ?: $this->activity->title);

        if ($this->activity->action_url) {
            $mail->action(
                $this->activity->action_label ?: 'Open Boma',
                $this->activity->action_url,
            );
        }

        return $mail->line('You can control these email alerts from your notification settings.');
    }
}
