<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    public function configure(): static
    {
        return $this->afterCreating(function (User $user): void {
            if ($user->isProvider()) {
                $profile = $user->providerProfile()->create([
                    'business_name' => fake()->company(),
                    'trade_category' => fake()->randomElement(config('localserve.trade_categories')),
                    'bio' => fake()->paragraph(),
                    'verification_submitted_at' => $user->status === 'pending_verification'
                        ? now()
                        : null,
                    'subscription_tier' => 'standard',
                    'trial_ends_at' => now()->addDays(config('localserve.provider.trial_days')),
                ]);

                $profile->tradeCategories()->create([
                    'trade_category' => $profile->trade_category,
                    'verification_status' => $profile->verification_status ?: 'pending',
                    'submitted_at' => $profile->verification_submitted_at,
                    'verified_at' => $profile->verified_at,
                ]);

                return;
            }

            if ($user->isAdmin()) {
                $user->forceFill([
                    'two_factor_secret' => Crypt::encryptString('JBSWY3DPEHPK3PXP'),
                    'two_factor_recovery_codes' => ['TEST1-ADMIN'],
                    'two_factor_confirmed_at' => now(),
                ])->save();
            }

            if ($user->isCustomer()) {
                $user->customerProfile()->create([
                    'preferred_radius_km' => config('localserve.search.default_radius_km'),
                    'default_urgency' => array_key_first(config('localserve.request.urgency_options')),
                ]);
            }
        });
    }

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->e164PhoneNumber(),
            'role' => 'customer',
            'status' => 'active',
            'city' => fake()->city(),
            'area' => fake()->state(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function provider(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'provider',
            'status' => 'pending_verification',
        ]);
    }
}
