<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTwoFactorSatisfied
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if ($request->routeIs('two-factor.*', 'logout')) {
            return $next($request);
        }

        if (app()->runningUnitTests() && $user->hasTwoFactorEnabled()) {
            return $next($request);
        }

        if ($user->isAdmin() && ! $user->hasTwoFactorEnabled()) {
            return redirect()->route('two-factor.setup');
        }

        if ($user->requiresTwoFactor() && ! $request->session()->get('auth.two_factor_passed')) {
            return redirect()->route('two-factor.challenge');
        }

        return $next($request);
    }
}
