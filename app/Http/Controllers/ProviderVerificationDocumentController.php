<?php

namespace App\Http\Controllers;

use App\Models\ProviderVerificationDocument;
use App\Models\ProviderVerificationEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProviderVerificationDocumentController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $provider = $request->user()->loadMissing('providerProfile.verificationDocuments');

        abort_unless($provider->isProvider(), 403);
        abort_unless($provider->providerProfile, 404);
        abort_if($provider->providerProfile->verification_status === 'verified', 403);

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
        $path = $file->store('verification-documents/'.$provider->id, 'local');

        $document = $provider->providerProfile->verificationDocuments()->create([
            'uploaded_by_user_id' => $provider->id,
            'document_type' => $validated['document_type'],
            'label' => $validated['label'] ?? null,
            'original_name' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'mime_type' => $file->getClientMimeType() ?: $file->getMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize(),
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

        return Redirect::route('profile.edit');
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

        abort_if($document->providerProfile->verification_status === 'verified', 403);

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

        return Redirect::route('profile.edit');
    }
}
