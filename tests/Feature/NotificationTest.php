<?php

use App\Events\InAppNotificationCreated;
use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Models\User;
use App\Notifications\BomaActivityNotification;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createNotificationProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Signal Electrical Co',
        'trade_category' => 'Electrical',
        'bio' => 'Provider used in notification flow tests.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

function createPendingNotificationProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'city' => 'Harare',
        'area' => 'Greendale',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Pending Trust Works',
        'trade_category' => 'Electrical',
        'bio' => 'Pending provider used in admin notification tests.',
        'verification_status' => 'pending',
        'verification_notes' => 'Business registration and owner identity are ready for review.',
        'verification_submitted_at' => now(),
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

test('targeted request creation notifies the provider and visiting marks it read', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $provider = createNotificationProvider();

    $this->actingAs($customer)
        ->post(route('requests.store'), [
            'provider_id' => $provider->id,
            'trade_category' => 'Electrical',
            'title' => 'Need a circuit inspection',
            'description' => 'A kitchen circuit keeps tripping and needs inspection.',
            'urgency' => 'urgent',
            'preferred_date' => now()->addDays(2)->toDateString(),
            'budget_min' => 60,
            'budget_max' => 120,
            'city' => 'Harare',
            'area' => 'Avondale',
        ])
        ->assertRedirect();

    $jobRequest = JobRequest::query()->latest()->first();

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_targeted',
        'title' => 'New targeted request',
    ]);

    $notification = $provider->fresh()->inAppNotifications()->first();

    $this->actingAs($provider)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('auth.notifications.unreadCount', 1)
            ->has('auth.notifications.recent', 1));

    $this->actingAs($provider)
        ->get(route('notifications.visit', $notification))
        ->assertRedirect(route('requests.show', $jobRequest));

    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('messages and request status changes notify the customer', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $provider = createNotificationProvider();

    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Gate motor fault',
        'description' => 'Need support with an intermittent gate motor failure.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'targeted',
    ]);

    $this->actingAs($provider)
        ->post(route('requests.messages.store', $jobRequest), [
            'body' => 'I can inspect this tomorrow morning.',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->actingAs($provider)
        ->patch(route('requests.status.update', $jobRequest), [
            'action' => 'accept',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_message',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_accepted',
    ]);

    $this->actingAs($customer)
        ->get(route('notifications.index', ['tab' => 'unread']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Notifications/Index')
            ->where('activeTab', 'unread')
            ->where('summary.unread', 2)
            ->has('notifications.data', 2));
});

test('provider review publication notifies the provider', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $provider = createNotificationProvider();

    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Closed rewiring follow-up',
        'description' => 'Closed request used to test review notifications.',
        'urgency' => 'flexible',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'closed',
    ]);

    $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 200,
        'method' => 'mobile_money',
        'reference' => 'CONFIRMED-NOTIFICATION-PAYMENT',
        'status' => 'confirmed',
        'paid_at' => now()->subDay(),
        'confirmed_at' => now(),
    ]);

    $this->actingAs($customer)
        ->put(route('requests.review.upsert', $jobRequest), [
            'rating' => 5,
            'headline' => 'Clean result',
            'body' => 'The provider kept the work tidy and communication was direct.',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'provider_review',
        'title' => 'New customer review',
    ]);
});

test('admin provider verification decisions notify the provider', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);
    $provider = createPendingNotificationProvider();

    $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'document_type' => 'National ID',
        'label' => 'Owner identity',
        'original_name' => 'owner-id.pdf',
        'storage_path' => 'verification-documents/'.$provider->id.'/owner-id.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 180000,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.providers.update', $provider), [
            'action' => 'approve',
            'review_notes' => '',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'provider_verification_approved',
        'title' => 'Provider verification approved',
    ]);
});

test('notifications workspace can mark everything as read', function () {
    $user = User::factory()->create();

    InAppNotification::notifyUser(
        $user,
        'request_message',
        'First unread notification',
        'Unread notification body.',
        route('dashboard'),
        'Open dashboard',
    );

    InAppNotification::notifyUser(
        $user,
        'request_closed',
        'Second unread notification',
        'Another unread notification body.',
        route('dashboard'),
        'Open dashboard',
    );

    $this->actingAs($user)
        ->post(route('notifications.markAll'))
        ->assertRedirect();

    expect($user->fresh()->inAppNotifications()->whereNull('read_at')->count())->toBe(0);
});

test('users cannot open another users notification', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create([
        'email' => 'other-notification-user@example.com',
    ]);

    $notification = InAppNotification::notifyUser(
        $user,
        'request_message',
        'Private notification',
        'This should stay private.',
        route('dashboard'),
        'Open dashboard',
    );

    $this->actingAs($otherUser)
        ->get(route('notifications.visit', $notification))
        ->assertForbidden();
});

test('users can manage category email preferences without disabling in app alerts', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('notifications.preferences.update'), [
            'messages' => true,
            'requests' => false,
            'payments' => true,
            'reviews' => true,
            'account' => true,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('notification_preferences', [
        'user_id' => $user->id,
        'email_messages' => true,
        'email_requests' => false,
    ]);

    InAppNotification::notifyUser(
        $user,
        'request_targeted',
        'Request email disabled',
        'This remains visible inside Boma.',
        route('dashboard'),
    );

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $user->id,
        'title' => 'Request email disabled',
    ]);
    Notification::assertNotSentTo($user, BomaActivityNotification::class);
});

test('new notification events and queued emails target the intended user', function () {
    Event::fake([InAppNotificationCreated::class]);
    Notification::fake();
    $user = User::factory()->create();

    $activity = InAppNotification::notifyUser(
        $user,
        'request_payment_recorded',
        'Payment recorded',
        'A payment update is ready to review.',
        route('dashboard'),
        'Open dashboard',
    );

    Event::assertDispatched(
        InAppNotificationCreated::class,
        fn (InAppNotificationCreated $event): bool => $event->notification->is($activity),
    );
    Notification::assertSentTo($user, BomaActivityNotification::class);

    $event = new InAppNotificationCreated($activity);
    expect($event->broadcastOn()[0]->name)->toBe('private-user.'.$user->id)
        ->and($event->broadcastWith()['notification']['category'])->toBe('payments');
});
