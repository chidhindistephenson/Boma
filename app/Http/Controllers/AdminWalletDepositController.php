<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\WalletDepositRequest;
use App\Services\WalletService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminWalletDepositController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->isAdmin(), 403);

        $request->validate([
            'status' => ['nullable', 'string', Rule::in(['all', 'pending', 'pending_gateway', 'approved', 'rejected'])],
            'currency' => ['nullable', 'string', Rule::in(['all', ...array_keys(config('localserve.payment.currencies'))])],
        ]);

        $filters = [
            'status' => $request->string('status')->toString() ?: 'pending',
            'currency' => $request->string('currency')->toString() ?: 'all',
        ];

        $baseQuery = WalletDepositRequest::query();

        $deposits = WalletDepositRequest::query()
            ->with(['user', 'reviewedBy', 'paymentMethod'])
            ->when($filters['status'] !== 'all', fn (Builder $query) => $query->where('status', $filters['status']))
            ->when($filters['currency'] !== 'all', fn (Builder $query) => $query->where('currency', $filters['currency']))
            ->latest('id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (WalletDepositRequest $deposit): array => $this->payload($deposit));

        return Inertia::render('Admin/WalletDeposits/Index', [
            'filters' => $filters,
            'currencyOptions' => config('localserve.payment.currencies'),
            'deposits' => $deposits,
            'summary' => [
                'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
                'pendingGateway' => (clone $baseQuery)->where('status', 'pending_gateway')->count(),
                'approved' => (clone $baseQuery)->where('status', 'approved')->count(),
                'rejected' => (clone $baseQuery)->where('status', 'rejected')->count(),
            ],
        ]);
    }

    public function update(
        Request $request,
        WalletDepositRequest $deposit,
        WalletService $wallets,
    ): RedirectResponse {
        $admin = $request->user();

        abort_unless($admin->isAdmin(), 403);
        abort_if($deposit->status !== 'pending', 422);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['approve', 'reject'])],
            'review_notes' => [
                Rule::requiredIf($request->string('action')->toString() === 'reject'),
                'nullable',
                'string',
                'max:1200',
            ],
        ]);

        if ($validated['action'] === 'approve') {
            $transaction = $wallets->credit(
                $deposit->user,
                $deposit->amount,
                'deposit',
                'Wallet top-up approved',
                [
                    'wallet_deposit_request_id' => $deposit->id,
                    'source' => $deposit->source,
                    'reference' => $deposit->reference,
                ],
                $deposit->currency,
            );

            $deposit->update([
                'status' => 'approved',
                'wallet_transaction_id' => $transaction->id,
                'reviewed_by_user_id' => $admin->id,
                'reviewed_at' => now(),
                'review_notes' => ($validated['review_notes'] ?? null) ?: null,
            ]);
        } else {
            $deposit->update([
                'status' => 'rejected',
                'reviewed_by_user_id' => $admin->id,
                'reviewed_at' => now(),
                'review_notes' => $validated['review_notes'],
            ]);
        }

        $deposit->refresh();

        InAppNotification::notifyUser(
            $deposit->user,
            'wallet_deposit_'.$deposit->status,
            'Wallet funding '.str_replace('_', ' ', $deposit->status),
            "Your {$deposit->currency} {$deposit->amount} wallet funding request is {$deposit->status}.",
            route('profile.edit', ['section' => 'billing']),
            'View wallet',
            ['wallet_deposit_request_id' => $deposit->id],
        );

        return Redirect::route('admin.wallet-deposits.index');
    }

    private function payload(WalletDepositRequest $deposit): array
    {
        return [
            'id' => $deposit->id,
            'amount' => $deposit->amount,
            'currency' => $deposit->currency,
            'source' => $deposit->source,
            'reference' => $deposit->reference,
            'status' => $deposit->status,
            'gatewayProvider' => $deposit->gateway_provider,
            'gatewayStatus' => $deposit->gateway_status,
            'gatewayTransactionId' => $deposit->gateway_transaction_id,
            'gatewayMerchantReference' => $deposit->gateway_merchant_reference,
            'gatewayRedirectUrl' => $deposit->gateway_redirect_url,
            'paymentMethod' => $deposit->paymentMethod ? [
                'brand' => $deposit->paymentMethod->brand,
                'label' => $deposit->paymentMethod->label,
                'lastFour' => $deposit->paymentMethod->last_four,
            ] : null,
            'reviewNotes' => $deposit->review_notes,
            'reviewedByName' => $deposit->reviewedBy?->name,
            'reviewedAt' => $deposit->reviewed_at?->toDateTimeString(),
            'createdAt' => $deposit->created_at->toDateTimeString(),
            'user' => [
                'id' => $deposit->user->id,
                'name' => $deposit->user->name,
                'email' => $deposit->user->email,
                'role' => $deposit->user->role,
            ],
        ];
    }
}
