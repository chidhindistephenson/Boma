<?php

use App\Events\JobRequestConversationRead;
use App\Models\JobRequest;
use App\Models\User;
use App\Notifications\BomaActivityNotification;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createInboxConversation(array $attributes = []): array
{
    $customer = User::factory()->create(['name' => 'Inbox Customer']);
    $provider = User::factory()->provider()->create([
        'name' => 'Inbox Provider Owner',
        'status' => 'active',
    ]);
    $provider->providerProfile()->update([
        'business_name' => 'Inbox Electrical Co',
        'verification_status' => 'verified',
        'verified_at' => now(),
    ]);

    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Kitchen wiring conversation',
        'description' => 'A request used to verify the dedicated inbox.',
        'urgency' => 'flexible',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'in_conversation',
        ...$attributes,
    ]);

    return [$customer, $provider->fresh('providerProfile'), $jobRequest];
}

test('participants can browse a dedicated inbox and opening a thread marks it read', function () {
    Event::fake([JobRequestConversationRead::class]);
    [$customer, $provider, $jobRequest] = createInboxConversation([
        'customer_last_read_at' => now()->subHour(),
    ]);

    $jobRequest->messages()->create([
        'sender_id' => $provider->id,
        'body' => 'I can inspect the wiring tomorrow morning.',
    ]);

    expect($customer->unreadConversationMessageCount())->toBe(1);

    $this->actingAs($customer)
        ->get(route('inbox.show', $jobRequest))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Inbox/Index')
            ->has('threads.data', 1)
            ->where('selectedThread.id', $jobRequest->id)
            ->where('selectedThread.otherParticipant.name', 'Inbox Electrical Co')
            ->where('selectedThread.messages.0.body', 'I can inspect the wiring tomorrow morning.')
            ->where('selectedThread.messages.0.isOwn', false));

    expect($jobRequest->fresh()->customer_last_read_at)->not->toBeNull()
        ->and($customer->unreadConversationMessageCount())->toBe(0);
    Event::assertDispatched(JobRequestConversationRead::class);
});

test('unrelated users and administrators cannot enter a participant inbox thread', function () {
    [, , $jobRequest] = createInboxConversation();
    $jobRequest->messages()->create([
        'sender_id' => $jobRequest->customer_id,
        'body' => 'Private conversation content.',
    ]);

    $otherCustomer = User::factory()->create();
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($otherCustomer)->get(route('inbox.show', $jobRequest))->assertForbidden();
    $this->actingAs($admin)->get(route('inbox.show', $jobRequest))->assertForbidden();
});

test('participants can send from the inbox without being redirected to the request workspace', function () {
    Notification::fake();
    [$customer, $provider, $jobRequest] = createInboxConversation();
    $jobRequest->messages()->create([
        'sender_id' => $customer->id,
        'body' => 'Initial message.',
    ]);

    $this->actingAs($provider)
        ->post(route('inbox.messages.store', $jobRequest), [
            'body' => 'Reply sent directly from the inbox.',
        ])
        ->assertRedirect(route('inbox.show', $jobRequest));

    $this->assertDatabaseHas('job_request_messages', [
        'job_request_id' => $jobRequest->id,
        'sender_id' => $provider->id,
        'body' => 'Reply sent directly from the inbox.',
    ]);
    Notification::assertSentTo($customer, BomaActivityNotification::class);
});

test('older inbox messages are returned in chronological pages', function () {
    [$customer, , $jobRequest] = createInboxConversation();

    foreach (range(1, 35) as $number) {
        $jobRequest->messages()->create([
            'sender_id' => $customer->id,
            'body' => "Message {$number}",
        ]);
    }

    $oldestVisibleId = $jobRequest->messages()->latest('id')->limit(30)->get()->last()->id;

    $this->actingAs($customer)
        ->getJson(route('inbox.messages.index', [
            'jobRequest' => $jobRequest,
            'before' => $oldestVisibleId,
        ]))
        ->assertOk()
        ->assertJsonCount(5, 'messages')
        ->assertJsonPath('messages.0.body', 'Message 1')
        ->assertJsonPath('messages.4.body', 'Message 5')
        ->assertJsonPath('hasOlderMessages', false);
});

test('a participant can report a conversation only once and admins are notified', function () {
    [$customer, , $jobRequest] = createInboxConversation();
    $admin = User::factory()->create(['role' => 'admin']);
    $jobRequest->messages()->create([
        'sender_id' => $customer->id,
        'body' => 'Conversation that will be reported.',
    ]);

    $payload = ['reason' => 'fraud', 'details' => 'The other party requested an off-platform deposit.'];

    $this->actingAs($customer)->post(route('inbox.reports.store', $jobRequest), $payload)->assertRedirect();
    $this->actingAs($customer)->post(route('inbox.reports.store', $jobRequest), $payload)->assertRedirect();

    $this->assertDatabaseCount('job_request_conversation_reports', 1);
    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $admin->id,
        'type' => 'conversation_reported',
    ]);
});

test('admins can mute remove and restore reported conversations', function () {
    [$customer, $provider, $jobRequest] = createInboxConversation();
    $admin = User::factory()->create(['role' => 'admin']);
    $jobRequest->messages()->create([
        'sender_id' => $customer->id,
        'body' => 'Moderation test message.',
    ]);
    $jobRequest->conversationReports()->create([
        'reporter_id' => $customer->id,
        'reason' => 'harassment',
        'status' => 'pending',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.conversations.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Conversations/Index')
            ->has('conversations.data', 1)
            ->where('conversations.data.0.id', $jobRequest->id)
            ->where('conversations.data.0.pendingReportCount', 1));

    $this->actingAs($admin)
        ->patch(route('admin.conversations.update', $jobRequest), [
            'action' => 'mute',
            'moderation_notes' => 'Paused while the report is investigated.',
        ])
        ->assertRedirect();

    expect($jobRequest->fresh()->chat_muted_at)->not->toBeNull()
        ->and($jobRequest->fresh()->canMessage($provider))->toBeFalse();

    $this->actingAs($provider)
        ->post(route('inbox.messages.store', $jobRequest), ['body' => 'Blocked message'])
        ->assertForbidden();

    $this->actingAs($admin)
        ->patch(route('admin.conversations.update', $jobRequest), [
            'action' => 'remove',
            'moderation_notes' => 'Removed after confirming a policy violation.',
        ])
        ->assertRedirect();

    $this->actingAs($customer)->get(route('inbox.show', $jobRequest))->assertForbidden();

    $this->actingAs($admin)
        ->patch(route('admin.conversations.update', $jobRequest), [
            'action' => 'restore',
            'moderation_notes' => null,
        ])
        ->assertRedirect();

    expect($jobRequest->fresh()->chat_muted_at)->toBeNull()
        ->and($jobRequest->fresh()->chat_removed_at)->toBeNull();
    $this->actingAs($customer)->get(route('inbox.show', $jobRequest))->assertOk();
});

test('non admins cannot access conversation moderation', function () {
    [$customer, , $jobRequest] = createInboxConversation();
    $jobRequest->messages()->create([
        'sender_id' => $customer->id,
        'body' => 'Visible only to participants.',
    ]);

    $this->actingAs($customer)->get(route('admin.conversations.index'))->assertForbidden();
    $this->actingAs($customer)
        ->patch(route('admin.conversations.update', $jobRequest), [
            'action' => 'remove',
            'moderation_notes' => 'Unauthorized action.',
        ])
        ->assertForbidden();
});
