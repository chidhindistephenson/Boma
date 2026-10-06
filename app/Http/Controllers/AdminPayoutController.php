<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\PayoutRequest;
use App\Services\FinancialAuditService;
use App\Services\WalletService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminPayoutController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->isAdmin(), 403);

        $request->validate([
            'status' => ['nullable', 'string', Rule::in(['all', ...array_keys(config('localserve.payout.status_options'))])],
            'currency' => ['nullable', 'string', Rule::in(['all', ...array_keys(config('localserve.payment.currencies'))])],
        ]);

        $filters = [
            'status' => $request->string('status')->toString() ?: 'all',
            'currency' => $request->string('currency')->toString() ?: 'all',
        ];

        $baseQuery = PayoutRequest::query();

        $payouts = PayoutRequest::query()
            ->with(['provider.providerProfile', 'reviewedBy'])
            ->when($filters['status'] !== 'all', fn (Builder $query) => $query->where('status', $filters['status']))
            ->when($filters['currency'] !== 'all', fn (Builder $query) => $query->where('currency', $filters['currency']))
            ->latest('id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (PayoutRequest $payout): array => $this->payload($payout));

        return Inertia::render('Admin/Payouts/Index', [
            'filters' => $filters,
            'statusOptions' => config('localserve.payout.status_options'),
            'currencyOptions' => config('localserve.payment.currencies'),
            'destinationOptions' => config('localserve.payout.destination_options'),
            'payouts' => $payouts,
            'summary' => [
                'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
                'approved' => (clone $baseQuery)->where('status', 'approved')->count(),
                'paid' => (clone $baseQuery)->where('status', 'paid')->count(),
                'rejected' => (clone $baseQuery)->where('status', 'rejected')->count(),
            ],
        ]);
    }

    public function update(
        Request $request,
        PayoutRequest $payout,
        WalletService $wallets,
        FinancialAuditService $audit,
    ): RedirectResponse {
        $admin = $request->user();

        abort_unless($admin->isAdmin(), 403);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['approve', 'mark_paid', 'reject'])],
            'review_notes' => [
                Rule::requiredIf($request->string('action')->toString() === 'reject'),
                'nullable',
                'string',
                'max:1200',
            ],
            'settlement_reference' => [
                Rule::requiredIf($request->string('action')->toString() === 'mark_paid'),
                'nullable',
                'string',
                'max:120',
            ],
            'settlement_notes' => ['nullable', 'string', 'max:1200'],
        ]);

        $action = $validated['action'];

        abort_if($payout->status === 'paid' || $payout->status === 'rejected', 422);
        abort_if($action === 'mark_paid' && $payout->status !== 'approved', 422);

        if ($action === 'reject') {
            $refund = $payout->refund_wallet_transaction_id
                ? null
                : $wallets->credit(
                    $payout->provider,
                    $payout->amount,
                    'payout_refund',
                    "Refunded rejected payout request #{$payout->id}",
                    ['payout_request_id' => $payout->id],
                    $payout->currency,
                );

            $payout->update([
                'status' => 'rejected',
                'reviewed_by_user_id' => $admin->id,
                'reviewed_at' => now(),
                'review_notes' => $validated['review_notes'],
                'refund_wallet_transaction_id' => $refund?->id
                    ?? $payout->refund_wallet_transaction_id,
            ]);

            $audit->recordPayout($payout->refresh(), 'payout_rejected', [
                'reviewed_by_user_id' => $admin->id,
                'refund_wallet_transaction_id' => $refund?->id
                    ?? $payout->refund_wallet_transaction_id,
                'review_notes' => $validated['review_notes'],
            ]);
        } elseif ($action === 'mark_paid') {
            $payout->update([
                'status' => 'paid',
                'reviewed_by_user_id' => $admin->id,
                'reviewed_at' => now(),
                'paid_at' => now(),
                'review_notes' => ($validated['review_notes'] ?? null) ?: $payout->review_notes,
                'settlement_reference' => $validated['settlement_reference'],
                'settlement_notes' => ($validated['settlement_notes'] ?? null) ?: null,
            ]);

            $audit->recordPayout($payout->refresh(), 'payout_paid', [
                'reviewed_by_user_id' => $admin->id,
                'settlement_notes' => ($validated['settlement_notes'] ?? null) ?: null,
            ]);
        } else {
            $payout->update([
                'status' => 'approved',
                'reviewed_by_user_id' => $admin->id,
                'reviewed_at' => now(),
                'review_notes' => ($validated['review_notes'] ?? null) ?: null,
            ]);

            $audit->recordPayout($payout->refresh(), 'payout_approved', [
                'reviewed_by_user_id' => $admin->id,
                'review_notes' => ($validated['review_notes'] ?? null) ?: null,
            ]);
        }

        $payout->refresh();

        $notificationBody = "Your {$payout->currency} {$payout->amount} payout request is now {$payout->status}.";
        if ($payout->status === 'paid' && $payout->settlement_reference) {
            $notificationBody .= " Settlement reference: {$payout->settlement_reference}.";
        }

        InAppNotification::notifyUser(
            $payout->provider,
            'provider_payout_'.$payout->status,
            'Payout '.str_replace('_', ' ', $payout->status),
            $notificationBody,
            route('profile.edit', ['section' => 'billing']),
            'View wallet',
            ['payout_request_id' => $payout->id],
        );

        return Redirect::route('admin.payouts.index');
    }

    private function payload(PayoutRequest $payout): array
    {
        return [
            'id' => $payout->id,
            'amount' => $payout->amount,
            'currency' => $payout->currency,
            'destinationType' => $payout->destination_type,
            'destinationLabel' => $payout->destination_label,
            'accountReference' => $payout->account_reference,
            'notes' => $payout->notes,
            'status' => $payout->status,
            'reviewNotes' => $payout->review_notes,
            'reviewedByName' => $payout->reviewedBy?->name,
            'reviewedAt' => $payout->reviewed_at?->toDateTimeString(),
            'paidAt' => $payout->paid_at?->toDateTimeString(),
            'settlementReference' => $payout->settlement_reference,
            'settlementNotes' => $payout->settlement_notes,
            'createdAt' => $payout->created_at->toDateTimeString(),
            'provider' => [
                'id' => $payout->provider->id,
                'name' => $payout->provider->name,
                'businessName' => $payout->provider->providerProfile?->business_name,
                'email' => $payout->provider->email,
            ],
        ];
    }
}
