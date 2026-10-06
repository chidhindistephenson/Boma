<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || (! $user->isSuspended() && ! $user->isDeletedAccount())) {
            return $next($request);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $message = $user->isDeletedAccount()
            ? 'This account has been deleted and can no longer be used.'
            : 'This account has been suspended. Contact platform support if you think this is a mistake.';

        return redirect()
            ->route('login')
            ->withErrors([
                'email' => $message,
            ]);
    }
}
