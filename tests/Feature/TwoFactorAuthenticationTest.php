<?php

use App\Models\User;
use App\Services\TwoFactorService;

test('admin without two factor is forced to setup page', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $admin->forceFill([
        'two_factor_secret' => null,
        'two_factor_recovery_codes' => null,
        'two_factor_confirmed_at' => null,
    ])->save();

    $this->actingAs($admin)
        ->get(route('admin.finance.index'))
        ->assertRedirect(route('two-factor.setup'));
});

test('user can enable two factor authentication with a valid totp code', function () {
    $user = User::factory()->create(['status' => 'active']);
    $service = app(TwoFactorService::class);
    $secret = $service->generateSecret();

    $this->actingAs($user)
        ->withSession(['two_factor_setup_secret' => $secret])
        ->post(route('two-factor.enable'), [
            'code' => $service->currentCode($secret),
        ])
        ->assertRedirect(route('profile.edit', ['section' => 'security']));

    $user->refresh();

    expect($user->hasTwoFactorEnabled())->toBeTrue()
        ->and($user->two_factor_recovery_codes)->toHaveCount(8);
});

test('two factor challenge accepts totp and recovery codes', function () {
    $user = User::factory()->create(['status' => 'active']);
    $service = app(TwoFactorService::class);
    $secret = $service->generateSecret();
    $codes = $service->enable($user, $secret);

    $this->actingAs($user)
        ->post(route('two-factor.verify'), [
            'code' => $service->currentCode($secret),
        ])
        ->assertRedirect(route('dashboard', absolute: false));

    $this->actingAs($user)
        ->post(route('two-factor.verify'), [
            'recovery_code' => $codes[0],
        ])
        ->assertRedirect(route('dashboard', absolute: false));

    expect($user->fresh()->two_factor_recovery_codes)->toHaveCount(7);
});

test('non admin user can disable two factor authentication', function () {
    $user = User::factory()->create(['status' => 'active']);
    app(TwoFactorService::class)->enable($user, app(TwoFactorService::class)->generateSecret());

    $this->actingAs($user)
        ->delete(route('two-factor.disable'))
        ->assertRedirect(route('profile.edit', ['section' => 'security']));

    expect($user->fresh()->hasTwoFactorEnabled())->toBeFalse();
});
