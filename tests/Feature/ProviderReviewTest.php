<?php

use App\Models\JobRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createReviewProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Trustline Electrical Works',
        'trade_category' => 'Electrical',
        'bio' => 'Verified provider used in review workflow tests.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

function createClosedReviewRequest(User $customer, User $provider, array $attributes = []): JobRequest
{
    $jobRequest = JobRequest::create(array_merge([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => $provider->providerProfile->trade_category,
        'title' => 'Closed request for provider review',
        'description' => 'Closed request used to test the provider review flow.',
        'urgency' => 'this_week',
        'city' => $customer->city,
        'area' => $customer->area,
        'status' => 'closed',
        'customer_last_read_at' => now(),
        'provider_last_read_at' => now(),
    ], $attributes));

    $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 150,
        'method' => 'mobile_money',
        'reference' => 'CONFIRMED-REVIEW-PAYMENT-'.$jobRequest->id,
        'status' => 'confirmed',
        'paid_at' => now()->subDay(),
        'confirmed_at' => now(),
    ]);

    return $jobRequest;
}

test('customer can leave and update a review for a closed targeted request', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $provider = createReviewProvider();
    $jobRequest = createClosedReviewRequest($customer, $provider);

    $this->actingAs($customer)
        ->from(route('requests.show', $jobRequest))
        ->put(route('requests.review.upsert', $jobRequest), [
            'rating' => 5,
            'headline' => 'Fast and tidy',
            'body' => 'The provider diagnosed the fault quickly and left the site clean.',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('provider_reviews', [
        'job_request_id' => $jobRequest->id,
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'rating' => 5,
        'headline' => 'Fast and tidy',
    ]);

    $this->actingAs($customer)
        ->put(route('requests.review.upsert', $jobRequest), [
            'rating' => 4,
            'headline' => 'Strong communication',
            'body' => 'The final fix held up well and communication stayed clear throughout.',
        ])
        ->assertRedirect();

    $jobRequest->refresh();

    expect($jobRequest->review()->count())->toBe(1);

    $this->assertDatabaseHas('provider_reviews', [
        'job_request_id' => $jobRequest->id,
        'rating' => 4,
        'headline' => 'Strong communication',
        'body' => 'The final fix held up well and communication stayed clear throughout.',
    ]);
});

test('customer cannot review a request before it is closed', function () {
    $customer = User::factory()->create();
    $provider = createReviewProvider();

    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Accepted but not closed',
        'description' => 'The work is accepted but not closed yet.',
        'urgency' => 'urgent',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'accepted',
    ]);

    $this->actingAs($customer)
        ->put(route('requests.review.upsert', $jobRequest), [
            'rating' => 5,
            'headline' => 'Trying too early',
            'body' => 'This should not be allowed yet.',
        ])
        ->assertForbidden();
});

test('customer cannot review a closed request without a confirmed payment', function () {
    $customer = User::factory()->create();
    $provider = createReviewProvider();
    $jobRequest = createClosedReviewRequest($customer, $provider);

    $jobRequest->payment()->delete();

    $this->actingAs($customer)
        ->put(route('requests.review.upsert', $jobRequest), [
            'rating' => 5,
            'headline' => 'No verified transaction',
            'body' => 'A closed request without confirmed payment must not produce a review.',
        ])
        ->assertForbidden();
});

test('unrelated customer cannot review another customers closed request', function () {
    $customer = User::factory()->create();
    $otherCustomer = User::factory()->create([
        'email' => 'other-customer@example.com',
    ]);
    $provider = createReviewProvider();
    $jobRequest = createClosedReviewRequest($customer, $provider);

    $this->actingAs($otherCustomer)
        ->put(route('requests.review.upsert', $jobRequest), [
            'rating' => 1,
            'headline' => 'Unauthorized review',
            'body' => 'Another customer should not be able to rate this request.',
        ])
        ->assertForbidden();
});

test('request thread exposes the published review to the provider', function () {
    $customer = User::factory()->create();
    $provider = createReviewProvider();
    $jobRequest = createClosedReviewRequest($customer, $provider);

    $jobRequest->review()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'rating' => 5,
        'headline' => 'Reliable from start to finish',
        'body' => 'The provider stayed on time, explained the issue, and closed the work cleanly.',
    ]);

    $this->actingAs($provider)
        ->get(route('requests.show', $jobRequest))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Show')
            ->where('jobRequest.review.rating', 5)
            ->where('jobRequest.review.customerName', str($customer->name)->before(' ')->toString())
            ->where('permissions.canReview', false));
});

test('provider can post exactly one response and the customer review becomes locked', function () {
    $customer = User::factory()->create(['name' => 'Tariro Moyo']);
    $provider = createReviewProvider();
    $jobRequest = createClosedReviewRequest($customer, $provider);
    $review = $jobRequest->review()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'rating' => 5,
        'headline' => 'Clear workmanship',
        'body' => 'The provider communicated clearly and completed the agreed work.',
    ]);

    $this->actingAs($provider)
        ->patch(route('reviews.response', $review), [
            'response' => 'Thank you for trusting us with the repair.',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('provider_reviews', [
        'id' => $review->id,
        'provider_response' => 'Thank you for trusting us with the repair.',
    ]);

    $this->actingAs($provider)
        ->patch(route('reviews.response', $review), [
            'response' => 'A second response must not be accepted.',
        ])
        ->assertForbidden();

    $this->actingAs($customer)
        ->put(route('requests.review.upsert', $jobRequest), [
            'rating' => 1,
            'headline' => 'Changed after response',
            'body' => 'The customer cannot rewrite the context after a provider response.',
        ])
        ->assertForbidden();

    $this->get(route('providers.show', $provider))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('provider.reviews.0.customerName', 'Tariro')
            ->where('provider.reviews.0.providerResponse', 'Thank you for trusting us with the repair.'));
});

test('profanity screening flags a review and excludes it from the public rating', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);
    $customer = User::factory()->create();
    $provider = createReviewProvider();
    $jobRequest = createClosedReviewRequest($customer, $provider);

    $this->actingAs($customer)
        ->put(route('requests.review.upsert', $jobRequest), [
            'rating' => 1,
            'headline' => 'Unacceptable',
            'body' => 'This shit should be checked before appearing publicly.',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('provider_reviews', [
        'job_request_id' => $jobRequest->id,
        'moderation_status' => 'flagged',
    ]);
    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $admin->id,
        'type' => 'provider_review_flagged',
    ]);

    $this->get(route('providers.show', $provider))
        ->assertInertia(fn (Assert $page) => $page
            ->where('provider.reviewCount', 0)
            ->has('provider.reviews', 0));

    $this->actingAs($admin)
        ->get(route('admin.reviews.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Reviews/Index')
            ->where('summary.flagged', 1)
            ->has('reviews.data', 1));

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('platformSummary.flaggedReviews', 1));
});

test('a reported review enters moderation and an admin can publish or remove it', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);
    $customer = User::factory()->create();
    $provider = createReviewProvider();
    $jobRequest = createClosedReviewRequest($customer, $provider);
    $review = $jobRequest->review()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'rating' => 4,
        'headline' => 'Reported review',
        'body' => 'This review contains a claim that the provider wants checked.',
    ]);

    $this->actingAs($provider)
        ->post(route('reviews.reports.store', $review), [
            'reason' => 'false_information',
            'details' => 'The stated arrival time does not match the request record.',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('provider_review_reports', [
        'provider_review_id' => $review->id,
        'reporter_id' => $provider->id,
        'reason' => 'false_information',
    ]);
    expect($review->fresh()->moderation_status)->toBe('flagged');
    expect($provider->receivedProviderReviews()->count())->toBe(0);

    $this->actingAs($admin)
        ->patch(route('admin.reviews.update', $review), [
            'action' => 'publish',
            'moderation_notes' => 'The request evidence supports publishing the review.',
        ])
        ->assertRedirect();

    expect($review->fresh()->moderation_status)->toBe('published');
    expect($provider->receivedProviderReviews()->count())->toBe(1);

    $this->actingAs($admin)
        ->patch(route('admin.reviews.update', $review), [
            'action' => 'remove',
            'moderation_notes' => 'Removed after additional policy review.',
        ])
        ->assertRedirect();

    expect($review->fresh()->moderation_status)->toBe('removed');
    expect($provider->receivedProviderReviews()->count())->toBe(0);
});

test('non admins cannot access moderation and removal requires a note', function () {
    $customer = User::factory()->create();
    $provider = createReviewProvider();
    $jobRequest = createClosedReviewRequest($customer, $provider);
    $review = $jobRequest->review()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'rating' => 3,
        'headline' => 'Moderation permissions',
        'body' => 'This review is used to verify moderation authorization.',
        'moderation_status' => 'flagged',
    ]);

    $this->actingAs($customer)
        ->get(route('admin.reviews.index'))
        ->assertForbidden();

    $admin = User::factory()->create([
        'role' => 'admin',
        'email_verified_at' => now(),
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.reviews.update', $review), [
            'action' => 'remove',
            'moderation_notes' => '',
        ])
        ->assertSessionHasErrors('moderation_notes');
});

test('provider profile and directory expose aggregated review data', function () {
    $provider = createReviewProvider([], [
        'business_name' => 'Rated Electrical Studio',
    ]);
    $firstCustomer = User::factory()->create([
        'email' => 'review-a@example.com',
    ]);
    $secondCustomer = User::factory()->create([
        'email' => 'review-b@example.com',
    ]);

    $firstRequest = createClosedReviewRequest($firstCustomer, $provider, [
        'title' => 'First closed review request',
    ]);
    $secondRequest = createClosedReviewRequest($secondCustomer, $provider, [
        'title' => 'Second closed review request',
    ]);

    $firstRequest->review()->create([
        'customer_id' => $firstCustomer->id,
        'provider_id' => $provider->id,
        'rating' => 4,
        'headline' => 'Good finish',
        'body' => 'The work landed well and the final communication was clear.',
    ]);
    $secondRequest->review()->create([
        'customer_id' => $secondCustomer->id,
        'provider_id' => $provider->id,
        'rating' => 5,
        'headline' => 'Excellent turnaround',
        'body' => 'The response was quick and the repair quality was strong.',
    ]);

    $this->get(route('providers.show', $provider))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Providers/Show')
            ->where('provider.averageRating', 4.5)
            ->where('provider.reviewCount', 2)
            ->has('provider.reviews', 2)
            ->where('provider.reviews.0.rating', 5));

    $this->get(route('providers.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Providers/Index')
            ->where('providers.data.0.businessName', 'Rated Electrical Studio')
            ->where('providers.data.0.averageRating', 4.5)
            ->where('providers.data.0.reviewCount', 2));
});

test('provider dashboard includes recent review summary', function () {
    $provider = createReviewProvider();
    $firstCustomer = User::factory()->create([
        'email' => 'dashboard-review-a@example.com',
    ]);
    $secondCustomer = User::factory()->create([
        'email' => 'dashboard-review-b@example.com',
    ]);

    $firstRequest = createClosedReviewRequest($firstCustomer, $provider, [
        'title' => 'Dashboard review request one',
    ]);
    $secondRequest = createClosedReviewRequest($secondCustomer, $provider, [
        'title' => 'Dashboard review request two',
    ]);

    $firstRequest->review()->create([
        'customer_id' => $firstCustomer->id,
        'provider_id' => $provider->id,
        'rating' => 4,
        'headline' => 'Good follow-through',
        'body' => 'The provider stayed communicative and completed the agreed fix.',
    ]);
    $secondRequest->review()->create([
        'customer_id' => $secondCustomer->id,
        'provider_id' => $provider->id,
        'rating' => 5,
        'headline' => 'Very efficient',
        'body' => 'The work moved quickly and the final state looked professional.',
    ]);

    $this->actingAs($provider)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('providerSummary.averageRating', 4.5)
            ->where('providerSummary.reviewCount', 2)
            ->has('providerSummary.recentReviews', 2)
            ->where('providerSummary.recentReviews.0.rating', 5));
});
