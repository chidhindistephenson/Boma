<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\ProviderTradeCategory;
use App\Models\ProviderVerificationEvent;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class ProviderTradeCategoryController extends Controller
{
    public function store(Request $request, SubscriptionService $subscriptions): RedirectResponse
    {
        $provider = $request->user()->loadMissing('providerProfile.tradeCategories');

        abort_unless($provider->isProvider() && $provider->providerProfile, 403);

        $validated = $request->validate([
            'trade_category' => ['required', 'string', Rule::in(config('localserve.trade_categories'))],
        ]);

        $subscriptions->ensureTradeCategoryLimit(
            $provider->providerProfile,
            $validated['trade_category'],
        );

        $tradeCategory = $provider->providerProfile->tradeCategories()->firstOrCreate(
            ['trade_category' => $validated['trade_category']],
            [
                'verification_status' => 'pending',
                'submitted_at' => now(),
            ],
        );

        $isResubmittingRejectedTrade = ! $tradeCategory->wasRecentlyCreated
            && $tradeCategory->verification_status === 'rejected';

        if ($isResubmittingRejectedTrade) {
            $tradeCategory->forceFill([
                'verification_status' => 'pending',
                'submitted_at' => now(),
                'review_notes' => null,
                'reviewed_at' => null,
                'reviewed_by_user_id' => null,
                'verified_at' => null,
            ])->save();
        }

        if (! $tradeCategory->wasRecentlyCreated && ! $isResubmittingRejectedTrade) {
            return Redirect::route('profile.edit', ['section' => 'verification']);
        }

        ProviderVerificationEvent::record(
            $provider->providerProfile,
            $tradeCategory->wasRecentlyCreated ? 'trade_added' : 'trade_resubmitted',
            $provider,
            [
                'trade_category' => $tradeCategory->trade_category,
            ],
        );

        User::query()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->each(function (User $admin) use ($provider, $tradeCategory): void {
                InAppNotification::notifyUser(
                    $admin,
                    'provider_trade_category_submitted',
                    'Provider trade submitted',
                    "{$provider->providerProfile->business_name} requested verification for {$tradeCategory->trade_category}.",
                    route('admin.providers.index', ['status' => 'pending']),
                    'Review trade',
                    [
                        'provider_id' => $provider->id,
                        'provider_trade_category_id' => $tradeCategory->id,
                    ],
                );
            });

        return Redirect::route('profile.edit', ['section' => 'verification']);
    }

    public function destroy(Request $request, ProviderTradeCategory $tradeCategory): RedirectResponse
    {
        $provider = $request->user();
        $tradeCategory->loadMissing('providerProfile');

        abort_unless(
            $provider->isProvider()
            && $tradeCategory->providerProfile
            && $tradeCategory->providerProfile->user_id === $provider->id,
            403,
        );
        abort_if($tradeCategory->verification_status === 'verified', 403);

        ProviderVerificationEvent::record(
            $tradeCategory->providerProfile,
            'trade_removed',
            $provider,
            ['trade_category' => $tradeCategory->trade_category],
        );

        $tradeCategory->delete();

        return Redirect::route('profile.edit', ['section' => 'verification']);
    }
}
