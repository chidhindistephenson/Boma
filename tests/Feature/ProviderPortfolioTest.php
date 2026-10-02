<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    Storage::fake('local');
});

function createPortfolioProvider(array $userAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
    ], $userAttributes));

    $provider->providerProfile()->update([
        'verification_status' => 'verified',
        'verified_at' => now(),
    ]);

    return $provider->fresh('providerProfile');
}

function addPortfolioItem(User $provider, string $filename = 'finished-work.jpg')
{
    $path = 'provider-portfolios/'.$provider->providerProfile->id.'/'.$filename;
    Storage::disk('local')->put($path, 'portfolio-media');

    return $provider->providerProfile->portfolioItems()->create([
        'title' => 'Finished kitchen installation',
        'description' => 'Custom cabinets installed and finished for a family kitchen.',
        'media_type' => 'image',
        'original_name' => $filename,
        'storage_path' => $path,
        'mime_type' => 'image/jpeg',
        'size_bytes' => strlen('portfolio-media'),
        'sort_order' => 1,
    ]);
}

test('provider can upload and manage a portfolio item', function () {
    $provider = createPortfolioProvider();
    $service = $provider->providerProfile->services()->create([
        'title' => 'Bathroom installations',
        'short_description' => 'Fixture replacement and bathroom upgrade work.',
        'price_from' => 80,
        'sort_order' => 1,
    ]);

    $this->actingAs($provider)
        ->post(route('provider.portfolio.store'), [
            'title' => 'Bathroom renovation',
            'description' => 'A complete fixture replacement with clean tiling repairs.',
            'media' => UploadedFile::fake()->image('bathroom.jpg', 1200, 800),
            'provider_service_id' => $service->id,
            'sort_order' => 2,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $item = $provider->fresh('providerProfile.portfolioItems')
        ->providerProfile
        ->portfolioItems
        ->first();

    expect($item)->not->toBeNull();
    expect($item->title)->toBe('Bathroom renovation');
    expect($item->media_type)->toBe('image');
    expect($item->provider_service_id)->toBe($service->id);
    Storage::disk('local')->assertExists($item->storage_path);

    $this->actingAs($provider)
        ->patch(route('provider.portfolio.update', $item), [
            'title' => 'Updated bathroom renovation',
            'description' => 'Updated project details for the public portfolio.',
            'provider_service_id' => '',
            'sort_order' => 1,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($item->fresh()->title)->toBe('Updated bathroom renovation');
    expect($item->fresh()->sort_order)->toBe(1);
    expect($item->fresh()->provider_service_id)->toBeNull();

    $this->actingAs($provider)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('providerPortfolioItems', 1)
            ->where('providerPortfolioItems.0.title', 'Updated bathroom renovation'));
});

test('public provider profile exposes the full portfolio gallery', function () {
    $provider = createPortfolioProvider();
    $item = addPortfolioItem($provider);

    $this->get(route('providers.show', $provider))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Providers/Show')
            ->has('provider.portfolioItems', 1)
            ->where('provider.portfolioItems.0.title', $item->title)
            ->where('provider.portfolioItems.0.mediaType', 'image'));

    $this->get(route('providers.portfolio.media', [$provider, $item]))
        ->assertOk()
        ->assertHeader('content-type', 'image/jpeg');
});

test('another provider cannot update or delete portfolio work', function () {
    $owner = createPortfolioProvider();
    $otherProvider = createPortfolioProvider();
    $item = addPortfolioItem($owner);

    $this->actingAs($otherProvider)
        ->patch(route('provider.portfolio.update', $item), [
            'title' => 'Stolen project',
            'description' => 'This update must be rejected.',
            'sort_order' => 0,
        ])
        ->assertForbidden();

    $this->actingAs($otherProvider)
        ->delete(route('provider.portfolio.destroy', $item))
        ->assertForbidden();

    $this->assertDatabaseHas('provider_portfolio_items', [
        'id' => $item->id,
        'title' => 'Finished kitchen installation',
    ]);
    Storage::disk('local')->assertExists($item->storage_path);
});

test('private storefront media is visible only to its owner or an admin', function () {
    $provider = createPortfolioProvider([
        'status' => 'pending_verification',
        'email_verified_at' => null,
    ]);
    $provider->providerProfile()->update([
        'verification_status' => 'pending',
        'verified_at' => null,
    ]);
    $item = addPortfolioItem($provider);

    $this->get(route('providers.portfolio.media', [$provider, $item]))
        ->assertNotFound();

    $this->actingAs($provider)
        ->get(route('providers.portfolio.media', [$provider, $item]))
        ->assertOk();

    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('providers.portfolio.media', [$provider, $item]))
        ->assertOk();
});

test('deleting a portfolio item removes its stored media', function () {
    $provider = createPortfolioProvider();
    $item = addPortfolioItem($provider);

    $this->actingAs($provider)
        ->delete(route('provider.portfolio.destroy', $item))
        ->assertRedirect(route('profile.edit'));

    $this->assertDatabaseMissing('provider_portfolio_items', ['id' => $item->id]);
    Storage::disk('local')->assertMissing($item->storage_path);
});

test('a service package cannot have more than five portfolio images', function () {
    $provider = createPortfolioProvider();
    $service = $provider->providerProfile->services()->create([
        'title' => 'Kitchen installations',
        'short_description' => 'Custom kitchen fitting and finishing.',
        'price_from' => 120,
        'sort_order' => 1,
    ]);

    foreach (range(1, 5) as $index) {
        $item = addPortfolioItem($provider, "kitchen-{$index}.jpg");
        $item->update(['provider_service_id' => $service->id]);
    }

    $this->actingAs($provider)
        ->from(route('profile.edit'))
        ->post(route('provider.portfolio.store'), [
            'title' => 'Sixth kitchen image',
            'description' => 'This image exceeds the package limit.',
            'media' => UploadedFile::fake()->image('sixth-kitchen.jpg'),
            'provider_service_id' => $service->id,
        ])
        ->assertSessionHasErrors('provider_service_id')
        ->assertRedirect(route('profile.edit'));

    expect($service->portfolioItems()->where('media_type', 'image')->count())->toBe(5);
});
