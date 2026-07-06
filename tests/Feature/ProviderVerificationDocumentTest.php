<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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

    $response->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));

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
        ->assertRedirect(route('profile.edit'));

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

test('verified providers cannot upload or delete verification documents', function () {
    $provider = createDocumentProvider([
        'status' => 'active',
    ], [
        'verification_status' => 'verified',
        'verified_at' => now(),
    ]);

    $this->actingAs($provider)
        ->post(route('provider.verification.documents.store'), [
            'document_type' => 'National ID',
            'label' => 'Locked upload',
            'file' => UploadedFile::fake()->create('locked.pdf', 120, 'application/pdf'),
        ])
        ->assertForbidden();

    Storage::disk('local')->put('verification-documents/'.$provider->id.'/existing.pdf', 'locked');

    $document = $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'document_type' => 'Passport',
        'label' => 'Existing locked document',
        'original_name' => 'existing.pdf',
        'storage_path' => 'verification-documents/'.$provider->id.'/existing.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => strlen('locked'),
    ]);

    $this->actingAs($provider)
        ->delete(route('provider.verification.documents.destroy', $document))
        ->assertForbidden();
});
