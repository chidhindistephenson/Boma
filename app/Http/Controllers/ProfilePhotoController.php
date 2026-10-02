<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\MalwareScanner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProfilePhotoController extends Controller
{
    public function show(User $user): BinaryFileResponse
    {
        abort_unless(
            $user->profile_photo_path
            && Storage::disk('local')->exists($user->profile_photo_path),
            404,
        );

        return response()->file(
            Storage::disk('local')->path($user->profile_photo_path),
            [
                'Cache-Control' => 'public, max-age=86400',
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }

    public function store(Request $request, MalwareScanner $scanner): RedirectResponse
    {
        $validated = $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $scanner->assertClean($validated['photo'], 'photo');

        $user = $request->user();
        $oldPath = $user->profile_photo_path;
        $path = $validated['photo']->store("profile-photos/{$user->id}", 'local');

        $user->forceFill(['profile_photo_path' => $path])->save();

        if ($oldPath && $oldPath !== $path) {
            Storage::disk('local')->delete($oldPath);
        }

        return back()->with('status', 'profile-photo-updated');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();
        $path = $user->profile_photo_path;

        $user->forceFill(['profile_photo_path' => null])->save();

        if ($path) {
            Storage::disk('local')->delete($path);
        }

        return back()->with('status', 'profile-photo-removed');
    }
}
