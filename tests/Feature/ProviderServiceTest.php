<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createStorefrontProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Avondale',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Avondale Service Co',
        'headline' => 'Practical trade work with clean timing expectations.',
        'trade_category' => 'Electrical',
        'bio' => 'Reliable provider storefront for feature tests.',
        'years_experience' => 7,
        'base_price_from' => 65,
        'response_time_label' => 'Within 24 hours',
        'service_radius_km' => 20,
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

test('provider can create update and delete storefront services', function () {
    $provider = createStorefrontProvider();

    $this->actingAs($provider)
        ->post(route('provider.services.store'), [
            'title' => 'Fault finding and repairs',
            'short_description' => 'Circuit tracing and repair for common electrical issues.',
            'price_from' => 45,
            'turnaround_label' => 'Same day',
            'is_featured' => true,
            'sort_order' => 1,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $service = $provider->fresh('providerProfile.services')
        ->providerProfile
        ->services
        ->first();

    expect($service)->not->toBeNull();
    expect($service->title)->toBe('Fault finding and repairs');

    $this->actingAs($provider)
        ->patch(route('provider.services.update', $service), [
            'title' => 'Emergency fault finding',
            'short_description' => 'Updated description for urgent diagnostics.',
            'price_from' => 55,
            'turnaround_label' => 'Within 1 hour',
            'is_featured' => false,
            'sort_order' => 2,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $service->refresh();

    expect($service->title)->toBe('Emergency fault finding');
    expect($service->price_from)->toBe(55);
    expect($service->turnaround_label)->toBe('Within 1 hour');

    $this->actingAs($provider)
        ->delete(route('provider.services.destroy', $service))
        ->assertRedirect(route('profile.edit'));

    $this->assertDatabaseMissing('provider_services', [
        'id' => $service->id,
    ]);
});

test('provider cannot modify another providers storefront service', function () {
    $owner = createStorefrontProvider();
    $otherProvider = createStorefrontProvider([
        'email' => 'other-provider@example.com',
    ], [
        'business_name' => 'Other Storefront',
    ]);

    $service = $owner->providerProfile->services()->create([
        'title' => 'Panel upgrades',
        'short_description' => 'Owner service.',
        'price_from' => 100,
        'turnaround_label' => 'Within 24 hours',
        'is_featured' => true,
        'sort_order' => 1,
    ]);

    $this->actingAs($otherProvider)
        ->patch(route('provider.services.update', $service), [
            'title' => 'Hijacked service',
            'short_description' => 'Should fail.',
        ])
        ->assertForbidden();
});

test('provider dashboard includes storefront summary', function () {
    $provider = createStorefrontProvider();
    $provider->providerProfile->services()->create([
        'title' => 'Fault finding and repairs',
        'short_description' => 'Circuit tracing and repair.',
        'price_from' => 45,
        'turnaround_label' => 'Same day',
        'is_featured' => true,
        'sort_order' => 1,
    ]);

    User::factory()->create()->shortlistedProviders()->attach($provider->id);

    $this->actingAs($provider)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('providerSummary.serviceCount', 1)
            ->where('providerSummary.shortlistedByCustomersCount', 1)
            ->where('providerSummary.profileVisible', true)
            ->where('providerSummary.basePriceFrom', 65)
            ->where('providerSummary.responseTimeLabel', 'Within 24 hours'));
});
