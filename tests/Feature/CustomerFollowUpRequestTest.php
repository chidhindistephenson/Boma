<?php

use App\Models\JobRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createFollowUpCustomerProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'phone' => '+263777000004',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Fresh Circuit Works',
        'trade_category' => 'Electrical',
        'bio' => 'Provider used in customer follow-up request tests.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

function createFollowUpSourceRequest(User $customer, ?User $provider = null, array $attributes = []): JobRequest
{
    return JobRequest::create(array_merge([
        'customer_id' => $customer->id,
        'provider_id' => $provider?->id,
        'trade_category' => 'Electrical',
        'title' => 'Original consumer unit issue',
        'description' => 'Need a clean follow-up path for a consumer unit problem.',
        'urgency' => 'this_week',
        'budget_min' => 120,
        'budget_max' => 260,
        'city' => 'Harare',
        'area' => 'Avondale',
        'location_notes' => 'Call on arrival because the gate stays locked.',
        'status' => $provider ? 'declined' : 'open',
    ], $attributes));
}

test('customer can open the follow-up builder from an existing request', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $provider = createFollowUpCustomerProvider();
    $sourceRequest = createFollowUpSourceRequest($customer, $provider, [
        'title' => 'Declined generator inspection',
        'description' => 'The first provider could not take this job, so it needs a fresh thread.',
        'status' => 'declined',
    ]);

    $response = $this->actingAs($customer)->get(
        route('requests.followup.create', $sourceRequest),
    );

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Requests/Create')
        ->where('defaultValues.sourceJobRequestId', $sourceRequest->id)
        ->where('defaultValues.title', 'Declined generator inspection')
        ->where('defaultValues.description', 'The first provider could not take this job, so it needs a fresh thread.')
        ->where('defaultValues.tradeCategory', 'Electrical')
        ->where('defaultValues.providerId', null)
        ->where('sourceRequest.id', $sourceRequest->id)
        ->where('sourceRequest.title', 'Declined generator inspection')
        ->where('sourceRequest.status', 'declined'));
});

test('customer can open the follow-up builder from an open untargeted request', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $sourceRequest = createFollowUpSourceRequest($customer, null, [
        'title' => 'Open wiring diagnosis',
        'description' => 'Capture the scope first, then decide which provider to target.',
        'status' => 'open',
    ]);

    $response = $this->actingAs($customer)->get(
        route('requests.followup.create', $sourceRequest),
    );

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Requests/Create')
        ->where('defaultValues.sourceJobRequestId', $sourceRequest->id)
        ->where('defaultValues.title', 'Open wiring diagnosis')
        ->where('defaultValues.description', 'Capture the scope first, then decide which provider to target.')
        ->where('defaultValues.providerId', null)
        ->where('sourceRequest.providerLabel', 'Open request')
        ->where('sourceRequest.status', 'open'));
});

test('customer can create a targeted follow-up request and source link is stored', function () {
    $customer = User::factory()->create();
    $firstProvider = createFollowUpCustomerProvider();
    $secondProvider = createFollowUpCustomerProvider([
        'email' => 'second-followup-provider@example.com',
    ], [
        'business_name' => 'Second Circuit Works',
    ]);
    $sourceRequest = createFollowUpSourceRequest($customer, $firstProvider, [
        'status' => 'declined',
    ]);

    $this->actingAs($customer)
        ->post(route('requests.store'), [
            'source_job_request_id' => $sourceRequest->id,
            'provider_id' => $secondProvider->id,
            'trade_category' => 'Electrical',
            'title' => 'Original consumer unit issue',
            'description' => 'Need a clean follow-up path for a consumer unit problem.',
            'urgency' => 'this_week',
            'budget_min' => 120,
            'budget_max' => 260,
            'city' => 'Harare',
            'area' => 'Avondale',
            'location_notes' => 'Call on arrival because the gate stays locked.',
        ])
        ->assertRedirect();

    $followUpRequest = JobRequest::query()->where('source_job_request_id', $sourceRequest->id)->latest()->first();

    expect($followUpRequest)->not->toBeNull();

    $this->assertDatabaseHas('job_requests', [
        'id' => $followUpRequest->id,
        'source_job_request_id' => $sourceRequest->id,
        'provider_id' => $secondProvider->id,
        'status' => 'targeted',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $secondProvider->id,
        'type' => 'request_targeted',
        'title' => 'New targeted request',
    ]);

    $this->actingAs($customer)
        ->get(route('requests.show', $followUpRequest))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Show')
            ->where('jobRequest.sourceRequest.id', $sourceRequest->id)
            ->where('jobRequest.sourceRequest.title', $sourceRequest->title)
            ->where('permissions.canCreateFollowUp', true));
});

test('customers cannot use another customers request as a follow-up template', function () {
    $owner = User::factory()->create();
    $otherCustomer = User::factory()->create([
        'email' => 'other-followup-customer@example.com',
    ]);
    $provider = createFollowUpCustomerProvider();
    $sourceRequest = createFollowUpSourceRequest($owner, $provider);

    $this->actingAs($otherCustomer)
        ->get(route('requests.followup.create', $sourceRequest))
        ->assertForbidden();

    $this->actingAs($otherCustomer)
        ->post(route('requests.store'), [
            'source_job_request_id' => $sourceRequest->id,
            'provider_id' => $provider->id,
            'trade_category' => 'Electrical',
            'title' => 'Unauthorized follow-up attempt',
            'description' => 'This should not be allowed.',
            'urgency' => 'urgent',
            'city' => 'Harare',
        ])
        ->assertForbidden();
});
