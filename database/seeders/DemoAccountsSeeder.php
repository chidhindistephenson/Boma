<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('BomaDemo123!');

        $customer = User::updateOrCreate(
            ['email' => 'customer@boma.test'],
            [
                'name' => 'Boma Customer',
                'phone' => '+263771000001',
                'role' => 'customer',
                'status' => 'active',
                'city' => 'Harare',
                'area' => 'Avondale',
                'email_verified_at' => now(),
                'password' => $password,
            ],
        );

        $customer->customerProfile()->updateOrCreate(
            ['user_id' => $customer->id],
            [
                'preferred_radius_km' => config('localserve.search.default_radius_km'),
                'default_trade_category' => 'Electrical',
                'default_urgency' => 'this_week',
                'default_budget_min' => 50,
                'default_budget_max' => 180,
                'location_notes' => 'Main gate usually stays locked after 6pm. Call or message on arrival.',
            ],
        );

        $provider = User::updateOrCreate(
            ['email' => 'provider@boma.test'],
            [
                'name' => 'Boma Provider',
                'phone' => '+263771000002',
                'role' => 'provider',
                'status' => 'active',
                'city' => 'Harare',
                'area' => 'Borrowdale',
                'email_verified_at' => now(),
                'password' => $password,
            ],
        );

        $provider->providerProfile()->updateOrCreate(
            ['user_id' => $provider->id],
            [
                'business_name' => 'Boma Electrical Works',
                'headline' => 'Fast diagnostics, clean installs, and dependable electrical callouts.',
                'trade_category' => 'Electrical',
                'bio' => 'Verified electrical services for homes, offices, and urgent repairs.',
                'years_experience' => 8,
                'base_price_from' => 65,
                'response_time_label' => 'Same day',
                'service_radius_km' => 25,
                'verification_status' => 'verified',
                'verified_at' => now(),
                'availability_status' => 'available',
                'subscription_tier' => 'standard',
                'trial_ends_at' => now()->addDays(config('localserve.provider.trial_days')),
            ],
        );

        $provider->providerProfile->services()->updateOrCreate(
            ['title' => 'Fault finding and repairs'],
            [
                'short_description' => 'Diagnosis and repair for tripping circuits, dead sockets, and unstable lighting.',
                'price_from' => 45,
                'turnaround_label' => 'Same day',
                'is_featured' => true,
                'sort_order' => 1,
            ],
        );

        $provider->providerProfile->services()->updateOrCreate(
            ['title' => 'DB board rewiring'],
            [
                'short_description' => 'Replacement and reorganization of overloaded boards with clear safety scoping.',
                'price_from' => 120,
                'turnaround_label' => 'Within 24 hours',
                'is_featured' => false,
                'sort_order' => 2,
            ],
        );

        User::updateOrCreate(
            ['email' => 'admin@boma.test'],
            [
                'name' => 'Boma Admin',
                'phone' => '+263771000003',
                'role' => 'admin',
                'status' => 'active',
                'city' => 'Harare',
                'area' => 'CBD',
                'email_verified_at' => now(),
                'password' => $password,
            ],
        );
    }
}
