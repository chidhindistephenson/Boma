<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\ProviderVerificationEvent;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AdminProviderVerificationController extends Controller
{
    public function index(Request $request): Response
    {
        $admin = $request->user();

        abort_unless($admin->isAdmin(), 403);

        $activeStatus = $request->string('status')->toString();

        if (! in_array($activeStatus, ['pending', 'verified', 'rejected', 'all'], true)) {
            $activeStatus = 'pending';
        }

        $providers = User::query()
            ->where('role', 'provider')
            ->with([
                'providerProfile.reviewedBy',
                'providerProfile.verificationDocuments',
                'providerProfile.verificationEvents.actor',
            ])
            ->withCount('shortlistedByCustomers')
            ->get()
            ->when($activeStatus !== 'all', fn ($collection) => $collection
                ->filter(fn (User $provider): bool => $provider->providerProfile?->verification_status === $activeStatus))
            ->sortByDesc(function (User $provider) use ($activeStatus): int {
                $profile = $provider->providerProfile;

                $primaryDate = match ($activeStatus) {
                    'verified' => $profile?->verified_at,
                    'rejected' => $profile?->reviewed_at ?? $profile?->updated_at,
                    default => $profile?->verification_submitted_at ?? $profile?->updated_at,
                };

                return $primaryDate?->timestamp ?? $provider->created_at->timestamp;
            })
            ->values()
            ->map(function (User $provider): array {
                $profile = $provider->providerProfile;

                return [
                    'id' => $provider->id,
                    'providerName' => $provider->name,
                    'businessName' => $profile?->business_name,
                    'tradeCategory' => $profile?->trade_category,
                    'bio' => $profile?->bio,
                    'verificationStatus' => $profile?->verification_status,
                    'verificationSubmittedAt' => $profile?->verification_submitted_at?->toDateTimeString(),
                    'verificationNotes' => $profile?->verification_notes,
                    'verificationReviewNotes' => $profile?->verification_review_notes,
                    'verifiedAt' => $profile?->verified_at?->toDateTimeString(),
                    'reviewedAt' => $profile?->reviewed_at?->toDateTimeString(),
                    'reviewedByName' => $profile?->reviewedBy?->name,
                    'email' => $provider->email,
                    'emailVerified' => $provider->email_verified_at !== null,
                    'phone' => $provider->phone,
                    'status' => $provider->status,
                    'locationLabel' => implode(', ', array_values(array_filter([
                        $provider->area,
                        $provider->city,
                    ]))),
                    'shortlistedByCustomersCount' => $provider->shortlisted_by_customers_count,
                    'memberSince' => $provider->created_at->toDateString(),
                    'verificationDocuments' => $profile?->verificationDocuments
                        ? $profile->verificationDocuments->map(fn ($document): array => [
                            'id' => $document->id,
                            'documentType' => $document->document_type,
                            'label' => $document->label,
                            'originalName' => $document->original_name,
                            'sizeBytes' => $document->size_bytes,
                            'uploadedAt' => $document->created_at->toDateTimeString(),
                        ])->all()
                        : [],
                    'verificationTimeline' => $profile?->verificationEvents
                        ? $profile->verificationEvents
                            ->take(8)
                            ->map(fn (ProviderVerificationEvent $event): array => $event->toTimelineEntry())
                            ->all()
                        : [],
                    'canApprove' => $profile?->verification_status !== 'verified',
                    'canReject' => $profile?->verification_status !== 'rejected',
                ];
            })
            ->all();

        $summary = [
            'pending' => User::query()
                ->where('role', 'provider')
                ->whereHas('providerProfile', fn ($query) => $query->where('verification_status', 'pending'))
                ->count(),
            'verified' => User::query()
                ->where('role', 'provider')
                ->whereHas('providerProfile', fn ($query) => $query->where('verification_status', 'verified'))
                ->count(),
            'rejected' => User::query()
                ->where('role', 'provider')
                ->whereHas('providerProfile', fn ($query) => $query->where('verification_status', 'rejected'))
                ->count(),
        ];

        return Inertia::render('Admin/Providers/Index', [
            'activeStatus' => $activeStatus,
            'providers' => $providers,
            'summary' => $summary,
        ]);
    }

    public function update(Request $request, User $provider): RedirectResponse
    {
        $admin = $request->user();

        abort_unless($admin->isAdmin(), 403);

        $provider->loadMissing('providerProfile');

        abort_unless($provider->isProvider() && $provider->providerProfile, 404);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['approve', 'reject'])],
            'review_notes' => [
                Rule::requiredIf($request->string('action')->toString() === 'reject'),
                'nullable',
                'string',
                'max:1500',
            ],
        ]);

        $isApproval = $validated['action'] === 'approve';

        if ($isApproval && $provider->providerProfile->verificationDocuments()->doesntExist()) {
            throw ValidationException::withMessages([
                'review_notes' => 'This provider needs at least one uploaded verification document before approval.',
            ]);
        }

        DB::transaction(function () use ($admin, $provider, $validated, $isApproval): void {
            $provider->update([
                'status' => $isApproval ? 'active' : 'verification_rejected',
            ]);

            $provider->providerProfile()->update([
                'verification_status' => $isApproval ? 'verified' : 'rejected',
                'verification_review_notes' => $validated['review_notes'] ?? null,
                'verified_at' => $isApproval ? now() : null,
                'reviewed_at' => now(),
                'reviewed_by_user_id' => $admin->id,
            ]);

            ProviderVerificationEvent::record(
                $provider->providerProfile,
                $isApproval ? 'approved' : 'rejected',
                $admin,
                [
                    'review_notes' => $validated['review_notes'] ?? null,
                ],
            );

            InAppNotification::notifyUser(
                $provider,
                $isApproval ? 'provider_verification_approved' : 'provider_verification_rejected',
                $isApproval ? 'Provider verification approved' : 'Provider verification rejected',
                $isApproval
                    ? 'Your provider profile is now verified and can appear publicly whenever the account remains active.'
                    : (($validated['review_notes'] ?? null)
                        ? "The admin left this review note: {$validated['review_notes']}"
                        : 'Your provider profile needs updates before it can be approved.'),
                route('profile.edit'),
                'Open account',
                [
                    'provider_id' => $provider->id,
                    'reviewed_by_user_id' => $admin->id,
                ],
            );
        });

        return Redirect::back();
    }
}
