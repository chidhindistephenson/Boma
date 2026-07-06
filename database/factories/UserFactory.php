<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
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
                $user->providerProfile()->create([
                    'business_name' => fake()->company(),
                    'trade_category' => fake()->randomElement(config('localserve.trade_categories')),
                    'bio' => fake()->paragraph(),
                    'verification_submitted_at' => $user->status === 'pending_verification'
                        ? now()
                        : null,
                    'trial_ends_at' => now()->addDays(config('localserve.provider.trial_days')),
                ]);

                return;
            }

            $user->customerProfile()->create([
                'preferred_radius_km' => config('localserve.search.default_radius_km'),
                'default_urgency' => array_key_first(config('localserve.request.urgency_options')),
            ]);
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
