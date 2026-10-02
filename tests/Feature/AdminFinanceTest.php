<?php

use App\Models\JobRequest;
use App\Models\JobRequestPayment;
use App\Models\PayoutRequest;
use App\Models\User;
use App\Models\UserPaymentMethod;
use App\Models\WalletDepositRequest;
use App\Services\WalletService;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function createFinanceOverviewProvider(): User
{
    $provider = User::factory()->provider()->create([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Avondale',
    ]);

    $provider->providerProfile()->update([
        'business_name' => 'Finance Works',
        'trade_category' => 'Electrical',
        'verification_status' => 'verified',
        'verified_at' => now(),
    ]);

    return $provider->fresh('providerProfile');
}

function createFinanceOverviewRequest(User $customer, User $provider, string $title): JobRequest
{
    return JobRequest::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => $title,
        'description' => 'Finance overview request fixture.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'accepted',
    ]);
}

function createFinanceOverviewPayment(
    User $customer,
    User $provider,
    string $title,
    int $amount,
    string $currency,
    string $status,
    string $escrowStatus,
): JobRequestPayment {
    $jobRequest = createFinanceOverviewRequest($customer, $provider, $title);

    return $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => $amount,
        'currency' => $currency,
        'method' => 'wallet',
        'channel' => 'electronic',
        'status' => $status,
        'escrow_status' => $escrowStatus,
        'gateway_provider' => 'Boma Sandbox Pay',
        'reference' => 'FIN-'.$amount.'-'.$currency,
        'paid_at' => now(),
    ]);
}

test('admin can review platform finance totals', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $customer = User::factory()->create(['name' => 'Finance Customer']);
    $provider = createFinanceOverviewProvider();

    createFinanceOverviewPayment($customer, $provider, 'Held USD request', 300, 'USD', 'confirmed', 'held');
    $releasedPayment = createFinanceOverviewPayment($customer, $provider, 'Released USD request', 200, 'USD', 'confirmed', 'released');
    $releasedPayment->update([
        'platform_fee_amount' => 10,
        'provider_net_amount' => 190,
    ]);
    createFinanceOverviewPayment($customer, $provider, 'Pending USD checkout', 100, 'USD', 'pending_gateway', 'not_held');
    createFinanceOverviewPayment($customer, $provider, 'Held ZiG request', 900, 'ZWG', 'confirmed', 'held');

    WalletDepositRequest::create([
        'user_id' => $customer->id,
        'amount' => 250,
        'currency' => 'USD',
        'source' => 'mobile_money',
        'reference' => 'ECOCASH-USD-250',
        'status' => 'pending',
    ]);

    WalletDepositRequest::create([
        'user_id' => $customer->id,
        'amount' => 450,
        'currency' => 'USD',
        'source' => 'visa',
        'reference' => 'VISA-USD-450',
        'status' => 'approved',
        'reviewed_by_user_id' => $admin->id,
        'reviewed_at' => now(),
    ]);

    $paymentMethod = UserPaymentMethod::create([
        'user_id' => $customer->id,
        'type' => 'card',
        'brand' => 'visa',
        'label' => 'Finance Visa',
        'last_four' => '4242',
        'exp_month' => 7,
        'exp_year' => 2030,
        'gateway_token' => 'tok_finance_gateway_deposit',
        'is_default' => true,
    ]);

    WalletDepositRequest::create([
        'user_id' => $customer->id,
        'user_payment_method_id' => $paymentMethod->id,
        'amount' => 175,
        'currency' => 'USD',
        'source' => 'saved_card',
        'reference' => 'PES-WAL-175',
        'status' => 'pending_gateway',
        'gateway_provider' => 'Pesepay',
        'gateway_status' => 'initiated',
        'gateway_transaction_id' => 'PES-WAL-175',
    ]);

    app(WalletService::class)->credit(
        $customer,
        700,
        'wallet_deposit',
        'Finance overview customer deposit',
        [],
        'USD',
    );

    $wallet = app(WalletService::class)->walletFor($provider, 'USD');

    PayoutRequest::create([
        'provider_id' => $provider->id,
        'wallet_id' => $wallet->id,
        'amount' => 150,
        'currency' => 'USD',
        'destination_type' => 'mobile_money',
        'destination_label' => 'EcoCash',
        'account_reference' => '+263771000001',
        'status' => 'pending',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.finance.index', ['from' => now()->subDay()->toDateString(), 'to' => now()->toDateString()]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Finance/Index')
            ->where('filters.currency', 'USD')
            ->where('filters.from', now()->subDay()->toDateString())
            ->where('filters.to', now()->toDateString())
            ->where('summary.capturedPayments', 500)
            ->where('summary.escrowHeld', 300)
            ->where('summary.releasedEarnings', 190)
            ->where('summary.platformRevenue', 10)
            ->where('summary.pendingGateway', 100)
            ->where('summary.pendingDeposits', 250)
            ->where('summary.pendingGatewayDeposits', 175)
            ->where('summary.approvedDeposits', 450)
            ->where('summary.pendingPayouts', 150)
            ->where('summary.walletLiability', 700)
            ->has('recentPayments', 3)
            ->has('recentTransactions', 1)
            ->has('depositQueue', 2)
            ->where('depositQueue.0.paymentMethod.lastFour', '4242')
            ->has('payoutQueue', 1));

    $response = $this->actingAs($admin)
        ->get(route('admin.finance.export', [
            'currency' => 'USD',
            'from' => now()->subDay()->toDateString(),
            'to' => now()->toDateString(),
        ]))
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');

    $csv = $response->streamedContent();

    expect($csv)->toContain('Section,Date,Reference')
        ->and($csv)->toContain('Payment')
        ->and($csv)->toContain('Wallet deposit')
        ->and($csv)->toContain('Wallet transaction')
        ->and($csv)->toContain('Payout')
        ->and($csv)->toContain('PES-WAL-175')
        ->and($csv)->toContain('Finance overview customer deposit')
        ->and($csv)->not->toContain('Held ZiG request');

    $this->actingAs($admin)
        ->get(route('admin.finance.index', ['currency' => 'ZWG']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Finance/Index')
            ->where('filters.currency', 'ZWG')
            ->where('summary.capturedPayments', 900)
            ->where('summary.escrowHeld', 900)
            ->where('summary.pendingDeposits', 0)
            ->where('summary.pendingGatewayDeposits', 0)
            ->where('summary.pendingPayouts', 0)
            ->has('recentPayments', 1));
});

test('non admins cannot access finance oversight', function () {
    $customer = User::factory()->create();

    $this->actingAs($customer)
        ->get(route('admin.finance.index'))
        ->assertForbidden();
});
