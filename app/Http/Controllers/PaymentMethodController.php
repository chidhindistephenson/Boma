<?php

namespace App\Http\Controllers;

use App\Models\UserPaymentMethod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class PaymentMethodController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'brand' => ['required', 'string', Rule::in(['visa', 'mastercard', 'amex', 'other'])],
            'label' => ['nullable', 'string', 'max:80'],
            'last_four' => ['required', 'digits:4'],
            'exp_month' => ['required', 'integer', 'between:1,12'],
            'exp_year' => ['required', 'integer', 'min:'.now()->year, 'max:'.(now()->year + 20)],
            'gateway_token' => ['required', 'string', 'max:160', 'unique:user_payment_methods,gateway_token'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        DB::transaction(function () use ($request, $validated): void {
            if ($validated['is_default'] ?? false) {
                $request->user()->paymentMethods()->update(['is_default' => false]);
            }

            $request->user()->paymentMethods()->create([
                'type' => 'card',
                'brand' => $validated['brand'],
                'label' => ($validated['label'] ?? null) ?: null,
                'last_four' => $validated['last_four'],
                'exp_month' => $validated['exp_month'],
                'exp_year' => $validated['exp_year'],
                'gateway_token' => $validated['gateway_token'],
                'is_default' => $validated['is_default'] ?? ! $request->user()->paymentMethods()->exists(),
            ]);
        });

        return Redirect::route('profile.edit', ['section' => 'billing'])
            ->with('status', 'payment-method-added');
    }

    public function makeDefault(Request $request, UserPaymentMethod $paymentMethod): RedirectResponse
    {
        abort_unless($paymentMethod->user_id === $request->user()->id, 403);

        DB::transaction(function () use ($request, $paymentMethod): void {
            $request->user()->paymentMethods()->update(['is_default' => false]);
            $paymentMethod->update(['is_default' => true]);
        });

        return Redirect::route('profile.edit', ['section' => 'billing'])
            ->with('status', 'payment-method-defaulted');
    }

    public function destroy(Request $request, UserPaymentMethod $paymentMethod): RedirectResponse
    {
        abort_unless($paymentMethod->user_id === $request->user()->id, 403);

        $paymentMethod->delete();

        return Redirect::route('profile.edit', ['section' => 'billing'])
            ->with('status', 'payment-method-deleted');
    }
}
