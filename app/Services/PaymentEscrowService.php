<?php

namespace App\Services;

use App\Models\JobRequestPayment;
use App\Models\User;
use Illuminate\Support\Carbon;
use RuntimeException;

class PaymentEscrowService
{
    public function __construct(
        private WalletService $wallets,
        private FinancialAuditService $audit,
        private PaymentReceiptService $receipts,
    ) {
    }

    public function hold(JobRequestPayment $payment): JobRequestPayment
    {
        $payment->loadMissing('jobRequest.schedule');
        $alreadyHeld = $payment->status === 'confirmed' && $payment->escrow_status === 'held';
        [$platformFee, $providerNet] = $this->feeAmounts($payment);

        $payment->update([
            'escrow_status' => 'held',
            'escrow_held_at' => $payment->escrow_held_at ?? now(),
            'release_due_at' => $this->releaseDueAt($payment),
            'released_at' => null,
            'released_by_user_id' => null,
            'release_reason' => null,
            'platform_fee_amount' => $platformFee,
            'provider_net_amount' => $providerNet,
        ]);

        $payment = $payment->refresh();
        if (! $alreadyHeld) {
            $this->audit->recordPayment($payment, 'payment_held');
            $this->receipts->send($payment, 'confirmed');
        }

        return $payment;
    }

    public function markExternal(JobRequestPayment $payment): JobRequestPayment
    {
        $alreadyConfirmedExternal = $payment->status === 'confirmed' && $payment->escrow_status === 'external';

        $payment->update([
            'escrow_status' => 'external',
            'escrow_held_at' => null,
            'release_due_at' => null,
            'released_at' => null,
            'released_by_user_id' => null,
            'release_reason' => null,
        ]);

        $payment = $payment->refresh();
        if (! $alreadyConfirmedExternal) {
            $this->audit->recordPayment($payment, 'payment_confirmed_external');
            $this->receipts->send($payment, 'confirmed');
        }

        return $payment;
    }

    public function release(
        JobRequestPayment $payment,
        ?User $releasedBy = null,
        string $reason = 'customer_confirmed',
    ): JobRequestPayment {
        $payment->loadMissing(['jobRequest', 'provider']);
        [$platformFee, $providerNet] = $this->feeAmounts($payment);

        $providerCredit = $payment->provider_wallet_transaction_id
            ? null
            : $this->wallets->credit(
                $payment->provider,
                $providerNet,
                'provider_earning',
                "Released payment for {$payment->jobRequest->title}",
                [
                    'job_request_id' => $payment->job_request_id,
                    'job_request_payment_id' => $payment->id,
                    'release_reason' => $reason,
                    'gross_amount' => $payment->amount,
                    'platform_fee_amount' => $platformFee,
                ],
                $payment->currency,
            );

        $payment->update([
            'escrow_status' => 'released',
            'released_at' => now(),
            'released_by_user_id' => $releasedBy?->id,
            'release_reason' => $reason,
            'platform_fee_amount' => $platformFee,
            'provider_net_amount' => $providerNet,
            'disputed_at' => null,
            'disputed_by_user_id' => null,
            'dispute_reason' => null,
            'provider_wallet_transaction_id' => $providerCredit?->id
                ?? $payment->provider_wallet_transaction_id,
        ]);

        $payment = $payment->refresh();
        $this->audit->recordPayment($payment, 'payment_released', [
            'release_reason' => $reason,
            'released_by_user_id' => $releasedBy?->id,
        ]);
        $this->receipts->send($payment, 'released');

        return $payment;
    }

    public function dispute(
        JobRequestPayment $payment,
        User $disputedBy,
        string $reason,
    ): JobRequestPayment {
        if ($payment->escrow_status !== 'held' || $payment->status !== 'confirmed') {
            throw new RuntimeException('Only confirmed payments still held in escrow can be disputed.');
        }

        $payment->update([
            'escrow_status' => 'disputed',
            'release_due_at' => null,
            'disputed_at' => now(),
            'disputed_by_user_id' => $disputedBy->id,
            'dispute_reason' => $reason,
        ]);

        return $payment->refresh();
    }

    public function refund(
        JobRequestPayment $payment,
        User $refundedBy,
        string $reason,
    ): JobRequestPayment {
        $payment->loadMissing(['jobRequest', 'customer']);

        if (! in_array($payment->escrow_status, ['held', 'disputed'], true) || $payment->status !== 'confirmed') {
            throw new RuntimeException('Only confirmed payments still held in escrow can be refunded.');
        }

        $customerCredit = $payment->customer_wallet_transaction_id
            ? null
            : $this->wallets->credit(
                $payment->customer,
                $payment->amount,
                'payment_refund',
                "Refund for {$payment->jobRequest->title}",
                [
                    'job_request_id' => $payment->job_request_id,
                    'job_request_payment_id' => $payment->id,
                    'refund_reason' => $reason,
                ],
                $payment->currency,
            );

        $payment->update([
            'status' => 'refunded',
            'escrow_status' => 'refunded',
            'release_due_at' => null,
            'refunded_at' => now(),
            'refunded_by_user_id' => $refundedBy->id,
            'refund_reason' => $reason,
            'disputed_at' => null,
            'disputed_by_user_id' => null,
            'dispute_reason' => null,
            'customer_wallet_transaction_id' => $customerCredit?->id
                ?? $payment->customer_wallet_transaction_id,
        ]);

        $payment = $payment->refresh();
        $this->audit->recordPayment($payment, 'payment_refunded', [
            'refund_reason' => $reason,
            'refunded_by_user_id' => $refundedBy->id,
        ]);
        $this->receipts->send($payment, 'refunded');

        return $payment;
    }

    public function releaseDueAt(JobRequestPayment $payment): Carbon
    {
        $payment->loadMissing('jobRequest.schedule');

        $confirmedAt = $payment->confirmed_at ?? now();
        $serviceAt = $payment->jobRequest?->schedule?->completed_at
            ?? $payment->jobRequest?->schedule?->scheduled_for;

        $base = $serviceAt && $serviceAt->greaterThan($confirmedAt)
            ? $serviceAt
            : $confirmedAt;

        return $base->copy()->addHours(48);
    }

    private function feeAmounts(JobRequestPayment $payment): array
    {
        $basisPoints = max(0, (int) config('localserve.payment.platform_fee_bps', 0));
        $fee = intdiv($payment->amount * $basisPoints, 10000);
        $fee = min($fee, $payment->amount);

        return [$fee, $payment->amount - $fee];
    }
}
