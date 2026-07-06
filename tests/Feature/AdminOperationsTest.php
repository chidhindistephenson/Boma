<?php

use App\Models\JobRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createAdminOpsProvider(array $userAttributes = [], array $profileAttributes = []): User
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
        'bio' => 'Verified provider for admin operations tests.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

test('admin can browse the filtered user directory', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);

    User::factory()->create([
        'name' => 'Harare Customer',
        'email' => 'customer-directory@example.com',
    ]);

    createAdminOpsProvider([
        'email' => 'provider-directory@example.com',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.users.index', [
            'role' => 'provider',
            'q' => 'Spark',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Users/Index')
            ->where('filters.role', 'provider')
            ->where('filters.q', 'Spark')
            ->has('users.data', 1)
            ->where('users.data.0.providerBusinessName', 'Spark District Electric'));
});

test('admin can suspend and restore a customer account', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);

    $customer = User::factory()->create([
        'email' => 'moderated-customer@example.com',
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.users.update', $customer), [
            'action' => 'suspend',
            'reason' => 'Chargeback fraud investigation is in progress.',
        ])
        ->assertRedirect();

    $customer->refresh();

    expect($customer->suspended_at)->not->toBeNull();
    expect($customer->suspended_by_user_id)->toBe($admin->id);
    expect($customer->suspension_reason)->toBe('Chargeback fraud investigation is in progress.');

    $this->actingAs($admin)
        ->patch(route('admin.users.update', $customer), [
            'action' => 'restore',
            'reason' => '',
        ])
        ->assertRedirect();

    $customer->refresh();

    expect($customer->suspended_at)->toBeNull();
    expect($customer->suspended_by_user_id)->toBeNull();
    expect($customer->suspension_reason)->toBeNull();
});

test('admin cannot suspend another admin account', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);

    $otherAdmin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
        'email' => 'other-admin@example.com',
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.users.update', $otherAdmin), [
            'action' => 'suspend',
            'reason' => 'Attempted moderation of another admin.',
        ])
        ->assertForbidden();
});

test('admin can browse filtered request oversight', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);

    $customer = User::factory()->create();
    $provider = createAdminOpsProvider();

    JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Accepted generator repair',
        'description' => 'Generator repair is already underway and needs admin visibility.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'status' => 'accepted',
    ]);

    JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => null,
        'trade_category' => 'Electrical',
        'title' => 'Open kitchen socket issue',
        'description' => 'Still waiting for a provider match.',
        'urgency' => 'urgent',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'open',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.requests.index', [
            'status' => 'accepted',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Requests/Index')
            ->where('filters.status', 'accepted')
            ->where('summary.total', 2)
            ->where('summary.active', 2)
            ->has('jobRequests.data', 1)
            ->where('jobRequests.data.0.title', 'Accepted generator repair'));
});

test('admin dashboard surfaces operational queues and moderation context', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $pendingProvider = createAdminOpsProvider([
        'email' => 'pending-provider@example.com',
        'status' => 'pending_verification',
    ], [
        'business_name' => 'Pending Circuit Studio',
        'verification_status' => 'pending',
        'verified_at' => null,
        'verification_submitted_at' => now()->subDay(),
    ]);

    $pendingProvider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $pendingProvider->id,
        'document_type' => 'National ID',
        'label' => 'Primary identity document',
        'original_name' => 'id-card.pdf',
        'storage_path' => 'verification-documents/'.$pendingProvider->id.'/id-card.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 2048,
    ]);

    $pendingProvider->providerProfile->services()->create([
        'title' => 'Emergency diagnostics',
        'short_description' => 'Urgent electrical diagnostics for dashboard coverage.',
        'price_from' => 50,
        'turnaround_label' => 'Same day',
        'is_featured' => true,
        'sort_order' => 1,
    ]);

    $customer = User::factory()->create([
        'name' => 'Dashboard Customer',
        'email' => 'dashboard-customer@example.com',
    ]);

    JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => null,
        'trade_category' => 'Electrical',
        'title' => 'Open switchboard issue',
        'description' => 'Unassigned request for admin alert coverage.',
        'urgency' => 'urgent',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'open',
    ]);

    $moderatedUser = User::factory()->create([
        'name' => 'Suspended Customer',
        'email' => 'suspended-customer@example.com',
        'status' => 'active',
        'suspended_at' => now()->subHours(2),
        'suspended_by_user_id' => $admin->id,
        'suspension_reason' => 'Repeated abuse reports require intervention.',
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('platformSummary.pendingProviderVerifications', 1)
            ->where('platformSummary.unassignedRequests', 1)
            ->where('platformSummary.targetedWithoutQuote', 0)
            ->where('platformSummary.paymentsAwaitingConfirmation', 0)
            ->where('adminQueues.pendingProviders.0.businessName', 'Pending Circuit Studio')
            ->where('adminQueues.pendingProviders.0.documentCount', 1)
            ->where('adminQueues.pendingProviders.0.serviceCount', 1)
            ->where('adminQueues.requestAlerts.0.title', 'Open switchboard issue')
            ->where('adminQueues.requestAlerts.0.alertLabel', 'Open and unassigned')
            ->where('adminQueues.recentModeration.0.name', 'Suspended Customer')
            ->where('adminQueues.recentModeration.0.suspendedByName', $admin->name)
            ->where('adminQueues.recentModeration.0.suspensionReason', 'Repeated abuse reports require intervention.'));
});

test('non admin users cannot access admin workspaces', function () {
    $customer = User::factory()->create();

    $this->actingAs($customer)
        ->get(route('admin.users.index'))
        ->assertForbidden();

    $this->actingAs($customer)
        ->get(route('admin.requests.index'))
        ->assertForbidden();
});
