<?php

use App\Models\ProviderVerificationDocument;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    Storage::fake('local');
});

function createDocumentProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'name' => 'Document Provider',
        'city' => 'Harare',
        'area' => 'Greendale',
        'phone' => '+263777111111',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Greendale Trade Works',
        'trade_category' => 'Electrical',
        'bio' => 'Document upload test provider.',
        'verification_status' => 'pending',
        'verification_notes' => 'Registered provider with recent compliance paperwork.',
        'verification_submitted_at' => now(),
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

test('provider can upload a private verification document', function () {
    $provider = createDocumentProvider();

    $response = $this->actingAs($provider)->post(
        route('provider.verification.documents.store'),
        [
            'document_type' => 'National ID',
            'label' => 'Owner identity card',
            'file' => UploadedFile::fake()->create(
                'owner-id.pdf',
                240,
                'application/pdf',
            ),
        ],
    );

    $response->assertSessionHasNoErrors()->assertRedirect(route('profile.edit', ['section' => 'verification']));

    $document = $provider->fresh('providerProfile.verificationDocuments')
        ->providerProfile
        ->verificationDocuments
        ->first();

    expect($document)->not->toBeNull();

    Storage::disk('local')->assertExists($document->storage_path);

    $this->assertDatabaseHas('provider_verification_documents', [
        'provider_profile_id' => $provider->providerProfile->id,
        'document_type' => 'National ID',
        'label' => 'Owner identity card',
        'original_name' => 'owner-id.pdf',
        'verification_status' => ProviderVerificationDocument::STATUS_PENDING,
    ]);

    $event = $provider->fresh('providerProfile.verificationEvents')
        ->providerProfile
        ->verificationEvents
        ->first();

    expect($event)->not->toBeNull();
    expect($event->event_type)->toBe('document_uploaded');
    expect($event->payload['label'])->toBe('Owner identity card');
});

test('provider and admin can download a verification document but customers cannot', function () {
    $provider = createDocumentProvider();
    $admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);
    $customer = User::factory()->create();

    $this->actingAs($provider)->post(route('provider.verification.documents.store'), [
        'document_type' => 'Business registration',
        'label' => 'Registrar copy',
        'file' => UploadedFile::fake()->create('registration.pdf', 180, 'application/pdf'),
    ]);

    $document = $provider->fresh('providerProfile.verificationDocuments')
        ->providerProfile
        ->verificationDocuments
        ->first();

    $this->actingAs($provider)
        ->get(route('provider.verification.documents.show', $document))
        ->assertOk();

    $this->actingAs($admin)
        ->get(route('provider.verification.documents.show', $document))
        ->assertOk();

    $this->actingAs($customer)
        ->get(route('provider.verification.documents.show', $document))
        ->assertForbidden();
});

test('provider can remove an unverified verification document', function () {
    $provider = createDocumentProvider();

    $this->actingAs($provider)->post(route('provider.verification.documents.store'), [
        'document_type' => 'Proof of address',
        'label' => 'Utility statement',
        'file' => UploadedFile::fake()->create('utility.png', 220, 'image/png'),
    ]);

    $document = $provider->fresh('providerProfile.verificationDocuments')
        ->providerProfile
        ->verificationDocuments
        ->first();

    $storedPath = $document->storage_path;

    $this->actingAs($provider)
        ->delete(route('provider.verification.documents.destroy', $document))
        ->assertRedirect(route('profile.edit', ['section' => 'verification']));

    Storage::disk('local')->assertMissing($storedPath);
    $this->assertDatabaseMissing('provider_verification_documents', [
        'id' => $document->id,
    ]);

    $event = $provider->fresh('providerProfile.verificationEvents')
        ->providerProfile
        ->verificationEvents
        ->first();

    expect($event)->not->toBeNull();
    expect($event->event_type)->toBe('document_removed');
    expect($event->payload['document_type'])->toBe('Proof of address');
});

test('verified providers can add documents but cannot delete approved evidence', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $provider = createDocumentProvider([
        'status' => 'active',
    ], [
        'verification_status' => 'verified',
        'verified_at' => now(),
    ]);

    $this->actingAs($provider)
        ->post(route('provider.verification.documents.store'), [
            'document_type' => 'National ID',
            'label' => 'Additional trade evidence',
            'file' => UploadedFile::fake()->create('locked.pdf', 120, 'application/pdf'),
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit', ['section' => 'verification']));

    $this->assertDatabaseHas('provider_verification_documents', [
        'provider_profile_id' => $provider->providerProfile->id,
        'label' => 'Additional trade evidence',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $admin->id,
        'type' => 'provider_verification_document_added',
        'title' => 'New provider document needs review',
    ]);

    Storage::disk('local')->put('verification-documents/'.$provider->id.'/existing.pdf', 'locked');

    $document = $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'document_type' => 'Passport',
        'label' => 'Existing locked document',
        'original_name' => 'existing.pdf',
        'storage_path' => 'verification-documents/'.$provider->id.'/existing.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => strlen('locked'),
        'verification_status' => ProviderVerificationDocument::STATUS_APPROVED,
        'approved_at' => now(),
    ]);

    $this->actingAs($provider)
        ->delete(route('provider.verification.documents.destroy', $document))
        ->assertForbidden();
});

test('verified provider can submit a replacement for an approved document', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $provider = createDocumentProvider([
        'status' => 'active',
    ], [
        'verification_status' => 'verified',
        'verified_at' => now(),
    ]);

    Storage::disk('local')->put('verification-documents/'.$provider->id.'/approved.pdf', 'approved');

    $approvedDocument = $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'document_type' => 'Tax certificate',
        'label' => '2025 tax certificate',
        'original_name' => 'approved.pdf',
        'storage_path' => 'verification-documents/'.$provider->id.'/approved.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => strlen('approved'),
        'verification_status' => ProviderVerificationDocument::STATUS_APPROVED,
        'approved_at' => now(),
    ]);

    $this->actingAs($provider)
        ->post(route('provider.verification.documents.replace', $approvedDocument), [
            'label' => '2026 tax certificate',
            'file' => UploadedFile::fake()->create('replacement.pdf', 140, 'application/pdf'),
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit', ['section' => 'verification']));

    $replacement = $provider->providerProfile->verificationDocuments()
        ->where('replaces_document_id', $approvedDocument->id)
        ->first();

    expect($replacement)->not->toBeNull();
    expect($replacement->verification_status)->toBe(ProviderVerificationDocument::STATUS_PENDING_REPLACEMENT);
    expect($approvedDocument->fresh()->verification_status)->toBe(ProviderVerificationDocument::STATUS_APPROVED);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $admin->id,
        'type' => 'provider_verification_document_replacement_requested',
        'title' => 'Document replacement needs review',
    ]);

    $this->actingAs($provider)
        ->post(route('provider.verification.documents.replace', $approvedDocument), [
            'label' => 'Duplicate replacement',
            'file' => UploadedFile::fake()->create('duplicate.pdf', 140, 'application/pdf'),
        ])
        ->assertSessionHasErrors('file');
});

test('admin can approve a replacement and supersede the old approved document', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $provider = createDocumentProvider([
        'status' => 'active',
    ], [
        'verification_status' => 'verified',
        'verified_at' => now(),
    ]);

    Storage::disk('local')->put('verification-documents/'.$provider->id.'/old.pdf', 'old');
    Storage::disk('local')->put('verification-documents/'.$provider->id.'/new.pdf', 'new');

    $oldDocument = $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'document_type' => 'Business registration',
        'label' => 'Old registration',
        'original_name' => 'old.pdf',
        'storage_path' => 'verification-documents/'.$provider->id.'/old.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => strlen('old'),
        'verification_status' => ProviderVerificationDocument::STATUS_APPROVED,
        'approved_at' => now()->subDay(),
    ]);

    $replacement = $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'replaces_document_id' => $oldDocument->id,
        'document_type' => 'Business registration',
        'label' => 'New registration',
        'original_name' => 'new.pdf',
        'storage_path' => 'verification-documents/'.$provider->id.'/new.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => strlen('new'),
        'verification_status' => ProviderVerificationDocument::STATUS_PENDING_REPLACEMENT,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.provider-verification-documents.update', $replacement), [
            'action' => 'approve',
        ])
        ->assertSessionHasNoErrors();

    expect($replacement->fresh()->verification_status)->toBe(ProviderVerificationDocument::STATUS_APPROVED);
    expect($oldDocument->fresh()->verification_status)->toBe(ProviderVerificationDocument::STATUS_SUPERSEDED);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'provider_verification_document_replacement_approved',
        'title' => 'Document replacement approved',
    ]);
});

test('admin can reject a replacement while keeping the old approved document active', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $provider = createDocumentProvider([
        'status' => 'active',
    ], [
        'verification_status' => 'verified',
        'verified_at' => now(),
    ]);

    Storage::disk('local')->put('verification-documents/'.$provider->id.'/old.pdf', 'old');
    Storage::disk('local')->put('verification-documents/'.$provider->id.'/bad.pdf', 'bad');

    $oldDocument = $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'document_type' => 'Insurance certificate',
        'label' => 'Approved insurance',
        'original_name' => 'old.pdf',
        'storage_path' => 'verification-documents/'.$provider->id.'/old.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => strlen('old'),
        'verification_status' => ProviderVerificationDocument::STATUS_APPROVED,
        'approved_at' => now()->subDay(),
    ]);

    $replacement = $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'replaces_document_id' => $oldDocument->id,
        'document_type' => 'Insurance certificate',
        'label' => 'Bad insurance',
        'original_name' => 'bad.pdf',
        'storage_path' => 'verification-documents/'.$provider->id.'/bad.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => strlen('bad'),
        'verification_status' => ProviderVerificationDocument::STATUS_PENDING_REPLACEMENT,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.provider-verification-documents.update', $replacement), [
            'action' => 'reject',
            'review_notes' => 'The renewal date is not visible.',
        ])
        ->assertSessionHasNoErrors();

    expect($replacement->fresh()->verification_status)->toBe(ProviderVerificationDocument::STATUS_REJECTED);
    expect($replacement->fresh()->review_notes)->toBe('The renewal date is not visible.');
    expect($oldDocument->fresh()->verification_status)->toBe(ProviderVerificationDocument::STATUS_APPROVED);
});

test('verified provider with a pending replacement appears in the admin pending queue', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $provider = createDocumentProvider([
        'status' => 'active',
    ], [
        'verification_status' => 'verified',
        'verified_at' => now(),
    ]);

    Storage::disk('local')->put('verification-documents/'.$provider->id.'/old.pdf', 'old');
    Storage::disk('local')->put('verification-documents/'.$provider->id.'/new.pdf', 'new');

    $oldDocument = $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'document_type' => 'Professional license',
        'label' => 'Approved license',
        'original_name' => 'old.pdf',
        'storage_path' => 'verification-documents/'.$provider->id.'/old.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => strlen('old'),
        'verification_status' => ProviderVerificationDocument::STATUS_APPROVED,
        'approved_at' => now()->subDay(),
    ]);

    $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'replaces_document_id' => $oldDocument->id,
        'document_type' => 'Professional license',
        'label' => 'Renewed license',
        'original_name' => 'new.pdf',
        'storage_path' => 'verification-documents/'.$provider->id.'/new.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => strlen('new'),
        'verification_status' => ProviderVerificationDocument::STATUS_PENDING_REPLACEMENT,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.providers.index', ['status' => 'pending']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Providers/Index')
            ->where('activeStatus', 'pending')
            ->where('providers.per_page', 5)
            ->has('providers.data', 1)
            ->where('providers.data.0.id', $provider->id)
            ->where('providers.data.0.verificationDocuments.0.verificationStatus', ProviderVerificationDocument::STATUS_PENDING_REPLACEMENT));
});
