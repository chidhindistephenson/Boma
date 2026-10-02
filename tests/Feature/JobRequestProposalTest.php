<?php

use App\Models\JobRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createBoardProvider(
    string $email,
    string $category = 'Electrical',
    float $latitude = -17.8252,
    float $longitude = 31.0335,
): User {
    $provider = User::factory()->provider()->create([
        'email' => $email,
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Avondale',
        'latitude' => $latitude,
        'longitude' => $longitude,
    ]);

    $provider->providerProfile()->update([
        'business_name' => str($email)->before('@')->headline()->toString(),
        'trade_category' => $category,
        'bio' => 'Verified provider for the open job board workflow.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
        'service_radius_km' => 25,
    ]);

    return $provider->fresh('providerProfile');
}

function createOpenBoardRequest(User $customer): JobRequest
{
    return JobRequest::create([
        'customer_id' => $customer->id,
        'trade_category' => 'Electrical',
        'title' => 'Open distribution board repair',
        'description' => 'Inspect repeated breaker trips and propose a safe repair.',
        'urgency' => 'this_week',
        'budget_min' => 100,
        'budget_max' => 400,
        'city' => 'Harare',
        'area' => 'Avondale',
        'latitude' => -17.8252,
        'longitude' => 31.0335,
        'status' => 'open',
    ]);
}

function proposalPayload(int $amount = 220): array
{
    return [
        'amount' => $amount,
        'timeline_days' => 2,
        'summary' => 'Inspection, replacement parts, installation, and safety testing.',
        'notes' => 'Final parts selection follows the initial inspection.',
        'valid_until' => now()->addWeek()->toDateString(),
    ];
}

test('an open request notifies only verified providers matching category and service area', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
        'latitude' => -17.8252,
        'longitude' => 31.0335,
    ]);
    $matching = createBoardProvider('matching-board@example.com');
    $farAway = createBoardProvider('far-board@example.com', 'Electrical', -20.1596, 28.5833);
    $wrongCategory = createBoardProvider('plumber-board@example.com', 'Plumbing');

    $this->actingAs($customer)
        ->post(route('requests.store'), [
            'provider_id' => '',
            'trade_category' => 'Electrical',
            'title' => 'Open home wiring inspection',
            'description' => 'Need nearby electricians to inspect and propose a safe repair.',
            'urgency' => 'this_week',
            'preferred_date' => now()->addDays(3)->toDateString(),
            'budget_min' => 100,
            'budget_max' => 450,
            'city' => 'Harare',
            'area' => 'Avondale',
        ])
        ->assertRedirect();

    $jobRequest = JobRequest::query()->where('title', 'Open home wiring inspection')->firstOrFail();

    expect($jobRequest->status)->toBe('open');
    expect($jobRequest->latitude)->toBe(-17.8252);
    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $matching->id,
        'type' => 'request_board_match',
    ]);
    $this->assertDatabaseMissing('in_app_notifications', [
        'user_id' => $farAway->id,
        'type' => 'request_board_match',
    ]);
    $this->assertDatabaseMissing('in_app_notifications', [
        'user_id' => $wrongCategory->id,
        'type' => 'request_board_match',
    ]);
});

test('verified provider sees only matching open requests on the job board', function () {
    $customer = User::factory()->create();
    $provider = createBoardProvider('board-browser@example.com');
    $matching = createOpenBoardRequest($customer);

    JobRequest::create([
        'customer_id' => $customer->id,
        'trade_category' => 'Plumbing',
        'title' => 'Unrelated plumbing request',
        'description' => 'This request must not appear for an electrician.',
        'urgency' => 'urgent',
        'city' => 'Harare',
        'status' => 'open',
    ]);

    $this->actingAs($provider)
        ->get(route('request-board.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Board')
            ->where('summary.matched', 1)
            ->has('jobRequests.data', 1)
            ->where('jobRequests.data.0.id', $matching->id));

    $this->actingAs($provider)
        ->get(route('requests.show', $matching))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('permissions.canPropose', true));

    $this->actingAs($provider)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('providerSummary.matchingOpenRequests', 1));
});

test('multiple providers can propose and customer acceptance creates the assigned quote', function () {
    $customer = User::factory()->create(['name' => 'Nyasha Dube']);
    $firstProvider = createBoardProvider('first-proposal@example.com');
    $secondProvider = createBoardProvider('second-proposal@example.com');
    $jobRequest = createOpenBoardRequest($customer);

    $this->actingAs($firstProvider)
        ->put(route('requests.proposal.upsert', $jobRequest), proposalPayload(210))
        ->assertRedirect(route('requests.show', $jobRequest));
    $this->actingAs($secondProvider)
        ->put(route('requests.proposal.upsert', $jobRequest), proposalPayload(260))
        ->assertRedirect(route('requests.show', $jobRequest));

    $firstProposal = $jobRequest->proposals()->where('provider_id', $firstProvider->id)->firstOrFail();
    $secondProposal = $jobRequest->proposals()->where('provider_id', $secondProvider->id)->firstOrFail();

    $this->actingAs($customer)
        ->get(route('requests.show', $jobRequest))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('jobRequest.proposals', 2)
            ->where('permissions.canRespondToProposals', true));

    $this->actingAs($customer)
        ->patch(route('requests.proposals.respond', [$jobRequest, $firstProposal]), [
            'action' => 'accept',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $jobRequest->refresh();

    expect($jobRequest->provider_id)->toBe($firstProvider->id);
    expect($jobRequest->status)->toBe('accepted');
    expect($firstProposal->fresh()->status)->toBe('accepted');
    expect($secondProposal->fresh()->status)->toBe('declined');
    $this->assertDatabaseHas('job_request_quotes', [
        'job_request_id' => $jobRequest->id,
        'provider_id' => $firstProvider->id,
        'amount' => 210,
        'status' => 'accepted',
    ]);
    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $firstProvider->id,
        'type' => 'request_proposal_accepted',
    ]);

    $this->actingAs($secondProvider)
        ->get(route('requests.show', $jobRequest))
        ->assertForbidden();
});

test('provider can update and withdraw a pending proposal but unrelated users cannot respond', function () {
    $customer = User::factory()->create();
    $otherCustomer = User::factory()->create(['email' => 'other-board-customer@example.com']);
    $provider = createBoardProvider('withdraw-proposal@example.com');
    $jobRequest = createOpenBoardRequest($customer);

    $this->actingAs($provider)
        ->put(route('requests.proposal.upsert', $jobRequest), proposalPayload(200))
        ->assertRedirect();
    $this->actingAs($provider)
        ->put(route('requests.proposal.upsert', $jobRequest), proposalPayload(180))
        ->assertRedirect();

    $proposal = $jobRequest->proposals()->firstOrFail();
    expect($proposal->amount)->toBe(180);

    $this->actingAs($otherCustomer)
        ->patch(route('requests.proposals.respond', [$jobRequest, $proposal]), [
            'action' => 'accept',
        ])
        ->assertForbidden();

    $this->actingAs($provider)
        ->patch(route('requests.proposal.withdraw', $jobRequest))
        ->assertRedirect(route('request-board.index'));

    expect($proposal->fresh()->status)->toBe('withdrawn');
});
