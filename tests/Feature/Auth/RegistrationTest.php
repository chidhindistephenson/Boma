<?php

use App\Models\User;

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new customers can register', function () {
    $response = $this->post('/register', [
        'role' => 'customer',
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone' => '+263771111111',
        'city' => 'Harare',
        'area' => 'Avondale',
        'password' => 'SecurePass1!',
        'password_confirmation' => 'SecurePass1!',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    $user = User::first();

    expect($user->role)->toBe('customer');
    expect($user->customerProfile)->not->toBeNull();
});

test('new providers can register', function () {
    $response = $this->post('/register', [
        'role' => 'provider',
        'name' => 'Test Provider',
        'email' => 'provider@example.com',
        'phone' => '+263772222222',
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'business_name' => 'Spark Electrical',
        'trade_category' => 'Electrical',
        'bio' => 'Reliable electrical repairs for homes and small businesses.',
        'password' => 'SecurePass1!',
        'password_confirmation' => 'SecurePass1!',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    $user = User::where('email', 'provider@example.com')->firstOrFail();

    expect($user->role)->toBe('provider');
    expect($user->providerProfile)->not->toBeNull();
    expect($user->providerProfile->trade_category)->toBe('Electrical');
});
