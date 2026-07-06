<?php

use App\Models\User;

beforeEach(function () {
    $this->withoutVite();
});

function createDirectoryProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $user = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Avondale',
    ], $userAttributes));

    $user->providerProfile()->update(array_merge([
        'business_name' => 'Boma Test Services',
        'trade_category' => 'Electrical',
        'bio' => 'Reliable electrical services for homes and offices.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $user->fresh('providerProfile');
}

test('provider directory defaults to verified active providers only', function () {
    $verifiedProvider = createDirectoryProvider([
        'name' => 'Verified Provider',
    ], [
        'business_name' => 'Verified Wiring Co',
    ]);

    createDirectoryProvider([
        'name' => 'Pending Provider',
    ], [
        'business_name' => 'Pending Wiring Co',
        'verification_status' => 'pending',
        'verified_at' => null,
    ]);

    $response = $this->get(route('providers.index'));

    $response->assertOk();
    $response->assertSee($verifiedProvider->providerProfile->business_name);
    $response->assertDontSee('Pending Wiring Co');
});

test('provider directory can include non-verified active providers when requested', function () {
    createDirectoryProvider([
        'name' => 'Pending Provider',
    ], [
        'business_name' => 'Pending Wiring Co',
        'verification_status' => 'pending',
        'verified_at' => null,
    ]);

    $response = $this->get(route('providers.index', ['verified' => 0]));

    $response->assertOk();
    $response->assertSee('Pending Wiring Co');
});

test('provider directory filters by search query and category', function () {
    createDirectoryProvider([
        'name' => 'Spark Owner',
        'city' => 'Harare',
        'area' => 'Borrowdale',
    ], [
        'business_name' => 'Spark Grid Electrical',
        'trade_category' => 'Electrical',
    ]);

    createDirectoryProvider([
        'name' => 'Cleaning Owner',
        'city' => 'Bulawayo',
        'area' => 'Matsheumhlope',
    ], [
        'business_name' => 'Clean Sweep Collective',
        'trade_category' => 'Cleaning',
    ]);

    $response = $this->get(route('providers.index', [
        'q' => 'spark',
        'category' => 'Electrical',
        'city' => 'Harare',
    ]));

    $response->assertOk();
    $response->assertSee('Spark Grid Electrical');
    $response->assertDontSee('Clean Sweep Collective');
});

test('provider directory search can match provider service titles', function () {
    $provider = createDirectoryProvider([
        'name' => 'Service Search Provider',
    ], [
        'business_name' => 'Circuit Care Studio',
        'headline' => 'Quick electrical diagnostics with neat handoff.',
    ]);

    $provider->providerProfile->services()->create([
        'title' => 'DB board rewiring',
        'short_description' => 'Safer board rebuilds and load balancing.',
        'price_from' => 120,
        'turnaround_label' => 'Within 24 hours',
        'is_featured' => true,
        'sort_order' => 1,
    ]);

    createDirectoryProvider([
        'name' => 'Other Provider',
    ], [
        'business_name' => 'Harare Cleaning Base',
        'trade_category' => 'Cleaning',
    ]);

    $response = $this->get(route('providers.index', [
        'q' => 'rewiring',
    ]));

    $response->assertOk();
    $response->assertSee('Circuit Care Studio');
    $response->assertDontSee('Harare Cleaning Base');
});
