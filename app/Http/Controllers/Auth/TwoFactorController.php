<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\TwoFactorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorController extends Controller
{
    public function setup(Request $request, TwoFactorService $twoFactor): Response
    {
        $user = $request->user();

        if ($user->hasTwoFactorEnabled()) {
            $secret = $twoFactor->secretFor($user);
        } else {
            $secret = $request->session()->get('two_factor_setup_secret')
                ?: $twoFactor->generateSecret();

            $request->session()->put('two_factor_setup_secret', $secret);
        }

        return Inertia::render('Auth/TwoFactorSetup', [
            'secret' => $secret,
            'otpauthUrl' => $twoFactor->otpauthUrl($user, $secret),
            'mandatory' => $user->isAdmin(),
            'enabled' => $user->hasTwoFactorEnabled(),
        ]);
    }

    public function enable(Request $request, TwoFactorService $twoFactor): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $secret = $request->session()->get('two_factor_setup_secret');

        if (! $secret || ! hash_equals($twoFactor->currentCode($secret), preg_replace('/\s+/', '', $validated['code']))) {
            throw ValidationException::withMessages([
                'code' => 'The authentication code is invalid.',
            ]);
        }

        $codes = $twoFactor->enable($request->user(), $secret);
        $request->session()->forget('two_factor_setup_secret');
        $request->session()->put('auth.two_factor_passed', true);

        return Redirect::route('profile.edit', ['section' => 'security'])
            ->with('status', 'two-factor-enabled')
            ->with('recovery_codes', $codes);
    }

    public function challenge(): Response
    {
        return Inertia::render('Auth/TwoFactorChallenge');
    }

    public function verify(Request $request, TwoFactorService $twoFactor): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $valid = filled($validated['code'] ?? null)
            ? $twoFactor->verify($user, $validated['code'])
            : $twoFactor->consumeRecoveryCode($user, $validated['recovery_code'] ?? '');

        if (! $valid) {
            throw ValidationException::withMessages([
                'code' => 'The authentication code is invalid.',
            ]);
        }

        $request->session()->put('auth.two_factor_passed', true);

        return Redirect::intended(route('dashboard', absolute: false));
    }

    public function disable(Request $request, TwoFactorService $twoFactor): RedirectResponse
    {
        abort_if($request->user()->isAdmin(), 403);

        $twoFactor->disable($request->user());
        $request->session()->forget('auth.two_factor_passed');

        return Redirect::route('profile.edit', ['section' => 'security'])
            ->with('status', 'two-factor-disabled');
    }
}
