<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserSocialAccount;
use App\Services\SystemSettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OAuthController extends Controller
{
    public function redirect(Request $request, string $provider): RedirectResponse
    {
        $config = $this->providerConfig($provider);
        $state = Str::random(40);

        $request->session()->put("oauth.{$provider}.state", $state);

        return redirect()->away($config['authorize_url'].'?'.http_build_query([
            'client_id' => $config['client_id'],
            'redirect_uri' => route('oauth.callback', $provider),
            'response_type' => 'code',
            'scope' => $config['scope'],
            'state' => $state,
        ]));
    }

    public function callback(Request $request, string $provider, SystemSettingsService $settings): RedirectResponse
    {
        $config = $this->providerConfig($provider);

        abort_unless(
            hash_equals((string) $request->session()->pull("oauth.{$provider}.state"), $request->string('state')->toString()),
            403,
        );

        if ($request->filled('error')) {
            throw ValidationException::withMessages([
                'oauth' => 'The OAuth provider rejected the login request.',
            ]);
        }

        $token = Http::asForm()
            ->post($config['token_url'], [
                'client_id' => $config['client_id'],
                'client_secret' => $config['client_secret'],
                'redirect_uri' => route('oauth.callback', $provider),
                'grant_type' => 'authorization_code',
                'code' => $request->string('code')->toString(),
            ])
            ->throw()
            ->json('access_token');

        $profile = Http::withToken($token)
            ->get($config['user_url'])
            ->throw()
            ->json();

        $normalized = $this->normalizeProfile($provider, $profile);

        if (! $normalized['id'] || ! $normalized['email']) {
            throw ValidationException::withMessages([
                'oauth' => 'The OAuth provider did not return a usable profile.',
            ]);
        }

        $user = DB::transaction(function () use ($provider, $normalized, $profile, $settings): User {
            $account = UserSocialAccount::query()
                ->where('provider', $provider)
                ->where('provider_user_id', $normalized['id'])
                ->first();

            if ($account) {
                $account->update([
                    'email' => $normalized['email'],
                    'name' => $normalized['name'],
                    'profile' => $profile,
                ]);

                return $account->user;
            }

            $user = User::query()->where('email', $normalized['email'])->first();

            if (! $user) {
                $user = User::create([
                    'name' => $normalized['name'] ?: 'Boma user',
                    'email' => $normalized['email'],
                    'phone' => '',
                    'role' => 'customer',
                    'status' => 'active',
                    'city' => 'Harare',
                    'area' => null,
                    'password' => Hash::make(Str::random(48)),
                ]);

                $user->forceFill([
                    'email_verified_at' => now(),
                ])->save();

                $user->customerProfile()->create([
                    'preferred_radius_km' => $settings->defaultSearchRadiusKm(),
                ]);
            }

            $user->socialAccounts()->create([
                'provider' => $provider,
                'provider_user_id' => $normalized['id'],
                'email' => $normalized['email'],
                'name' => $normalized['name'],
                'profile' => $profile,
            ]);

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    private function providerConfig(string $provider): array
    {
        abort_unless(in_array($provider, ['google', 'facebook'], true), 404);

        $config = config("services.{$provider}");

        abort_if(empty($config['client_id']) || empty($config['client_secret']), 503);

        return $config;
    }

    private function normalizeProfile(string $provider, array $profile): array
    {
        return match ($provider) {
            'google' => [
                'id' => (string) ($profile['sub'] ?? ''),
                'email' => strtolower((string) ($profile['email'] ?? '')),
                'name' => (string) ($profile['name'] ?? ''),
            ],
            'facebook' => [
                'id' => (string) ($profile['id'] ?? ''),
                'email' => strtolower((string) ($profile['email'] ?? '')),
                'name' => (string) ($profile['name'] ?? ''),
            ],
        };
    }
}
