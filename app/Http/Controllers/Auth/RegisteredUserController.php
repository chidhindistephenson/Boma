<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SystemSettingsService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Auth/Register', [
            'defaultRole' => $request->string('role')->toString() === 'provider'
                ? 'provider'
                : 'customer',
            'tradeCategories' => config('localserve.trade_categories'),
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request, SystemSettingsService $settings): RedirectResponse
    {
        $request->validate([
            'role' => ['required', 'in:customer,provider'],
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'phone' => 'required|string|max:30',
            'city' => 'required|string|max:120',
            'area' => 'nullable|string|max:120',
            'business_name' => [
                Rule::requiredIf($request->string('role')->toString() === 'provider'),
                'nullable',
                'string',
                'max:255',
            ],
            'trade_category' => [
                Rule::requiredIf($request->string('role')->toString() === 'provider'),
                'nullable',
                Rule::in(config('localserve.trade_categories')),
            ],
            'bio' => [
                Rule::requiredIf($request->string('role')->toString() === 'provider'),
                'nullable',
                'string',
                'max:1000',
            ],
            'password' => [
                'required',
                'confirmed',
                Rules\Password::min(8)->mixedCase()->numbers()->symbols(),
            ],
        ]);

        $user = DB::transaction(function () use ($request, $settings): User {
            $user = User::create([
                'name' => $request->string('name')->toString(),
                'email' => $request->string('email')->toString(),
                'phone' => $request->string('phone')->toString(),
                'role' => $request->string('role')->toString(),
                'status' => $request->string('role')->toString() === 'provider'
                    ? 'pending_verification'
                    : 'active',
                'city' => $request->string('city')->toString(),
                'area' => $request->string('area')->toString() ?: null,
                'password' => Hash::make($request->string('password')->toString()),
            ]);

            if ($user->isProvider()) {
                $profile = $user->providerProfile()->create([
                    'business_name' => $request->string('business_name')->toString(),
                    'trade_category' => $request->string('trade_category')->toString(),
                    'bio' => $request->string('bio')->toString(),
                    'verification_submitted_at' => now(),
                    'trial_ends_at' => now()->addDays(config('localserve.provider.trial_days')),
                ]);

                $profile->tradeCategories()->create([
                    'trade_category' => $profile->trade_category,
                    'verification_status' => $profile->verification_status ?? 'pending',
                    'submitted_at' => $profile->verification_submitted_at,
                ]);
            } else {
                $user->customerProfile()->create([
                    'preferred_radius_km' => $settings->defaultSearchRadiusKm(),
                ]);
            }

            return $user;
        });

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
