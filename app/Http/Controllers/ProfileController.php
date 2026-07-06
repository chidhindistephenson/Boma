<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user()->loadMissing([
            'providerProfile.verificationDocuments',
            'providerProfile.verificationEvents.actor',
            'providerProfile.services',
        ]);

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'tradeCategories' => config('localserve.trade_categories'),
            'requestUrgencyOptions' => config('localserve.request.urgency_options'),
            'availabilityOptions' => config('localserve.provider.availability_options'),
            'responseTimeOptions' => config('localserve.provider.response_time_options'),
            'verificationDocumentTypes' => config('localserve.provider.verification_document_types'),
            'providerVerificationDocuments' => $user->isProvider() && $user->providerProfile
                ? $user->providerProfile->verificationDocuments->map(function ($document): array {
                    return [
                        'id' => $document->id,
                        'documentType' => $document->document_type,
                        'label' => $document->label,
                        'originalName' => $document->original_name,
                        'sizeBytes' => $document->size_bytes,
                        'uploadedAt' => $document->created_at->toDateTimeString(),
                    ];
                })->all()
                : [],
            'providerVerificationTimeline' => $user->isProvider() && $user->providerProfile
                ? $user->providerProfile->verificationEvents
                    ->take(10)
                    ->map(fn ($event): array => $event->toTimelineEntry())
                    ->all()
                : [],
            'providerServices' => $user->isProvider() && $user->providerProfile
                ? $user->providerProfile->services->map(function ($service): array {
                    return [
                        'id' => $service->id,
                        'title' => $service->title,
                        'shortDescription' => $service->short_description,
                        'priceFrom' => $service->price_from,
                        'turnaroundLabel' => $service->turnaround_label,
                        'isFeatured' => $service->is_featured,
                        'sortOrder' => $service->sort_order,
                    ];
                })->all()
                : [],
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'city' => $validated['city'],
            'area' => $validated['area'] ?? null,
        ]);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        DB::transaction(function () use ($user, $validated): void {
            $user->save();

            if ($user->isProvider()) {
                $currentProviderProfile = $user->providerProfile;

                $user->providerProfile()->updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'business_name' => $validated['business_name'],
                        'headline' => ($validated['headline'] ?? null) ?: null,
                        'trade_category' => $validated['trade_category'],
                        'bio' => $validated['bio'],
                        'availability_status' => $validated['availability_status']
                            ?? $currentProviderProfile?->availability_status
                            ?? 'available',
                        'years_experience' => $validated['years_experience'] ?? null,
                        'base_price_from' => $validated['base_price_from'] ?? null,
                        'response_time_label' => $validated['response_time_label'] ?? null,
                        'service_radius_km' => $validated['service_radius_km'] ?? null,
                        'verification_notes' => $currentProviderProfile?->verification_status === 'verified'
                            ? $currentProviderProfile->verification_notes
                            : ($validated['verification_notes'] ?? null),
                    ],
                );

                return;
            }

            $user->customerProfile()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'preferred_radius_km' => $validated['preferred_radius_km']
                        ?? $user->customerProfile?->preferred_radius_km
                        ?? config('localserve.search.default_radius_km'),
                    'default_trade_category' => ($validated['default_trade_category'] ?? null) ?: null,
                    'default_urgency' => $validated['default_urgency']
                        ?? $user->customerProfile?->default_urgency
                        ?? array_key_first(config('localserve.request.urgency_options')),
                    'default_budget_min' => $validated['default_budget_min'] ?? null,
                    'default_budget_max' => $validated['default_budget_max'] ?? null,
                    'location_notes' => ($validated['location_notes'] ?? null) ?: null,
                ],
            );
        });

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
