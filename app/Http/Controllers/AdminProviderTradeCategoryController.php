<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\ProviderTradeCategory;
use App\Models\ProviderVerificationEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminProviderTradeCategoryController extends Controller
{
    public function update(Request $request, ProviderTradeCategory $tradeCategory): RedirectResponse
    {
        $admin = $request->user();

        abort_unless($admin->isAdmin(), 403);

        $tradeCategory->loadMissing('providerProfile.user');
        abort_unless($tradeCategory->providerProfile?->user, 404);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['approve', 'reject'])],
            'review_notes' => [
                Rule::requiredIf($request->string('action')->toString() === 'reject'),
                'nullable',
                'string',
                'max:1500',
            ],
        ]);

        $provider = $tradeCategory->providerProfile->user;

        if (
            $validated['action'] === 'approve'
            && $tradeCategory->providerProfile->verificationDocuments()->doesntExist()
        ) {
            throw ValidationException::withMessages([
                'review_notes' => 'This trade needs at least one uploaded verification document before approval.',
            ]);
        }

        DB::transaction(function () use ($admin, $provider, $tradeCategory, $validated): void {
            $isApproval = $validated['action'] === 'approve';

            $tradeCategory->forceFill([
                'verification_status' => $isApproval ? 'verified' : 'rejected',
                'verified_at' => $isApproval ? now() : null,
                'reviewed_at' => now(),
                'reviewed_by_user_id' => $admin->id,
                'review_notes' => $validated['review_notes'] ?? null,
            ])->save();

            ProviderVerificationEvent::record(
                $tradeCategory->providerProfile,
                $isApproval ? 'trade_approved' : 'trade_rejected',
                $admin,
                [
                    'trade_category' => $tradeCategory->trade_category,
                    'review_notes' => $validated['review_notes'] ?? null,
                ],
            );

            InAppNotification::notifyUser(
                $provider,
                $isApproval ? 'provider_trade_category_approved' : 'provider_trade_category_rejected',
                $isApproval ? 'Trade verification approved' : 'Trade verification rejected',
                $isApproval
                    ? "{$tradeCategory->trade_category} is now verified on your provider profile."
                    : (($validated['review_notes'] ?? null)
                        ? "The admin left this review note: {$validated['review_notes']}"
                        : "{$tradeCategory->trade_category} needs stronger evidence before approval."),
                route('profile.edit', ['section' => 'verification']),
                'Open documents',
                [
                    'provider_trade_category_id' => $tradeCategory->id,
                    'reviewed_by_user_id' => $admin->id,
                ],
            );
        });

        return Redirect::back();
    }
}
