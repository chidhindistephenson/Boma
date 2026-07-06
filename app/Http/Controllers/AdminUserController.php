<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserController extends Controller
{
    public function index(Request $request): Response
    {
        $admin = $request->user();

        abort_unless($admin->isAdmin(), 403);

        $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', 'string', Rule::in(['all', 'customer', 'provider', 'admin'])],
            'account_status' => [
                'nullable',
                'string',
                Rule::in(['all', 'active', 'pending_verification', 'verification_rejected']),
            ],
            'suspension' => ['nullable', 'string', Rule::in(['all', 'clear', 'suspended'])],
        ]);

        $filters = [
            'q' => trim($request->string('q')->toString()),
            'role' => $request->string('role')->toString() ?: 'all',
            'accountStatus' => $request->string('account_status')->toString() ?: 'all',
            'suspension' => $request->string('suspension')->toString() ?: 'all',
        ];

        $users = User::query()
            ->with(['providerProfile', 'suspendedBy'])
            ->withCount([
                'customerJobRequests',
                'providerJobRequests',
                'shortlistedProviders',
                'shortlistedByCustomers',
            ])
            ->when($filters['role'] !== 'all', fn (Builder $query) => $query->where('role', $filters['role']))
            ->when(
                $filters['accountStatus'] !== 'all',
                fn (Builder $query) => $query->where('status', $filters['accountStatus'])
            )
            ->when($filters['suspension'] === 'suspended', fn (Builder $query) => $query->whereNotNull('suspended_at'))
            ->when($filters['suspension'] === 'clear', fn (Builder $query) => $query->whereNull('suspended_at'))
            ->when($filters['q'] !== '', function (Builder $query) use ($filters): void {
                $like = '%'.Str::lower($filters['q']).'%';

                $query->where(function (Builder $searchQuery) use ($like): void {
                    $searchQuery
                        ->whereRaw('LOWER(users.name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(users.email) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(users.phone) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(users.city) LIKE ?', [$like])
                        ->orWhereRaw("LOWER(COALESCE(users.area, '')) LIKE ?", [$like])
                        ->orWhereHas('providerProfile', function (Builder $providerQuery) use ($like): void {
                            $providerQuery
                                ->whereRaw("LOWER(COALESCE(business_name, '')) LIKE ?", [$like])
                                ->orWhereRaw("LOWER(COALESCE(trade_category, '')) LIKE ?", [$like]);
                        });
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(function (User $user) use ($admin): array {
                $providerProfile = $user->providerProfile;
                $canModerate = ! $user->isAdmin() && $user->id !== $admin->id;

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'status' => $user->status,
                    'emailVerified' => $user->email_verified_at !== null,
                    'locationLabel' => implode(', ', array_values(array_filter([
                        $user->area,
                        $user->city,
                    ]))),
                    'createdAt' => $user->created_at->toDateTimeString(),
                    'isSuspended' => $user->isSuspended(),
                    'suspendedAt' => $user->suspended_at?->toDateTimeString(),
                    'suspendedByName' => $user->suspendedBy?->name,
                    'suspensionReason' => $user->suspension_reason,
                    'providerBusinessName' => $providerProfile?->business_name,
                    'providerTradeCategory' => $providerProfile?->trade_category,
                    'providerVerificationStatus' => $providerProfile?->verification_status,
                    'customerRequestCount' => $user->customer_job_requests_count,
                    'providerRequestCount' => $user->provider_job_requests_count,
                    'shortlistedProvidersCount' => $user->shortlisted_providers_count,
                    'shortlistedByCustomersCount' => $user->shortlisted_by_customers_count,
                    'canSuspend' => $canModerate && ! $user->isSuspended(),
                    'canRestore' => $canModerate && $user->isSuspended(),
                ];
            });

        return Inertia::render('Admin/Users/Index', [
            'filters' => $filters,
            'users' => $users,
            'summary' => [
                'totalUsers' => User::query()->count(),
                'customers' => User::query()->where('role', 'customer')->count(),
                'providers' => User::query()->where('role', 'provider')->count(),
                'admins' => User::query()->where('role', 'admin')->count(),
                'suspendedUsers' => User::query()->whereNotNull('suspended_at')->count(),
            ],
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $admin = $request->user();

        abort_unless($admin->isAdmin(), 403);
        abort_if($user->isAdmin() || $user->id === $admin->id, 403);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['suspend', 'restore'])],
            'reason' => [
                Rule::requiredIf($request->string('action')->toString() === 'suspend'),
                'nullable',
                'string',
                'max:1200',
            ],
        ]);

        if ($validated['action'] === 'suspend') {
            $user->update([
                'suspended_at' => now(),
                'suspended_by_user_id' => $admin->id,
                'suspension_reason' => $validated['reason'],
            ]);
        } else {
            $user->update([
                'suspended_at' => null,
                'suspended_by_user_id' => null,
                'suspension_reason' => null,
            ]);
        }

        return Redirect::back();
    }
}
