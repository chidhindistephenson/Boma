<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createProfileProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $user = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'phone' => '+263778888888',
    ], $userAttributes));

    $user->providerProfile()->update(array_merge([
        'business_name' => 'Northside Electrical Studio',
        'trade_category' => 'Electrical',
        'bio' => 'Reliable electrical work for homes, retail spaces, and urgent maintenance jobs.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $user->fresh('providerProfile');
}

test('public provider profile can be viewed while direct contact stays hidden for guests', function () {
    $provider = createProfileProvider();

    $response = $this->get(route('providers.show', $provider));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Providers/Show')
        ->where('provider.businessName', 'Northside Electrical Studio')
        ->where('canRevealContact', false)
        ->where('provider.phone', null)
        ->where('canShortlist', false));
});

test('customer can shortlist and remove a provider', function () {
    $customer = User::factory()->create();
    $provider = createProfileProvider();

    $this->actingAs($customer)
        ->from(route('providers.show', $provider))
        ->post(route('providers.shortlist.store', $provider))
        ->assertRedirect(route('providers.show', $provider));

    $this->assertDatabaseHas('shortlisted_providers', [
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
    ]);

    $this->actingAs($customer)
        ->from(route('providers.show', $provider))
        ->delete(route('providers.shortlist.destroy', $provider))
        ->assertRedirect(route('providers.show', $provider));

    $this->assertDatabaseMissing('shortlisted_providers', [
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
    ]);
});

test('customer dashboard shows recent shortlisted providers', function () {
    $customer = User::factory()->create();
    $provider = createProfileProvider([], [
        'business_name' => 'Spark District Electric',
    ]);

    $customer->shortlistedProviders()->attach($provider->id);

    $response = $this->actingAs($customer)->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Dashboard')
        ->has('shortlistedProviders', 1)
        ->where('shortlistedProviders.0.businessName', 'Spark District Electric'));
});

test('public provider profile shows storefront details and services', function () {
    $provider = createProfileProvider([], [
        'headline' => 'Fast electrical diagnostics and upgrade work.',
        'years_experience' => 11,
        'base_price_from' => 75,
        'response_time_label' => 'Same day',
        'service_radius_km' => 28,
    ]);

    $provider->providerProfile->services()->createMany([
        [
            'title' => 'Fault finding and repairs',
            'short_description' => 'Circuit tracing, socket repairs, and light fitting fixes.',
            'price_from' => 45,
            'turnaround_label' => 'Same day',
            'is_featured' => true,
            'sort_order' => 1,
        ],
        [
            'title' => 'DB board rewiring',
            'short_description' => 'Safer board rebuilds and load-balancing upgrades.',
            'price_from' => 120,
            'turnaround_label' => 'Within 24 hours',
            'is_featured' => false,
            'sort_order' => 2,
        ],
    ]);

    $response = $this->get(route('providers.show', $provider));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Providers/Show')
        ->where('provider.headline', 'Fast electrical diagnostics and upgrade work.')
        ->where('provider.yearsExperience', 11)
        ->where('provider.basePriceFrom', 75)
        ->where('provider.responseTimeLabel', 'Same day')
        ->where('provider.serviceRadiusKm', 28)
        ->has('provider.services', 2)
        ->where('provider.services.0.title', 'Fault finding and repairs'));
});

test('provider can preview their own storefront before it is public', function () {
    $provider = User::factory()->provider()->create([
        'status' => 'pending_verification',
        'email_verified_at' => null,
        'city' => 'Harare',
        'area' => 'Borrowdale',
    ]);

    $provider->providerProfile()->update([
        'business_name' => 'Private Preview Electrical',
        'headline' => 'Preview before public launch.',
        'trade_category' => 'Electrical',
        'bio' => 'Pending provider should still inspect the storefront.',
        'verification_status' => 'pending',
        'verified_at' => null,
        'availability_status' => 'available',
        'years_experience' => 5,
        'base_price_from' => 60,
        'response_time_label' => 'Within 24 hours',
        'service_radius_km' => 15,
    ]);

    $provider->providerProfile->services()->create([
        'title' => 'Initial wiring check',
        'short_description' => 'Preview-only storefront service.',
        'price_from' => 35,
        'turnaround_label' => 'Same day',
        'is_featured' => true,
        'sort_order' => 1,
    ]);

    $this->actingAs($provider)
        ->get(route('providers.show', $provider))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Providers/Show')
            ->where('isOwnerPreview', true)
            ->where('isPubliclyVisible', false)
            ->where('provider.businessName', 'Private Preview Electrical')
            ->has('provider.services', 1));

    auth()->logout();

    $this->get(route('providers.show', $provider))
        ->assertNotFound();
});
