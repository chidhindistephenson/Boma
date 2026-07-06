<?php

use App\Models\JobRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createScheduleProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'phone' => '+263777000002',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Gridline Electrical',
        'trade_category' => 'Electrical',
        'bio' => 'Provider used in scheduling tests.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

function createAcceptedScheduleRequest(User $customer, User $provider, array $attributes = []): JobRequest
{
    return JobRequest::create(array_merge([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Accepted socket replacement job',
        'description' => 'Accepted request used for the visit scheduling flow.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'accepted',
    ], $attributes));
}

test('provider can propose a visit on an accepted request', function () {
    $customer = User::factory()->create();
    $provider = createScheduleProvider();
    $jobRequest = createAcceptedScheduleRequest($customer, $provider);

    $this->actingAs($provider)
        ->put(route('requests.schedule.upsert', $jobRequest), [
            'scheduled_for' => now()->addDays(2)->setHour(9)->setMinute(30)->setSecond(0)->toDateTimeString(),
            'duration_hours' => 3,
            'notes' => 'Bring ladder access because the fittings run above the garage beam.',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_schedules', [
        'job_request_id' => $jobRequest->id,
        'proposed_by_user_id' => $provider->id,
        'duration_hours' => 3,
        'status' => 'proposed',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_schedule_proposed',
        'title' => 'Visit proposed',
    ]);

    $this->actingAs($customer)
        ->get(route('requests.show', $jobRequest))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Show')
            ->where('jobRequest.schedule.status', 'proposed')
            ->where('permissions.canRespondToSchedule', true));
});

test('customer can confirm a proposed visit and provider is notified', function () {
    $customer = User::factory()->create();
    $provider = createScheduleProvider();
    $jobRequest = createAcceptedScheduleRequest($customer, $provider);

    $jobRequest->schedule()->create([
        'proposed_by_user_id' => $provider->id,
        'scheduled_for' => now()->addDays(1)->setHour(10)->setMinute(0)->setSecond(0),
        'duration_hours' => 2,
        'status' => 'proposed',
        'notes' => 'Access is through the side gate.',
    ]);

    $this->actingAs($customer)
        ->patch(route('requests.schedule.status.update', $jobRequest), [
            'action' => 'confirm',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_schedules', [
        'job_request_id' => $jobRequest->id,
        'status' => 'confirmed',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_schedule_confirmed',
        'title' => 'Visit confirmed',
    ]);
});

test('customer can cancel a confirmed visit and provider can repropose another one', function () {
    $customer = User::factory()->create();
    $provider = createScheduleProvider();
    $jobRequest = createAcceptedScheduleRequest($customer, $provider);

    $jobRequest->schedule()->create([
        'proposed_by_user_id' => $provider->id,
        'scheduled_for' => now()->addDays(1)->setHour(8)->setMinute(0)->setSecond(0),
        'duration_hours' => 4,
        'status' => 'confirmed',
        'confirmed_at' => now()->subHour(),
    ]);

    $this->actingAs($customer)
        ->patch(route('requests.schedule.status.update', $jobRequest), [
            'action' => 'cancel',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_schedules', [
        'job_request_id' => $jobRequest->id,
        'status' => 'cancelled',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_schedule_cancelled',
        'title' => 'Visit cancelled',
    ]);

    $this->actingAs($provider)
        ->put(route('requests.schedule.upsert', $jobRequest), [
            'scheduled_for' => now()->addDays(3)->setHour(13)->setMinute(0)->setSecond(0)->toDateTimeString(),
            'duration_hours' => 2,
            'notes' => 'Revised slot after the first time window stopped working.',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_schedules', [
        'job_request_id' => $jobRequest->id,
        'duration_hours' => 2,
        'status' => 'proposed',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_schedule_updated',
        'title' => 'Visit updated',
    ]);
});

test('provider can complete a confirmed visit', function () {
    $customer = User::factory()->create();
    $provider = createScheduleProvider();
    $jobRequest = createAcceptedScheduleRequest($customer, $provider);

    $jobRequest->schedule()->create([
        'proposed_by_user_id' => $provider->id,
        'scheduled_for' => now()->subHours(4),
        'duration_hours' => 2,
        'status' => 'confirmed',
        'confirmed_at' => now()->subDay(),
    ]);

    $this->actingAs($provider)
        ->patch(route('requests.schedule.status.update', $jobRequest), [
            'action' => 'complete',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_schedules', [
        'job_request_id' => $jobRequest->id,
        'status' => 'completed',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_schedule_completed',
        'title' => 'Visit marked complete',
    ]);
});

test('scheduling is blocked on non accepted requests and for unrelated users', function () {
    $customer = User::factory()->create();
    $provider = createScheduleProvider();
    $otherProvider = createScheduleProvider([
        'email' => 'other-schedule-provider@example.com',
    ], [
        'business_name' => 'Other Gridline Electrical',
    ]);
    $jobRequest = createAcceptedScheduleRequest($customer, $provider, [
        'status' => 'in_conversation',
    ]);

    $this->actingAs($provider)
        ->put(route('requests.schedule.upsert', $jobRequest), [
            'scheduled_for' => now()->addDays(2)->setHour(11)->setMinute(0)->setSecond(0)->toDateTimeString(),
            'duration_hours' => 2,
            'notes' => 'Trying to schedule before the request is fully accepted.',
        ])
        ->assertForbidden();

    $acceptedRequest = createAcceptedScheduleRequest($customer, $provider, [
        'title' => 'Accepted breaker replacement',
    ]);

    $acceptedRequest->schedule()->create([
        'proposed_by_user_id' => $provider->id,
        'scheduled_for' => now()->addDays(2),
        'duration_hours' => 2,
        'status' => 'proposed',
    ]);

    $this->actingAs($otherProvider)
        ->patch(route('requests.schedule.status.update', $acceptedRequest), [
            'action' => 'confirm',
        ])
        ->assertForbidden();
});

test('customer workspace includes pending and confirmed visit counts', function () {
    $customer = User::factory()->create();
    $provider = createScheduleProvider();

    $proposedRequest = createAcceptedScheduleRequest($customer, $provider, [
        'title' => 'Proposed visit request',
    ]);
    $proposedRequest->schedule()->create([
        'proposed_by_user_id' => $provider->id,
        'scheduled_for' => now()->addDays(2),
        'duration_hours' => 2,
        'status' => 'proposed',
    ]);

    $confirmedRequest = createAcceptedScheduleRequest($customer, $provider, [
        'title' => 'Confirmed visit request',
    ]);
    $confirmedRequest->schedule()->create([
        'proposed_by_user_id' => $provider->id,
        'scheduled_for' => now()->addDays(4),
        'duration_hours' => 3,
        'status' => 'confirmed',
        'confirmed_at' => now(),
    ]);

    $this->actingAs($customer)
        ->get(route('requests.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Index')
            ->where('summary.pendingSchedules', 1)
            ->where('summary.confirmedSchedules', 1)
            ->has('jobRequests.data', 2));
});
