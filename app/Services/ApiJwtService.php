<?php

namespace App\Services;

use App\Models\ApiRefreshToken;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ApiJwtService
{
    public function issueTokenPair(User $user, ?string $deviceName = null, ?string $ip = null, ?string $userAgent = null): array
    {
        $refreshToken = Str::random(80);
        $refreshTokenModel = $user->apiRefreshTokens()->create([
            'token_hash' => hash('sha256', $refreshToken),
            'device_name' => $deviceName,
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'expires_at' => now()->addMinutes($this->refreshTtlMinutes()),
        ]);

        return [
            'access_token' => $this->makeAccessToken($user),
            'token_type' => 'Bearer',
            'expires_in' => $this->accessTtlMinutes() * 60,
            'refresh_token' => $refreshToken,
            'refresh_expires_at' => $refreshTokenModel->expires_at->toDateTimeString(),
        ];
    }

    public function rotateRefreshToken(string $refreshToken, ?string $ip = null, ?string $userAgent = null): array
    {
        $stored = ApiRefreshToken::query()
            ->with('user')
            ->where('token_hash', hash('sha256', $refreshToken))
            ->first();

        if (! $stored || ! $stored->isUsable() || $stored->user->isSuspended() || $stored->user->status !== 'active') {
            throw ValidationException::withMessages([
                'refresh_token' => 'The refresh token is invalid or expired.',
            ]);
        }

        $stored->update([
            'revoked_at' => now(),
            'last_used_at' => now(),
        ]);

        return $this->issueTokenPair($stored->user, $stored->device_name, $ip, $userAgent);
    }

    public function revokeRefreshToken(string $refreshToken): void
    {
        ApiRefreshToken::query()
            ->where('token_hash', hash('sha256', $refreshToken))
            ->whereNull('revoked_at')
            ->update([
                'revoked_at' => now(),
                'last_used_at' => now(),
            ]);
    }

    public function userFromAccessToken(string $token): User
    {
        $payload = $this->decode($token);

        if (($payload['typ'] ?? null) !== 'access') {
            throw new RuntimeException('The token type is invalid.');
        }

        if (($payload['exp'] ?? 0) < now()->timestamp) {
            throw new RuntimeException('The token has expired.');
        }

        $user = User::find($payload['sub'] ?? null);

        if (! $user || $user->isSuspended() || $user->status !== 'active') {
            throw new RuntimeException('The token user is not active.');
        }

        return $user;
    }

    private function makeAccessToken(User $user): string
    {
        return $this->encode([
            'iss' => config('app.url'),
            'sub' => $user->id,
            'typ' => 'access',
            'iat' => now()->timestamp,
            'exp' => now()->addMinutes($this->accessTtlMinutes())->timestamp,
            'jti' => (string) Str::uuid(),
        ]);
    }

    private function encode(array $payload): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $segments = [
            $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR)),
            $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR)),
        ];
        $segments[] = $this->base64UrlEncode(hash_hmac('sha256', implode('.', $segments), $this->secret(), true));

        return implode('.', $segments);
    }

    private function decode(string $token): array
    {
        $segments = explode('.', $token);

        if (count($segments) !== 3) {
            throw new RuntimeException('The token format is invalid.');
        }

        [$header, $payload, $signature] = $segments;
        $expected = $this->base64UrlEncode(hash_hmac('sha256', "{$header}.{$payload}", $this->secret(), true));

        if (! hash_equals($expected, $signature)) {
            throw new RuntimeException('The token signature is invalid.');
        }

        $decoded = json_decode($this->base64UrlDecode($payload), true, 512, JSON_THROW_ON_ERROR);

        return is_array($decoded) ? $decoded : [];
    }

    private function secret(): string
    {
        $key = Config::get('app.key');

        if (str_starts_with($key, 'base64:')) {
            return base64_decode(substr($key, 7), true) ?: $key;
        }

        return $key;
    }

    private function accessTtlMinutes(): int
    {
        return (int) config('localserve.security.jwt_access_ttl_minutes', 15);
    }

    private function refreshTtlMinutes(): int
    {
        return (int) config('localserve.security.jwt_refresh_ttl_minutes', 43200);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/').str_repeat('=', (4 - strlen($value) % 4) % 4)) ?: '';
    }
}
