<?php

use App\Models\JobRequest;
use App\Models\ProviderTradeCategory;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function (): void {
    $this->withoutVite();
    Storage::fake('local');
});

function createVerifiedTradeProvider(): User
{
    $provider = User::factory()->provider()->create([
        'name' => 'Qutanga Owner',
        'status' => 'active',
        'city' => 'Harare',
        'area' => 'Avondale',
        'email_verified_at' => now(),
    ]);

    $provider->providerProfile()->update([
        'business_name' => 'Qutanga',
        'trade_category' => 'Software Development',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'service_radius_km' => 40,
    ]);

    $provider->providerProfile->tradeCategories()->delete();

    $provider->providerProfile->tradeCategories()->updateOrCreate(
        ['trade_category' => 'Software Development'],
        [
            'verification_status' => 'verified',
            'submitted_at' => now(),
            'verified_at' => now(),
        ],
    );

    Storage::disk('local')->put('verification-documents/'.$provider->id.'/registration.pdf', 'payload');

    $provider->providerProfile->verificationDocuments()->create([
        'uploaded_by_user_id' => $provider->id,
        'document_type' => 'Business registration',
        'label' => 'Company registration',
        'original_name' => 'registration.pdf',
        'storage_path' => 'verification-documents/'.$provider->id.'/registration.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => strlen('payload'),
    ]);

    return $provider->fresh('providerProfile.tradeCategories');
}

test('verified provider can request another trade category without losing current verification', function (): void {
    $admin = User::factory()->create(['role' => 'admin']);
    $provider = createVerifiedTradeProvider();

    $this->actingAs($provider)
        ->post(route('provider.trade-categories.store'), [
            'trade_category' => 'Cyber Security',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit', ['section' => 'verification']));

    $provider->refresh();

    expect($provider->status)->toBe('active');
    expect($provider->providerProfile->verification_status)->toBe('verified');

    $this->assertDatabaseHas('provider_trade_categories', [
        'provider_profile_id' => $provider->providerProfile->id,
        'trade_category' => 'Cyber Security',
        'verification_status' => 'pending',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $admin->id,
        'type' => 'provider_trade_category_submitted',
    ]);
});

test('admin can approve an added trade category for discovery and job matching', function (): void {
    $admin = User::factory()->create(['role' => 'admin']);
    $provider = createVerifiedTradeProvider();
    $tradeCategory = $provider->providerProfile->tradeCategories()->create([
        'trade_category' => 'Network Engineering',
        'verification_status' => 'pending',
        'submitted_at' => now(),
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.provider-trade-categories.update', $tradeCategory), [
            'action' => 'approve',
            'review_notes' => 'Network references match the submitted documents.',
        ])
        ->assertSessionHasNoErrors();

    $tradeCategory->refresh();

    expect($tradeCategory->verification_status)->toBe('verified');
    expect($tradeCategory->verified_at)->not->toBeNull();

    $this->actingAs(User::factory()->create())
        ->get(route('providers.index', ['category' => 'Network Engineering']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('providers.data', 1)
            ->where('providers.data.0.businessName', 'Qutanga')
            ->where('providers.data.0.categories', fn ($categories): bool => in_array(
                'Network Engineering',
                collect($categories)->all(),
                true,
            )));

    $customer = User::factory()->create(['city' => $provider->city]);
    $request = JobRequest::create([
        'customer_id' => $customer->id,
        'trade_category' => 'Network Engineering',
        'title' => 'Network cabinet installation',
        'description' => 'Need a verified network engineer.',
        'city' => $provider->city,
        'status' => 'open',
    ]);

    expect($request->matchesProvider($provider->fresh('providerProfile.verifiedTradeCategories')))->toBeTrue();
});

test('pending added trade category is not used for discovery or job matching', function (): void {
    $provider = createVerifiedTradeProvider();

    $provider->providerProfile->tradeCategories()->create([
        'trade_category' => 'Cyber Security',
        'verification_status' => 'pending',
        'submitted_at' => now(),
    ]);

    $this->actingAs(User::factory()->create())
        ->get(route('providers.index', ['category' => 'Cyber Security']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('providers.data', 0));

    $customer = User::factory()->create(['city' => $provider->city]);
    $request = JobRequest::create([
        'customer_id' => $customer->id,
        'trade_category' => 'Cyber Security',
        'title' => 'Security assessment',
        'description' => 'Need a cyber security provider.',
        'city' => $provider->city,
        'status' => 'open',
    ]);

    expect($request->matchesProvider($provider->fresh('providerProfile.verifiedTradeCategories')))->toBeFalse();
});

test('provider cannot remove a verified trade category', function (): void {
    $provider = createVerifiedTradeProvider();
    $tradeCategory = $provider->providerProfile->verifiedTradeCategories()->first();

    $this->actingAs($provider)
        ->delete(route('provider.trade-categories.destroy', $tradeCategory))
        ->assertForbidden();
});

test('provider can remove a pending trade category', function (): void {
    $provider = createVerifiedTradeProvider();
    $tradeCategory = $provider->providerProfile->tradeCategories()->create([
        'trade_category' => 'Cyber Security',
        'verification_status' => 'pending',
        'submitted_at' => now(),
    ]);

    $this->actingAs($provider)
        ->delete(route('provider.trade-categories.destroy', $tradeCategory))
        ->assertRedirect(route('profile.edit', ['section' => 'verification']));

    expect(ProviderTradeCategory::query()->whereKey($tradeCategory->id)->exists())->toBeFalse();
});
