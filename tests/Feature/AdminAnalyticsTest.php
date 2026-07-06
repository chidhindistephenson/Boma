<?php

use App\Models\JobRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createAnalyticsProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Northline Electrical Works',
        'trade_category' => 'Electrical',
        'bio' => 'Provider used in analytics tests.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

function setCreatedAt(Model $model, Carbon $timestamp): void
{
    $timestamps = $model->timestamps;
    $model->timestamps = false;
    $model->forceFill([
        'created_at' => $timestamp,
        'updated_at' => $timestamp,
    ])->saveQuietly();
    $model->timestamps = $timestamps;
}

test('admin can view filtered platform analytics', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);

    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $provider = createAnalyticsProvider();
    $otherProvider = createAnalyticsProvider([
        'email' => 'plumbing-provider@example.com',
    ], [
        'business_name' => 'Southline Plumbing Co',
        'trade_category' => 'Plumbing',
    ]);

    $closedRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Closed rewiring request',
        'description' => 'Closed request used for analytics.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'closed',
    ]);
    setCreatedAt($closedRequest, now()->subDays(18));

    $acceptedQuote = $closedRequest->quote()->create([
        'provider_id' => $provider->id,
        'amount' => 200,
        'timeline_days' => 2,
        'status' => 'accepted',
        'summary' => 'Accepted quote for the rewiring work.',
        'responded_at' => now()->subDays(15),
    ]);
    setCreatedAt($acceptedQuote, now()->subDays(16));

    $review = $closedRequest->review()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'rating' => 5,
        'headline' => 'Strong result',
        'body' => 'The provider delivered clean work and direct communication.',
    ]);
    setCreatedAt($review, now()->subDays(13));

    $conversationRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Conversation request',
        'description' => 'Request still in the quote stage.',
        'urgency' => 'urgent',
        'city' => 'Harare',
        'area' => 'Greendale',
        'status' => 'in_conversation',
    ]);
    setCreatedAt($conversationRequest, now()->subDays(8));

    $declinedQuote = $conversationRequest->quote()->create([
        'provider_id' => $provider->id,
        'amount' => 100,
        'timeline_days' => 4,
        'status' => 'declined',
        'summary' => 'Initial quote that the customer declined.',
        'responded_at' => now()->subDays(5),
    ]);
    setCreatedAt($declinedQuote, now()->subDays(6));

    $oldRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $otherProvider->id,
        'trade_category' => 'Plumbing',
        'title' => 'Old plumbing request',
        'description' => 'Outside the reporting window for this test.',
        'urgency' => 'flexible',
        'city' => 'Bulawayo',
        'area' => 'Selbourne Park',
        'status' => 'closed',
    ]);
    setCreatedAt($oldRequest, now()->subDays(140));

    $this->actingAs($admin)
        ->get(route('admin.analytics.index', [
            'period' => '90d',
            'category' => 'Electrical',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Analytics/Index')
            ->where('filters.period', '90d')
            ->where('filters.category', 'Electrical')
            ->where('summary.requestCount', 2)
            ->where('summary.targetedRequestCount', 2)
            ->where('summary.quoteCoverageRate', 100)
            ->where('summary.quoteAcceptanceRate', 50)
            ->where('summary.averageQuoteAmount', 150)
            ->where('summary.reviewCompletionRate', 100)
            ->where('categoryBreakdown.0.category', 'Electrical')
            ->where('categoryBreakdown.0.requestCount', 2)
            ->where('cityBreakdown.0.city', 'Harare')
            ->where('providerPerformance.0.businessName', 'Northline Electrical Works')
            ->where('providerPerformance.0.acceptedQuotes', 1)
            ->where('providerPerformance.0.reviewCount', 1)
            ->where('providerPerformance.0.quoteAcceptanceRate', 50)
            ->where('operationalHealth.targetedWithoutQuoteCount', 0)
            ->where('operationalHealth.unreviewedClosedRequestCount', 0)
            ->where('operationalHealth.averageQuoteLeadDays', 3)
            ->has('trend'));
});

test('non admin users cannot access analytics workspace', function () {
    $customer = User::factory()->create();

    $this->actingAs($customer)
        ->get(route('admin.analytics.index'))
        ->assertForbidden();
});
