<?php

namespace App\Http\Controllers;

use App\Models\ProviderVerificationEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;

class ProviderVerificationController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $provider = $request->user()->loadMissing('providerProfile');

        abort_unless($provider->isProvider(), 403);
        abort_unless($provider->providerProfile, 404);

        if (blank($provider->providerProfile->verification_notes)) {
            throw ValidationException::withMessages([
                'verification_notes' => 'Add verification details for the admin review before submitting.',
            ]);
        }

        if ($provider->providerProfile->verificationDocuments()->doesntExist()) {
            throw ValidationException::withMessages([
                'verification_documents' => 'Upload at least one verification document before submitting your profile for review.',
            ]);
        }

        $eventType = $provider->providerProfile->verification_status === 'rejected'
            ? 'resubmitted'
            : 'submitted';

        DB::transaction(function () use ($eventType, $provider): void {
            $provider->update([
                'status' => 'pending_verification',
            ]);

            $provider->providerProfile()->update([
                'verification_status' => 'pending',
                'verification_submitted_at' => now(),
                'verification_review_notes' => null,
                'verified_at' => null,
                'reviewed_at' => null,
                'reviewed_by_user_id' => null,
            ]);

            ProviderVerificationEvent::record(
                $provider->providerProfile,
                $eventType,
                $provider,
                [
                    'document_count' => $provider->providerProfile->verificationDocuments()->count(),
                ],
            );
        });

        return Redirect::route('profile.edit', ['section' => 'verification']);
    }
}
