<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class VerifiedProvidersSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('BomaDemo123!');
        $trialEndsAt = now()->addDays(config('localserve.provider.trial_days'));

        $providers = [
            [
                'email' => 'plumbing@boma.test',
                'name' => 'Munashe Dube',
                'phone' => '+263771100001',
                'city' => 'Harare',
                'area' => 'Avondale',
                'business_name' => 'Mvura Plumbing Studio',
                'trade_category' => 'Plumbing',
                'bio' => 'Leak repairs, bathroom refits, and same-day plumbing callouts for homes and small offices.',
                'availability_status' => 'available',
                'subscription_tier' => 'standard',
            ],
            [
                'email' => 'carpentry@boma.test',
                'name' => 'Tawanda Ncube',
                'phone' => '+263771100002',
                'city' => 'Harare',
                'area' => 'Mount Pleasant',
                'business_name' => 'Denga Carpentry Atelier',
                'trade_category' => 'Carpentry',
                'bio' => 'Built-in cupboards, shelving, trim work, and custom wood fittings with clean finishing.',
                'availability_status' => 'busy',
                'subscription_tier' => 'standard',
            ],
            [
                'email' => 'cleaning@boma.test',
                'name' => 'Rudo Chikore',
                'phone' => '+263771100003',
                'city' => 'Harare',
                'area' => 'Highlands',
                'business_name' => 'CleanLines Domestic Care',
                'trade_category' => 'Cleaning',
                'bio' => 'Deep cleaning, move-in refreshes, and recurring home care for busy households.',
                'availability_status' => 'available',
                'subscription_tier' => 'standard',
            ],
            [
                'email' => 'landscaping@boma.test',
                'name' => 'Farai Moyo',
                'phone' => '+263771100004',
                'city' => 'Harare',
                'area' => 'Greendale',
                'business_name' => 'Green Ridge Landscaping',
                'trade_category' => 'Gardening & Landscaping',
                'bio' => 'Garden restoration, lawn maintenance, and low-maintenance yard planning for residential properties.',
                'availability_status' => 'available',
                'subscription_tier' => 'standard',
            ],
            [
                'email' => 'painting@boma.test',
                'name' => 'Tatenda Sibanda',
                'phone' => '+263771100005',
                'city' => 'Harare',
                'area' => 'Westgate',
                'business_name' => 'Walltone Finishes',
                'trade_category' => 'Painting',
                'bio' => 'Interior and exterior painting, patch repairs, and durable finishing for homes and shops.',
                'availability_status' => 'busy',
                'subscription_tier' => 'pro',
            ],
            [
                'email' => 'appliance@boma.test',
                'name' => 'Percy Mlambo',
                'phone' => '+263771100006',
                'city' => 'Harare',
                'area' => 'Marlborough',
                'business_name' => 'Rapid Appliance Rescue',
                'trade_category' => 'Appliance Repair',
                'bio' => 'Repairs for stoves, fridges, microwaves, and small appliances with practical turnaround times.',
                'availability_status' => 'available',
                'subscription_tier' => 'standard',
            ],
            [
                'email' => 'beauty@boma.test',
                'name' => 'Kundai Muchengeti',
                'phone' => '+263771100007',
                'city' => 'Harare',
                'area' => 'Eastlea',
                'business_name' => 'Radiant Hands Wellness',
                'trade_category' => 'Beauty & Wellness',
                'bio' => 'Mobile beauty and wellness appointments for braids, grooming, and event-ready sessions.',
                'availability_status' => 'offline',
                'subscription_tier' => 'standard',
            ],
            [
                'email' => 'catering@boma.test',
                'name' => 'Memory Jena',
                'phone' => '+263771100008',
                'city' => 'Harare',
                'area' => 'Belvedere',
                'business_name' => 'Sadza & Sage Catering',
                'trade_category' => 'Catering',
                'bio' => 'Small-event catering, boxed meals, and reliable service for family functions and office gatherings.',
                'availability_status' => 'available',
                'subscription_tier' => 'pro',
            ],
            [
                'email' => 'itsupport@boma.test',
                'name' => 'Nyasha Chari',
                'phone' => '+263771100009',
                'city' => 'Harare',
                'area' => 'CBD',
                'business_name' => 'Node Nine IT Support',
                'trade_category' => 'IT Support',
                'bio' => 'On-site troubleshooting, router setup, printer support, and small business device maintenance.',
                'availability_status' => 'available',
                'subscription_tier' => 'pro',
            ],
            [
                'email' => 'bulawayo-plumbing@boma.test',
                'name' => 'Sibongile Dube',
                'phone' => '+263771100010',
                'city' => 'Bulawayo',
                'area' => 'Hillside',
                'business_name' => 'Matopo Pipeworks',
                'trade_category' => 'Plumbing',
                'bio' => 'Trusted plumbing maintenance, burst-pipe response, and fixture installs across Bulawayo homes.',
                'availability_status' => 'available',
                'subscription_tier' => 'standard',
            ],
            [
                'email' => 'gweru-electrical@boma.test',
                'name' => 'Tafadzwa Gono',
                'phone' => '+263771100011',
                'city' => 'Gweru',
                'area' => 'CBD',
                'business_name' => 'Midlands Power Desk',
                'trade_category' => 'Electrical',
                'bio' => 'Home rewiring, fault finding, and emergency electrical fixes with clear scoping before work starts.',
                'availability_status' => 'busy',
                'subscription_tier' => 'pro',
            ],
            [
                'email' => 'mutare-cleaning@boma.test',
                'name' => 'Tinotenda Chingono',
                'phone' => '+263771100012',
                'city' => 'Mutare',
                'area' => 'Murambi',
                'business_name' => 'Eastern Breeze Cleaners',
                'trade_category' => 'Cleaning',
                'bio' => 'Residential cleaning and post-event recovery work with consistent teams and practical supplies.',
                'availability_status' => 'available',
                'subscription_tier' => 'standard',
            ],
            [
                'email' => 'masvingo-painting@boma.test',
                'name' => 'Justice Muchengeti',
                'phone' => '+263771100013',
                'city' => 'Masvingo',
                'area' => 'Rhodene',
                'business_name' => 'Great Wall Coatings',
                'trade_category' => 'Painting',
                'bio' => 'Protective coatings, repaint projects, and prep work for commercial and residential spaces.',
                'availability_status' => 'available',
                'subscription_tier' => 'standard',
            ],
            [
                'email' => 'chinhoyi-gardens@boma.test',
                'name' => 'Martin Chuma',
                'phone' => '+263771100014',
                'city' => 'Chinhoyi',
                'area' => 'CBD',
                'business_name' => 'Mashonaland Yard Co',
                'trade_category' => 'Gardening & Landscaping',
                'bio' => 'Front-yard upgrades, hedge trimming, and dependable upkeep plans for homes and lodges.',
                'availability_status' => 'offline',
                'subscription_tier' => 'standard',
            ],
        ];

        foreach ($providers as $providerData) {
            $storefront = $this->storefrontForTrade($providerData['trade_category']);

            $provider = User::updateOrCreate(
                ['email' => $providerData['email']],
                [
                    'name' => $providerData['name'],
                    'phone' => $providerData['phone'],
                    'role' => 'provider',
                    'status' => 'active',
                    'city' => $providerData['city'],
                    'area' => $providerData['area'],
                    'email_verified_at' => now(),
                    'password' => $password,
                ],
            );

            $provider->providerProfile()->updateOrCreate(
                ['user_id' => $provider->id],
                [
                    'business_name' => $providerData['business_name'],
                    'headline' => $storefront['headline'],
                    'trade_category' => $providerData['trade_category'],
                    'bio' => $providerData['bio'],
                    'years_experience' => $storefront['years_experience'],
                    'base_price_from' => $storefront['base_price_from'],
                    'response_time_label' => $storefront['response_time_label'],
                    'service_radius_km' => $storefront['service_radius_km'],
                    'verification_status' => 'verified',
                    'verified_at' => now(),
                    'availability_status' => $providerData['availability_status'],
                    'subscription_tier' => $providerData['subscription_tier'],
                    'trial_ends_at' => $trialEndsAt,
                ],
            );

            $this->syncServices($provider, $storefront['services']);
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function storefrontForTrade(string $tradeCategory): array
    {
        return match ($tradeCategory) {
            'Plumbing' => [
                'headline' => 'Leak fixes, fixture installs, and practical same-day plumbing support.',
                'years_experience' => 9,
                'base_price_from' => 40,
                'response_time_label' => 'Same day',
                'service_radius_km' => 22,
                'services' => [
                    [
                        'title' => 'Leak and burst-pipe repair',
                        'short_description' => 'Urgent isolation, repair, and cleanup for leaking lines and failed fittings.',
                        'price_from' => 40,
                        'turnaround_label' => 'Same day',
                        'is_featured' => true,
                        'sort_order' => 1,
                    ],
                    [
                        'title' => 'Bathroom fixture installation',
                        'short_description' => 'Installation of taps, basins, toilets, and mixers with tidy finishing.',
                        'price_from' => 65,
                        'turnaround_label' => 'Within 24 hours',
                        'is_featured' => false,
                        'sort_order' => 2,
                    ],
                ],
            ],
            'Electrical' => [
                'headline' => 'Fast diagnostics, tidy rewiring, and safe electrical upgrades for busy spaces.',
                'years_experience' => 8,
                'base_price_from' => 55,
                'response_time_label' => 'Within 24 hours',
                'service_radius_km' => 25,
                'services' => [
                    [
                        'title' => 'Fault finding and repairs',
                        'short_description' => 'Targeted diagnosis and repair for sockets, lights, and breaker issues.',
                        'price_from' => 55,
                        'turnaround_label' => 'Same day',
                        'is_featured' => true,
                        'sort_order' => 1,
                    ],
                    [
                        'title' => 'Circuit upgrades and rewiring',
                        'short_description' => 'Safer board layouts, rewiring, and load balancing for homes and offices.',
                        'price_from' => 120,
                        'turnaround_label' => 'Within 48 hours',
                        'is_featured' => false,
                        'sort_order' => 2,
                    ],
                ],
            ],
            'Carpentry' => [
                'headline' => 'Custom woodwork, clean finishing, and fitted storage that actually lasts.',
                'years_experience' => 10,
                'base_price_from' => 90,
                'response_time_label' => 'By appointment',
                'service_radius_km' => 18,
                'services' => [
                    [
                        'title' => 'Built-in cupboards and shelving',
                        'short_description' => 'Measure, build, and install fitted storage for bedrooms and home offices.',
                        'price_from' => 90,
                        'turnaround_label' => 'By appointment',
                        'is_featured' => true,
                        'sort_order' => 1,
                    ],
                    [
                        'title' => 'Door and trim finishing',
                        'short_description' => 'Joinery refinements, alignment fixes, and trim work with neat edges.',
                        'price_from' => 55,
                        'turnaround_label' => 'Within 48 hours',
                        'is_featured' => false,
                        'sort_order' => 2,
                    ],
                ],
            ],
            'Painting' => [
                'headline' => 'Sharp prep, durable coats, and fast refresh work for interiors and exteriors.',
                'years_experience' => 7,
                'base_price_from' => 70,
                'response_time_label' => 'Within 48 hours',
                'service_radius_km' => 30,
                'services' => [
                    [
                        'title' => 'Interior repaint packages',
                        'short_description' => 'Wall prep, crack filling, and fresh interior coats for rooms and shops.',
                        'price_from' => 70,
                        'turnaround_label' => 'Within 48 hours',
                        'is_featured' => true,
                        'sort_order' => 1,
                    ],
                    [
                        'title' => 'Exterior weatherproof painting',
                        'short_description' => 'Exterior surface prep and protective finishes built for local weather.',
                        'price_from' => 110,
                        'turnaround_label' => 'By appointment',
                        'is_featured' => false,
                        'sort_order' => 2,
                    ],
                ],
            ],
            'Cleaning' => [
                'headline' => 'Deep cleans, reset sessions, and reliable recurring home-care schedules.',
                'years_experience' => 6,
                'base_price_from' => 35,
                'response_time_label' => 'Within 24 hours',
                'service_radius_km' => 20,
                'services' => [
                    [
                        'title' => 'Deep home cleaning',
                        'short_description' => 'Kitchen, bathroom, and living-area deep cleans with practical finishing touches.',
                        'price_from' => 35,
                        'turnaround_label' => 'Within 24 hours',
                        'is_featured' => true,
                        'sort_order' => 1,
                    ],
                    [
                        'title' => 'Move-in or move-out reset',
                        'short_description' => 'Thorough turnover cleans for new tenants, landlords, and homeowners.',
                        'price_from' => 60,
                        'turnaround_label' => 'Same day',
                        'is_featured' => false,
                        'sort_order' => 2,
                    ],
                ],
            ],
            'Gardening & Landscaping' => [
                'headline' => 'Lawn rescue, tidy hedges, and low-maintenance outdoor plans.',
                'years_experience' => 8,
                'base_price_from' => 45,
                'response_time_label' => 'Within 48 hours',
                'service_radius_km' => 25,
                'services' => [
                    [
                        'title' => 'Garden cleanup and trimming',
                        'short_description' => 'Overgrown yard recovery, hedge trimming, and cleanup haul-away.',
                        'price_from' => 45,
                        'turnaround_label' => 'Within 48 hours',
                        'is_featured' => true,
                        'sort_order' => 1,
                    ],
                    [
                        'title' => 'Routine lawn maintenance',
                        'short_description' => 'Scheduled grass cutting, edging, and practical upkeep for tidy outdoor spaces.',
                        'price_from' => 30,
                        'turnaround_label' => 'By appointment',
                        'is_featured' => false,
                        'sort_order' => 2,
                    ],
                ],
            ],
            'Appliance Repair' => [
                'headline' => 'Repair-first appliance support with clear turnaround expectations.',
                'years_experience' => 7,
                'base_price_from' => 50,
                'response_time_label' => 'Within 24 hours',
                'service_radius_km' => 18,
                'services' => [
                    [
                        'title' => 'Fridge and freezer diagnostics',
                        'short_description' => 'Cooling failure diagnosis, part replacement guidance, and practical repair work.',
                        'price_from' => 50,
                        'turnaround_label' => 'Within 24 hours',
                        'is_featured' => true,
                        'sort_order' => 1,
                    ],
                    [
                        'title' => 'Stove and microwave repairs',
                        'short_description' => 'Heating and control troubleshooting for common kitchen appliance faults.',
                        'price_from' => 45,
                        'turnaround_label' => 'Within 48 hours',
                        'is_featured' => false,
                        'sort_order' => 2,
                    ],
                ],
            ],
            'Beauty & Wellness' => [
                'headline' => 'Mobile beauty sessions planned around convenience, events, and presentation.',
                'years_experience' => 5,
                'base_price_from' => 25,
                'response_time_label' => 'By appointment',
                'service_radius_km' => 15,
                'services' => [
                    [
                        'title' => 'Event-ready grooming sessions',
                        'short_description' => 'On-location grooming and styling support for personal events and quick refreshes.',
                        'price_from' => 25,
                        'turnaround_label' => 'By appointment',
                        'is_featured' => true,
                        'sort_order' => 1,
                    ],
                    [
                        'title' => 'Protective styling appointments',
                        'short_description' => 'Planned mobile appointments for braids, care prep, and finishing.',
                        'price_from' => 40,
                        'turnaround_label' => 'By appointment',
                        'is_featured' => false,
                        'sort_order' => 2,
                    ],
                ],
            ],
            'Catering' => [
                'headline' => 'Dependable small-event catering with clear menus and practical logistics.',
                'years_experience' => 9,
                'base_price_from' => 80,
                'response_time_label' => 'Within 24 hours',
                'service_radius_km' => 35,
                'services' => [
                    [
                        'title' => 'Family event meal packages',
                        'short_description' => 'Tray-based catering for gatherings with planning support and dependable handoff.',
                        'price_from' => 80,
                        'turnaround_label' => 'By appointment',
                        'is_featured' => true,
                        'sort_order' => 1,
                    ],
                    [
                        'title' => 'Office boxed meals',
                        'short_description' => 'Coordinated lunch packs and light catering for meetings and team sessions.',
                        'price_from' => 60,
                        'turnaround_label' => 'Within 24 hours',
                        'is_featured' => false,
                        'sort_order' => 2,
                    ],
                ],
            ],
            'IT Support' => [
                'headline' => 'Practical device, network, and office support without enterprise overhead.',
                'years_experience' => 8,
                'base_price_from' => 45,
                'response_time_label' => 'Within 1 hour',
                'service_radius_km' => 20,
                'services' => [
                    [
                        'title' => 'Router and Wi-Fi setup',
                        'short_description' => 'Network setup, troubleshooting, and stability fixes for homes and small offices.',
                        'price_from' => 45,
                        'turnaround_label' => 'Within 1 hour',
                        'is_featured' => true,
                        'sort_order' => 1,
                    ],
                    [
                        'title' => 'Printer and workstation support',
                        'short_description' => 'On-site fixes for printers, laptops, desktops, and day-to-day office issues.',
                        'price_from' => 35,
                        'turnaround_label' => 'Same day',
                        'is_featured' => false,
                        'sort_order' => 2,
                    ],
                ],
            ],
            default => [
                'headline' => 'Trusted local trade work with clear delivery expectations and honest availability.',
                'years_experience' => 6,
                'base_price_from' => 40,
                'response_time_label' => 'Within 24 hours',
                'service_radius_km' => 20,
                'services' => [],
            ],
        };
    }

    /**
     * @param array<int, array<string, mixed>> $services
     */
    protected function syncServices(User $provider, array $services): void
    {
        foreach ($services as $service) {
            $provider->providerProfile->services()->updateOrCreate(
                ['title' => $service['title']],
                [
                    'short_description' => $service['short_description'],
                    'price_from' => $service['price_from'],
                    'turnaround_label' => $service['turnaround_label'],
                    'is_featured' => $service['is_featured'],
                    'sort_order' => $service['sort_order'],
                ],
            );
        }
    }
}
