<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class ProviderSubscriptionController extends Controller
{
    public function store(Request $request, SubscriptionPlan $plan, SubscriptionService $subscriptions): RedirectResponse
    {
        abort_unless($request->user()->isProvider(), 403);

        $subscriptions->subscribe($request->user()->loadMissing('providerProfile'), $plan);

        return Redirect::route('profile.edit', ['section' => 'billing'])
            ->with('status', 'subscription-updated');
    }

    public function destroy(Request $request, SubscriptionService $subscriptions): RedirectResponse
    {
        $provider = $request->user()->loadMissing('providerProfile');

        abort_unless($provider->isProvider() && $provider->providerProfile, 403);

        $subscriptions->cancel($provider->providerProfile);

        return Redirect::route('profile.edit', ['section' => 'billing'])
            ->with('status', 'subscription-cancelled');
    }
}
