<?php

use App\Models\ProviderSubscription;
use App\Models\SubscriptionPlan;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

test('provider can activate a wallet billed subscription plan', function () {
    $provider = User::factory()->provider()->create([
        'status' => 'active',
    ]);
    $provider->providerProfile->update([
        'verification_status' => 'verified',
        'verified_at' => now(),
    ]);
    $plan = SubscriptionPlan::query()->where('code', 'standard')->firstOrFail();

    app(WalletService::class)->credit(
        $provider,
        50,
        'test_credit',
        'Test wallet funding',
        [],
        'USD',
    );

    $this->actingAs($provider)
        ->post(route('provider.subscriptions.store', $plan))
        ->assertRedirect(route('profile.edit', ['section' => 'billing']));

    $subscription = ProviderSubscription::query()->firstOrFail();

    expect($subscription->subscription_plan_id)->toBe($plan->id)
        ->and($subscription->status)->toBe('active')
        ->and($subscription->amount)->toBe(15)
        ->and($subscription->walletTransaction)->not->toBeNull()
        ->and($provider->wallet()->where('currency', 'USD')->first()->balance)->toBe(35)
        ->and($provider->providerProfile->fresh()->subscription_tier)->toBe('standard');
});

test('subscription limits are enforced for featured services', function () {
    $provider = User::factory()->provider()->create([
        'status' => 'active',
    ]);
    $provider->providerProfile->update([
        'subscription_tier' => 'basic_trial',
        'verification_status' => 'verified',
        'verified_at' => now(),
    ]);

    $this->actingAs($provider)
        ->post(route('provider.services.store'), [
            'title' => 'Featured listing',
            'short_description' => 'Trying to feature a service on a trial plan.',
            'is_featured' => true,
        ])
        ->assertSessionHasErrors('is_featured');
});

test('admin can update subscription settings and export reports', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $provider = User::factory()->provider()->create(['status' => 'active']);
    $plan = SubscriptionPlan::query()->where('code', 'pro')->firstOrFail();
    $provider->providerProfile->subscriptions()->create([
        'subscription_plan_id' => $plan->id,
        'status' => 'active',
        'amount' => $plan->price,
        'currency' => $plan->currency,
        'starts_at' => now(),
        'current_period_ends_at' => now()->addMonth(),
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.settings.update'), [
            'default_search_radius_km' => 40,
            'featured_slots' => 20,
        ])
        ->assertRedirect(route('admin.settings.index'));

    expect(SystemSetting::query()->find('search.default_radius_km')->value)->toBe(40)
        ->and(SystemSetting::query()->find('subscriptions.featured_slots')->value)->toBe(20);

    $this->actingAs($admin)
        ->patch(route('admin.settings.plans.update', $plan), [
            'name' => 'Pro Plus',
            'description' => 'Updated plan.',
            'price' => 45,
            'currency' => 'USD',
            'billing_interval' => 'monthly',
            'trial_days' => 0,
            'service_limit' => 20,
            'portfolio_limit' => 100,
            'featured_service_limit' => 8,
            'trade_category_limit' => 5,
            'has_premium_analytics' => true,
            'is_active' => true,
            'sort_order' => 30,
        ])
        ->assertRedirect(route('admin.settings.index'));

    expect($plan->fresh()->price)->toBe(45)
        ->and($plan->fresh()->featured_service_limit)->toBe(8);

    $response = $this->actingAs($admin)
        ->get(route('admin.reports.export', ['report' => 'subscriptions']));

    $response->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');

    expect($response->streamedContent())->toContain('Plan')
        ->toContain($provider->providerProfile->business_name);
});

test('admin can send a managed user password reset link', function () {
    Notification::fake();

    $admin = User::factory()->create(['role' => 'admin']);
    $customer = User::factory()->create(['role' => 'customer']);

    $this->actingAs($admin)
        ->post(route('admin.users.reset-password', $customer))
        ->assertRedirect();

    Notification::assertSentTo($customer, ResetPassword::class);
});
