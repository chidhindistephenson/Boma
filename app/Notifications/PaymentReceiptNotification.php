<?php

namespace App\Notifications;

use App\Models\JobRequestPayment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentReceiptNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public JobRequestPayment $payment,
        public string $eventType = 'confirmed',
    ) {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->payment->loadMissing(['jobRequest', 'customer', 'provider.providerProfile']);

        $title = match ($this->eventType) {
            'released' => 'Payment released',
            'refunded' => 'Payment refunded',
            default => 'Payment receipt',
        };

        $amount = $this->payment->currency === 'USD'
            ? '$'.number_format($this->payment->amount)
            : config("localserve.payment.currencies.{$this->payment->currency}", $this->payment->currency).' '.number_format($this->payment->amount);

        return (new MailMessage)
            ->subject($title.' - Boma')
            ->greeting('Hello '.$notifiable->name.',')
            ->line("Receipt {$this->receiptNumber()} for {$this->payment->jobRequest->title}.")
            ->line("Amount: {$amount}")
            ->line('Reference: '.($this->payment->reference ?: 'Not supplied'))
            ->line('Status: '.str_replace('_', ' ', $this->payment->status))
            ->line('Escrow: '.str_replace('_', ' ', $this->payment->escrow_status))
            ->action('Open receipt', route('requests.payment.receipt', $this->payment->jobRequest))
            ->line('Keep this receipt for your records.');
    }

    private function receiptNumber(): string
    {
        return 'BOMA-RCP-'.$this->payment->id;
    }
}
