<?php

use App\Models\JobRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createQuoteProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'phone' => '+263777000001',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'North Grid Electrical',
        'trade_category' => 'Electrical',
        'bio' => 'Quote workflow test provider.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

function createQuotedJobRequest(User $customer, User $provider, array $attributes = []): JobRequest
{
    return JobRequest::create(array_merge([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Full lounge rewiring',
        'description' => 'Need inspection, parts sourcing, and full rewiring support.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'targeted',
    ], $attributes));
}

test('provider can send a quote on a targeted request', function () {
    $customer = User::factory()->create();
    $provider = createQuoteProvider();
    $jobRequest = createQuotedJobRequest($customer, $provider);

    $this->actingAs($provider)
        ->put(route('requests.quote.upsert', $jobRequest), [
            'amount' => 240,
            'timeline_days' => 3,
            'summary' => 'Inspection, materials pickup, socket replacement, and testing.',
            'notes' => 'Amount assumes no hidden wall damage after opening the first channel.',
            'valid_until' => now()->addDays(7)->toDateString(),
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_quotes', [
        'job_request_id' => $jobRequest->id,
        'provider_id' => $provider->id,
        'amount' => 240,
        'timeline_days' => 3,
        'status' => 'pending',
    ]);

    $this->assertDatabaseHas('job_requests', [
        'id' => $jobRequest->id,
        'status' => 'in_conversation',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_quote_created',
        'title' => 'New quote received',
    ]);

    $this->actingAs($customer)
        ->get(route('requests.show', $jobRequest))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Show')
            ->where('jobRequest.quote.status', 'pending')
            ->where('jobRequest.quote.amount', 240)
            ->where('permissions.canRespondToQuote', true));
});

test('customer can accept a pending quote and request becomes accepted', function () {
    $customer = User::factory()->create();
    $provider = createQuoteProvider();
    $jobRequest = createQuotedJobRequest($customer, $provider, [
        'status' => 'in_conversation',
    ]);

    $jobRequest->quote()->create([
        'provider_id' => $provider->id,
        'amount' => 190,
        'timeline_days' => 2,
        'status' => 'pending',
        'summary' => 'Diagnose the fault, replace damaged fittings, and test the circuit.',
        'valid_until' => now()->addDays(5)->toDateString(),
    ]);

    $this->actingAs($customer)
        ->patch(route('requests.quote.status.update', $jobRequest), [
            'action' => 'accept',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_quotes', [
        'job_request_id' => $jobRequest->id,
        'status' => 'accepted',
    ]);

    $this->assertDatabaseHas('job_requests', [
        'id' => $jobRequest->id,
        'status' => 'accepted',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_quote_accepted',
        'title' => 'Quote accepted',
    ]);
});

test('customer can decline a quote and provider can revise it', function () {
    $customer = User::factory()->create();
    $provider = createQuoteProvider();
    $jobRequest = createQuotedJobRequest($customer, $provider, [
        'status' => 'in_conversation',
    ]);

    $jobRequest->quote()->create([
        'provider_id' => $provider->id,
        'amount' => 330,
        'timeline_days' => 4,
        'status' => 'pending',
        'summary' => 'Initial quote for the hallway and lounge rewiring scope.',
    ]);

    $this->actingAs($customer)
        ->patch(route('requests.quote.status.update', $jobRequest), [
            'action' => 'decline',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_quotes', [
        'job_request_id' => $jobRequest->id,
        'status' => 'declined',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_quote_declined',
        'title' => 'Quote declined',
    ]);

    $this->actingAs($provider)
        ->put(route('requests.quote.upsert', $jobRequest), [
            'amount' => 280,
            'timeline_days' => 3,
            'summary' => 'Revised quote after trimming non-essential fitting replacements.',
            'notes' => 'Customer can add patio sockets later as a separate follow-on job.',
            'valid_until' => now()->addDays(6)->toDateString(),
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_quotes', [
        'job_request_id' => $jobRequest->id,
        'amount' => 280,
        'timeline_days' => 3,
        'status' => 'pending',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_quote_updated',
        'title' => 'Quote updated',
    ]);
});

test('accepted quotes cannot be changed and only the customer can respond', function () {
    $customer = User::factory()->create();
    $otherCustomer = User::factory()->create([
        'email' => 'other-customer@example.com',
    ]);
    $provider = createQuoteProvider();
    $jobRequest = createQuotedJobRequest($customer, $provider, [
        'status' => 'accepted',
    ]);

    $jobRequest->quote()->create([
        'provider_id' => $provider->id,
        'amount' => 260,
        'timeline_days' => 2,
        'status' => 'accepted',
        'summary' => 'Accepted quote used for authorization coverage.',
        'responded_at' => now(),
    ]);

    $this->actingAs($provider)
        ->put(route('requests.quote.upsert', $jobRequest), [
            'amount' => 290,
            'timeline_days' => 3,
            'summary' => 'Trying to modify an accepted quote.',
        ])
        ->assertForbidden();

    $this->actingAs($otherCustomer)
        ->patch(route('requests.quote.status.update', $jobRequest), [
            'action' => 'decline',
        ])
        ->assertForbidden();
});

test('customer workspace surfaces quote counts and states', function () {
    $customer = User::factory()->create();
    $provider = createQuoteProvider();

    $pendingQuoteRequest = createQuotedJobRequest($customer, $provider, [
        'title' => 'Pending quote request',
        'status' => 'in_conversation',
    ]);
    $pendingQuoteRequest->quote()->create([
        'provider_id' => $provider->id,
        'amount' => 210,
        'timeline_days' => 2,
        'status' => 'pending',
        'summary' => 'Pending quote summary.',
    ]);

    $acceptedQuoteRequest = createQuotedJobRequest($customer, $provider, [
        'title' => 'Accepted quote request',
        'status' => 'accepted',
    ]);
    $acceptedQuoteRequest->quote()->create([
        'provider_id' => $provider->id,
        'amount' => 340,
        'timeline_days' => 5,
        'status' => 'accepted',
        'summary' => 'Accepted quote summary.',
        'responded_at' => now(),
    ]);

    $this->actingAs($customer)
        ->get(route('requests.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Index')
            ->where('summary.pendingQuotes', 1)
            ->where('summary.acceptedQuotes', 1)
            ->has('jobRequests.data', 2));
});
