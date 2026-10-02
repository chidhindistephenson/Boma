<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\ProviderVerificationDocument;
use App\Models\ProviderVerificationEvent;
use App\Models\User;
use App\Services\MalwareScanner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProviderVerificationDocumentController extends Controller
{
    public function store(Request $request, MalwareScanner $scanner): RedirectResponse
    {
        $provider = $request->user()->loadMissing('providerProfile.verificationDocuments');

        abort_unless($provider->isProvider(), 403);
        abort_unless($provider->providerProfile, 404);

        $validated = $request->validate([
            'document_type' => [
                'required',
                'string',
                Rule::in(config('localserve.provider.verification_document_types')),
            ],
            'label' => ['nullable', 'string', 'max:255'],
            'file' => [
                'required',
                'file',
                'mimetypes:application/pdf,image/jpeg,image/png',
                'max:'.config('localserve.provider.verification_document_max_kb'),
            ],
        ]);

        $file = $validated['file'];
        $scanner->assertClean($file, 'file');
        $path = $file->store('verification-documents/'.$provider->id, 'local');

        $document = $provider->providerProfile->verificationDocuments()->create([
            'uploaded_by_user_id' => $provider->id,
            'document_type' => $validated['document_type'],
            'label' => $validated['label'] ?? null,
            'original_name' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'mime_type' => $file->getClientMimeType() ?: $file->getMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize(),
            'verification_status' => ProviderVerificationDocument::STATUS_PENDING,
        ]);

        ProviderVerificationEvent::record(
            $provider->providerProfile,
            'document_uploaded',
            $provider,
            [
                'document_type' => $document->document_type,
                'label' => $document->label,
                'original_name' => $document->original_name,
            ],
        );

        if ($provider->providerProfile->verification_status === 'verified') {
            $this->notifyAdmins(
                $provider,
                $document,
                'provider_verification_document_added',
                'New provider document needs review',
                "{$provider->providerProfile->business_name} added {$document->document_type} evidence after verification.",
            );
        }

        return Redirect::route('profile.edit', ['section' => 'verification']);
    }

    public function replace(Request $request, ProviderVerificationDocument $document, MalwareScanner $scanner): RedirectResponse
    {
        $document->loadMissing('providerProfile');
        $provider = $request->user();

        abort_unless(
            $provider->isProvider()
            && $document->providerProfile
            && $document->providerProfile->user_id === $provider->id,
            403,
        );
        abort_unless($document->canBeReplaced(), 403);

        $hasOpenReplacement = $document->replacements()
            ->whereIn('verification_status', [
                ProviderVerificationDocument::STATUS_PENDING,
                ProviderVerificationDocument::STATUS_PENDING_REPLACEMENT,
            ])
            ->exists();

        if ($hasOpenReplacement) {
            throw ValidationException::withMessages([
                'file' => 'This document already has a replacement waiting for admin review.',
            ]);
        }

        $validated = $request->validate([
            'label' => ['nullable', 'string', 'max:255'],
            'file' => [
                'required',
                'file',
                'mimetypes:application/pdf,image/jpeg,image/png',
                'max:'.config('localserve.provider.verification_document_max_kb'),
            ],
        ]);

        $file = $validated['file'];
        $scanner->assertClean($file, 'file');
        $path = $file->store('verification-documents/'.$provider->id, 'local');

        $replacement = $document->providerProfile->verificationDocuments()->create([
            'uploaded_by_user_id' => $provider->id,
            'replaces_document_id' => $document->id,
            'document_type' => $document->document_type,
            'label' => $validated['label'] ?? $document->label,
            'original_name' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'mime_type' => $file->getClientMimeType() ?: $file->getMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize(),
            'verification_status' => ProviderVerificationDocument::STATUS_PENDING_REPLACEMENT,
        ]);

        ProviderVerificationEvent::record(
            $document->providerProfile,
            'document_replacement_requested',
            $provider,
            [
                'document_type' => $replacement->document_type,
                'label' => $replacement->label,
                'original_name' => $replacement->original_name,
                'replaces_original_name' => $document->original_name,
            ],
        );

        $this->notifyAdmins(
            $provider,
            $replacement,
            'provider_verification_document_replacement_requested',
            'Document replacement needs review',
            "{$provider->providerProfile->business_name} submitted a replacement for {$document->document_type}.",
        );

        return Redirect::route('profile.edit', ['section' => 'verification']);
    }

    public function show(Request $request, ProviderVerificationDocument $document): StreamedResponse
    {
        $document->loadMissing('providerProfile');

        abort_unless($document->isVisibleTo($request->user()), 403);
        abort_unless(Storage::disk('local')->exists($document->storage_path), 404);

        return Storage::disk('local')->download(
            $document->storage_path,
            $document->original_name,
            ['Content-Type' => $document->mime_type],
        );
    }

    public function destroy(Request $request, ProviderVerificationDocument $document): RedirectResponse
    {
        $document->loadMissing('providerProfile');
        $provider = $request->user();

        abort_unless(
            $provider->isProvider()
            && $document->providerProfile
            && $document->providerProfile->user_id === $provider->id,
            403,
        );

        abort_unless($document->canBeRemovedByProvider(), 403);

        ProviderVerificationEvent::record(
            $document->providerProfile,
            'document_removed',
            $provider,
            [
                'document_type' => $document->document_type,
                'label' => $document->label,
                'original_name' => $document->original_name,
            ],
        );

        Storage::disk('local')->delete($document->storage_path);
        $document->delete();

        return Redirect::route('profile.edit', ['section' => 'verification']);
    }

    private function notifyAdmins(
        User $provider,
        ProviderVerificationDocument $document,
        string $type,
        string $title,
        string $body,
    ): void {
        User::query()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->each(function (User $admin) use ($document, $provider, $type, $title, $body): void {
                InAppNotification::notifyUser(
                    $admin,
                    $type,
                    $title,
                    $body,
                    route('admin.providers.index', ['status' => 'pending']),
                    'Review document',
                    [
                        'provider_id' => $provider->id,
                        'provider_verification_document_id' => $document->id,
                    ],
                );
            });
    }
}
