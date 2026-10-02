<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use App\Services\SystemSettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminSystemSettingsController extends Controller
{
    public function index(Request $request, SystemSettingsService $settings): Response
    {
        abort_unless($request->user()->isAdmin(), 403);

        return Inertia::render('Admin/Settings/Index', [
            'settings' => [
                'defaultSearchRadiusKm' => $settings->defaultSearchRadiusKm(),
                'featuredSlots' => $settings->featuredSlots(),
            ],
            'plans' => SubscriptionPlan::query()
                ->orderBy('sort_order')
                ->get()
                ->map(fn (SubscriptionPlan $plan): array => $this->planPayload($plan))
                ->all(),
            'currencyOptions' => config('localserve.payment.currencies'),
        ]);
    }

    public function update(Request $request, SystemSettingsService $settings): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'default_search_radius_km' => ['required', 'integer', 'min:1', 'max:250'],
            'featured_slots' => ['required', 'integer', 'min:0', 'max:1000'],
        ]);

        $settings->set('search.default_radius_km', $validated['default_search_radius_km'], $request->user());
        $settings->set('subscriptions.featured_slots', $validated['featured_slots'], $request->user());

        return Redirect::route('admin.settings.index')->with('status', 'settings-updated');
    }

    public function updatePlan(Request $request, SubscriptionPlan $plan): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'price' => ['required', 'integer', 'min:0', 'max:1000000'],
            'currency' => ['required', 'string', Rule::in(array_keys(config('localserve.payment.currencies')))],
            'billing_interval' => ['required', 'string', Rule::in(['monthly', 'yearly'])],
            'trial_days' => ['required', 'integer', 'min:0', 'max:365'],
            'service_limit' => ['required', 'integer', 'min:0', 'max:500'],
            'portfolio_limit' => ['required', 'integer', 'min:0', 'max:2000'],
            'featured_service_limit' => ['required', 'integer', 'min:0', 'max:100'],
            'trade_category_limit' => ['required', 'integer', 'min:1', 'max:50'],
            'has_premium_analytics' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:999'],
        ]);

        $plan->update([
            ...$validated,
            'has_premium_analytics' => $request->boolean('has_premium_analytics'),
            'is_active' => $request->boolean('is_active'),
        ]);

        return Redirect::route('admin.settings.index')->with('status', 'plan-updated');
    }

    private function planPayload(SubscriptionPlan $plan): array
    {
        return [
            'id' => $plan->id,
            'code' => $plan->code,
            'name' => $plan->name,
            'description' => $plan->description,
            'price' => $plan->price,
            'currency' => $plan->currency,
            'billingInterval' => $plan->billing_interval,
            'trialDays' => $plan->trial_days,
            'serviceLimit' => $plan->service_limit,
            'portfolioLimit' => $plan->portfolio_limit,
            'featuredServiceLimit' => $plan->featured_service_limit,
            'tradeCategoryLimit' => $plan->trade_category_limit,
            'hasPremiumAnalytics' => $plan->has_premium_analytics,
            'isActive' => $plan->is_active,
            'sortOrder' => $plan->sort_order,
        ];
    }
}
