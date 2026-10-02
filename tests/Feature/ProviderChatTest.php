<?php

use App\Broadcasting\JobRequestChannel;
use App\Events\JobRequestMessageSent;
use App\Models\JobRequest;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    Storage::fake('local');
});

function createChatProvider(): User
{
    $provider = User::factory()->provider()->create([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
    ]);

    $provider->providerProfile()->update([
        'business_name' => 'Boma Chat Electrical',
        'trade_category' => 'Electrical',
        'bio' => 'Electrical services used to test direct provider chat.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ]);

    return $provider->fresh('providerProfile');
}

test('customer can start a provider chat from the provider profile', function () {
    $customer = User::factory()->create([
        'name' => 'Chat Customer',
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $provider = createChatProvider();

    $response = $this->actingAs($customer)
        ->post(route('providers.chat.store', $provider), [
            'body' => 'Can you inspect a faulty distribution board this week?',
        ]);

    $jobRequest = JobRequest::query()->sole();

    $response->assertRedirect(route('providers.show', [
        'provider' => $provider,
        'chat' => 1,
    ]));
    expect($jobRequest->provider_id)->toBe($provider->id)
        ->and($jobRequest->customer_id)->toBe($customer->id)
        ->and($jobRequest->status)->toBe('targeted');

    $this->assertDatabaseHas('job_request_messages', [
        'job_request_id' => $jobRequest->id,
        'sender_id' => $customer->id,
        'body' => 'Can you inspect a faulty distribution board this week?',
    ]);
    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_message',
    ]);

    $this->get(route('providers.show', [
        'provider' => $provider,
        'chat' => 1,
    ]))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('shouldOpenChat', true)
            ->where('chatThread.id', $jobRequest->id)
            ->has('chatThread.messages', 1)
            ->where(
                'chatThread.messages.0.body',
                'Can you inspect a faulty distribution board this week?',
            )
            ->where('chatThread.messages.0.isOwn', true));
});

test('new profile messages reuse the active provider thread', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $provider = createChatProvider();

    $this->actingAs($customer)
        ->post(route('providers.chat.store', $provider), [
            'body' => 'I need help with a wiring fault.',
        ])
        ->assertRedirect();

    $this->actingAs($customer)
        ->post(route('providers.chat.store', $provider), [
            'body' => 'The fault affects the kitchen sockets.',
        ])
        ->assertRedirect();

    expect(JobRequest::query()->count())->toBe(1)
        ->and(JobRequest::query()->first()->messages()->count())->toBe(2);
});

test('provider replies appear in the profile chat thread', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $provider = createChatProvider();

    $this->actingAs($customer)
        ->post(route('providers.chat.store', $provider), [
            'body' => 'Are you available tomorrow?',
        ])
        ->assertRedirect();

    $jobRequest = JobRequest::query()->sole();

    $this->actingAs($provider)
        ->post(route('requests.messages.store', $jobRequest), [
            'body' => 'Yes, I can visit in the afternoon.',
        ])
        ->assertRedirect();

    $this->actingAs($customer)
        ->get(route('providers.show', $provider))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('chatThread.id', $jobRequest->id)
            ->has('chatThread.messages', 2)
            ->where('chatThread.messages.1.body', 'Yes, I can visit in the afternoon.')
            ->where('chatThread.messages.1.isOwn', false));
});

test('customer can send private media from the provider profile chat', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $provider = createChatProvider();
    $media = UploadedFile::fake()->create('faulty-board.jpg', 120, 'image/jpeg');

    $this->actingAs($customer)
        ->post(route('providers.chat.store', $provider), [
            'body' => '',
            'media' => $media,
        ])
        ->assertRedirect();

    $jobRequest = JobRequest::query()->sole();
    $message = $jobRequest->messages()->sole();

    expect($message->body)->toBeNull()
        ->and($message->attachment_original_name)->toBe('faulty-board.jpg')
        ->and($message->attachment_mime_type)->toBe('image/jpeg');
    Storage::disk('local')->assertExists($message->attachment_path);

    $mediaRoute = route('requests.messages.media', [$jobRequest, $message]);

    $this->actingAs($customer)->get($mediaRoute)->assertOk();
    $this->actingAs($provider)->get($mediaRoute)->assertOk();

    $otherCustomer = User::factory()->create();
    $this->actingAs($otherCustomer)->get($mediaRoute)->assertForbidden();

    $this->actingAs($customer)
        ->get(route('providers.show', $provider))
        ->assertInertia(fn (Assert $page) => $page
            ->where('chatThread.messages.0.body', null)
            ->where('chatThread.messages.0.attachment.name', 'faulty-board.jpg')
            ->where('chatThread.messages.0.attachment.isImage', true));
});

test('chat messages expose the expected private broadcast payload', function () {
    $customer = User::factory()->create([
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);
    $provider = createChatProvider();

    $this->actingAs($customer)->post(route('providers.chat.store', $provider), [
        'body' => 'Can you confirm that you received this?',
    ]);

    $message = JobRequest::query()->sole()->messages()->sole();
    $event = new JobRequestMessageSent($message);
    $payload = $event->broadcastWith();

    expect($event->broadcastAs())->toBe('message.sent')
        ->and($event->broadcastOn())->toHaveCount(2)
        ->and($event->broadcastOn()[0]->name)->toBe(
            'private-job-request.'.$message->job_request_id,
        )
        ->and($event->broadcastOn()[1]->name)->toBe(
            'private-user.'.$provider->id,
        )
        ->and($payload['message']['id'])->toBe($message->id)
        ->and($payload['message']['body'])->toBe(
            'Can you confirm that you received this?',
        )
        ->and($payload['message']['sender']['id'])->toBe($customer->id);
});

test('only request participants can authorize the private chat channel', function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'testing-key',
        'broadcasting.connections.reverb.secret' => 'testing-secret',
        'broadcasting.connections.reverb.app_id' => 'testing-app',
    ]);
    Broadcast::channel('job-request.{jobRequestId}', JobRequestChannel::class);

    $customer = User::factory()->create();
    $provider = createChatProvider();
    $jobRequest = JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Private channel test',
        'description' => 'Verify that unrelated users cannot subscribe to this conversation.',
        'urgency' => 'flexible',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'targeted',
    ]);
    $channelPayload = [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-job-request.'.$jobRequest->id,
    ];

    $this->actingAs($customer)
        ->postJson('/broadcasting/auth', $channelPayload)
        ->assertOk();
    $this->actingAs($provider)
        ->postJson('/broadcasting/auth', $channelPayload)
        ->assertOk();

    $unrelatedCustomer = User::factory()->create();
    $this->actingAs($unrelatedCustomer)
        ->postJson('/broadcasting/auth', $channelPayload)
        ->assertForbidden();
});

test('only customers can start provider chats', function () {
    $provider = createChatProvider();
    $otherProvider = createChatProvider();

    $this->actingAs($otherProvider)
        ->post(route('providers.chat.store', $provider), [
            'body' => 'Providers cannot open customer chat threads.',
        ])
        ->assertForbidden();
});

test('guests must authenticate before starting provider chats', function () {
    $provider = createChatProvider();

    $this->post(route('providers.chat.store', $provider), [
        'body' => 'Guests must authenticate before starting a chat.',
    ])->assertRedirect(route('login'));
});
