<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class TwoFactorService
{
    public function generateSecret(): string
    {
        return $this->base32Encode(random_bytes(20));
    }

    public function enable(User $user, string $secret): array
    {
        $codes = collect(range(1, 8))
            ->map(fn () => Str::upper(Str::random(5)).'-'.Str::upper(Str::random(5)))
            ->all();

        $user->forceFill([
            'two_factor_secret' => Crypt::encryptString($secret),
            'two_factor_recovery_codes' => $codes,
            'two_factor_confirmed_at' => now(),
        ])->save();

        return $codes;
    }

    public function disable(User $user): void
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();
    }

    public function verify(User $user, string $code): bool
    {
        $secret = $this->secretFor($user);

        if (! $secret) {
            return false;
        }

        $code = preg_replace('/\s+/', '', $code);
        $timeStep = (int) floor(time() / 30);

        foreach ([-1, 0, 1] as $offset) {
            if (hash_equals($this->totp($secret, $timeStep + $offset), $code)) {
                return true;
            }
        }

        return false;
    }

    public function consumeRecoveryCode(User $user, string $code): bool
    {
        $codes = $user->two_factor_recovery_codes ?? [];
        $index = array_search($code, $codes, true);

        if ($index === false) {
            return false;
        }

        unset($codes[$index]);
        $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();

        return true;
    }

    public function otpauthUrl(User $user, string $secret): string
    {
        return 'otpauth://totp/'.rawurlencode('Boma:'.$user->email).'?'.http_build_query([
            'secret' => $secret,
            'issuer' => 'Boma',
            'algorithm' => 'SHA1',
            'digits' => 6,
            'period' => 30,
        ]);
    }

    public function secretFor(User $user): ?string
    {
        if (! $user->two_factor_secret) {
            return null;
        }

        return Crypt::decryptString($user->two_factor_secret);
    }

    public function currentCode(string $secret): string
    {
        return $this->totp($secret, (int) floor(time() / 30));
    }

    private function totp(string $secret, int $timeStep): string
    {
        $key = $this->base32Decode($secret);
        $time = pack('N*', 0).pack('N*', $timeStep);
        $hash = hash_hmac('sha1', $time, $key, true);
        $offset = ord(substr($hash, -1)) & 0x0F;
        $value = unpack('N', substr($hash, $offset, 4))[1] & 0x7FFFFFFF;

        return str_pad((string) ($value % 1000000), 6, '0', STR_PAD_LEFT);
    }

    private function base32Encode(string $value): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bits = '';
        $output = '';

        foreach (str_split($value) as $character) {
            $bits .= str_pad(decbin(ord($character)), 8, '0', STR_PAD_LEFT);
        }

        foreach (str_split($bits, 5) as $chunk) {
            $output .= $alphabet[bindec(str_pad($chunk, 5, '0'))];
        }

        return $output;
    }

    private function base32Decode(string $value): string
    {
        $alphabet = array_flip(str_split('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'));
        $bits = '';
        $output = '';

        foreach (str_split(strtoupper($value)) as $character) {
            if (! isset($alphabet[$character])) {
                continue;
            }

            $bits .= str_pad(decbin($alphabet[$character]), 5, '0', STR_PAD_LEFT);
        }

        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $output .= chr(bindec($chunk));
            }
        }

        return $output;
    }
}
