<?php

namespace App\Http\Controllers;

use App\Models\JobRequestPayment;
use App\Models\PayoutRequest;
use App\Models\UserWallet;
use App\Models\WalletDepositRequest;
use App\Models\WalletTransaction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminFinanceController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return $this->index($request);
    }

    public function index(Request $request): Response
    {
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'currency' => ['nullable', 'string', Rule::in(['all', ...array_keys(config('localserve.payment.currencies'))])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $currency = $request->string('currency')->toString() ?: config('localserve.payment.wallet_currency');
        $currencyFilter = $currency === 'all' ? null : $currency;
        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;

        $paymentsBase = JobRequestPayment::query()
            ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to));
        $payoutsBase = PayoutRequest::query()
            ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to));
        $walletsBase = UserWallet::query()
            ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter));
        $depositRequestsBase = WalletDepositRequest::query()
            ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to));

        $summary = [
            'capturedPayments' => (int) (clone $paymentsBase)
                ->where('status', 'confirmed')
                ->where('channel', 'electronic')
                ->sum('amount'),
            'escrowHeld' => (int) (clone $paymentsBase)
                ->where('status', 'confirmed')
                ->where('escrow_status', 'held')
                ->sum('amount'),
            'disputedEscrow' => (int) (clone $paymentsBase)
                ->where('status', 'confirmed')
                ->where('escrow_status', 'disputed')
                ->sum('amount'),
            'releasedEarnings' => (int) (clone $paymentsBase)
                ->where('escrow_status', 'released')
                ->sum(DB::raw('COALESCE(provider_net_amount, amount)')),
            'platformRevenue' => (int) (clone $paymentsBase)
                ->where('escrow_status', 'released')
                ->sum('platform_fee_amount'),
            'refundedPayments' => (int) (clone $paymentsBase)
                ->where('escrow_status', 'refunded')
                ->sum('amount'),
            'pendingGateway' => (int) (clone $paymentsBase)
                ->where('status', 'pending_gateway')
                ->sum('amount'),
            'pendingDeposits' => (int) (clone $depositRequestsBase)
                ->where('status', 'pending')
                ->sum('amount'),
            'pendingGatewayDeposits' => (int) (clone $depositRequestsBase)
                ->where('status', 'pending_gateway')
                ->sum('amount'),
            'approvedDeposits' => (int) (clone $depositRequestsBase)
                ->where('status', 'approved')
                ->sum('amount'),
            'externalManual' => (int) (clone $paymentsBase)
                ->where('escrow_status', 'external')
                ->sum('amount'),
            'pendingPayouts' => (int) (clone $payoutsBase)
                ->where('status', 'pending')
                ->sum('amount'),
            'approvedPayouts' => (int) (clone $payoutsBase)
                ->where('status', 'approved')
                ->sum('amount'),
            'paidPayouts' => (int) (clone $payoutsBase)
                ->where('status', 'paid')
                ->sum('amount'),
            'walletLiability' => (int) (clone $walletsBase)->sum('balance'),
        ];

        $recentPayments = JobRequestPayment::query()
            ->with(['jobRequest', 'customer', 'provider.providerProfile'])
            ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn (JobRequestPayment $payment): array => [
                'id' => $payment->id,
                'requestId' => $payment->job_request_id,
                'requestTitle' => $payment->jobRequest?->title,
                'customerName' => $payment->customer?->name,
                'providerName' => $payment->provider?->providerProfile?->business_name
                    ?? $payment->provider?->name,
                'amount' => $payment->amount,
                'platformFeeAmount' => $payment->platform_fee_amount,
                'providerNetAmount' => $payment->provider_net_amount
                    ?? max(0, $payment->amount - $payment->platform_fee_amount),
                'currency' => $payment->currency,
                'status' => $payment->status,
                'escrowStatus' => $payment->escrow_status,
                'gatewayProvider' => $payment->gateway_provider,
                'reference' => $payment->reference,
                'createdAt' => $payment->created_at->toDateTimeString(),
            ])
            ->all();

        $recentTransactions = WalletTransaction::query()
            ->with('user')
            ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn (WalletTransaction $transaction): array => [
                'id' => $transaction->id,
                'userName' => $transaction->user?->name,
                'userRole' => $transaction->user?->role,
                'type' => $transaction->type,
                'direction' => $transaction->direction,
                'amount' => $transaction->amount,
                'currency' => $transaction->currency,
                'balanceAfter' => $transaction->balance_after,
                'reference' => $transaction->reference,
                'description' => $transaction->description,
                'createdAt' => $transaction->created_at->toDateTimeString(),
            ])
            ->all();

        $depositQueue = WalletDepositRequest::query()
            ->with(['user', 'paymentMethod'])
            ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
            ->whereIn('status', ['pending', 'pending_gateway'])
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn (WalletDepositRequest $deposit): array => [
                'id' => $deposit->id,
                'userName' => $deposit->user?->name,
                'userEmail' => $deposit->user?->email,
                'amount' => $deposit->amount,
                'currency' => $deposit->currency,
                'source' => $deposit->source,
                'reference' => $deposit->reference,
                'status' => $deposit->status,
                'gatewayProvider' => $deposit->gateway_provider,
                'gatewayStatus' => $deposit->gateway_status,
                'paymentMethod' => $deposit->paymentMethod ? [
                    'brand' => $deposit->paymentMethod->brand,
                    'label' => $deposit->paymentMethod->label,
                    'lastFour' => $deposit->paymentMethod->last_four,
                ] : null,
                'createdAt' => $deposit->created_at->toDateTimeString(),
            ])
            ->all();

        $payoutQueue = PayoutRequest::query()
            ->with(['provider.providerProfile'])
            ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
            ->whereIn('status', ['pending', 'approved'])
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn (PayoutRequest $payout): array => [
                'id' => $payout->id,
                'providerName' => $payout->provider?->providerProfile?->business_name
                    ?? $payout->provider?->name,
                'amount' => $payout->amount,
                'currency' => $payout->currency,
                'destinationLabel' => $payout->destination_label,
                'status' => $payout->status,
                'createdAt' => $payout->created_at->toDateTimeString(),
            ])
            ->all();

        return Inertia::render('Admin/Finance/Index', [
            'filters' => [
                'currency' => $currency,
                'from' => $from,
                'to' => $to,
            ],
            'currencyOptions' => config('localserve.payment.currencies'),
            'summary' => $summary,
            'recentPayments' => $recentPayments,
            'recentTransactions' => $recentTransactions,
            'depositQueue' => $depositQueue,
            'payoutQueue' => $payoutQueue,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'currency' => ['nullable', 'string', Rule::in(['all', ...array_keys(config('localserve.payment.currencies'))])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $currency = $request->string('currency')->toString() ?: config('localserve.payment.wallet_currency');
        $currencyFilter = $currency === 'all' ? null : $currency;
        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;
        $filename = 'boma-finance-reconciliation-'.$currency.'-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($currencyFilter, $from, $to): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Section',
                'Date',
                'Reference',
                'User / Customer',
                'Provider',
                'Type / Method',
                'Status',
                'Escrow / Direction',
                'Amount',
                'Currency',
                'Fee',
                'Provider Net',
                'Notes',
            ]);

            JobRequestPayment::query()
                ->with(['jobRequest', 'customer', 'provider.providerProfile'])
                ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
                ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
                ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
                ->orderByDesc('id')
                ->chunk(100, function ($payments) use ($handle): void {
                    foreach ($payments as $payment) {
                        fputcsv($handle, [
                            'Payment',
                            $payment->created_at->toDateTimeString(),
                            $payment->reference,
                            $payment->customer?->name,
                            $payment->provider?->providerProfile?->business_name ?? $payment->provider?->name,
                            $payment->method,
                            $payment->status,
                            $payment->escrow_status,
                            $payment->amount,
                            $payment->currency,
                            $payment->platform_fee_amount,
                            $payment->provider_net_amount ?? max(0, $payment->amount - $payment->platform_fee_amount),
                            $payment->jobRequest?->title,
                        ]);
                    }
                });

            WalletDepositRequest::query()
                ->with(['user', 'paymentMethod'])
                ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
                ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
                ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
                ->orderByDesc('id')
                ->chunk(100, function ($deposits) use ($handle): void {
                    foreach ($deposits as $deposit) {
                        fputcsv($handle, [
                            'Wallet deposit',
                            $deposit->created_at->toDateTimeString(),
                            $deposit->reference,
                            $deposit->user?->name,
                            '',
                            $deposit->source,
                            $deposit->status,
                            $deposit->gateway_status,
                            $deposit->amount,
                            $deposit->currency,
                            0,
                            0,
                            $deposit->gateway_provider ?: $deposit->review_notes,
                        ]);
                    }
                });

            WalletTransaction::query()
                ->with('user')
                ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
                ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
                ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
                ->orderByDesc('id')
                ->chunk(100, function ($transactions) use ($handle): void {
                    foreach ($transactions as $transaction) {
                        fputcsv($handle, [
                            'Wallet transaction',
                            $transaction->created_at->toDateTimeString(),
                            $transaction->reference,
                            $transaction->user?->name,
                            '',
                            $transaction->type,
                            $transaction->status,
                            $transaction->direction,
                            $transaction->amount,
                            $transaction->currency,
                            0,
                            0,
                            $transaction->description,
                        ]);
                    }
                });

            PayoutRequest::query()
                ->with(['provider.providerProfile'])
                ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
                ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
                ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
                ->orderByDesc('id')
                ->chunk(100, function ($payouts) use ($handle): void {
                    foreach ($payouts as $payout) {
                        fputcsv($handle, [
                            'Payout',
                            $payout->created_at->toDateTimeString(),
                            $payout->settlement_reference,
                            '',
                            $payout->provider?->providerProfile?->business_name ?? $payout->provider?->name,
                            $payout->destination_type,
                            $payout->status,
                            $payout->destination_label,
                            $payout->amount,
                            $payout->currency,
                            0,
                            0,
                            $payout->settlement_notes ?: $payout->review_notes,
                        ]);
                    }
                });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
