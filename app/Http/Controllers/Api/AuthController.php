<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ApiJwtService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request, ApiJwtService $tokens): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $user = User::query()
            ->where('email', $validated['email'])
            ->first();

        if (
            ! $user
            || ! Hash::check($validated['password'], $user->password)
            || $user->status !== 'active'
            || $user->isSuspended()
        ) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match an active Boma account.',
            ]);
        }

        return response()->json([
            'user' => $this->userPayload($user),
            ...$tokens->issueTokenPair(
                $user,
                $validated['device_name'] ?? null,
                $request->ip(),
                $request->userAgent(),
            ),
        ]);
    }

    public function refresh(Request $request, ApiJwtService $tokens): JsonResponse
    {
        $validated = $request->validate([
            'refresh_token' => ['required', 'string'],
        ]);

        return response()->json($tokens->rotateRefreshToken(
            $validated['refresh_token'],
            $request->ip(),
            $request->userAgent(),
        ));
    }

    public function logout(Request $request, ApiJwtService $tokens): JsonResponse
    {
        $validated = $request->validate([
            'refresh_token' => ['required', 'string'],
        ]);

        $tokens->revokeRefreshToken($validated['refresh_token']);

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
        ];
    }
}
