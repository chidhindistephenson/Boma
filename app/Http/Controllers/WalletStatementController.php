<?php

namespace App\Http\Controllers;

use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WalletStatementController extends Controller
{
    public function __invoke(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'currency' => ['nullable', 'string', Rule::in(array_keys(config('localserve.payment.currencies')))],
        ]);

        $user = $request->user();
        $currency = $validated['currency'] ?? config('localserve.payment.wallet_currency');
        $filename = 'boma-wallet-statement-'.$currency.'-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($user, $currency): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Date',
                'Reference',
                'Type',
                'Direction',
                'Amount',
                'Currency',
                'Balance After',
                'Description',
            ]);

            WalletTransaction::query()
                ->where('user_id', $user->id)
                ->where('currency', $currency)
                ->orderByDesc('id')
                ->chunk(100, function ($transactions) use ($handle): void {
                    foreach ($transactions as $transaction) {
                        fputcsv($handle, [
                            $transaction->created_at->toDateTimeString(),
                            $transaction->reference,
                            $transaction->type,
                            $transaction->direction,
                            $transaction->amount,
                            $transaction->currency,
                            $transaction->balance_after,
                            $transaction->description,
                        ]);
                    }
                });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
