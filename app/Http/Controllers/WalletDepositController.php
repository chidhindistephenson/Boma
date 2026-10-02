<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\User;
use App\Models\UserPaymentMethod;
use App\Models\WalletDepositRequest;
use App\Services\Payments\PesepayGateway;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class WalletDepositController extends Controller
{
    public function store(Request $request, PesepayGateway $pesepayGateway, WalletService $wallets): Response
    {
        $source = $request->string('source')->toString();

        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'currency' => ['nullable', 'string', Rule::in(array_keys(config('localserve.payment.currencies')))],
            'source' => ['required', 'string', Rule::in(['online_checkout', 'saved_card', 'cash_deposit', 'mobile_money', 'bank_transfer', 'card'])],
            'user_payment_method_id' => [
                Rule::requiredIf($source === 'saved_card'),
                'nullable',
                'integer',
                'exists:user_payment_methods,id',
            ],
            'reference' => [
                Rule::requiredIf(! in_array($source, ['online_checkout', 'saved_card'], true)),
                'nullable',
                'string',
                'max:120',
            ],
        ]);

        $paymentMethod = null;
        if ($validated['source'] === 'saved_card') {
            $paymentMethod = UserPaymentMethod::query()
                ->where('id', $validated['user_payment_method_id'] ?? null)
                ->where('user_id', $request->user()->id)
                ->first();

            throw_unless($paymentMethod, ValidationException::withMessages([
                'user_payment_method_id' => 'Choose one of your saved cards.',
            ]));
        }

        $deposit = WalletDepositRequest::create([
            'user_id' => $request->user()->id,
            'user_payment_method_id' => $paymentMethod?->id,
            'amount' => $validated['amount'],
            'currency' => $validated['currency'] ?? config('localserve.payment.wallet_currency'),
            'source' => $validated['source'],
            'reference' => $validated['reference'] ?? null,
            'status' => in_array($validated['source'], ['online_checkout', 'saved_card'], true) ? 'pending_gateway' : 'pending',
        ]);

        if (in_array($validated['source'], ['online_checkout', 'saved_card'], true)) {
            if (config('localserve.payment.driver') === 'pesepay') {
                $gatewayResult = $pesepayGateway->initiateWalletDeposit($deposit);

                $deposit->update([
                    'reference' => $gatewayResult['reference_number'],
                    'gateway_provider' => $gatewayResult['provider'],
                    'gateway_status' => $gatewayResult['status'],
                    'gateway_transaction_id' => $gatewayResult['reference_number'],
                    'gateway_merchant_reference' => $gatewayResult['merchant_reference'],
                    'gateway_poll_url' => $gatewayResult['poll_url'],
                    'gateway_redirect_url' => $gatewayResult['redirect_url'],
                    'gateway_payload' => [
                        'initiated_at' => now()->toDateTimeString(),
                        'source' => 'wallet_deposit',
                        'saved_payment_method' => $paymentMethod ? [
                            'brand' => $paymentMethod->brand,
                            'last_four' => $paymentMethod->last_four,
                        ] : null,
                    ],
                ]);

                return Inertia::location($gatewayResult['redirect_url']);
            }

            $deposit->update([
                'reference' => 'WAL-DEP-'.Str::upper(Str::random(12)),
                'gateway_provider' => config('localserve.payment.gateway_provider'),
                'gateway_status' => 'paid',
                'gateway_transaction_id' => 'WAL-DEP-'.Str::upper(Str::random(12)),
                'gateway_authorization_code' => 'AUTH-'.Str::upper(Str::random(8)),
                'gateway_payload' => [
                    'processed_at' => now()->toDateTimeString(),
                    'source' => 'wallet_deposit',
                    'saved_payment_method' => $paymentMethod ? [
                        'brand' => $paymentMethod->brand,
                        'last_four' => $paymentMethod->last_four,
                    ] : null,
                ],
                'gateway_result_received_at' => now(),
            ]);

            $this->creditGatewayDeposit($deposit, $wallets);

            return Redirect::route('profile.edit', ['section' => 'billing'])
                ->with('status', 'wallet-funded');
        }

        User::query()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->get()
            ->each(fn (User $admin) => InAppNotification::notifyUser(
                $admin,
                'wallet_deposit_requested',
                'Wallet funding requested',
                "{$request->user()->name} submitted a {$deposit->currency} {$deposit->amount} wallet funding request.",
                route('admin.wallet-deposits.index'),
                'Review deposit',
                ['wallet_deposit_request_id' => $deposit->id],
            ));

        return Redirect::route('profile.edit', ['section' => 'billing'])
            ->with('status', 'wallet-funding-submitted');
    }

    public function result(Request $request, WalletDepositRequest $deposit, PesepayGateway $gateway, WalletService $wallets): Response
    {
        abort_unless($deposit->gateway_provider === 'Pesepay', 404);

        $wasApproved = $deposit->status === 'approved';
        $gateway->syncWalletDeposit($deposit, $request->all());
        $deposit->refresh();

        if (! $wasApproved && $deposit->gateway_status === 'paid') {
            $this->creditGatewayDeposit($deposit, $wallets);
        }

        return response()->noContent();
    }

    public function return(Request $request, WalletDepositRequest $deposit, PesepayGateway $gateway, WalletService $wallets): RedirectResponse
    {
        abort_unless($deposit->user_id === $request->user()->id, 403);
        abort_unless($deposit->gateway_provider === 'Pesepay', 404);

        $wasApproved = $deposit->status === 'approved';
        $gateway->syncWalletDeposit($deposit);
        $deposit->refresh();

        if (! $wasApproved && $deposit->gateway_status === 'paid') {
            $this->creditGatewayDeposit($deposit, $wallets);
        }

        return Redirect::route('profile.edit', ['section' => 'billing']);
    }

    public function sync(Request $request, WalletDepositRequest $deposit, PesepayGateway $gateway, WalletService $wallets): RedirectResponse
    {
        abort_unless($deposit->user_id === $request->user()->id, 403);
        abort_unless($deposit->gateway_provider === 'Pesepay', 404);

        $wasApproved = $deposit->status === 'approved';
        $gateway->syncWalletDeposit($deposit);
        $deposit->refresh();

        if (! $wasApproved && $deposit->gateway_status === 'paid') {
            $this->creditGatewayDeposit($deposit, $wallets);
        }

        return Redirect::route('profile.edit', ['section' => 'billing']);
    }

    private function creditGatewayDeposit(WalletDepositRequest $deposit, WalletService $wallets): void
    {
        DB::transaction(function () use ($deposit, $wallets): void {
            $lockedDeposit = WalletDepositRequest::query()
                ->with('user')
                ->whereKey($deposit->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedDeposit->wallet_transaction_id) {
                return;
            }

            $transaction = $wallets->credit(
                $lockedDeposit->user,
                $lockedDeposit->amount,
                'wallet_deposit',
                'Wallet top-up through Boma checkout',
                [
                    'wallet_deposit_request_id' => $lockedDeposit->id,
                    'gateway_provider' => $lockedDeposit->gateway_provider,
                    'gateway_transaction_id' => $lockedDeposit->gateway_transaction_id,
                ],
                $lockedDeposit->currency,
            );

            $lockedDeposit->update([
                'wallet_transaction_id' => $transaction->id,
                'status' => 'approved',
                'reviewed_at' => now(),
                'review_notes' => 'Automatically approved after gateway confirmation.',
            ]);

            InAppNotification::notifyUser(
                $lockedDeposit->user,
                'wallet_deposit_approved',
                'Wallet funded',
                "{$lockedDeposit->currency} {$lockedDeposit->amount} has been added to your Boma wallet.",
                route('profile.edit', ['section' => 'billing']),
                'View wallet',
                ['wallet_deposit_request_id' => $lockedDeposit->id],
            );
        });
    }
}
