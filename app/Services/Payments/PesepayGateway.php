<?php

namespace App\Services\Payments;

use App\Models\JobRequest;
use App\Models\JobRequestPayment;
use App\Models\WalletDepositRequest;
use App\Services\PaymentEscrowService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class PesepayGateway
{
    public function initiate(JobRequest $jobRequest, array $payload): array
    {
        $pesepay = $this->client();
        $pesepay->returnUrl = route('requests.payment.return', $jobRequest);
        $pesepay->resultUrl = route('payments.pesepay.result', $jobRequest);

        $merchantReference = $payload['merchant_reference']
            ?? 'BOMA-REQ-'.$jobRequest->id.'-'.Str::upper(Str::random(10));

        try {
            $transaction = $pesepay->createTransaction(
                (int) $payload['amount'],
                $payload['currency'] ?? config('localserve.payment.pesepay.currency'),
                $payload['reason'] ?? "Boma payment for {$jobRequest->title}",
                $merchantReference,
            );

            $response = $pesepay->initiateTransaction($transaction);
        } catch (Throwable $exception) {
            Log::warning('Pesepay initiation failed.', [
                'job_request_id' => $jobRequest->id,
                'message' => $exception->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'method' => 'Pesepay checkout could not be started. Please try again.',
            ]);
        }

        if (! $response->success()) {
            throw ValidationException::withMessages([
                'method' => $response->message() ?: 'Pesepay rejected the checkout request.',
            ]);
        }

        return [
            'provider' => 'Pesepay',
            'status' => 'initiated',
            'reference_number' => $response->referenceNumber(),
            'poll_url' => $response->pollUrl(),
            'redirect_url' => $response->redirectUrl(),
            'merchant_reference' => $merchantReference,
        ];
    }

    public function sync(JobRequestPayment $payment, array $callbackPayload = []): array
    {
        $reference = $payment->gateway_transaction_id ?: $payment->reference;
        $pollUrl = $payment->gateway_poll_url;

        if (! $pollUrl && ! $reference) {
            throw ValidationException::withMessages([
                'method' => 'This payment has no Pesepay reference to verify.',
            ]);
        }

        try {
            $response = $pollUrl
                ? $this->client()->pollTransaction($pollUrl)
                : $this->client()->checkPayment($reference);
        } catch (Throwable $exception) {
            Log::warning('Pesepay status check failed.', [
                'payment_id' => $payment->id,
                'message' => $exception->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'method' => 'Pesepay status could not be verified. Please try again.',
            ]);
        }

        if (! $response->success()) {
            throw ValidationException::withMessages([
                'method' => $response->message() ?: 'Pesepay could not verify this payment.',
            ]);
        }

        $isPaid = $response->paid();
        $payload = array_filter([
            ...($payment->gateway_payload ?? []),
            'last_callback' => $callbackPayload ?: null,
            'last_polled_at' => now()->toDateTimeString(),
        ], fn ($value) => $value !== null);

        $payment->update([
            'gateway_status' => $isPaid ? 'paid' : 'pending',
            'gateway_transaction_id' => $response->referenceNumber() ?: $payment->gateway_transaction_id,
            'gateway_poll_url' => $response->pollUrl() ?: $payment->gateway_poll_url,
            'gateway_payload' => $payload,
            'gateway_result_received_at' => $callbackPayload ? now() : $payment->gateway_result_received_at,
            'status' => $isPaid ? 'confirmed' : $payment->status,
            'paid_at' => $isPaid ? now() : $payment->paid_at,
            'processed_at' => $isPaid ? now() : $payment->processed_at,
            'confirmed_at' => $isPaid ? now() : $payment->confirmed_at,
        ]);

        if ($isPaid) {
            app(PaymentEscrowService::class)->hold($payment->refresh());
        }

        return [
            'paid' => $isPaid,
            'reference_number' => $response->referenceNumber(),
            'poll_url' => $response->pollUrl(),
        ];
    }

    public function initiateWalletDeposit(WalletDepositRequest $deposit): array
    {
        $pesepay = $this->client();
        $pesepay->returnUrl = route('wallet.deposits.pesepay.return', $deposit);
        $pesepay->resultUrl = route('wallet.deposits.pesepay.result', $deposit);

        $merchantReference = 'BOMA-WAL-'.$deposit->id.'-'.Str::upper(Str::random(10));

        try {
            $transaction = $pesepay->createTransaction(
                $deposit->amount,
                $deposit->currency,
                'Boma wallet top-up',
                $merchantReference,
            );

            $response = $pesepay->initiateTransaction($transaction);
        } catch (Throwable $exception) {
            Log::warning('Pesepay wallet deposit initiation failed.', [
                'wallet_deposit_request_id' => $deposit->id,
                'message' => $exception->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'source' => 'Pesepay checkout could not be started. Please try again.',
            ]);
        }

        if (! $response->success()) {
            throw ValidationException::withMessages([
                'source' => $response->message() ?: 'Pesepay rejected the wallet top-up request.',
            ]);
        }

        return [
            'provider' => 'Pesepay',
            'status' => 'initiated',
            'reference_number' => $response->referenceNumber(),
            'poll_url' => $response->pollUrl(),
            'redirect_url' => $response->redirectUrl(),
            'merchant_reference' => $merchantReference,
        ];
    }

    public function syncWalletDeposit(WalletDepositRequest $deposit, array $callbackPayload = []): array
    {
        $reference = $deposit->gateway_transaction_id ?: $deposit->reference;
        $pollUrl = $deposit->gateway_poll_url;

        if (! $pollUrl && ! $reference) {
            throw ValidationException::withMessages([
                'source' => 'This wallet deposit has no Pesepay reference to verify.',
            ]);
        }

        try {
            $response = $pollUrl
                ? $this->client()->pollTransaction($pollUrl)
                : $this->client()->checkPayment($reference);
        } catch (Throwable $exception) {
            Log::warning('Pesepay wallet deposit status check failed.', [
                'wallet_deposit_request_id' => $deposit->id,
                'message' => $exception->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'source' => 'Pesepay wallet deposit status could not be verified. Please try again.',
            ]);
        }

        if (! $response->success()) {
            throw ValidationException::withMessages([
                'source' => $response->message() ?: 'Pesepay could not verify this wallet deposit.',
            ]);
        }

        $isPaid = $response->paid();
        $payload = array_filter([
            ...($deposit->gateway_payload ?? []),
            'last_callback' => $callbackPayload ?: null,
            'last_polled_at' => now()->toDateTimeString(),
        ], fn ($value) => $value !== null);

        $deposit->update([
            'gateway_status' => $isPaid ? 'paid' : 'pending',
            'gateway_transaction_id' => $response->referenceNumber() ?: $deposit->gateway_transaction_id,
            'gateway_poll_url' => $response->pollUrl() ?: $deposit->gateway_poll_url,
            'gateway_payload' => $payload,
            'gateway_result_received_at' => $callbackPayload ? now() : $deposit->gateway_result_received_at,
        ]);

        return [
            'paid' => $isPaid,
            'reference_number' => $response->referenceNumber(),
            'poll_url' => $response->pollUrl(),
        ];
    }

    private function client(): object
    {
        $integrationKey = config('localserve.payment.pesepay.integration_key');
        $encryptionKey = config('localserve.payment.pesepay.encryption_key');

        if (! $integrationKey || ! $encryptionKey) {
            throw ValidationException::withMessages([
                'method' => 'Pesepay is not configured. Add PESEPAY_INTEGRATION_KEY and PESEPAY_ENCRYPTION_KEY.',
            ]);
        }

        $this->loadSdk();

        return new \Pesepay\Payments\Pesepay($integrationKey, $encryptionKey);
    }

    private function loadSdk(): void
    {
        if (class_exists(\Pesepay\Payments\Pesepay::class, false)) {
            return;
        }

        require_once base_path('vendor/codevirtus/pesepay/src/Pesepay.php');
    }
}
