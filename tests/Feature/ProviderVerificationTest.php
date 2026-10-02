<?php

use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    Storage::fake('local');
});

function createVerificationProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'name' => 'Verification Provider',
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'phone' => '+263778888888',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Borrowdale Home Services',
        'trade_category' => 'Electrical',
        'bio' => 'Residential and small commercial electrical work.',
        'verification_status' => 'pending',
        'verification_submitted_at' => now(),
        'verification_notes' => 'Licensed electrician with 8 years experience and municipal compliance work.',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

function attachVerificationDocument(User $provider, string $filename = 'id-card.pdf'): void
{
    $path = 'verification-documents/'.$provider->id.'/'.$filename;

    Storage::disk('local')->put($path, 'verification-payload');

    $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'document_type' => 'National ID',
        'label' => 'Primary identity document',
        'original_name' => $filename,
        'storage_path' => $path,
        'mime_type' => 'application/pdf',
        'size_bytes' => strlen('verification-payload'),
    ]);
}

test('provider can resubmit a rejected verification profile for review', function () {
    $provider = createVerificationProvider([
        'status' => 'verification_rejected',
    ], [
        'verification_status' => 'rejected',
        'verification_review_notes' => 'Add stronger business verification context.',
        'reviewed_at' => now()->subDay(),
    ]);
    attachVerificationDocument($provider);

    $response = $this->actingAs($provider)->post(route('provider.verification.store'));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit', ['section' => 'verification']));

    $provider->refresh();

    $this->assertSame('pending_verification', $provider->status);
    $this->assertSame('pending', $provider->providerProfile->verification_status);
    $this->assertNull($provider->providerProfile->verification_review_notes);
    $this->assertNotNull($provider->providerProfile->verification_submitted_at);

    $event = $provider->fresh('providerProfile.verificationEvents.actor')
        ->providerProfile
        ->verificationEvents
        ->first();

    expect($event)->not->toBeNull();
    expect($event->event_type)->toBe('resubmitted');
    expect($event->actor?->is($provider))->toBeTrue();
});

test('provider cannot submit verification review without private verification notes', function () {
    $provider = createVerificationProvider([], [
        'verification_notes' => null,
    ]);
    attachVerificationDocument($provider);

    $this->actingAs($provider)
        ->from(route('profile.edit'))
        ->post(route('provider.verification.store'))
        ->assertSessionHasErrors('verification_notes')
        ->assertRedirect(route('profile.edit'));
});

test('provider cannot submit verification review without uploaded documents', function () {
    $provider = createVerificationProvider();

    $this->actingAs($provider)
        ->from(route('profile.edit'))
        ->post(route('provider.verification.store'))
        ->assertSessionHasErrors('verification_documents')
        ->assertRedirect(route('profile.edit'));
});

test('admin can view the provider verification queue', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);
    $provider = createVerificationProvider();
    attachVerificationDocument($provider);

    $response = $this->actingAs($admin)->get(route('admin.providers.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Providers/Index')
        ->where('activeStatus', 'pending')
        ->where('providers.per_page', 5)
        ->has('providers.data', 1)
        ->where('providers.data.0.businessName', $provider->providerProfile->business_name)
        ->has('providers.data.0.verificationTimeline', 0));
});

test('admin can approve a provider verification request', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);
    $provider = createVerificationProvider();
    attachVerificationDocument($provider);

    $response = $this->actingAs($admin)
        ->from(route('admin.providers.index'))
        ->patch(route('admin.providers.update', $provider), [
            'action' => 'approve',
            'review_notes' => 'Business details match the expected trust signals.',
        ]);

    $response->assertRedirect(route('admin.providers.index'));

    $provider->refresh();

    $this->assertSame('active', $provider->status);
    $this->assertSame('verified', $provider->providerProfile->verification_status);
    $this->assertNotNull($provider->providerProfile->verified_at);
    $this->assertSame(
        'Business details match the expected trust signals.',
        $provider->providerProfile->verification_review_notes,
    );
    $this->assertTrue($provider->fresh('providerProfile')->isDirectoryVisible(true));

    $event = $provider->fresh('providerProfile.verificationEvents.actor')
        ->providerProfile
        ->verificationEvents
        ->first();

    expect($event)->not->toBeNull();
    expect($event->event_type)->toBe('approved');
    expect($event->actor?->is($admin))->toBeTrue();
    expect($event->payload['review_notes'])->toBe(
        'Business details match the expected trust signals.',
    );
});

test('admin can reject a provider verification request with review notes', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);
    $provider = createVerificationProvider();
    attachVerificationDocument($provider);

    $response = $this->actingAs($admin)
        ->from(route('admin.providers.index'))
        ->patch(route('admin.providers.update', $provider), [
            'action' => 'reject',
            'review_notes' => 'Registration details are too thin. Add stronger verification evidence.',
        ]);

    $response->assertRedirect(route('admin.providers.index'));

    $provider->refresh();

    $this->assertSame('verification_rejected', $provider->status);
    $this->assertSame('rejected', $provider->providerProfile->verification_status);
    $this->assertNull($provider->providerProfile->verified_at);
    $this->assertSame(
        'Registration details are too thin. Add stronger verification evidence.',
        $provider->providerProfile->verification_review_notes,
    );
    $this->assertFalse($provider->fresh('providerProfile')->isDirectoryVisible(true));

    $event = $provider->fresh('providerProfile.verificationEvents.actor')
        ->providerProfile
        ->verificationEvents
        ->first();

    expect($event)->not->toBeNull();
    expect($event->event_type)->toBe('rejected');
    expect($event->actor?->is($admin))->toBeTrue();
});

test('non admin users cannot access the provider verification queue', function () {
    $customer = User::factory()->create();

    $this->actingAs($customer)
        ->get(route('admin.providers.index'))
        ->assertForbidden();
});

test('admin cannot approve a provider without uploaded verification documents', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);
    $provider = createVerificationProvider();

    $this->actingAs($admin)
        ->from(route('admin.providers.index'))
        ->patch(route('admin.providers.update', $provider), [
            'action' => 'approve',
            'review_notes' => 'Trying to approve without documents.',
        ])
        ->assertSessionHasErrors('review_notes')
        ->assertRedirect(route('admin.providers.index'));
});
