<?php

namespace App\Http\Controllers;

use App\Actions\SendJobRequestMessage;
use App\Http\Requests\StoreJobRequestMessageRequest;
use App\Models\JobRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;

class ProviderChatController extends Controller
{
    public function store(
        StoreJobRequestMessageRequest $request,
        User $provider,
        SendJobRequestMessage $sendMessage,
    ): RedirectResponse {
        $customer = $request->user();

        abort_unless($customer->isCustomer(), 403);

        $provider->loadMissing('providerProfile');
        abort_unless($provider->isDirectoryVisible(false), 404);

        $validated = $request->validated();

        $customer->loadMissing('customerProfile');

        $jobRequest = DB::transaction(function () use (
            $customer,
            $provider,
            $validated,
            $request,
            $sendMessage,
        ): JobRequest {
            $jobRequest = JobRequest::query()
                ->where('customer_id', $customer->id)
                ->where('provider_id', $provider->id)
                ->whereIn('status', ['targeted', 'in_conversation', 'accepted'])
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $jobRequest) {
                $urgency = $customer->customerProfile?->default_urgency;

                if (! isset(config('localserve.request.urgency_options')[$urgency])) {
                    $urgency = 'flexible';
                }

                $jobRequest = JobRequest::create([
                    'customer_id' => $customer->id,
                    'provider_id' => $provider->id,
                    'trade_category' => $provider->providerProfile->trade_category,
                    'title' => $provider->providerProfile->trade_category.' enquiry',
                    'description' => 'Direct enquiry started from the provider profile.',
                    'urgency' => $urgency,
                    'preferred_date' => now()->addDay()->toDateString(),
                    'budget_min' => $customer->customerProfile?->default_budget_min,
                    'budget_max' => $customer->customerProfile?->default_budget_max,
                    'city' => $customer->city,
                    'area' => $customer->area,
                    'location_notes' => $customer->customerProfile?->location_notes,
                    'latitude' => $customer->latitude,
                    'longitude' => $customer->longitude,
                    'status' => 'targeted',
                    'customer_last_read_at' => now(),
                ]);
            }

            $sendMessage->execute(
                $jobRequest,
                $customer,
                $validated['body'] ?? null,
                $request->file('media'),
            );

            return $jobRequest;
        });

        return Redirect::route('providers.show', [
            'provider' => $provider,
            'chat' => 1,
        ]);
    }
}
