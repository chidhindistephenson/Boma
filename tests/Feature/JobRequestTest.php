<?php

use App\Models\JobRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createRequestProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $user = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'phone' => '+263779999999',
    ], $userAttributes));

    $user->providerProfile()->update(array_merge([
        'business_name' => 'Target Electric Co',
        'trade_category' => 'Electrical',
        'bio' => 'Targeted provider profile for request flow tests.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $user->fresh('providerProfile');
}

test('customer can render the general request creation page', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $customer->customerProfile()->update([
        'default_trade_category' => 'Electrical',
        'default_urgency' => 'urgent',
        'default_budget_min' => 75,
        'default_budget_max' => 220,
        'location_notes' => 'Guard usually opens the gate from the side entrance.',
        'preferred_radius_km' => 35,
    ]);
    $provider = createRequestProvider();

    $customer->shortlistedProviders()->attach($provider->id);

    $response = $this->actingAs($customer)->get(route('requests.create'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Requests/Create')
        ->has('providers', 1)
        ->where('defaultValues.tradeCategory', 'Electrical')
        ->where('defaultValues.urgency', 'urgent')
        ->where('defaultValues.budgetMin', 75)
        ->where('defaultValues.budgetMax', 220)
        ->where('defaultValues.locationNotes', 'Guard usually opens the gate from the side entrance.')
        ->where('defaultValues.preferredRadiusKm', 35)
        ->where('defaultValues.city', 'Harare')
        ->where('defaultValues.area', 'Avondale'));
});

test('customer can render a provider-targeted request creation page', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider([], [
        'business_name' => 'Northline Wiring',
        'trade_category' => 'Electrical',
    ]);

    $response = $this->actingAs($customer)->get(
        route('providers.requests.create', $provider),
    );

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Requests/Create')
        ->where('lockedProvider', true)
        ->where('providers.0.tradeCategories.0', 'Electrical')
        ->where('defaultValues.providerId', $provider->id)
        ->where('defaultValues.tradeCategory', 'Electrical'));
});

test('provider-targeted request defaults to the provider trade over customer defaults', function () {
    $customer = User::factory()->create();
    $customer->customerProfile()->update([
        'default_trade_category' => 'Electrical',
    ]);
    $provider = createRequestProvider([], [
        'business_name' => 'Great Wall Coatings',
        'trade_category' => 'Painting',
    ]);

    $response = $this->actingAs($customer)->get(
        route('providers.requests.create', $provider),
    );

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Requests/Create')
        ->where('lockedProvider', true)
        ->where('defaultValues.providerId', $provider->id)
        ->where('defaultValues.tradeCategory', 'Painting')
        ->where('providers.0.tradeCategories.0', 'Painting'));
});

test('customer cannot create a targeted request for a trade the provider does not offer', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider([], [
        'business_name' => 'Great Wall Coatings',
        'trade_category' => 'Painting',
    ]);

    $response = $this->actingAs($customer)->post(route('requests.store'), [
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Kitchen rewiring support needed',
        'description' => 'Need a qualified electrician to inspect and rewire a damaged kitchen circuit.',
        'urgency' => 'urgent',
        'preferred_date' => now()->addDays(2)->toDateString(),
        'budget_min' => 80,
        'budget_max' => 150,
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);

    $response->assertSessionHasErrors('trade_category');

    $this->assertDatabaseMissing('job_requests', [
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Kitchen rewiring support needed',
    ]);
});

test('customer can create a targeted job request', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider();

    $response = $this->actingAs($customer)->post(route('requests.store'), [
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Kitchen rewiring support needed',
        'description' => 'Need a qualified electrician to inspect and rewire a damaged kitchen circuit.',
        'urgency' => 'urgent',
        'preferred_date' => now()->addDays(2)->toDateString(),
        'budget_min' => 80,
        'budget_max' => 150,
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);

    $jobRequest = JobRequest::query()->latest()->first();

    $response->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_requests', [
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'title' => 'Kitchen rewiring support needed',
        'status' => 'targeted',
    ]);
});

test('customer can create a job request with saved access notes', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider();

    $response = $this->actingAs($customer)->post(route('requests.store'), [
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Need a hallway rewiring assessment',
        'description' => 'Looking for a provider to inspect and quote a hallway rewiring job.',
        'urgency' => 'this_week',
        'preferred_date' => now()->addDays(3)->toDateString(),
        'budget_min' => 100,
        'budget_max' => 240,
        'city' => 'Harare',
        'area' => 'Avondale',
        'location_notes' => 'Blue gate on the corner stand. Please call five minutes before arrival.',
    ]);

    $jobRequest = JobRequest::query()->latest()->first();

    $response->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_requests', [
        'id' => $jobRequest->id,
        'location_notes' => 'Blue gate on the corner stand. Please call five minutes before arrival.',
    ]);
});

test('customer can view their request thread', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider();

    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Need socket replacements',
        'description' => 'Three sockets need replacement in the lounge.',
        'urgency' => 'flexible',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'targeted',
    ]);

    $response = $this->actingAs($customer)->get(route('requests.show', $jobRequest));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Requests/Show')
        ->where('jobRequest.title', 'Need socket replacements')
        ->where('permissions.canMessage', true));
});

test('provider can reply to a targeted request and move it into conversation', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider();

    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Faulty breaker inspection',
        'description' => 'Need a breaker assessed after repeated trips.',
        'urgency' => 'urgent',
        'city' => 'Harare',
        'area' => 'Highlands',
        'status' => 'targeted',
    ]);

    $response = $this->actingAs($provider)->post(
        route('requests.messages.store', $jobRequest),
        ['body' => 'I can inspect this tomorrow morning.'],
    );

    $response->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_messages', [
        'job_request_id' => $jobRequest->id,
        'sender_id' => $provider->id,
        'body' => 'I can inspect this tomorrow morning.',
    ]);

    $this->assertSame('in_conversation', $jobRequest->fresh()->status);
});

test('provider can accept a targeted request', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider();

    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'DB board replacement',
        'description' => 'Need a provider to replace a damaged DB board.',
        'urgency' => 'urgent',
        'city' => 'Harare',
        'area' => 'Mount Pleasant',
        'status' => 'targeted',
    ]);

    $response = $this->actingAs($provider)->patch(
        route('requests.status.update', $jobRequest),
        ['action' => 'accept'],
    );

    $response->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_requests', [
        'id' => $jobRequest->id,
        'status' => 'accepted',
    ]);
});

test('provider can decline a request and the thread becomes read only', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider();

    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Garage rewiring',
        'description' => 'Need rewiring support for a detached garage.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Greendale',
        'status' => 'targeted',
    ]);

    $response = $this->actingAs($provider)->patch(
        route('requests.status.update', $jobRequest),
        ['action' => 'decline'],
    );

    $response->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_requests', [
        'id' => $jobRequest->id,
        'status' => 'declined',
    ]);

    $this->actingAs($customer)
        ->post(route('requests.messages.store', $jobRequest), [
            'body' => 'Checking whether this thread is still open.',
        ])
        ->assertForbidden();
});

test('customer can close an accepted request and stop further replies', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider();

    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Solar inverter follow-up',
        'description' => 'Need to close the request after scheduling is complete.',
        'urgency' => 'flexible',
        'city' => 'Harare',
        'area' => 'Avondale West',
        'status' => 'accepted',
    ]);

    $response = $this->actingAs($customer)->patch(
        route('requests.status.update', $jobRequest),
        ['action' => 'close'],
    );

    $response->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_requests', [
        'id' => $jobRequest->id,
        'status' => 'closed',
    ]);

    $this->actingAs($provider)
        ->post(route('requests.messages.store', $jobRequest), [
            'body' => 'Trying to respond after the request was closed.',
        ])
        ->assertForbidden();
});

test('unrelated provider cannot view another providers targeted request', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider();
    $otherProvider = createRequestProvider([
        'email' => 'other-provider@example.com',
    ], [
        'business_name' => 'Other Target Electric Co',
    ]);

    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Outdoor light issue',
        'description' => 'Garden lighting stopped working after rainfall.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'status' => 'targeted',
    ]);

    $this->actingAs($otherProvider)
        ->get(route('requests.show', $jobRequest))
        ->assertForbidden();
});

test('dashboard shows unread request messages and viewing the thread clears them', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider();

    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Gate motor fault',
        'description' => 'Need help with an intermittent gate motor failure.',
        'urgency' => 'urgent',
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'status' => 'targeted',
        'customer_last_read_at' => now()->subHour(),
    ]);

    $this->actingAs($provider)->post(
        route('requests.messages.store', $jobRequest),
        ['body' => 'I can inspect this later today.'],
    )->assertRedirect(route('requests.show', $jobRequest));

    $this->actingAs($customer)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('customerJobRequests.0.messageCount', 1)
            ->where('customerJobRequests.0.unreadCount', 1));

    $this->actingAs($customer)
        ->get(route('requests.show', $jobRequest))
        ->assertOk();

    $this->actingAs($customer)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('customerJobRequests.0.unreadCount', 0));
});

test('provider dashboard shows recent targeted requests', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider();

    JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Bathroom heater not working',
        'description' => 'Need inspection and repair for a failed bathroom heater circuit.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Greystone Park',
        'status' => 'targeted',
    ]);

    $response = $this->actingAs($provider)->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Dashboard')
        ->has('providerJobRequests', 1)
        ->where('providerJobRequests.0.title', 'Bathroom heater not working')
        ->where('providerJobRequests.0.customerName', $customer->name));
});

test('customer can browse the request workspace with filters', function () {
    $customer = User::factory()->create();
    $provider = createRequestProvider();

    JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Accepted generator wiring check',
        'description' => 'Need a final inspection on a completed generator wiring job.',
        'urgency' => 'flexible',
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'status' => 'accepted',
    ]);

    JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Open kitchen plug issue',
        'description' => 'Need a diagnosis for dead kitchen plugs.',
        'urgency' => 'urgent',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'open',
    ]);

    $attentionRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Quote approval needed',
        'description' => 'Need to approve the provider quote for a light repair.',
        'urgency' => 'flexible',
        'city' => 'Harare',
        'area' => 'Mount Pleasant',
        'status' => 'in_conversation',
    ]);

    $attentionRequest->quote()->create([
        'provider_id' => $provider->id,
        'amount' => 95,
        'timeline_days' => 1,
        'summary' => 'Replace fittings and test the circuit.',
        'status' => 'pending',
    ]);

    $this->actingAs($customer)
        ->get(route('requests.index', ['status' => 'accepted']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Index')
            ->where('filters.status', 'accepted')
            ->where('summary.total', 3)
            ->where('summary.active', 3)
            ->has('jobRequests.data', 1)
            ->where('jobRequests.data.0.title', 'Accepted generator wiring check'));

    $this->actingAs($customer)
        ->get(route('requests.index', ['attention' => 1]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Index')
            ->where('filters.attention', true)
            ->has('jobRequests.data', 1)
            ->where('jobRequests.data.0.title', 'Quote approval needed')
            ->where('jobRequests.data.0.quoteNeedsResponse', true));
});

test('provider can browse the request inbox with filters', function () {
    $customer = User::factory()->create([
        'name' => 'Inbox Customer',
        'email' => 'inbox-customer@example.com',
    ]);
    $provider = createRequestProvider();

    $targetedRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Urgent breaker panel check',
        'description' => 'Customer needs someone to inspect repeated breaker trips.',
        'urgency' => 'urgent',
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'status' => 'targeted',
        'provider_last_read_at' => now()->subHour(),
    ]);

    $acceptedRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Accepted solar rewiring follow-up',
        'description' => 'Accepted request used to confirm filtering stays scoped.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'accepted',
    ]);

    $targetedRequest->messages()->create([
        'sender_id' => $customer->id,
        'body' => 'Can you inspect this as early as possible?',
    ]);

    $acceptedRequest->quote()->create([
        'provider_id' => $provider->id,
        'amount' => 180,
        'timeline_days' => 2,
        'summary' => 'Accepted quote for rewiring follow-up.',
        'notes' => 'Materials and labor included.',
        'status' => 'accepted',
    ]);

    $this->actingAs($provider)
        ->get(route('requests.index', ['status' => 'targeted', 'q' => 'Inbox Customer']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Index')
            ->where('viewerRole', 'provider')
            ->where('filters.status', 'targeted')
            ->where('filters.q', 'Inbox Customer')
            ->where('summary.total', 2)
            ->where('summary.active', 2)
            ->where('summary.pendingRequests', 1)
            ->where('summary.acceptedRequests', 1)
            ->where('summary.pendingQuotes', 0)
            ->where('summary.acceptedQuotes', 1)
            ->where('summary.unreadMessages', 1)
            ->has('jobRequests.data', 1)
            ->where('jobRequests.data.0.title', 'Urgent breaker panel check')
            ->where('jobRequests.data.0.customerName', 'Inbox Customer')
            ->where('jobRequests.data.0.unreadCount', 1));
});
