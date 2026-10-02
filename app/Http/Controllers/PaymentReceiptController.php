<?php

namespace App\Http\Controllers;

use App\Models\JobRequest;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PaymentReceiptController extends Controller
{
    public function __invoke(Request $request, JobRequest $jobRequest): Response
    {
        $viewer = $request->user();

        $jobRequest->loadMissing([
            'customer',
            'provider.providerProfile',
            'payment.paymentMethod',
            'payment.releasedBy',
            'payment.refundedBy',
            'payment.disputedBy',
        ]);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->payment, 404);

        $payment = $jobRequest->payment;
        $providerLabel = $jobRequest->provider?->providerProfile?->business_name
            ?? $jobRequest->provider?->name
            ?? 'Open provider';
        $amount = $this->formatAmount($payment->amount, $payment->currency);
        $platformFee = $this->formatAmount($payment->platform_fee_amount, $payment->currency);
        $providerNet = $this->formatAmount(
            $payment->provider_net_amount ?? max(0, $payment->amount - $payment->platform_fee_amount),
            $payment->currency,
        );

        $rows = [
            'Receipt number' => 'BOMA-RCP-'.$payment->id,
            'Request' => $jobRequest->title,
            'Customer' => $jobRequest->customer->name,
            'Provider' => $providerLabel,
            'Amount' => $amount,
            'Boma platform fee' => $platformFee,
            'Provider net' => $providerNet,
            'Payment channel' => $this->label($payment->channel),
            'Payment method' => $this->label($payment->method),
            'Payment status' => $this->label($payment->status),
            'Escrow status' => $this->label($payment->escrow_status),
            'Reference' => $payment->reference ?: 'Not supplied',
            'Gateway' => $payment->gateway_provider ?: 'Not applicable',
            'Gateway transaction' => $payment->gateway_transaction_id ?: 'Not applicable',
            'Paid at' => $payment->paid_at?->toDayDateTimeString() ?? 'Not recorded',
            'Confirmed at' => $payment->confirmed_at?->toDayDateTimeString() ?? 'Not confirmed',
            'Released at' => $payment->released_at?->toDayDateTimeString() ?? 'Not released',
            'Refunded at' => $payment->refunded_at?->toDayDateTimeString() ?? 'Not refunded',
            'Refunded by' => $payment->refundedBy?->name ?? 'Not refunded',
            'Refund reason' => $payment->refund_reason ?: 'Not applicable',
            'Disputed at' => $payment->disputed_at?->toDayDateTimeString() ?? 'Not disputed',
            'Disputed by' => $payment->disputedBy?->name ?? 'Not disputed',
            'Dispute reason' => $payment->dispute_reason ?: 'Not applicable',
            'Generated at' => now()->toDayDateTimeString(),
        ];

        $bodyRows = collect($rows)->map(function (string $value, string $label): string {
            return '<tr><th>'.e($label).'</th><td>'.e($value).'</td></tr>';
        })->implode('');

        $html = <<<HTML
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Boma Payment Receipt</title>
    <style>
        body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #f4f4f5; color: #09090b; }
        main { max-width: 760px; margin: 40px auto; background: #fff; border: 1px solid #d4d4d8; padding: 36px; }
        .eyebrow { color: #71717a; font-size: 12px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; }
        h1 { margin: 10px 0 4px; font-size: 34px; }
        .amount { margin: 24px 0; font-size: 44px; font-weight: 800; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th, td { border-top: 1px solid #e4e4e7; padding: 14px 0; text-align: left; vertical-align: top; }
        th { width: 38%; color: #52525b; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; }
        .actions { margin-top: 28px; display: flex; gap: 12px; }
        button { border: 0; background: #09090b; color: #fff; padding: 12px 18px; font-weight: 700; border-radius: 999px; cursor: pointer; }
        @media print { body { background: #fff; } main { margin: 0; border: 0; } .actions { display: none; } }
    </style>
</head>
<body>
    <main>
        <p class="eyebrow">Boma payment receipt</p>
        <h1>{$this->escape($jobRequest->title)}</h1>
        <p>Receipt for a payment recorded on Boma.</p>
        <div class="amount">{$this->escape($amount)}</div>
        <table>{$bodyRows}</table>
        <div class="actions">
            <button onclick="window.print()">Print or save PDF</button>
        </div>
    </main>
</body>
</html>
HTML;

        return response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    private function formatAmount(int $amount, string $currency): string
    {
        return $currency === 'USD'
            ? '$'.number_format($amount)
            : config("localserve.payment.currencies.{$currency}", $currency).' '.number_format($amount);
    }

    private function label(?string $value): string
    {
        return str_replace('_', ' ', $value ?: 'not set');
    }

    private function escape(string $value): string
    {
        return e($value);
    }
}
