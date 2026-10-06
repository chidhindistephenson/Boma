<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/profile');

    $response->assertOk();
});

test('unverified user can access account management', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk();
});

test('profile page selects valid account sections', function () {
    $provider = User::factory()->provider()->create();

    $this->actingAs($provider)
        ->get(route('profile.edit', ['section' => 'verification']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('activeSection', 'verification'));

    $this->actingAs($provider)
        ->get(route('profile.edit', ['section' => 'storefront']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('activeSection', 'profile'));

    $this->actingAs($provider)
        ->get(route('profile.edit', ['section' => 'unknown']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('activeSection', 'profile'));
});

test('user can upload and view a profile photo', function () {
    Storage::fake('local');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profile.photo.store'), [
            'photo' => UploadedFile::fake()->image('avatar.jpg', 480, 480)->size(900),
        ])
        ->assertSessionHasNoErrors();

    $path = $user->fresh()->profile_photo_path;

    expect($path)->not->toBeNull();
    Storage::disk('local')->assertExists($path);

    $this->get(route('users.avatar', $user))->assertOk();
});

test('replacing a profile photo removes the previous file', function () {
    Storage::fake('local');
    $user = User::factory()->create();

    $oldPath = UploadedFile::fake()->image('old.jpg')->store("profile-photos/{$user->id}", 'local');
    $user->update(['profile_photo_path' => $oldPath]);

    $this->actingAs($user)
        ->post(route('profile.photo.store'), [
            'photo' => UploadedFile::fake()->image('new.webp'),
        ])
        ->assertSessionHasNoErrors();

    Storage::disk('local')->assertMissing($oldPath);
    Storage::disk('local')->assertExists($user->fresh()->profile_photo_path);
});

test('user can remove their profile photo', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $path = UploadedFile::fake()->image('avatar.png')->store("profile-photos/{$user->id}", 'local');
    $user->update(['profile_photo_path' => $path]);

    $this->actingAs($user)
        ->delete(route('profile.photo.destroy'))
        ->assertSessionHasNoErrors();

    expect($user->fresh()->profile_photo_path)->toBeNull();
    Storage::disk('local')->assertMissing($path);
});

test('profile photo must be a supported image', function () {
    Storage::fake('local');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profile.photo.store'), [
            'photo' => UploadedFile::fake()->create('payload.pdf', 20, 'application/pdf'),
        ])
        ->assertSessionHasErrors('photo');

    expect($user->fresh()->profile_photo_path)->toBeNull();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'phone' => '+263773333333',
            'city' => 'Bulawayo',
            'area' => 'Hillside',
            'latitude' => -20.1547,
            'longitude' => 28.5833,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    $user->refresh();

    $this->assertSame('Test User', $user->name);
    $this->assertSame('test@example.com', $user->email);
    $this->assertSame('+263773333333', $user->phone);
    $this->assertSame('Bulawayo', $user->city);
    $this->assertSame('Hillside', $user->area);
    $this->assertSame(-20.1547, $user->latitude);
    $this->assertSame(28.5833, $user->longitude);
    $this->assertNull($user->email_verified_at);
});

test('saving service preferences keeps the active account section', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'section' => 'preferences',
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'city' => $user->city,
            'area' => $user->area,
            'preferred_radius_km' => 30,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit', ['section' => 'preferences']));
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/profile', [
            'name' => 'Test User',
            'email' => $user->email,
            'phone' => $user->phone,
            'city' => $user->city,
            'area' => $user->area,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    $this->assertNotNull($user->refresh()->email_verified_at);
});

test('provider profile information can be updated', function () {
    $user = User::factory()->provider()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/profile', [
            'name' => 'Updated Provider',
            'email' => 'provider@example.com',
            'phone' => '+263774444444',
            'city' => 'Harare',
            'area' => 'Mount Pleasant',
            'business_name' => 'Prime Wiring Co',
            'headline' => 'Fast electrical fixes with tidy finish work.',
            'trade_category' => 'Electrical',
            'bio' => 'Fast and dependable installations.',
            'availability_status' => 'busy',
            'years_experience' => 9,
            'base_price_from' => 85,
            'response_time_label' => 'Within 24 hours',
            'service_radius_km' => 30,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    $user->refresh();

    $this->assertSame('Updated Provider', $user->name);
    $this->assertSame('Prime Wiring Co', $user->providerProfile->business_name);
    $this->assertSame('Fast electrical fixes with tidy finish work.', $user->providerProfile->headline);
    $this->assertSame('Electrical', $user->providerProfile->trade_category);
    $this->assertSame('busy', $user->providerProfile->availability_status);
    $this->assertSame(9, $user->providerProfile->years_experience);
    $this->assertSame(85, $user->providerProfile->base_price_from);
    $this->assertSame('Within 24 hours', $user->providerProfile->response_time_label);
    $this->assertSame(30, $user->providerProfile->service_radius_km);
});

test('verified provider verification note stays locked during profile updates', function () {
    $user = User::factory()->provider()->create([
        'status' => 'active',
    ]);

    $user->providerProfile()->update([
        'verification_status' => 'verified',
        'verified_at' => now(),
        'verification_notes' => 'Original locked verification note.',
    ]);

    $this->actingAs($user)->patch('/profile', [
        'name' => 'Verified Provider',
        'email' => $user->email,
        'phone' => $user->phone,
        'city' => $user->city,
        'area' => $user->area,
        'business_name' => 'Verified Trade Co',
        'trade_category' => 'Electrical',
        'bio' => 'Updated public provider bio.',
        'availability_status' => 'available',
        'verification_notes' => 'Attempted replacement note.',
    ])->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    $this->assertSame(
        'Original locked verification note.',
        $user->fresh('providerProfile')->providerProfile->verification_notes,
    );
});

test('provider profile page exposes the verification timeline', function () {
    $user = User::factory()->provider()->create([
        'email_verified_at' => now(),
    ]);

    $user->providerProfile()->update([
        'verification_notes' => 'Owner identity and business registration are ready for review.',
    ]);

    $this->actingAs($user)->post(route('provider.verification.documents.store'), [
        'document_type' => 'National ID',
        'label' => 'Owner ID',
        'file' => UploadedFile::fake()->create('owner-id.pdf', 180, 'application/pdf'),
    ])->assertSessionHasNoErrors();

    $this->actingAs($user)->post(route('provider.verification.store'))
        ->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->get('/profile')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('providerVerificationTimeline', 2)
            ->where('providerVerificationTimeline.0.eventType', 'submitted')
            ->where('providerVerificationTimeline.1.eventType', 'document_uploaded'));
});

test('customer profile preferences can be updated', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->patch('/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'city' => $user->city,
            'area' => $user->area,
            'preferred_radius_km' => 40,
            'default_trade_category' => 'Electrical',
            'default_urgency' => 'urgent',
            'default_budget_min' => 60,
            'default_budget_max' => 180,
            'location_notes' => 'Please call when you reach the gate.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    $user->refresh();

    $this->assertSame(40, $user->customerProfile->preferred_radius_km);
    $this->assertSame('Electrical', $user->customerProfile->default_trade_category);
    $this->assertSame('urgent', $user->customerProfile->default_urgency);
    $this->assertSame(60, $user->customerProfile->default_budget_min);
    $this->assertSame(180, $user->customerProfile->default_budget_max);
    $this->assertSame('Please call when you reach the gate.', $user->customerProfile->location_notes);
});

test('user can delete their account', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $photoPath = UploadedFile::fake()->image('avatar.jpg')->store("profile-photos/{$user->id}", 'local');
    $user->update(['profile_photo_path' => $photoPath]);

    $response = $this
        ->actingAs($user)
        ->delete('/profile', [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/');

    $this->assertGuest();
    $user->refresh();
    expect($user->status)->toBe('deleted')
        ->and($user->anonymized_at)->not->toBeNull()
        ->and($user->retention_until)->not->toBeNull()
        ->and($user->email)->toBe("deleted-user-{$user->id}@anonymous.boma.local")
        ->and($user->phone)->toBe('0000000000')
        ->and($user->profile_photo_path)->toBeNull();
    Storage::disk('local')->assertMissing($photoPath);
});

test('admin profile update does not create customer preferences', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->patch(route('profile.update'), [
            'name' => 'Updated Admin',
            'email' => $admin->email,
            'phone' => $admin->phone,
            'city' => $admin->city,
            'area' => $admin->area,
        ])
        ->assertSessionHasNoErrors();

    expect($admin->fresh()->customerProfile)->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/profile')
        ->delete('/profile', [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect('/profile');

    $this->assertNotNull($user->fresh());
    expect($user->fresh()->status)->not->toBe('deleted');
});

test('account retention command anonymizes due deletion requests', function () {
    $user = User::factory()->create([
        'deletion_requested_at' => now()->subDay(),
    ]);

    $this->artisan('accounts:enforce-retention')
        ->expectsOutput('Account retention processed. Anonymized: 1.')
        ->assertExitCode(0);

    $user->refresh();

    expect($user->status)->toBe('deleted')
        ->and($user->anonymized_at)->not->toBeNull()
        ->and($user->deletion_reason)->toBe('retention_policy')
        ->and($user->email)->toBe("deleted-user-{$user->id}@anonymous.boma.local");
});
