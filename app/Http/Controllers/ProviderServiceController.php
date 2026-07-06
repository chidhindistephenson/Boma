<?php

namespace App\Http\Controllers;

use App\Models\ProviderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class ProviderServiceController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $provider = $request->user()->loadMissing('providerProfile');

        abort_unless($provider->isProvider() && $provider->providerProfile, 403);

        $provider->providerProfile->services()->create($this->validatePayload($request));

        return Redirect::route('profile.edit');
    }

    public function update(Request $request, ProviderService $service): RedirectResponse
    {
        $provider = $request->user();
        $service->loadMissing('providerProfile');

        abort_unless(
            $provider->isProvider()
            && $service->providerProfile
            && $service->providerProfile->user_id === $provider->id,
            403,
        );

        $service->update($this->validatePayload($request));

        return Redirect::route('profile.edit');
    }

    public function destroy(Request $request, ProviderService $service): RedirectResponse
    {
        $provider = $request->user();
        $service->loadMissing('providerProfile');

        abort_unless(
            $provider->isProvider()
            && $service->providerProfile
            && $service->providerProfile->user_id === $provider->id,
            403,
        );

        $service->delete();

        return Redirect::route('profile.edit');
    }

    /**
     * @return array<string, mixed>
     */
    protected function validatePayload(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'short_description' => ['required', 'string', 'max:400'],
            'price_from' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'turnaround_label' => ['nullable', 'string', 'max:80'],
            'is_featured' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
        ]);

        return array_merge($validated, [
            'price_from' => $request->filled('price_from')
                ? $request->integer('price_from')
                : null,
            'is_featured' => $request->boolean('is_featured'),
            'sort_order' => (int) $request->integer('sort_order', 0),
        ]);
    }
}
