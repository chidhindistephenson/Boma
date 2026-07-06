<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createShortlistedWorkspaceProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Spark District Electric',
        'trade_category' => 'Electrical',
        'headline' => 'Clean diagnostics and fast callouts.',
        'bio' => 'Verified electrical provider for customer workspace tests.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
        'base_price_from' => 80,
        'response_time_label' => 'Same day',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

test('customer can filter the shortlist workspace', function () {
    $customer = User::factory()->create();
    $provider = createShortlistedWorkspaceProvider();
    $otherProvider = createShortlistedWorkspaceProvider([
        'email' => 'plumber@example.com',
    ], [
        'business_name' => 'Tapline Plumbing',
        'trade_category' => 'Plumbing',
    ]);

    $customer->shortlistedProviders()->attach([$provider->id, $otherProvider->id]);

    $this->actingAs($customer)
        ->get(route('shortlist.index', ['category' => 'Electrical', 'q' => 'Spark']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Customers/Shortlist')
            ->where('filters.category', 'Electrical')
            ->where('filters.q', 'Spark')
            ->has('providers.data', 1)
            ->where('providers.data.0.businessName', 'Spark District Electric'));
});

test('customer shortlist workspace surfaces provider trust signals', function () {
    $customer = User::factory()->create();
    $provider = createShortlistedWorkspaceProvider();

    $jobRequest = $customer->customerJobRequests()->create([
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Closed shortlist trust request',
        'description' => 'Closed request used to feed shortlist trust signals.',
        'urgency' => 'flexible',
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'status' => 'closed',
    ]);

    $jobRequest->review()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'rating' => 5,
        'headline' => 'Strong work',
        'body' => 'Clear communication and clean execution.',
    ]);

    $customer->shortlistedProviders()->attach($provider->id);

    $this->actingAs($customer)
        ->get(route('shortlist.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Customers/Shortlist')
            ->where('providers.data.0.businessName', 'Spark District Electric')
            ->where('providers.data.0.verificationStatus', 'verified')
            ->where('providers.data.0.averageRating', 5)
            ->where('providers.data.0.reviewCount', 1));
});
