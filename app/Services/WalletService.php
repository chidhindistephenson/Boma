<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserWallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class WalletService
{
    public function walletFor(User $user, ?string $currency = null): UserWallet
    {
        $currency = $this->normalizeCurrency($currency);

        return UserWallet::firstOrCreate(
            ['user_id' => $user->id, 'currency' => $currency],
            ['balance' => 0],
        );
    }

    public function walletsFor(User $user)
    {
        foreach (array_keys(config('localserve.payment.currencies')) as $currency) {
            $this->walletFor($user, $currency);
        }

        return UserWallet::query()
            ->where('user_id', $user->id)
            ->whereIn('currency', array_keys(config('localserve.payment.currencies')))
            ->orderByRaw("CASE currency WHEN 'USD' THEN 0 WHEN 'ZWG' THEN 1 ELSE 2 END")
            ->get();
    }

    public function credit(User $user, int $amount, string $type, string $description, array $metadata = [], ?string $currency = null): WalletTransaction
    {
        $currency = $this->normalizeCurrency($currency);

        return DB::transaction(function () use ($user, $amount, $type, $description, $metadata, $currency): WalletTransaction {
            $this->walletFor($user, $currency);
            $wallet = UserWallet::where('user_id', $user->id)
                ->where('currency', $currency)
                ->lockForUpdate()
                ->firstOrFail();
            $wallet->increment('balance', $amount);
            $wallet->refresh();

            return $wallet->transactions()->create([
                'user_id' => $user->id,
                'job_request_id' => $metadata['job_request_id'] ?? null,
                'job_request_payment_id' => $metadata['job_request_payment_id'] ?? null,
                'type' => $type,
                'direction' => 'credit',
                'amount' => $amount,
                'currency' => $currency,
                'balance_after' => $wallet->balance,
                'status' => 'completed',
                'reference' => $this->reference('WCR'),
                'description' => $description,
                'metadata' => $metadata,
            ]);
        });
    }

    public function debit(User $user, int $amount, string $type, string $description, array $metadata = [], ?string $currency = null): WalletTransaction
    {
        $currency = $this->normalizeCurrency($currency);

        return DB::transaction(function () use ($user, $amount, $type, $description, $metadata, $currency): WalletTransaction {
            $this->walletFor($user, $currency);
            $wallet = UserWallet::where('user_id', $user->id)
                ->where('currency', $currency)
                ->lockForUpdate()
                ->firstOrFail();

            if ($wallet->balance < $amount) {
                throw new RuntimeException("Your {$currency} wallet balance is not enough for this payment.");
            }

            $wallet->decrement('balance', $amount);
            $wallet->refresh();

            return $wallet->transactions()->create([
                'user_id' => $user->id,
                'job_request_id' => $metadata['job_request_id'] ?? null,
                'job_request_payment_id' => $metadata['job_request_payment_id'] ?? null,
                'type' => $type,
                'direction' => 'debit',
                'amount' => $amount,
                'currency' => $currency,
                'balance_after' => $wallet->balance,
                'status' => 'completed',
                'reference' => $this->reference('WDB'),
                'description' => $description,
                'metadata' => $metadata,
            ]);
        });
    }

    private function normalizeCurrency(?string $currency): string
    {
        $currency = strtoupper($currency ?: config('localserve.payment.wallet_currency'));

        if (! array_key_exists($currency, config('localserve.payment.currencies'))) {
            throw ValidationException::withMessages([
                'currency' => 'Choose a supported currency.',
            ]);
        }

        return $currency;
    }

    private function reference(string $prefix): string
    {
        return $prefix.'-'.now()->format('YmdHis').'-'.Str::upper(Str::random(8));
    }
}
