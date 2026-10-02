<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\ProviderVerificationDocument;
use App\Models\ProviderVerificationEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class AdminProviderVerificationDocumentController extends Controller
{
    public function update(Request $request, ProviderVerificationDocument $document): RedirectResponse
    {
        $admin = $request->user();

        abort_unless($admin->isAdmin(), 403);

        $document->loadMissing('providerProfile.user', 'replacesDocument');

        abort_unless($document->providerProfile, 404);
        abort_unless($document->isPendingAdminReview(), 403);

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
        $isReplacement = $document->replaces_document_id !== null;
        $provider = $document->providerProfile->user;

        DB::transaction(function () use ($admin, $document, $isApproval, $isReplacement, $provider, $validated): void {
            if ($isApproval && $document->replacesDocument) {
                $document->replacesDocument->forceFill([
                    'verification_status' => ProviderVerificationDocument::STATUS_SUPERSEDED,
                    'reviewed_at' => now(),
                    'reviewed_by_user_id' => $admin->id,
                ])->save();
            }

            $document->forceFill([
                'verification_status' => $isApproval
                    ? ProviderVerificationDocument::STATUS_APPROVED
                    : ProviderVerificationDocument::STATUS_REJECTED,
                'approved_at' => $isApproval ? now() : null,
                'reviewed_at' => now(),
                'reviewed_by_user_id' => $admin->id,
                'review_notes' => $validated['review_notes'] ?? null,
            ])->save();

            ProviderVerificationEvent::record(
                $document->providerProfile,
                match (true) {
                    $isApproval && $isReplacement => 'document_replacement_approved',
                    ! $isApproval && $isReplacement => 'document_replacement_rejected',
                    $isApproval => 'document_approved',
                    default => 'document_rejected',
                },
                $admin,
                [
                    'document_type' => $document->document_type,
                    'label' => $document->label,
                    'original_name' => $document->original_name,
                    'review_notes' => $validated['review_notes'] ?? null,
                ],
            );

            InAppNotification::notifyUser(
                $provider,
                match (true) {
                    $isApproval && $isReplacement => 'provider_verification_document_replacement_approved',
                    ! $isApproval && $isReplacement => 'provider_verification_document_replacement_rejected',
                    $isApproval => 'provider_verification_document_approved',
                    default => 'provider_verification_document_rejected',
                },
                match (true) {
                    $isApproval && $isReplacement => 'Document replacement approved',
                    ! $isApproval && $isReplacement => 'Document replacement rejected',
                    $isApproval => 'Verification document approved',
                    default => 'Verification document rejected',
                },
                $isApproval
                    ? "{$document->document_type} has been approved by the admin team."
                    : (($validated['review_notes'] ?? null)
                        ? "The admin left this review note: {$validated['review_notes']}"
                        : "{$document->document_type} needs stronger evidence before approval."),
                route('profile.edit', ['section' => 'verification']),
                'Open documents',
                [
                    'provider_verification_document_id' => $document->id,
                    'reviewed_by_user_id' => $admin->id,
                ],
            );
        });

        return Redirect::back();
    }
}
