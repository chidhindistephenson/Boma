<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\PayoutRequest;
use App\Models\User;
use App\Services\FinancialAuditService;
use App\Services\WalletService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class PayoutRequestController extends Controller
{
    public function store(
        Request $request,
        WalletService $wallets,
        FinancialAuditService $audit,
    ): RedirectResponse {
        $provider = $request->user();

        abort_unless($provider->isProvider(), 403);

        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'currency' => ['required', 'string', Rule::in(array_keys(config('localserve.payment.currencies')))],
            'destination_type' => ['required', 'string', Rule::in(array_keys(config('localserve.payout.destination_options')))],
            'destination_label' => ['required', 'string', 'max:120'],
            'account_reference' => ['required', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:1200'],
        ]);

        $payout = DB::transaction(function () use ($provider, $validated, $wallets, $audit): PayoutRequest {
            try {
                $debit = $wallets->debit(
                    $provider,
                    (int) $validated['amount'],
                    'payout_request',
                    'Payout request to '.$validated['destination_label'],
                    [
                        'destination_type' => $validated['destination_type'],
                        'account_reference' => $validated['account_reference'],
                    ],
                    $validated['currency'],
                );
            } catch (RuntimeException $exception) {
                throw ValidationException::withMessages([
                    'amount' => $exception->getMessage(),
                ]);
            }

            $payout = $provider->payoutRequests()->create([
                'wallet_id' => $debit->wallet_id,
                'wallet_transaction_id' => $debit->id,
                'amount' => $validated['amount'],
                'currency' => $validated['currency'],
                'destination_type' => $validated['destination_type'],
                'destination_label' => $validated['destination_label'],
                'account_reference' => $validated['account_reference'],
                'notes' => ($validated['notes'] ?? null) ?: null,
                'status' => 'pending',
            ]);

            $debit->update([
                'metadata' => [
                    ...($debit->metadata ?? []),
                    'payout_request_id' => $payout->id,
                ],
            ]);

            $audit->recordPayout($payout->refresh(), 'payout_requested', [
                'wallet_debit_transaction_id' => $debit->id,
            ]);

            return $payout;
        });

        User::query()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->each(function ($admin) use ($provider, $payout): void {
                InAppNotification::notifyUser(
                    $admin,
                    'provider_payout_requested',
                    'Payout requested',
                    "{$provider->name} requested a {$payout->currency} {$payout->amount} payout.",
                    route('admin.payouts.index'),
                    'Review payout',
                    ['payout_request_id' => $payout->id],
                );
            });

        return Redirect::route('profile.edit', ['section' => 'billing'])
            ->with('status', 'payout-requested');
    }
}
