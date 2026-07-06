<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class ShortlistedProviderController extends Controller
{
    public function store(Request $request, User $provider): RedirectResponse
    {
        $customer = $request->user();

        abort_unless($customer->isCustomer(), 403);

        $provider->load('providerProfile');

        abort_unless($provider->isDirectoryVisible(false), 404);

        $customer->shortlistedProviders()->syncWithoutDetaching([$provider->id]);

        return Redirect::back();
    }

    public function destroy(Request $request, User $provider): RedirectResponse
    {
        $customer = $request->user();

        abort_unless($customer->isCustomer(), 403);

        $customer->shortlistedProviders()->detach($provider->id);

        return Redirect::back();
    }
}
