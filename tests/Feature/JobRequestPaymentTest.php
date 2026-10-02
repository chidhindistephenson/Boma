<?php

use App\Models\JobRequest;
use App\Models\JobRequestPayment;
use App\Models\PayoutRequest;
use App\Models\User;
use App\Models\WalletDepositRequest;
use App\Services\PaymentEscrowService;
use App\Services\Payments\PesepayGateway;
use App\Services\WalletService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    Storage::fake('local');
});

function createPaymentProvider(array $userAttributes = [], array $profileAttributes = []): User
{
    $provider = User::factory()->provider()->create(array_merge([
        'status' => 'active',
        'email_verified_at' => now(),
        'city' => 'Harare',
        'area' => 'Borrowdale',
        'phone' => '+263777000003',
    ], $userAttributes));

    $provider->providerProfile()->update(array_merge([
        'business_name' => 'Steady Current Services',
        'trade_category' => 'Electrical',
        'bio' => 'Provider used in payment workflow tests.',
        'verification_status' => 'verified',
        'verified_at' => now(),
        'availability_status' => 'available',
    ], $profileAttributes));

    return $provider->fresh('providerProfile');
}

function createAcceptedQuotedPaymentRequest(User $customer, User $provider, array $attributes = []): JobRequest
{
    $jobRequest = JobRequest::create(array_merge([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'trade_category' => 'Electrical',
        'title' => 'Distribution board replacement',
        'description' => 'Accepted request used for manual payment tracking.',
        'urgency' => 'this_week',
        'city' => 'Harare',
        'area' => 'Avondale',
        'status' => 'accepted',
    ], $attributes));

    $jobRequest->quote()->create([
        'provider_id' => $provider->id,
        'amount' => 320,
        'timeline_days' => 3,
        'status' => 'accepted',
        'summary' => 'Accepted quote used to unlock the payment workflow.',
        'responded_at' => now()->subDay(),
    ]);

    return $jobRequest->fresh('quote');
}

test('customer can record a payment on an accepted quoted request', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 320,
            'method' => 'mobile_money',
            'reference' => 'ECO-104422',
            'notes' => 'Full amount settled from the customer business wallet.',
            'paid_at' => now()->subHour()->toDateTimeString(),
            'proof' => UploadedFile::fake()->create('ecocash-confirmation.pdf', 140, 'application/pdf'),
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'job_request_id' => $jobRequest->id,
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'channel' => 'electronic',
        'method' => 'mobile_money',
        'status' => 'submitted',
        'reference' => 'ECO-104422',
        'proof_original_name' => 'ecocash-confirmation.pdf',
    ]);

    $payment = $jobRequest->fresh('payment')->payment;

    expect($payment->hasProof())->toBeTrue();
    Storage::disk('local')->assertExists($payment->proof_storage_path);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_payment_recorded',
        'title' => 'Payment recorded',
    ]);

    $this->actingAs($provider)
        ->get(route('requests.show', $jobRequest))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Show')
            ->where('jobRequest.payment.status', 'submitted')
            ->where('jobRequest.payment.channel', 'electronic')
            ->where('jobRequest.payment.method', 'mobile_money')
            ->where('jobRequest.payment.proofOriginalName', 'ecocash-confirmation.pdf')
            ->where('jobRequest.payment.proofUrl', route('requests.payment.proof', $jobRequest))
            ->where('permissions.canRespondToPayment', true)
            ->where('paymentMethodOptions.mobile_money', 'Mobile money'));
});

test('provider can confirm a submitted payment', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'cash',
        'status' => 'submitted',
        'paid_at' => now()->subHours(2),
    ]);

    $this->actingAs($provider)
        ->patch(route('requests.payment.status.update', $jobRequest), [
            'action' => 'confirm',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'job_request_id' => $jobRequest->id,
        'status' => 'confirmed',
        'escrow_status' => 'external',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_payment_confirmed',
        'title' => 'Payment confirmed',
    ]);
});

test('customer can pay electronically through the system checkout', function () {
    $customer = User::factory()->create([
        'name' => 'Brenda Checkout',
        'email' => 'brenda.checkout@example.com',
        'phone' => '+263771234567',
    ]);
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 320,
            'channel' => 'electronic',
            'method' => 'mobile_money',
            'payer_name' => 'Brenda Checkout',
            'payer_email' => 'brenda.checkout@example.com',
            'payer_phone' => '+263771234567',
            'checkout_token' => 'sandbox-otp-000000',
            'notes' => 'Paid inside Boma checkout.',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $payment = $jobRequest->fresh('payment')->payment;

    expect($payment->status)->toBe('confirmed')
        ->and($payment->channel)->toBe('electronic')
        ->and($payment->gateway_provider)->toBe('Boma Sandbox Pay')
        ->and($payment->gateway_status)->toBe('paid')
        ->and($payment->gateway_transaction_id)->not->toBeNull()
        ->and($payment->confirmed_at)->not->toBeNull()
        ->and($payment->escrow_status)->toBe('held')
        ->and($payment->escrow_held_at)->not->toBeNull()
        ->and($payment->release_due_at)->not->toBeNull()
        ->and($payment->processed_at)->not->toBeNull()
        ->and($payment->reference)->toBe($payment->gateway_transaction_id);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_payment_confirmed',
        'title' => 'Payment received',
    ]);

    $this->actingAs($provider)
        ->get(route('requests.show', $jobRequest))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Show')
            ->where('jobRequest.payment.status', 'confirmed')
            ->where('jobRequest.payment.channel', 'electronic')
            ->where('jobRequest.payment.gatewayProvider', 'Boma Sandbox Pay')
            ->where('permissions.canRespondToPayment', false));
});

test('customer is redirected to pesepay checkout when pesepay driver is enabled', function () {
    config()->set('localserve.payment.driver', 'pesepay');

    $customer = User::factory()->create([
        'name' => 'Pesepay Customer',
        'email' => 'pesepay.customer@example.com',
        'phone' => '+263771234567',
    ]);
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    app()->instance(PesepayGateway::class, new class extends PesepayGateway
    {
        public function initiate(JobRequest $jobRequest, array $payload): array
        {
            return [
                'provider' => 'Pesepay',
                'status' => 'initiated',
                'reference_number' => 'PES-REF-'.$jobRequest->id,
                'poll_url' => 'https://api.test.pesepay.com/poll/'.$jobRequest->id,
                'redirect_url' => 'https://pay.pesepay.com/checkout/'.$jobRequest->id,
                'merchant_reference' => 'BOMA-REQ-'.$jobRequest->id,
            ];
        }
    });

    $this->actingAs($customer)
        ->withHeader('X-Inertia', 'true')
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 320,
            'channel' => 'electronic',
            'method' => 'mobile_money',
            'payer_name' => 'Pesepay Customer',
            'payer_email' => 'pesepay.customer@example.com',
            'payer_phone' => '+263771234567',
        ])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', 'https://pay.pesepay.com/checkout/'.$jobRequest->id);

    $this->assertDatabaseHas('job_request_payments', [
        'job_request_id' => $jobRequest->id,
        'channel' => 'electronic',
        'method' => 'mobile_money',
        'gateway_provider' => 'Pesepay',
        'gateway_status' => 'initiated',
        'gateway_transaction_id' => 'PES-REF-'.$jobRequest->id,
        'gateway_merchant_reference' => 'BOMA-REQ-'.$jobRequest->id,
        'gateway_redirect_url' => 'https://pay.pesepay.com/checkout/'.$jobRequest->id,
        'status' => 'pending_gateway',
    ]);
});

test('pesepay result callback verifies and confirms the payment', function () {
    config()->set('localserve.payment.driver', 'pesepay');

    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $payment = $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'mobile_money',
        'channel' => 'electronic',
        'gateway_provider' => 'Pesepay',
        'gateway_status' => 'initiated',
        'gateway_transaction_id' => 'PES-REF-'.$jobRequest->id,
        'gateway_poll_url' => 'https://api.test.pesepay.com/poll/'.$jobRequest->id,
        'reference' => 'PES-REF-'.$jobRequest->id,
        'status' => 'pending_gateway',
        'paid_at' => now(),
    ]);

    app()->instance(PesepayGateway::class, new class extends PesepayGateway
    {
        public function sync(JobRequestPayment $payment, array $callbackPayload = []): array
        {
            $payment->update([
                'gateway_status' => 'paid',
                'gateway_payload' => ['last_callback' => $callbackPayload],
                'gateway_result_received_at' => now(),
                'status' => 'confirmed',
                'paid_at' => now(),
                'processed_at' => now(),
                'confirmed_at' => now(),
            ]);
            app(PaymentEscrowService::class)->hold($payment->refresh());

            return [
                'paid' => true,
                'reference_number' => $payment->gateway_transaction_id,
                'poll_url' => $payment->gateway_poll_url,
            ];
        }
    });

    $this->post(route('payments.pesepay.result', $jobRequest), [
        'referenceNumber' => 'PES-REF-'.$jobRequest->id,
    ])->assertNoContent();

    $this->assertDatabaseHas('job_request_payments', [
        'id' => $payment->id,
        'gateway_status' => 'paid',
        'status' => 'confirmed',
        'escrow_status' => 'held',
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_payment_confirmed',
        'title' => 'Payment received',
    ]);
});

test('customer can fund wallet and pay a request from wallet balance', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $this->actingAs($customer)
        ->post(route('wallet.deposits.store'), [
            'amount' => 500,
            'source' => 'cash_deposit',
            'reference' => 'CASH-DEP-001',
        ])
        ->assertRedirect(route('profile.edit', ['section' => 'billing']));

    $deposit = WalletDepositRequest::firstOrFail();

    expect($customer->wallets()->where('currency', 'USD')->first()?->balance ?? 0)->toBe(0)
        ->and($deposit->status)->toBe('pending');

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $admin->id,
        'type' => 'wallet_deposit_requested',
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.wallet-deposits.update', $deposit), [
            'action' => 'approve',
            'review_notes' => 'Reference matched.',
        ])
        ->assertRedirect(route('admin.wallet-deposits.index'));

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 320,
            'channel' => 'electronic',
            'method' => 'wallet',
            'notes' => 'Paid using Boma wallet balance.',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $payment = $jobRequest->fresh('payment')->payment;
    $wallet = $customer->wallet()->first();

    expect($wallet->balance)->toBe(180)
        ->and($payment->status)->toBe('confirmed')
        ->and($payment->method)->toBe('wallet')
        ->and($payment->gateway_provider)->toBe('Boma Wallet')
        ->and($payment->escrow_status)->toBe('held')
        ->and($payment->wallet_transaction_id)->not->toBeNull();
});

test('admin can reject a wallet funding request without crediting the wallet', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $customer = User::factory()->create();

    $this->actingAs($customer)
        ->post(route('wallet.deposits.store'), [
            'amount' => 125,
            'currency' => 'USD',
            'source' => 'bank_transfer',
            'reference' => 'BAD-REF-001',
        ])
        ->assertRedirect(route('profile.edit', ['section' => 'billing']));

    $deposit = WalletDepositRequest::firstOrFail();

    $this->actingAs($admin)
        ->patch(route('admin.wallet-deposits.update', $deposit), [
            'action' => 'reject',
            'review_notes' => 'The reference could not be matched.',
        ])
        ->assertRedirect(route('admin.wallet-deposits.index'));

    $deposit->refresh();

    expect($deposit->status)->toBe('rejected')
        ->and($deposit->wallet_transaction_id)->toBeNull()
        ->and($customer->wallets()->where('currency', 'USD')->first()?->balance ?? 0)->toBe(0);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'wallet_deposit_rejected',
    ]);
});

test('customer can fund wallet through online checkout in sandbox mode', function () {
    $customer = User::factory()->create();

    $this->actingAs($customer)
        ->post(route('wallet.deposits.store'), [
            'amount' => 275,
            'currency' => 'USD',
            'source' => 'online_checkout',
        ])
        ->assertRedirect(route('profile.edit', ['section' => 'billing']));

    $deposit = WalletDepositRequest::firstOrFail();
    $wallet = app(WalletService::class)->walletFor($customer->fresh(), 'USD');

    expect($deposit->status)->toBe('approved')
        ->and($deposit->gateway_provider)->toBe('Boma Sandbox Pay')
        ->and($deposit->gateway_status)->toBe('paid')
        ->and($deposit->wallet_transaction_id)->not->toBeNull()
        ->and($wallet->balance)->toBe(275);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'wallet_deposit_approved',
    ]);
});

test('customer can fund wallet with a saved card', function () {
    $customer = User::factory()->create();
    $paymentMethod = $customer->paymentMethods()->create([
        'type' => 'card',
        'brand' => 'visa',
        'label' => 'Eco bank Visa',
        'last_four' => '4242',
        'exp_month' => 7,
        'exp_year' => 2030,
        'gateway_token' => 'tok_wallet_topup_4242',
        'is_default' => true,
    ]);

    $this->actingAs($customer)
        ->post(route('wallet.deposits.store'), [
            'amount' => 380,
            'currency' => 'USD',
            'source' => 'saved_card',
            'user_payment_method_id' => $paymentMethod->id,
        ])
        ->assertRedirect(route('profile.edit', ['section' => 'billing']));

    $deposit = WalletDepositRequest::firstOrFail();
    $wallet = app(WalletService::class)->walletFor($customer->fresh(), 'USD');

    expect($deposit->status)->toBe('approved')
        ->and($deposit->source)->toBe('saved_card')
        ->and($deposit->user_payment_method_id)->toBe($paymentMethod->id)
        ->and($deposit->gateway_provider)->toBe('Boma Sandbox Pay')
        ->and($deposit->wallet_transaction_id)->not->toBeNull()
        ->and($wallet->balance)->toBe(380);
});

test('customer cannot fund wallet with another users saved card', function () {
    $customer = User::factory()->create();
    $otherCustomer = User::factory()->create();
    $paymentMethod = $otherCustomer->paymentMethods()->create([
        'type' => 'card',
        'brand' => 'visa',
        'last_four' => '9999',
        'exp_month' => 9,
        'exp_year' => 2031,
        'gateway_token' => 'tok_other_wallet_topup',
        'is_default' => true,
    ]);

    $this->actingAs($customer)
        ->from(route('profile.edit', ['section' => 'billing']))
        ->post(route('wallet.deposits.store'), [
            'amount' => 380,
            'currency' => 'USD',
            'source' => 'saved_card',
            'user_payment_method_id' => $paymentMethod->id,
        ])
        ->assertRedirect(route('profile.edit', ['section' => 'billing']))
        ->assertSessionHasErrors('user_payment_method_id');

    expect(WalletDepositRequest::count())->toBe(0)
        ->and($customer->wallets()->where('currency', 'USD')->first()?->balance ?? 0)->toBe(0);
});

test('admin can audit gateway pending wallet deposits', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $customer = User::factory()->create(['name' => 'Gateway Customer']);
    $paymentMethod = $customer->paymentMethods()->create([
        'type' => 'card',
        'brand' => 'visa',
        'label' => 'Audit Visa',
        'last_four' => '1111',
        'exp_month' => 8,
        'exp_year' => 2031,
        'gateway_token' => 'tok_gateway_pending_audit',
        'is_default' => true,
    ]);

    WalletDepositRequest::create([
        'user_id' => $customer->id,
        'user_payment_method_id' => $paymentMethod->id,
        'amount' => 900,
        'currency' => 'USD',
        'source' => 'saved_card',
        'reference' => 'PES-WAL-AUDIT',
        'status' => 'pending_gateway',
        'gateway_provider' => 'Pesepay',
        'gateway_status' => 'initiated',
        'gateway_transaction_id' => 'PES-WAL-AUDIT',
        'gateway_merchant_reference' => 'BOMA-WAL-AUDIT',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.wallet-deposits.index', ['status' => 'pending_gateway']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/WalletDeposits/Index')
            ->where('filters.status', 'pending_gateway')
            ->where('summary.pendingGateway', 1)
            ->has('deposits.data', 1)
            ->where('deposits.data.0.gatewayProvider', 'Pesepay')
            ->where('deposits.data.0.gatewayStatus', 'initiated')
            ->where('deposits.data.0.paymentMethod.lastFour', '1111'));
});

test('pesepay wallet deposit credits the wallet after gateway confirmation only once', function () {
    config()->set('localserve.payment.driver', 'pesepay');

    $customer = User::factory()->create();

    app()->instance(PesepayGateway::class, new class extends PesepayGateway
    {
        public function initiateWalletDeposit(WalletDepositRequest $deposit): array
        {
            return [
                'provider' => 'Pesepay',
                'status' => 'initiated',
                'reference_number' => 'PES-WAL-'.$deposit->id,
                'poll_url' => 'https://api.test.pesepay.com/wallet-poll/'.$deposit->id,
                'redirect_url' => 'https://pay.pesepay.com/wallet-checkout/'.$deposit->id,
                'merchant_reference' => 'BOMA-WAL-'.$deposit->id,
            ];
        }

        public function syncWalletDeposit(WalletDepositRequest $deposit, array $callbackPayload = []): array
        {
            $deposit->update([
                'gateway_status' => 'paid',
                'gateway_payload' => ['last_callback' => $callbackPayload],
                'gateway_result_received_at' => now(),
            ]);

            return [
                'paid' => true,
                'reference_number' => $deposit->gateway_transaction_id,
                'poll_url' => $deposit->gateway_poll_url,
            ];
        }
    });

    $this->actingAs($customer)
        ->withHeader('X-Inertia', 'true')
        ->post(route('wallet.deposits.store'), [
            'amount' => 640,
            'currency' => 'USD',
            'source' => 'online_checkout',
        ])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', 'https://pay.pesepay.com/wallet-checkout/1');

    $deposit = WalletDepositRequest::firstOrFail();

    expect($deposit->status)->toBe('pending_gateway')
        ->and($deposit->gateway_provider)->toBe('Pesepay')
        ->and($deposit->gateway_status)->toBe('initiated')
        ->and($customer->wallets()->where('currency', 'USD')->first()?->balance ?? 0)->toBe(0);

    $this->post(route('wallet.deposits.pesepay.result', $deposit), [
        'referenceNumber' => 'PES-WAL-'.$deposit->id,
    ])->assertNoContent();

    $deposit->refresh();
    $wallet = app(WalletService::class)->walletFor($customer->fresh(), 'USD');

    expect($deposit->status)->toBe('approved')
        ->and($deposit->gateway_status)->toBe('paid')
        ->and($deposit->wallet_transaction_id)->not->toBeNull()
        ->and($wallet->balance)->toBe(640);

    $this->post(route('wallet.deposits.pesepay.result', $deposit), [
        'referenceNumber' => 'PES-WAL-'.$deposit->id,
    ])->assertNoContent();

    expect(app(WalletService::class)->walletFor($customer->fresh(), 'USD')->balance)->toBe(640);
});

test('customer can release held escrow funds to the provider', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $payment = $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'wallet',
        'channel' => 'electronic',
        'gateway_provider' => 'Boma Wallet',
        'gateway_status' => 'paid',
        'gateway_transaction_id' => 'WAL-REL-001',
        'reference' => 'WAL-REL-001',
        'status' => 'confirmed',
        'escrow_status' => 'held',
        'escrow_held_at' => now()->subDay(),
        'release_due_at' => now()->addDay(),
        'paid_at' => now()->subDay(),
        'processed_at' => now()->subDay(),
        'confirmed_at' => now()->subDay(),
    ]);

    $this->actingAs($customer)
        ->post(route('requests.payment.release', $jobRequest))
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'id' => $payment->id,
        'escrow_status' => 'released',
        'released_by_user_id' => $customer->id,
        'release_reason' => 'customer_confirmed',
    ]);
    $this->assertDatabaseHas('wallet_transactions', [
        'user_id' => $provider->id,
        'job_request_payment_id' => $payment->id,
        'type' => 'provider_earning',
        'direction' => 'credit',
        'amount' => 320,
        'currency' => 'USD',
    ]);

    expect($provider->wallets()->where('currency', 'USD')->first()->balance)->toBe(320);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_payment_released',
        'title' => 'Payment released',
    ]);
});

test('configured platform fee is retained when escrow is released', function () {
    config()->set('localserve.payment.platform_fee_bps', 500);

    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $payment = $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 1000,
        'currency' => 'USD',
        'method' => 'wallet',
        'channel' => 'electronic',
        'gateway_provider' => 'Boma Wallet',
        'gateway_status' => 'paid',
        'gateway_transaction_id' => 'WAL-FEE-001',
        'reference' => 'WAL-FEE-001',
        'status' => 'confirmed',
        'escrow_status' => 'held',
        'escrow_held_at' => now()->subDay(),
        'release_due_at' => now()->addDay(),
        'paid_at' => now()->subDay(),
        'processed_at' => now()->subDay(),
        'confirmed_at' => now()->subDay(),
    ]);

    $this->actingAs($customer)
        ->post(route('requests.payment.release', $jobRequest))
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'id' => $payment->id,
        'escrow_status' => 'released',
        'platform_fee_amount' => 50,
        'provider_net_amount' => 950,
    ]);
    $this->assertDatabaseHas('wallet_transactions', [
        'user_id' => $provider->id,
        'job_request_payment_id' => $payment->id,
        'type' => 'provider_earning',
        'direction' => 'credit',
        'amount' => 950,
        'currency' => 'USD',
    ]);

    expect($provider->wallets()->where('currency', 'USD')->first()->balance)->toBe(950);
});

test('admin can refund held escrow funds to the customer wallet', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $payment = $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'currency' => 'USD',
        'method' => 'wallet',
        'channel' => 'electronic',
        'gateway_provider' => 'Boma Wallet',
        'gateway_status' => 'paid',
        'gateway_transaction_id' => 'WAL-REF-001',
        'reference' => 'WAL-REF-001',
        'status' => 'confirmed',
        'escrow_status' => 'held',
        'escrow_held_at' => now()->subDay(),
        'release_due_at' => now()->addDay(),
        'paid_at' => now()->subDay(),
        'processed_at' => now()->subDay(),
        'confirmed_at' => now()->subDay(),
    ]);

    $this->actingAs($admin)
        ->post(route('requests.payment.refund', $jobRequest), [
            'reason' => 'The job was cancelled before the provider started work.',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'id' => $payment->id,
        'status' => 'refunded',
        'escrow_status' => 'refunded',
        'refunded_by_user_id' => $admin->id,
        'refund_reason' => 'The job was cancelled before the provider started work.',
    ]);

    $this->assertDatabaseHas('wallet_transactions', [
        'user_id' => $customer->id,
        'job_request_payment_id' => $payment->id,
        'type' => 'payment_refund',
        'direction' => 'credit',
        'amount' => 320,
        'currency' => 'USD',
    ]);

    expect($customer->wallets()->where('currency', 'USD')->first()->balance)->toBe(320)
        ->and($provider->wallets()->where('currency', 'USD')->first())->toBeNull();

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_payment_refunded',
        'title' => 'Payment refunded',
    ]);
    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_payment_refunded',
        'title' => 'Payment refunded',
    ]);
});

test('participants can dispute held escrow and pause automatic release', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $payment = $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'currency' => 'USD',
        'method' => 'wallet',
        'channel' => 'electronic',
        'gateway_provider' => 'Boma Wallet',
        'gateway_status' => 'paid',
        'gateway_transaction_id' => 'WAL-DSP-001',
        'reference' => 'WAL-DSP-001',
        'status' => 'confirmed',
        'escrow_status' => 'held',
        'escrow_held_at' => now()->subDays(3),
        'release_due_at' => now()->subMinute(),
        'paid_at' => now()->subDays(3),
        'processed_at' => now()->subDays(3),
        'confirmed_at' => now()->subDays(3),
    ]);

    $this->actingAs($customer)
        ->post(route('requests.payment.dispute', $jobRequest), [
            'reason' => 'The work is incomplete and needs administrator review.',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'id' => $payment->id,
        'status' => 'confirmed',
        'escrow_status' => 'disputed',
        'disputed_by_user_id' => $customer->id,
        'release_due_at' => null,
        'dispute_reason' => 'The work is incomplete and needs administrator review.',
    ]);

    $this->artisan('payments:release-due')
        ->expectsOutput('Released 0 escrow payment(s).')
        ->assertExitCode(0);

    $this->assertDatabaseHas('job_request_payments', [
        'id' => $payment->id,
        'escrow_status' => 'disputed',
    ]);
    $this->assertDatabaseMissing('wallet_transactions', [
        'user_id' => $provider->id,
        'type' => 'provider_earning',
    ]);
    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_payment_disputed',
    ]);
    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $admin->id,
        'type' => 'request_payment_disputed',
    ]);
});

test('admin can resolve disputed escrow by release or refund', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $releaseRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'title' => 'Disputed release request',
    ]);
    $refundRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'title' => 'Disputed refund request',
    ]);

    $releasePayment = $releaseRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'currency' => 'USD',
        'method' => 'wallet',
        'channel' => 'electronic',
        'gateway_provider' => 'Boma Wallet',
        'gateway_status' => 'paid',
        'gateway_transaction_id' => 'WAL-DSP-REL',
        'reference' => 'WAL-DSP-REL',
        'status' => 'confirmed',
        'escrow_status' => 'disputed',
        'escrow_held_at' => now()->subDay(),
        'disputed_at' => now()->subHour(),
        'disputed_by_user_id' => $customer->id,
        'dispute_reason' => 'Needs release decision.',
        'paid_at' => now()->subDay(),
        'processed_at' => now()->subDay(),
        'confirmed_at' => now()->subDay(),
    ]);
    $refundPayment = $refundRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 180,
        'currency' => 'USD',
        'method' => 'wallet',
        'channel' => 'electronic',
        'gateway_provider' => 'Boma Wallet',
        'gateway_status' => 'paid',
        'gateway_transaction_id' => 'WAL-DSP-REF',
        'reference' => 'WAL-DSP-REF',
        'status' => 'confirmed',
        'escrow_status' => 'disputed',
        'escrow_held_at' => now()->subDay(),
        'disputed_at' => now()->subHour(),
        'disputed_by_user_id' => $provider->id,
        'dispute_reason' => 'Needs refund decision.',
        'paid_at' => now()->subDay(),
        'processed_at' => now()->subDay(),
        'confirmed_at' => now()->subDay(),
    ]);

    $this->actingAs($admin)
        ->post(route('requests.payment.release', $releaseRequest))
        ->assertRedirect(route('requests.show', $releaseRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'id' => $releasePayment->id,
        'escrow_status' => 'released',
        'release_reason' => 'admin_resolved_dispute',
        'dispute_reason' => null,
    ]);
    $this->assertDatabaseHas('wallet_transactions', [
        'user_id' => $provider->id,
        'job_request_payment_id' => $releasePayment->id,
        'type' => 'provider_earning',
        'amount' => 320,
    ]);

    $this->actingAs($admin)
        ->post(route('requests.payment.refund', $refundRequest), [
            'reason' => 'Admin approved a refund after reviewing the disputed work.',
        ])
        ->assertRedirect(route('requests.show', $refundRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'id' => $refundPayment->id,
        'status' => 'refunded',
        'escrow_status' => 'refunded',
        'refund_reason' => 'Admin approved a refund after reviewing the disputed work.',
        'dispute_reason' => null,
    ]);
    $this->assertDatabaseHas('wallet_transactions', [
        'user_id' => $customer->id,
        'job_request_payment_id' => $refundPayment->id,
        'type' => 'payment_refund',
        'amount' => 180,
    ]);
});

test('non admins cannot refund held escrow funds', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $payment = $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'currency' => 'USD',
        'method' => 'wallet',
        'channel' => 'electronic',
        'gateway_provider' => 'Boma Wallet',
        'gateway_status' => 'paid',
        'gateway_transaction_id' => 'WAL-NOREF-001',
        'reference' => 'WAL-NOREF-001',
        'status' => 'confirmed',
        'escrow_status' => 'held',
        'escrow_held_at' => now()->subDay(),
        'release_due_at' => now()->addDay(),
        'paid_at' => now()->subDay(),
        'processed_at' => now()->subDay(),
        'confirmed_at' => now()->subDay(),
    ]);

    $this->actingAs($customer)
        ->post(route('requests.payment.refund', $jobRequest), [
            'reason' => 'Customer trying to force a refund.',
        ])
        ->assertForbidden();

    $this->assertDatabaseHas('job_request_payments', [
        'id' => $payment->id,
        'status' => 'confirmed',
        'escrow_status' => 'held',
    ]);
    $this->assertDatabaseMissing('wallet_transactions', [
        'user_id' => $customer->id,
        'type' => 'payment_refund',
    ]);
});

test('due escrow payments can be auto released', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $payment = $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'wallet',
        'channel' => 'electronic',
        'gateway_provider' => 'Boma Wallet',
        'gateway_status' => 'paid',
        'gateway_transaction_id' => 'WAL-AUTO-001',
        'reference' => 'WAL-AUTO-001',
        'status' => 'confirmed',
        'escrow_status' => 'held',
        'escrow_held_at' => now()->subDays(3),
        'release_due_at' => now()->subMinute(),
        'paid_at' => now()->subDays(3),
        'processed_at' => now()->subDays(3),
        'confirmed_at' => now()->subDays(3),
    ]);

    $this->artisan('payments:release-due')
        ->expectsOutput('Released 1 escrow payment(s).')
        ->assertExitCode(0);

    $this->assertDatabaseHas('job_request_payments', [
        'id' => $payment->id,
        'escrow_status' => 'released',
        'released_by_user_id' => null,
        'release_reason' => 'auto_48h',
    ]);
});

test('provider can request payout and admin can mark it paid', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $provider = createPaymentProvider();

    app(WalletService::class)->credit(
        $provider,
        600,
        'provider_earning',
        'Released payment for completed work',
        [],
        'USD',
    );

    $this->actingAs($provider)
        ->post(route('wallet.payouts.store'), [
            'amount' => 250,
            'currency' => 'USD',
            'destination_type' => 'mobile_money',
            'destination_label' => 'EcoCash',
            'account_reference' => '+263771000001',
            'notes' => 'Send to my main wallet.',
        ])
        ->assertRedirect(route('profile.edit', ['section' => 'billing']));

    $payout = PayoutRequest::firstOrFail();

    expect($provider->wallets()->where('currency', 'USD')->first()->balance)->toBe(350)
        ->and($payout->status)->toBe('pending')
        ->and($payout->walletTransaction)->not->toBeNull();

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $admin->id,
        'type' => 'provider_payout_requested',
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.payouts.update', $payout), [
            'action' => 'approve',
            'review_notes' => 'Destination verified.',
        ])
        ->assertRedirect(route('admin.payouts.index'));

    expect($payout->fresh()->status)->toBe('approved');

    $this->actingAs($admin)
        ->patch(route('admin.payouts.update', $payout), [
            'action' => 'mark_paid',
        ])
        ->assertSessionHasErrors('settlement_reference');

    $this->actingAs($admin)
        ->patch(route('admin.payouts.update', $payout), [
            'action' => 'mark_paid',
            'settlement_reference' => 'ECO-PAYOUT-7788',
            'settlement_notes' => 'Paid from the Boma operations wallet.',
        ])
        ->assertRedirect(route('admin.payouts.index'));

    $payout->refresh();

    expect($payout->status)->toBe('paid')
        ->and($payout->paid_at)->not->toBeNull()
        ->and($payout->settlement_reference)->toBe('ECO-PAYOUT-7788')
        ->and($payout->settlement_notes)->toBe('Paid from the Boma operations wallet.')
        ->and($provider->wallets()->where('currency', 'USD')->first()->balance)->toBe(350);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'provider_payout_paid',
        'body' => 'Your USD 250 payout request is now paid. Settlement reference: ECO-PAYOUT-7788.',
    ]);
});

test('admin can reject and refund a payout request', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $provider = createPaymentProvider();

    app(WalletService::class)->credit(
        $provider,
        400,
        'provider_earning',
        'Released payment for completed work',
        [],
        'USD',
    );

    $this->actingAs($provider)
        ->post(route('wallet.payouts.store'), [
            'amount' => 175,
            'currency' => 'USD',
            'destination_type' => 'bank_transfer',
            'destination_label' => 'NMB Bank',
            'account_reference' => '1234567890',
        ])
        ->assertRedirect(route('profile.edit', ['section' => 'billing']));

    $payout = PayoutRequest::firstOrFail();

    expect($provider->wallets()->where('currency', 'USD')->first()->balance)->toBe(225);

    $this->actingAs($admin)
        ->patch(route('admin.payouts.update', $payout), [
            'action' => 'reject',
            'review_notes' => 'Account reference could not be verified.',
        ])
        ->assertRedirect(route('admin.payouts.index'));

    $payout->refresh();

    expect($payout->status)->toBe('rejected')
        ->and($payout->refund_wallet_transaction_id)->not->toBeNull()
        ->and($provider->wallets()->where('currency', 'USD')->first()->balance)->toBe(400);

    $this->assertDatabaseHas('wallet_transactions', [
        'user_id' => $provider->id,
        'type' => 'payout_refund',
        'direction' => 'credit',
        'amount' => 175,
    ]);
});

test('customer can keep separate usd and zig wallet balances', function () {
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $this->actingAs($customer)
        ->post(route('wallet.deposits.store'), [
            'amount' => 1000,
            'currency' => 'ZWG',
            'source' => 'mobile_money',
            'reference' => 'ZIG-DEP-001',
        ])
        ->assertRedirect(route('profile.edit', ['section' => 'billing']));

    $deposit = WalletDepositRequest::firstOrFail();

    $this->actingAs($admin)
        ->patch(route('admin.wallet-deposits.update', $deposit), [
            'action' => 'approve',
        ])
        ->assertRedirect(route('admin.wallet-deposits.index'));

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 320,
            'currency' => 'ZWG',
            'channel' => 'electronic',
            'method' => 'wallet',
            'notes' => 'Paid using Boma ZiG wallet balance.',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $zigWallet = $customer->wallets()->where('currency', 'ZWG')->first();
    $usdWallet = $customer->wallets()->where('currency', 'USD')->first();
    $payment = $jobRequest->fresh('payment')->payment;

    expect($zigWallet->balance)->toBe(680)
        ->and($usdWallet?->balance ?? 0)->toBe(0)
        ->and($payment->currency)->toBe('ZWG')
        ->and($payment->status)->toBe('confirmed');
});

test('customer can save a tokenized visa card and pay with it', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $this->actingAs($customer)
        ->post(route('payment-methods.store'), [
            'brand' => 'visa',
            'label' => 'Personal Visa',
            'last_four' => '4242',
            'exp_month' => 12,
            'exp_year' => now()->year + 2,
            'gateway_token' => 'tok_test_visa_4242',
            'is_default' => true,
        ])
        ->assertRedirect(route('profile.edit', ['section' => 'billing']));

    $paymentMethod = $customer->paymentMethods()->first();

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 320,
            'channel' => 'electronic',
            'method' => 'saved_card',
            'user_payment_method_id' => $paymentMethod->id,
            'notes' => 'Paid with saved Visa.',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $payment = $jobRequest->fresh('payment')->payment;

    expect($payment->status)->toBe('confirmed')
        ->and($payment->method)->toBe('saved_card')
        ->and($payment->user_payment_method_id)->toBe($paymentMethod->id)
        ->and($payment->gateway_transaction_id)->toStartWith('CRD-');

    $this->assertDatabaseMissing('user_payment_methods', [
        'gateway_token' => '4242424242424242',
    ]);
});

test('customer can record a manual offline payment', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 320,
            'channel' => 'manual',
            'method' => 'cash',
            'notes' => 'Paid cash after the site visit.',
            'paid_at' => now()->subHour()->toDateTimeString(),
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'job_request_id' => $jobRequest->id,
        'amount' => 320,
        'channel' => 'manual',
        'method' => 'cash',
        'status' => 'submitted',
        'reference' => null,
    ]);
});

test('provider can request payment revision and customer can update it', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'cash',
        'reference' => 'ORIGINAL-1',
        'status' => 'submitted',
        'paid_at' => now()->subHours(4),
    ]);

    $this->actingAs($provider)
        ->patch(route('requests.payment.status.update', $jobRequest), [
            'action' => 'request_revision',
            'review_notes' => 'The supplied receipt reference does not match the amount received.',
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'job_request_id' => $jobRequest->id,
        'status' => 'revision_requested',
        'review_notes' => 'The supplied receipt reference does not match the amount received.',
        'reviewed_by_user_id' => $provider->id,
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $customer->id,
        'type' => 'request_payment_revision_requested',
        'title' => 'Payment needs review',
    ]);

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 300,
            'method' => 'bank_transfer',
            'reference' => 'REVISION-2',
            'notes' => 'Updated after correcting the transfer slip amount.',
            'paid_at' => now()->subMinutes(30)->toDateTimeString(),
            'proof' => UploadedFile::fake()->create('bank-transfer-slip.png', 200, 'image/png'),
        ])
        ->assertRedirect(route('requests.show', $jobRequest));

    $this->assertDatabaseHas('job_request_payments', [
        'job_request_id' => $jobRequest->id,
        'amount' => 300,
        'channel' => 'electronic',
        'method' => 'bank_transfer',
        'reference' => 'REVISION-2',
        'status' => 'submitted',
        'proof_original_name' => 'bank-transfer-slip.png',
        'review_notes' => null,
        'reviewed_by_user_id' => null,
    ]);

    $this->assertDatabaseHas('in_app_notifications', [
        'user_id' => $provider->id,
        'type' => 'request_payment_updated',
        'title' => 'Payment updated',
    ]);
});

test('payment proof can be downloaded by parties and admins only', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $outsider = User::factory()->create();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $path = 'payment-proofs/'.$jobRequest->id.'/receipt.pdf';
    Storage::disk('local')->put($path, 'receipt');

    $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'bank_transfer',
        'reference' => 'BANK-101',
        'status' => 'submitted',
        'paid_at' => now()->subHour(),
        'proof_storage_path' => $path,
        'proof_original_name' => 'receipt.pdf',
        'proof_mime_type' => 'application/pdf',
        'proof_size_bytes' => strlen('receipt'),
    ]);

    $this->actingAs($customer)
        ->get(route('requests.payment.proof', $jobRequest))
        ->assertOk();

    $this->actingAs($provider)
        ->get(route('requests.payment.proof', $jobRequest))
        ->assertOk();

    $this->actingAs($admin)
        ->get(route('requests.payment.proof', $jobRequest))
        ->assertOk();

    $this->actingAs($outsider)
        ->get(route('requests.payment.proof', $jobRequest))
        ->assertForbidden();
});

test('payment receipt can be viewed by request parties and admins only', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    $outsider = User::factory()->create();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'currency' => 'USD',
        'method' => 'wallet',
        'channel' => 'electronic',
        'gateway_provider' => 'Boma Wallet',
        'gateway_status' => 'paid',
        'gateway_transaction_id' => 'WAL-RCP-001',
        'reference' => 'WAL-RCP-001',
        'status' => 'confirmed',
        'escrow_status' => 'released',
        'paid_at' => now()->subDays(2),
        'processed_at' => now()->subDays(2),
        'confirmed_at' => now()->subDays(2),
        'released_at' => now()->subDay(),
    ]);

    $this->actingAs($customer)
        ->get(route('requests.payment.receipt', $jobRequest))
        ->assertOk()
        ->assertSee('Boma payment receipt')
        ->assertSee('BOMA-RCP-', false)
        ->assertSee('WAL-RCP-001');

    $this->actingAs($provider)
        ->get(route('requests.payment.receipt', $jobRequest))
        ->assertOk();

    $this->actingAs($admin)
        ->get(route('requests.payment.receipt', $jobRequest))
        ->assertOk();

    $this->actingAs($outsider)
        ->get(route('requests.payment.receipt', $jobRequest))
        ->assertForbidden();
});

test('user can download a currency scoped wallet statement', function () {
    $customer = User::factory()->create();

    app(WalletService::class)->credit(
        $customer,
        500,
        'wallet_deposit',
        'USD test deposit',
        [],
        'USD',
    );
    app(WalletService::class)->credit(
        $customer,
        900,
        'wallet_deposit',
        'ZiG test deposit',
        [],
        'ZWG',
    );

    $response = $this->actingAs($customer)
        ->get(route('wallet.statement', ['currency' => 'USD']))
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');

    $csv = $response->streamedContent();

    expect($csv)->toContain('USD test deposit')
        ->and($csv)->toContain('USD')
        ->and($csv)->not->toContain('ZiG test deposit');
});

test('non cash payments require a transaction reference and revisions require a reason', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider);

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 320,
            'method' => 'mobile_money',
            'paid_at' => now()->subHour()->toDateTimeString(),
        ])
        ->assertSessionHasErrors('reference');

    $jobRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'cash',
        'status' => 'submitted',
        'paid_at' => now()->subHours(2),
    ]);

    $this->actingAs($provider)
        ->patch(route('requests.payment.status.update', $jobRequest), [
            'action' => 'request_revision',
        ])
        ->assertSessionHasErrors('review_notes');
});

test('payments are blocked without an accepted quote or for unrelated users', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();
    $otherProvider = createPaymentProvider([
        'email' => 'other-payment-provider@example.com',
    ], [
        'business_name' => 'Other Steady Current Services',
    ]);
    $jobRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'status' => 'in_conversation',
    ]);

    $jobRequest->quote()->update([
        'status' => 'pending',
        'responded_at' => null,
    ]);

    $this->actingAs($customer)
        ->put(route('requests.payment.upsert', $jobRequest), [
            'amount' => 320,
            'method' => 'cash',
            'paid_at' => now()->subHour()->toDateTimeString(),
        ])
        ->assertForbidden();

    $acceptedRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'title' => 'Accepted payment authorization request',
    ]);

    $acceptedRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 320,
        'method' => 'cash',
        'status' => 'submitted',
        'paid_at' => now()->subHours(2),
    ]);

    $this->actingAs($otherProvider)
        ->patch(route('requests.payment.status.update', $acceptedRequest), [
            'action' => 'confirm',
        ])
        ->assertForbidden();
});

test('customer workspace and provider dashboard surface payment states', function () {
    $customer = User::factory()->create();
    $provider = createPaymentProvider();

    $submittedPaymentRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'title' => 'Submitted payment request',
    ]);
    $submittedPaymentRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 280,
        'method' => 'cash',
        'status' => 'submitted',
        'paid_at' => now()->subHours(3),
    ]);

    $revisionRequestedPaymentRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'title' => 'Revision payment request',
    ]);
    $revisionRequestedPaymentRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 410,
        'method' => 'mobile_money',
        'status' => 'revision_requested',
        'paid_at' => now()->subDay(),
        'revision_requested_at' => now()->subHours(5),
    ]);

    $confirmedPaymentRequest = createAcceptedQuotedPaymentRequest($customer, $provider, [
        'title' => 'Confirmed payment request',
    ]);
    $confirmedPaymentRequest->payment()->create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'amount' => 500,
        'method' => 'bank_transfer',
        'status' => 'confirmed',
        'paid_at' => now()->subDays(2),
        'confirmed_at' => now()->subDay(),
    ]);

    $this->actingAs($customer)
        ->get(route('requests.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Requests/Index')
            ->where('summary.pendingPayments', 1)
            ->where('summary.paymentsNeedingUpdate', 1)
            ->where('summary.confirmedPayments', 1)
            ->has('jobRequests.data', 3));

    $this->actingAs($provider)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('providerSummary.paymentsPendingConfirmation', 1)
            ->where('providerSummary.confirmedPayments', 1));
});
