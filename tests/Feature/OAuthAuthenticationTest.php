<?php

use App\Models\User;
use App\Models\UserSocialAccount;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config()->set('services.google.client_id', 'google-client');
    config()->set('services.google.client_secret', 'google-secret');
});

test('guest can start google oauth login', function () {
    $response = $this->get(route('oauth.redirect', 'google'))
        ->assertRedirect();

    expect($response->headers->get('Location'))->toContain('accounts.google.com')
        ->and(session('oauth.google.state'))->not->toBeNull();
});

test('google oauth callback creates and logs in customer account', function () {
    Http::fake([
        'https://oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'google-access-token',
        ]),
        'https://www.googleapis.com/oauth2/v3/userinfo' => Http::response([
            'sub' => 'google-user-123',
            'email' => 'oauth.customer@example.com',
            'name' => 'OAuth Customer',
        ]),
    ]);

    $this->withSession(['oauth.google.state' => 'state-token'])
        ->get(route('oauth.callback', [
            'provider' => 'google',
            'code' => 'auth-code',
            'state' => 'state-token',
        ]))
        ->assertRedirect(route('dashboard', absolute: false));

    $user = User::where('email', 'oauth.customer@example.com')->firstOrFail();

    $this->assertAuthenticatedAs($user);
    expect($user->role)->toBe('customer')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->customerProfile)->not->toBeNull();

    $this->assertDatabaseHas('user_social_accounts', [
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_user_id' => 'google-user-123',
    ]);
});

test('oauth callback links an existing user by email', function () {
    $user = User::factory()->create([
        'email' => 'linked@example.com',
        'status' => 'active',
    ]);

    Http::fake([
        'https://oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'google-access-token',
        ]),
        'https://www.googleapis.com/oauth2/v3/userinfo' => Http::response([
            'sub' => 'google-linked-123',
            'email' => 'linked@example.com',
            'name' => 'Linked Customer',
        ]),
    ]);

    $this->withSession(['oauth.google.state' => 'state-token'])
        ->get(route('oauth.callback', [
            'provider' => 'google',
            'code' => 'auth-code',
            'state' => 'state-token',
        ]))
        ->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticatedAs($user);
    expect(User::where('email', 'linked@example.com')->count())->toBe(1)
        ->and(UserSocialAccount::where('user_id', $user->id)->count())->toBe(1);
});

test('oauth callback rejects invalid state', function () {
    $this->withSession(['oauth.google.state' => 'real-state'])
        ->get(route('oauth.callback', [
            'provider' => 'google',
            'code' => 'auth-code',
            'state' => 'wrong-state',
        ]))
        ->assertForbidden();
});
