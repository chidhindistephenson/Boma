<?php

namespace Database\Seeders;

use App\Models\JobRequest;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ProviderReviewsSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('BomaDemo123!');

        $reviewers = [
            [
                'email' => 'reviewer.one@boma.test',
                'name' => 'Chipo Rwizi',
                'phone' => '+263771300001',
                'city' => 'Harare',
                'area' => 'Belgravia',
            ],
            [
                'email' => 'reviewer.two@boma.test',
                'name' => 'Keith Mufara',
                'phone' => '+263771300002',
                'city' => 'Harare',
                'area' => 'Greendale',
            ],
            [
                'email' => 'reviewer.three@boma.test',
                'name' => 'Tariro Bako',
                'phone' => '+263771300003',
                'city' => 'Bulawayo',
                'area' => 'Suburbs',
            ],
        ];

        foreach ($reviewers as $reviewerData) {
            $reviewer = User::updateOrCreate(
                ['email' => $reviewerData['email']],
                [
                    'name' => $reviewerData['name'],
                    'phone' => $reviewerData['phone'],
                    'role' => 'customer',
                    'status' => 'active',
                    'city' => $reviewerData['city'],
                    'area' => $reviewerData['area'],
                    'email_verified_at' => now(),
                    'password' => $password,
                ],
            );

            $reviewer->customerProfile()->updateOrCreate(
                ['user_id' => $reviewer->id],
                [
                    'preferred_radius_km' => config('localserve.search.default_radius_km'),
                    'default_urgency' => array_key_first(config('localserve.request.urgency_options')),
                ],
            );
        }

        $reviews = [
            [
                'customer_email' => 'customer@boma.test',
                'provider_email' => 'provider@boma.test',
                'trade_category' => 'Electrical',
                'title' => 'Kitchen circuit restoration',
                'description' => 'Closed request used to seed a review for the demo electrical provider.',
                'urgency' => 'urgent',
                'city' => 'Harare',
                'area' => 'Avondale',
                'rating' => 5,
                'headline' => 'Fast, clean electrical fix',
                'body' => 'Communication stayed clear, the diagnostic work was quick, and the final fix looked tidy.',
            ],
            [
                'customer_email' => 'reviewer.one@boma.test',
                'provider_email' => 'plumbing@boma.test',
                'trade_category' => 'Plumbing',
                'title' => 'Burst pipe callout in Avondale',
                'description' => 'Seeded closed plumbing request for public trust data.',
                'urgency' => 'urgent',
                'city' => 'Harare',
                'area' => 'Avondale',
                'rating' => 5,
                'headline' => 'Solved the leak the same day',
                'body' => 'The provider arrived prepared, isolated the pipe quickly, and explained the repair without wasting time.',
            ],
            [
                'customer_email' => 'reviewer.two@boma.test',
                'provider_email' => 'plumbing@boma.test',
                'trade_category' => 'Plumbing',
                'title' => 'Bathroom tap replacement',
                'description' => 'Seeded closed plumbing request for review distribution.',
                'urgency' => 'this_week',
                'city' => 'Harare',
                'area' => 'Mount Pleasant',
                'rating' => 4,
                'headline' => 'Reliable and straightforward',
                'body' => 'Turned up on time, handled the fitting cleanly, and left the work area in good shape.',
            ],
            [
                'customer_email' => 'reviewer.one@boma.test',
                'provider_email' => 'painting@boma.test',
                'trade_category' => 'Painting',
                'title' => 'Living room repaint',
                'description' => 'Seeded closed painting request for provider rating visibility.',
                'urgency' => 'flexible',
                'city' => 'Harare',
                'area' => 'Westgate',
                'rating' => 5,
                'headline' => 'Sharp prep and even finishing',
                'body' => 'The prep work was better than expected and the paint edges came out clean throughout the room.',
            ],
            [
                'customer_email' => 'reviewer.three@boma.test',
                'provider_email' => 'bulawayo-plumbing@boma.test',
                'trade_category' => 'Plumbing',
                'title' => 'Geyser pressure issue',
                'description' => 'Seeded Bulawayo plumbing request for review coverage outside Harare.',
                'urgency' => 'this_week',
                'city' => 'Bulawayo',
                'area' => 'Hillside',
                'rating' => 4,
                'headline' => 'Practical and well explained',
                'body' => 'The issue was traced properly and the provider gave a realistic explanation of what needed replacing.',
            ],
            [
                'customer_email' => 'reviewer.two@boma.test',
                'provider_email' => 'itsupport@boma.test',
                'trade_category' => 'IT Support',
                'title' => 'Office Wi-Fi stability fix',
                'description' => 'Seeded IT support request for digital trade review coverage.',
                'urgency' => 'urgent',
                'city' => 'Harare',
                'area' => 'CBD',
                'rating' => 5,
                'headline' => 'Network finally stable',
                'body' => 'Troubleshooting was methodical, the router setup was cleaned up, and the office has been stable since.',
            ],
            [
                'customer_email' => 'reviewer.one@boma.test',
                'provider_email' => 'cleaning@boma.test',
                'trade_category' => 'Cleaning',
                'title' => 'Move-out deep clean',
                'description' => 'Seeded cleaning request for review variety.',
                'urgency' => 'this_week',
                'city' => 'Harare',
                'area' => 'Highlands',
                'rating' => 4,
                'headline' => 'Detailed clean with good pace',
                'body' => 'The team covered the kitchen and bathrooms thoroughly and finished within the window they promised.',
            ],
            [
                'customer_email' => 'reviewer.three@boma.test',
                'provider_email' => 'masvingo-painting@boma.test',
                'trade_category' => 'Painting',
                'title' => 'Exterior wall coating refresh',
                'description' => 'Seeded Masvingo painting request for review spread.',
                'urgency' => 'flexible',
                'city' => 'Masvingo',
                'area' => 'Rhodene',
                'rating' => 5,
                'headline' => 'Good finish and good planning',
                'body' => 'The provider scoped the weather risk well and the final coating held up exactly as discussed.',
            ],
        ];

        foreach ($reviews as $reviewData) {
            $customer = User::query()->where('email', $reviewData['customer_email'])->first();
            $provider = User::query()->where('email', $reviewData['provider_email'])->first();

            if (! $customer || ! $provider) {
                continue;
            }

            $jobRequest = JobRequest::updateOrCreate(
                [
                    'customer_id' => $customer->id,
                    'provider_id' => $provider->id,
                    'title' => $reviewData['title'],
                ],
                [
                    'trade_category' => $reviewData['trade_category'],
                    'description' => $reviewData['description'],
                    'urgency' => $reviewData['urgency'],
                    'city' => $reviewData['city'],
                    'area' => $reviewData['area'],
                    'status' => 'closed',
                    'customer_last_read_at' => now(),
                    'provider_last_read_at' => now(),
                ],
            );

            $jobRequest->review()->updateOrCreate(
                ['job_request_id' => $jobRequest->id],
                [
                    'customer_id' => $customer->id,
                    'provider_id' => $provider->id,
                    'rating' => $reviewData['rating'],
                    'headline' => $reviewData['headline'],
                    'body' => $reviewData['body'],
                ],
            );
        }
    }
}
