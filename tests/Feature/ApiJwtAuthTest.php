<?php

use App\Models\ApiRefreshToken;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('user can login refresh and access api with jwt', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'password' => Hash::make('SecurePass1!'),
    ]);

    $login = $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'SecurePass1!',
        'device_name' => 'Mobile app',
    ])->assertOk()
        ->assertJsonPath('user.id', $user->id)
        ->assertJsonStructure([
            'access_token',
            'refresh_token',
            'expires_in',
            'refresh_expires_at',
        ]);

    expect(ApiRefreshToken::where('user_id', $user->id)->count())->toBe(1);

    $accessToken = $login->json('access_token');
    $refreshToken = $login->json('refresh_token');

    $this->withToken($accessToken)
        ->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonPath('user.email', $user->email);

    $refresh = $this->postJson('/api/auth/refresh', [
        'refresh_token' => $refreshToken,
    ])->assertOk()
        ->assertJsonStructure(['access_token', 'refresh_token']);

    expect(ApiRefreshToken::whereNotNull('revoked_at')->count())->toBe(1)
        ->and(ApiRefreshToken::whereNull('revoked_at')->count())->toBe(1);

    $this->postJson('/api/auth/refresh', [
        'refresh_token' => $refreshToken,
    ])->assertJsonValidationErrors('refresh_token');

    $this->withToken($refresh->json('access_token'))
        ->getJson('/api/auth/me')
        ->assertOk();
});

test('versioned api auth routes expose the jwt workflow', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'password' => Hash::make('SecurePass1!'),
    ]);

    $login = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'SecurePass1!',
        'device_name' => 'Mobile app',
    ])->assertOk();

    $this->withToken($login->json('access_token'))
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('user.id', $user->id);

    $refresh = $this->postJson('/api/v1/auth/refresh', [
        'refresh_token' => $login->json('refresh_token'),
    ])->assertOk();

    $this->postJson('/api/v1/auth/logout', [
        'refresh_token' => $refresh->json('refresh_token'),
    ])->assertOk();
});

test('logout revokes api refresh token', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'password' => Hash::make('SecurePass1!'),
    ]);

    $refreshToken = $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'SecurePass1!',
    ])->assertOk()->json('refresh_token');

    $this->postJson('/api/auth/logout', [
        'refresh_token' => $refreshToken,
    ])->assertOk();

    expect(ApiRefreshToken::first()->revoked_at)->not->toBeNull();
});

test('suspended users cannot login to api', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'suspended_at' => now(),
        'password' => Hash::make('SecurePass1!'),
    ]);

    $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'SecurePass1!',
    ])->assertJsonValidationErrors('email');
});
