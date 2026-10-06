<?php

namespace App\Services;

use App\Models\FinancialAuditLog;
use App\Models\JobRequestPayment;
use App\Models\PayoutRequest;
use App\Models\ProviderSubscription;
use App\Models\WalletTransaction;
use Illuminate\Database\Eloquent\Model;

class FinancialAuditService
{
    public function record(
        string $eventType,
        ?Model $auditable = null,
        array $attributes = [],
        array $metadata = [],
    ): FinancialAuditLog {
        $payload = array_merge([
            'event_type' => $eventType,
            'auditable_type' => $auditable ? $auditable::class : null,
            'auditable_id' => $auditable?->getKey(),
            'amount' => 0,
            'currency' => config('localserve.payment.wallet_currency'),
            'recorded_at' => now(),
            'metadata' => $metadata,
        ], $attributes);

        $payload['checksum'] = $this->checksum($payload);

        return FinancialAuditLog::query()->create($payload);
    }

    public function recordPayment(JobRequestPayment $payment, string $eventType, array $metadata = []): FinancialAuditLog
    {
        $payment->loadMissing(['jobRequest', 'customer', 'provider']);

        return $this->record($eventType, $payment, [
            'user_id' => $payment->customer_id,
            'job_request_id' => $payment->job_request_id,
            'job_request_payment_id' => $payment->id,
            'wallet_transaction_id' => $payment->wallet_transaction_id,
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'direction' => match ($eventType) {
                'payment_refunded' => 'credit',
                default => 'debit',
            },
            'reference' => $payment->reference,
            'status' => $payment->status,
        ], array_merge([
            'escrow_status' => $payment->escrow_status,
            'method' => $payment->method,
            'channel' => $payment->channel,
            'gateway_provider' => $payment->gateway_provider,
            'platform_fee_amount' => $payment->platform_fee_amount,
            'provider_net_amount' => $payment->provider_net_amount,
        ], $metadata));
    }

    public function recordWalletTransaction(WalletTransaction $transaction, string $eventType, array $metadata = []): FinancialAuditLog
    {
        return $this->record($eventType, $transaction, [
            'user_id' => $transaction->user_id,
            'job_request_id' => $transaction->job_request_id,
            'job_request_payment_id' => $transaction->job_request_payment_id,
            'wallet_transaction_id' => $transaction->id,
            'amount' => $transaction->amount,
            'currency' => $transaction->currency,
            'direction' => $transaction->direction,
            'reference' => $transaction->reference,
            'status' => $transaction->status,
        ], array_merge([
            'wallet_type' => $transaction->type,
            'balance_after' => $transaction->balance_after,
            'description' => $transaction->description,
        ], $metadata));
    }

    public function recordSubscription(ProviderSubscription $subscription, string $eventType, array $metadata = []): FinancialAuditLog
    {
        $subscription->loadMissing('providerProfile.user', 'plan', 'walletTransaction');

        return $this->record($eventType, $subscription, [
            'user_id' => $subscription->providerProfile?->user_id,
            'provider_subscription_id' => $subscription->id,
            'wallet_transaction_id' => $subscription->wallet_transaction_id,
            'amount' => $subscription->amount,
            'currency' => $subscription->currency,
            'direction' => 'debit',
            'reference' => $subscription->walletTransaction?->reference,
            'status' => $subscription->status,
        ], array_merge([
            'plan_code' => $subscription->plan?->code,
            'plan_name' => $subscription->plan?->name,
            'current_period_ends_at' => $subscription->current_period_ends_at?->toDateTimeString(),
        ], $metadata));
    }

    public function recordPayout(PayoutRequest $payout, string $eventType, array $metadata = []): FinancialAuditLog
    {
        return $this->record($eventType, $payout, [
            'user_id' => $payout->provider_id,
            'wallet_transaction_id' => $payout->wallet_transaction_id,
            'payout_request_id' => $payout->id,
            'amount' => $payout->amount,
            'currency' => $payout->currency,
            'direction' => 'debit',
            'reference' => $payout->settlement_reference,
            'status' => $payout->status,
        ], array_merge([
            'destination_type' => $payout->destination_type,
            'destination_label' => $payout->destination_label,
        ], $metadata));
    }

    private function checksum(array $payload): string
    {
        $source = $payload;
        unset($source['checksum']);

        return hash_hmac('sha256', json_encode($source, JSON_THROW_ON_ERROR), config('app.key'));
    }
}
