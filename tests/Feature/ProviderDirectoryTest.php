<?php

use App\Models\JobRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

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

test('provider directory exposes located providers to the map', function () {
    $provider = createDirectoryProvider([
        'name' => 'Mapped Provider',
        'latitude' => -17.8024,
        'longitude' => 31.0371,
    ], [
        'business_name' => 'Mapped Wiring Co',
    ]);

    $this->get(route('providers.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('mapProviders', 1)
            ->where('mapProviders.0.id', $provider->id)
            ->where('mapProviders.0.businessName', 'Mapped Wiring Co')
            ->where('mapProviders.0.latitude', -17.802)
            ->where('mapProviders.0.longitude', 31.037));
});

test('provider directory filters and sorts providers by geographic distance', function () {
    createDirectoryProvider([
        'name' => 'Nearby Provider',
        'latitude' => -17.8024,
        'longitude' => 31.0371,
    ], [
        'business_name' => 'Nearby Wiring Co',
    ]);

    createDirectoryProvider([
        'name' => 'Distant Provider',
        'city' => 'Bulawayo',
        'area' => 'Hillside',
        'latitude' => -20.1874,
        'longitude' => 28.6046,
    ], [
        'business_name' => 'Distant Wiring Co',
    ]);

    $response = $this->get(route('providers.index', [
        'latitude' => -17.8024,
        'longitude' => 31.0371,
        'radius' => 25,
        'sort' => 'distance',
    ]));

    $response->assertOk();
    $response->assertSee('Nearby Wiring Co');
    $response->assertDontSee('Distant Wiring Co');
    $response->assertInertia(fn (Assert $page) => $page
        ->where('filters.radius', 25)
        ->where('filters.sort', 'distance')
        ->where('providers.total', 1)
        ->where('providers.data.0.distanceKm', 0));
});

test('provider directory can sort located providers by rating', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);

    $lowerRatedProvider = createDirectoryProvider([
        'name' => 'Lower Rated Provider',
        'latitude' => -17.8030,
        'longitude' => 31.0371,
    ], [
        'business_name' => 'Lower Rated Wiring Co',
    ]);

    $higherRatedProvider = createDirectoryProvider([
        'name' => 'Higher Rated Provider',
        'latitude' => -17.8024,
        'longitude' => 31.0371,
    ], [
        'business_name' => 'Higher Rated Wiring Co',
    ]);

    foreach ([[$lowerRatedProvider, 3], [$higherRatedProvider, 5]] as [$provider, $rating]) {
        $jobRequest = JobRequest::create([
            'customer_id' => $customer->id,
            'provider_id' => $provider->id,
            'trade_category' => 'Electrical',
            'title' => "Closed rating request {$provider->id}",
            'description' => 'Closed request used to seed public provider ratings.',
            'urgency' => 'this_week',
            'city' => 'Harare',
            'area' => 'Avondale',
            'status' => 'closed',
        ]);

        $provider->receivedProviderReviews()->create([
            'job_request_id' => $jobRequest->id,
            'customer_id' => $customer->id,
            'rating' => $rating,
            'headline' => 'Verified feedback',
            'body' => 'A public review used by provider directory sorting.',
            'moderation_status' => 'published',
        ]);
    }

    $this->get(route('providers.index', [
        'latitude' => -17.8024,
        'longitude' => 31.0371,
        'radius' => 25,
        'sort' => 'rating',
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.sort', 'rating')
            ->where('providers.total', 2)
            ->where('providers.data.0.businessName', 'Higher Rated Wiring Co')
            ->where('providers.data.0.averageRating', 5));
});
