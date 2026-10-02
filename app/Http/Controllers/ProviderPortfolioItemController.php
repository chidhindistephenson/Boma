<?php

namespace App\Http\Controllers;

use App\Models\ProviderPortfolioItem;
use App\Models\ProviderProfile;
use App\Models\ProviderService;
use App\Models\User;
use App\Services\MalwareScanner;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProviderPortfolioItemController extends Controller
{
    public function store(Request $request, MalwareScanner $scanner, SubscriptionService $subscriptions): RedirectResponse
    {
        $provider = $request->user()->loadMissing('providerProfile.portfolioItems');

        abort_unless($provider->isProvider() && $provider->providerProfile, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:140'],
            'description' => ['required', 'string', 'max:1500'],
            'provider_service_id' => ['nullable', 'integer'],
            'media' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp,gif,mp4,webm,mov,pdf',
                'max:'.config('localserve.provider.portfolio_item_max_kb'),
            ],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
        ]);

        $file = $validated['media'];
        $scanner->assertClean($file, 'media');
        $subscriptions->ensurePortfolioLimit($provider->providerProfile);
        $currentSize = (int) $provider->providerProfile->portfolioItems->sum('size_bytes');

        if ($currentSize + $file->getSize() > config('localserve.provider.portfolio_total_max_bytes')) {
            throw ValidationException::withMessages([
                'media' => 'Your portfolio has reached its 500 MB total storage limit.',
            ]);
        }

        $mimeType = $file->getMimeType() ?: 'application/octet-stream';
        $service = $this->ownedService($request, $provider->providerProfile);
        $this->ensureServiceImageCapacity($service, $mimeType);
        $path = $file->store('provider-portfolios/'.$provider->providerProfile->id, 'local');

        if (! $path) {
            throw ValidationException::withMessages([
                'media' => 'The portfolio file could not be stored. Please try again.',
            ]);
        }

        $provider->providerProfile->portfolioItems()->create([
            'provider_service_id' => $service?->id,
            'title' => $validated['title'],
            'description' => $validated['description'],
            'media_type' => $this->mediaType($mimeType),
            'original_name' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'mime_type' => $mimeType,
            'size_bytes' => $file->getSize(),
            'sort_order' => $request->integer('sort_order', 0),
        ]);

        return Redirect::route('profile.edit');
    }

    public function update(Request $request, ProviderPortfolioItem $portfolioItem): RedirectResponse
    {
        $this->authorizeOwner($request, $portfolioItem);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:140'],
            'description' => ['required', 'string', 'max:1500'],
            'provider_service_id' => ['nullable', 'integer'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
        ]);

        $service = $this->ownedService($request, $portfolioItem->providerProfile);
        $this->ensureServiceImageCapacity(
            $service,
            $portfolioItem->mime_type,
            $portfolioItem,
        );

        $portfolioItem->update([
            ...$validated,
            'provider_service_id' => $service?->id,
            'sort_order' => $request->integer('sort_order', 0),
        ]);

        return Redirect::route('profile.edit');
    }

    public function destroy(Request $request, ProviderPortfolioItem $portfolioItem): RedirectResponse
    {
        $this->authorizeOwner($request, $portfolioItem);

        Storage::disk('local')->delete($portfolioItem->storage_path);
        $portfolioItem->delete();

        return Redirect::route('profile.edit');
    }

    public function media(
        Request $request,
        User $provider,
        ProviderPortfolioItem $portfolioItem,
    ): StreamedResponse {
        $portfolioItem->loadMissing('providerProfile');

        abort_unless(
            $portfolioItem->providerProfile
            && $portfolioItem->providerProfile->user_id === $provider->id,
            404,
        );

        $viewer = $request->user();
        $canPreview = $viewer
            && ($viewer->id === $provider->id || $viewer->isAdmin());

        abort_unless($provider->isDirectoryVisible(false) || $canPreview, 404);
        abort_unless(Storage::disk('local')->exists($portfolioItem->storage_path), 404);

        return Storage::disk('local')->response(
            $portfolioItem->storage_path,
            $portfolioItem->original_name,
            [
                'Content-Type' => $portfolioItem->mime_type,
                'X-Content-Type-Options' => 'nosniff',
            ],
            'inline',
        );
    }

    private function authorizeOwner(Request $request, ProviderPortfolioItem $portfolioItem): void
    {
        $portfolioItem->loadMissing('providerProfile');
        $provider = $request->user();

        abort_unless(
            $provider->isProvider()
            && $portfolioItem->providerProfile
            && $portfolioItem->providerProfile->user_id === $provider->id,
            403,
        );
    }

    private function mediaType(string $mimeType): string
    {
        return match (true) {
            str_starts_with($mimeType, 'image/') => 'image',
            str_starts_with($mimeType, 'video/') => 'video',
            default => 'document',
        };
    }

    private function ownedService(
        Request $request,
        ProviderProfile $providerProfile,
    ): ?ProviderService {
        if (! $request->filled('provider_service_id')) {
            return null;
        }

        $service = $providerProfile->services()
            ->find($request->integer('provider_service_id'));

        if (! $service) {
            throw ValidationException::withMessages([
                'provider_service_id' => 'Select one of your own service packages.',
            ]);
        }

        return $service;
    }

    private function ensureServiceImageCapacity(
        ?ProviderService $service,
        string $mimeType,
        ?ProviderPortfolioItem $except = null,
    ): void {
        if (! $service || ! str_starts_with($mimeType, 'image/')) {
            return;
        }

        $imageQuery = $service->portfolioItems()->where('media_type', 'image');

        if ($except) {
            $imageQuery->whereKeyNot($except->id);
        }

        if ($imageQuery->count() >= 5) {
            throw ValidationException::withMessages([
                'provider_service_id' => 'A service package can have up to five portfolio images.',
            ]);
        }
    }
}
