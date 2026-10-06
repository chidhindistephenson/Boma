<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Models\UserPaymentMethod;
use App\Services\PaymentEscrowService;
use App\Services\FinancialAuditService;
use App\Services\Payments\PesepayGateway;
use App\Services\Payments\SandboxPaymentGateway;
use App\Services\MalwareScanner;
use App\Services\WalletService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JobRequestPaymentController extends Controller
{
    public function upsert(
        Request $request,
        JobRequest $jobRequest,
        WalletService $wallets,
        PesepayGateway $pesepayGateway,
        PaymentEscrowService $escrow,
        FinancialAuditService $audit,
        MalwareScanner $scanner,
    ): Response {
        $viewer = $request->user();

        $jobRequest->loadMissing(['customer', 'provider.providerProfile', 'payment', 'quote']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->canManagePayment($viewer), 403);

        $methodOptions = array_keys(config('localserve.payment.method_options'));
        $channelOptions = array_keys(config('localserve.payment.channel_options'));
        $electronicMethods = config('localserve.payment.electronic_methods');
        $manualMethods = config('localserve.payment.manual_methods');
        $submittedMethod = $request->string('method')->toString();
        $hasExplicitChannel = $request->filled('channel');
        $submittedChannel = $request->string('channel')->toString()
            ?: (in_array($submittedMethod, $electronicMethods, true) ? 'electronic' : 'manual');
        $shouldProcessGateway = $hasExplicitChannel && $submittedChannel === 'electronic';

        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'currency' => ['nullable', 'string', Rule::in(array_keys(config('localserve.payment.currencies')))],
            'channel' => ['nullable', 'string', Rule::in($channelOptions)],
            'method' => ['required', 'string', Rule::in($methodOptions)],
            'reference' => [
                Rule::requiredIf(
                    ! $shouldProcessGateway
                    && ! in_array($submittedMethod, $manualMethods, true),
                ),
                'nullable',
                'string',
                'max:120',
            ],
            'payer_name' => [
                Rule::requiredIf($shouldProcessGateway && ! in_array($submittedMethod, ['wallet', 'saved_card'], true)),
                'nullable',
                'string',
                'max:120',
            ],
            'payer_email' => ['nullable', 'email', 'max:120'],
            'payer_phone' => [
                Rule::requiredIf($shouldProcessGateway && $submittedMethod === 'mobile_money'),
                'nullable',
                'string',
                'max:40',
            ],
            'user_payment_method_id' => [
                Rule::requiredIf($submittedMethod === 'saved_card'),
                'nullable',
                'integer',
                'exists:user_payment_methods,id',
            ],
            'checkout_token' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:1200'],
            'paid_at' => [Rule::requiredIf(! $shouldProcessGateway), 'nullable', 'date', 'before_or_equal:now'],
            'proof' => [
                'nullable',
                'file',
                'mimetypes:application/pdf,image/jpeg,image/png',
                'max:'.config('localserve.payment.proof_max_kb'),
            ],
        ]);

        abort_if(
            $submittedChannel === 'electronic' && ! in_array($validated['method'], $electronicMethods, true),
            422,
            'Electronic payments must use mobile money, bank transfer, card, or another electronic method.',
        );

        abort_if(
            $submittedChannel === 'manual' && ! in_array($validated['method'], $manualMethods, true),
            422,
            'Manual payments must use cash or a manual record.',
        );

        $isUpdate = $jobRequest->payment !== null;
        $proof = $validated['proof'] ?? null;
        $proofPayload = [];
        $gatewayPayload = [];
        $paymentStatus = 'submitted';
        $paidAt = $validated['paid_at'] ?? now();
        $confirmedAt = null;
        $paymentReference = ($validated['reference'] ?? null) ?: null;
        $walletTransaction = null;
        $paymentMethod = null;
        $pesepayCheckout = null;

        if ($proof) {
            $scanner->assertClean($proof, 'proof');

            if ($jobRequest->payment?->proof_storage_path) {
                Storage::disk('local')->delete($jobRequest->payment->proof_storage_path);
            }

            $proofPayload = [
                'proof_storage_path' => $proof->store('payment-proofs/'.$jobRequest->id, 'local'),
                'proof_original_name' => $proof->getClientOriginalName(),
                'proof_mime_type' => $proof->getClientMimeType() ?: $proof->getMimeType() ?: 'application/octet-stream',
                'proof_size_bytes' => $proof->getSize(),
            ];
        }

        if ($submittedMethod === 'saved_card') {
            $paymentMethod = UserPaymentMethod::query()
                ->where('id', $validated['user_payment_method_id'] ?? null)
                ->where('user_id', $viewer->id)
                ->first();

            throw_unless($paymentMethod, ValidationException::withMessages([
                'user_payment_method_id' => 'Choose one of your saved cards.',
            ]));
        }

        if ($submittedMethod !== 'wallet' && $shouldProcessGateway) {
            $gatewayPayloadInput = array_merge($validated, [
                'reason' => "Boma payment for {$jobRequest->title}",
                'currency' => $validated['currency'] ?? config('localserve.payment.wallet_currency'),
                'saved_payment_method' => $paymentMethod ? [
                    'brand' => $paymentMethod->brand,
                    'last_four' => $paymentMethod->last_four,
                    'gateway_token' => $paymentMethod->gateway_token,
                ] : null,
            ]);

            if (config('localserve.payment.driver') === 'pesepay') {
                $gatewayResult = $pesepayGateway->initiate($jobRequest, $gatewayPayloadInput);
                $paymentStatus = 'pending_gateway';
                $paidAt = now();
                $paymentReference = $gatewayResult['reference_number'];
                $pesepayCheckout = $gatewayResult['redirect_url'];

                $gatewayPayload = [
                    'gateway_provider' => $gatewayResult['provider'],
                    'gateway_status' => $gatewayResult['status'],
                    'gateway_transaction_id' => $gatewayResult['reference_number'],
                    'gateway_authorization_code' => null,
                    'gateway_merchant_reference' => $gatewayResult['merchant_reference'],
                    'gateway_poll_url' => $gatewayResult['poll_url'],
                    'gateway_redirect_url' => $gatewayResult['redirect_url'],
                    'gateway_payload' => [
                        'initiated_at' => now()->toDateTimeString(),
                        'method' => $submittedMethod,
                    ],
                    'processed_at' => null,
                ];
            } else {
                $gatewayResult = app(SandboxPaymentGateway::class)->charge($jobRequest, $gatewayPayloadInput);
                $paymentStatus = 'confirmed';
                $confirmedAt = $gatewayResult['processed_at'];
                $paidAt = $gatewayResult['processed_at'];
                $paymentReference ??= $gatewayResult['transaction_id'];

                $gatewayPayload = [
                    'gateway_provider' => $gatewayResult['provider'],
                    'gateway_status' => $gatewayResult['status'],
                    'gateway_transaction_id' => $gatewayResult['transaction_id'],
                    'gateway_authorization_code' => $gatewayResult['authorization_code'],
                    'processed_at' => $gatewayResult['processed_at'],
                ];
            }
        }

        $payment = DB::transaction(function () use (
            $jobRequest,
            $validated,
            $submittedChannel,
            $paymentReference,
            $paymentMethod,
            $walletTransaction,
            $paymentStatus,
            $paidAt,
            $confirmedAt,
            $gatewayPayload,
            $proofPayload,
            $submittedMethod,
            $viewer,
            $wallets,
            $escrow,
            $audit,
        ) {
            if ($submittedMethod === 'wallet') {
                try {
                    $walletTransaction = $wallets->debit(
                        $viewer,
                        (int) $validated['amount'],
                        'payment',
                        "Payment for {$jobRequest->title}",
                        ['job_request_id' => $jobRequest->id],
                        $validated['currency'] ?? config('localserve.payment.wallet_currency'),
                    );
                } catch (RuntimeException $exception) {
                    throw ValidationException::withMessages([
                        'method' => $exception->getMessage(),
                    ]);
                }

                $paymentStatus = 'confirmed';
                $confirmedAt = $walletTransaction->created_at;
                $paidAt = $walletTransaction->created_at;
                $paymentReference = $walletTransaction->reference;
                $gatewayPayload = [
                    'gateway_provider' => 'Boma Wallet',
                    'gateway_status' => 'paid',
                    'gateway_transaction_id' => $walletTransaction->reference,
                    'gateway_authorization_code' => null,
                    'processed_at' => $walletTransaction->created_at,
                ];
            }

            $payment = $jobRequest->payment()->updateOrCreate(
                [],
                array_merge([
                    'customer_id' => $jobRequest->customer_id,
                    'provider_id' => $jobRequest->provider_id,
                    'amount' => $validated['amount'],
                    'currency' => $validated['currency'] ?? config('localserve.payment.wallet_currency'),
                    'method' => $validated['method'],
                    'user_payment_method_id' => $paymentMethod?->id,
                    'wallet_transaction_id' => $walletTransaction?->id,
                    'channel' => $submittedChannel,
                    'reference' => $paymentReference,
                    'payer_name' => ($validated['payer_name'] ?? null) ?: null,
                    'payer_email' => ($validated['payer_email'] ?? null) ?: null,
                    'payer_phone' => ($validated['payer_phone'] ?? null) ?: null,
                    'notes' => ($validated['notes'] ?? null) ?: null,
                    'status' => $paymentStatus,
                    'paid_at' => $paidAt,
                    'confirmed_at' => $confirmedAt,
                    'revision_requested_at' => null,
                    'reviewed_by_user_id' => null,
                    'review_notes' => null,
                ], $gatewayPayload, $proofPayload),
            );

            if ($walletTransaction) {
                $walletTransaction->update(['job_request_payment_id' => $payment->id]);
            }

            if (
                $payment->status === 'confirmed'
                && $payment->channel === 'electronic'
                && filled($payment->gateway_provider)
            ) {
                $payment = $escrow->hold($payment);
            } elseif ($payment->status === 'submitted') {
                $audit->recordPayment($payment, 'payment_recorded');
            }

            return $payment;
        });

        if ($pesepayCheckout) {
            return Inertia::location($pesepayCheckout);
        }

        $notificationType = $shouldProcessGateway
            ? 'request_payment_confirmed'
            : ($isUpdate ? 'request_payment_updated' : 'request_payment_recorded');
        $notificationTitle = $shouldProcessGateway
            ? 'Payment received'
            : ($isUpdate ? 'Payment updated' : 'Payment recorded');
        $notificationBody = $shouldProcessGateway
            ? "{$jobRequest->customer->name} paid {$jobRequest->title} through Boma. Transaction {$payment->reference} is confirmed."
            : "{$jobRequest->customer->name} ".($isUpdate ? 'updated' : 'recorded')
                ." a payment for {$jobRequest->title}.";
        $notificationAction = $shouldProcessGateway ? 'View payment' : 'Review payment';

        InAppNotification::notifyUser(
            $jobRequest->provider,
            $notificationType,
            $notificationTitle,
            $notificationBody,
            route('requests.show', $jobRequest),
            $notificationAction,
            [
                'job_request_id' => $jobRequest->id,
                'payment_id' => $payment->id,
            ],
        );

        return Redirect::route('requests.show', $jobRequest);
    }

    public function proof(Request $request, JobRequest $jobRequest): StreamedResponse
    {
        $viewer = $request->user();

        $jobRequest->loadMissing(['payment']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->payment?->hasProof(), 404);
        abort_unless(Storage::disk('local')->exists($jobRequest->payment->proof_storage_path), 404);

        return Storage::disk('local')->download(
            $jobRequest->payment->proof_storage_path,
            $jobRequest->payment->proof_original_name,
            ['Content-Type' => $jobRequest->payment->proof_mime_type],
        );
    }
}
