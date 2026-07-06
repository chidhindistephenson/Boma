<?php

use App\Models\JobRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createPaymentProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'phone' => '+263777000003',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Steady Current Services',
        'trade_category' => 'Electrical',
        'bio' => 'Provider used in payment workflow tests.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

function createAcceptedQuotedPaymentRequest(User $customer, User $provider, array $attributes = []): JobRequest
{
    $jobRequest = JobRequest::create(array_merge([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Distribution board replacement',
        'description' => 'Accepted request used for manual payment tracking.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'accepted',
    ], $attributes));

    $jobRequest->quote()->create([
        'provider_id' => $provider->id,
        'amount' => 320,
        'timeline_days' => 3,
        'status' => 'accepted',
        'summary' => 'Accepted quote used to unlock the payment workflow.',
        'responded_at' => now()->subDay(),
    ]);

    return $jobRequest->fresh('quote');
}

test('customer can record a payment on an accepted quoted request', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 320,
            'method' => 'mobile_money',
            'reference' => 'ECO-104422',
            'notes' => 'Full amount settled from the customer business wallet.',
            'paid_at' => now()->subHour()->toDateTimeString(),
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'job_request_id' => $jobRequest->id,
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'mobile_money',
        'status' => 'submitted',
        'reference' => 'ECO-104422',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_payment_recorded',
        'title' => 'Payment recorded',
    ]);

    $this->actingAs($provider)
        ->get(route('requests.show', $jobRequest))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Show')
            ->where('jobRequest.payment.status', 'submitted')
            ->where('jobRequest.payment.method', 'mobile_money')
            ->where('permissions.canRespondToPayment', true)
            ->where('paymentMethodOptions.mobile_money', 'Mobile money'));
});

test('provider can confirm a submitted payment', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'cash',
        'status' => 'submitted',
        'paid_at' => now()->subHours(2),
    ]);

    $this->actingAs($provider)
        ->patch(route('requests.payment.status.update', $jobRequest), [
            'action' => 'confirm',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'job_request_id' => $jobRequest->id,
        'status' => 'confirmed',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_payment_confirmed',
        'title' => 'Payment confirmed',
    ]);
});

test('provider can request payment revision and customer can update it', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'cash',
        'reference' => 'ORIGINAL-1',
        'status' => 'submitted',
        'paid_at' => now()->subHours(4),
    ]);

    $this->actingAs($provider)
        ->patch(route('requests.payment.status.update', $jobRequest), [
            'action' => 'request_revision',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'job_request_id' => $jobRequest->id,
        'status' => 'revision_requested',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_payment_revision_requested',
        'title' => 'Payment needs review',
    ]);

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 300,
            'method' => 'bank_transfer',
            'reference' => 'REVISION-2',
            'notes' => 'Updated after correcting the transfer slip amount.',
            'paid_at' => now()->subMinutes(30)->toDateTimeString(),
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'job_request_id' => $jobRequest->id,
        'amount' => 300,
        'method' => 'bank_transfer',
        'reference' => 'REVISION-2',
        'status' => 'submitted',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_payment_updated',
        'title' => 'Payment updated',
    ]);
});

test('payments are blocked without an accepted quote or for unrelated users', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $otherProvider = createPaymentProvider([
        'email' => 'other-payment-provider@example.com',
    ], [
        'business_name' => 'Other Steady Current Services',
    ]);
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'status' => 'in_conversation',
    ]);

    $jobRequest->quote()->update([
        'status' => 'pending',
        'responded_at' => null,
    ]);

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 320,
            'method' => 'cash',
            'paid_at' => now()->subHour()->toDateTimeString(),
        ])
        ->assertForbidden();

    $acceptedRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'title' => 'Accepted payment authorization request',
    ]);

    $acceptedRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'cash',
        'status' => 'submitted',
        'paid_at' => now()->subHours(2),
    ]);

    $this->actingAs($otherProvider)
        ->patch(route('requests.payment.status.update', $acceptedRequest), [
            'action' => 'confirm',
        ])
        ->assertForbidden();
});

test('customer workspace and provider dashboard surface payment states', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();

    $submittedPaymentRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'title' => 'Submitted payment request',
    ]);
    $submittedPaymentRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 280,
        'method' => 'cash',
        'status' => 'submitted',
        'paid_at' => now()->subHours(3),
    ]);

    $revisionRequestedPaymentRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'title' => 'Revision payment request',
    ]);
    $revisionRequestedPaymentRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 410,
        'method' => 'mobile_money',
        'status' => 'revision_requested',
        'paid_at' => now()->subDay(),
        'revision_requested_at' => now()->subHours(5),
    ]);

    $confirmedPaymentRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'title' => 'Confirmed payment request',
    ]);
    $confirmedPaymentRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 500,
        'method' => 'bank_transfer',
        'status' => 'confirmed',
        'paid_at' => now()->subDays(2),
        'confirmed_at' => now()->subDay(),
    ]);

    $this->actingAs($customer)
        ->get(route('requests.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Index')
            ->where('summary.pendingPayments', 1)
            ->where('summary.paymentsNeedingUpdate', 1)
            ->where('summary.confirmedPayments', 1)
            ->has('jobRequests.data', 3));

    $this->actingAs($provider)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('providerSummary.paymentsPendingConfirmation', 1)
            ->where('providerSummary.confirmedPayments', 1));
});
