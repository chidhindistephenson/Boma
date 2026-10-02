import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

function currencyLabel(currency, currencyOptions = {}) {
    return currencyOptions[currency] ?? currency ?? 'USD';
}

function formatAmount(value, currency = 'USD', currencyOptions = {}) {
    const label = currencyLabel(currency, currencyOptions);
    const amount = Number(value || 0).toLocaleString();

    return currency === 'USD' ? `$${amount}` : `${label} ${amount}`;
}

function formatStatus(value) {
    return String(value || '').replace(/_/g, ' ');
}

export default function BillingPanel({
    wallet,
    wallets,
    paymentMethods,
    currencyOptions = {},
    payoutRequests = [],
    walletDepositRequests = [],
    payoutDestinationOptions = {},
    canRequestPayout = false,
    subscriptionPlans = [],
    providerSubscription = null,
}) {
    const savedCards = paymentMethods ?? [];
    const defaultCard = savedCards.find((method) => method.isDefault) ?? savedCards[0];
    const currentWallet = wallet ?? { balance: 0, currency: 'USD', transactions: [] };
    const walletList = wallets?.length ? wallets : [currentWallet];
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const currentPlanCode = providerSubscription?.entitlements?.planCode;

    const depositForm = useForm({
        amount: '',
        currency: currentWallet.currency ?? 'USD',
        source: 'online_checkout',
        user_payment_method_id: '',
        reference: '',
    });
    const cardForm = useForm({
        brand: 'visa',
        label: '',
        last_four: '',
        exp_month: '',
        exp_year: '',
        gateway_token: '',
        is_default: savedCards.length === 0,
    });
    const payoutForm = useForm({
        amount: '',
        currency: currentWallet.currency ?? 'USD',
        destination_type: 'mobile_money',
        destination_label: '',
        account_reference: '',
        notes: '',
    });

    const closeDepositModal = () => {
        setIsDepositModalOpen(false);
        depositForm.clearErrors();
    };

    const closeCardModal = () => {
        setIsCardModalOpen(false);
        cardForm.clearErrors();
    };

    const closePayoutModal = () => {
        setIsPayoutModalOpen(false);
        payoutForm.clearErrors();
    };

    const submitDeposit = (event) => {
        event.preventDefault();
        depositForm.post(route('wallet.deposits.store'), {
            preserveScroll: true,
            onSuccess: () => {
                depositForm.reset();
                setIsDepositModalOpen(false);
            },
        });
    };

    const submitCard = (event) => {
        event.preventDefault();
        cardForm.post(route('payment-methods.store'), {
            preserveScroll: true,
            onSuccess: () => {
                cardForm.reset('label', 'last_four', 'exp_month', 'exp_year', 'gateway_token');
                setIsCardModalOpen(false);
            },
        });
    };

    const submitPayout = (event) => {
        event.preventDefault();
        payoutForm.post(route('wallet.payouts.store'), {
            preserveScroll: true,
            onSuccess: () => {
                payoutForm.reset();
                setIsPayoutModalOpen(false);
            },
        });
    };

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-zinc-200 bg-zinc-50/90 p-6 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                    Boma wallet
                </p>
                <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {walletList.map((item) => (
                            <div
                                key={item.currency}
                                className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
                            >
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    {currencyLabel(item.currency, currencyOptions)} balance
                                </p>
                                <p className="mt-3 font-display text-4xl font-semibold text-zinc-950 dark:text-white">
                                    {formatAmount(item.balance, item.currency, currencyOptions)}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div>
                        <p className="font-display text-5xl font-semibold text-zinc-950 dark:text-white">
                            {formatAmount(currentWallet.balance, currentWallet.currency, currencyOptions)}
                        </p>
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            Available balance for paying providers inside Boma.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="w-fit rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
                            {currencyLabel(currentWallet.currency, currencyOptions)}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsDepositModalOpen(true)}
                            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                        >
                            Fund wallet
                        </button>
                        <a
                            href={route('wallet.statement', {
                                currency: currentWallet.currency,
                            })}
                            className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/40"
                        >
                            Statement
                        </a>
                        {canRequestPayout ? (
                            <button
                                type="button"
                                onClick={() => setIsPayoutModalOpen(true)}
                                className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/40"
                            >
                                Request payout
                            </button>
                        ) : null}
                    </div>
                </div>
            </section>

            {subscriptionPlans.length ? (
                <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                Provider subscription
                            </p>
                            <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                {providerSubscription?.entitlements?.planName ?? 'Choose a plan'}
                            </h3>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                Plans control storefront limits, featured services, trade expansion, and premium analytics.
                            </p>
                        </div>
                        {providerSubscription?.current ? (
                            <button
                                type="button"
                                onClick={() => router.delete(route('provider.subscriptions.destroy'), { preserveScroll: true })}
                                className="w-fit rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:border-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/40"
                            >
                                Cancel plan
                            </button>
                        ) : null}
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        {subscriptionPlans.map((plan) => {
                            const isCurrent = plan.code === currentPlanCode;

                            return (
                                <article
                                    key={plan.id}
                                    className={`rounded-[1.5rem] border p-5 ${
                                        isCurrent
                                            ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                            : 'border-zinc-200 bg-zinc-50 text-zinc-950 dark:border-white/10 dark:bg-white/[0.03] dark:text-white'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-display text-xl font-semibold">
                                                {plan.name}
                                            </p>
                                            <p className="mt-2 text-sm opacity-70">
                                                {plan.description}
                                            </p>
                                        </div>
                                        {isCurrent ? (
                                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-950 dark:bg-zinc-950 dark:text-white">
                                                Current
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="mt-5 font-display text-3xl font-semibold">
                                        {formatAmount(plan.price, plan.currency, currencyOptions)}
                                        <span className="ml-1 text-sm font-medium opacity-60">
                                            / {plan.billingInterval}
                                        </span>
                                    </p>
                                    <div className="mt-5 grid gap-2 text-sm opacity-80">
                                        <p>{plan.serviceLimit} service packages</p>
                                        <p>{plan.featuredServiceLimit} featured services</p>
                                        <p>{plan.portfolioLimit} portfolio items</p>
                                        <p>{plan.tradeCategoryLimit} trade categories</p>
                                        <p>{plan.hasPremiumAnalytics ? 'Premium analytics included' : 'Standard analytics'}</p>
                                    </div>
                                    {!isCurrent ? (
                                        <button
                                            type="button"
                                            onClick={() => router.post(route('provider.subscriptions.store', plan.id), {}, { preserveScroll: true })}
                                            className="mt-5 w-full rounded-full bg-zinc-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                                        >
                                            {plan.price > 0 ? 'Pay from wallet' : 'Activate'}
                                        </button>
                                    ) : null}
                                </article>
                            );
                        })}
                    </div>
                </section>
            ) : null}

            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                            Saved cards
                        </p>
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            Gateway-tokenized cards for faster checkout.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCardModalOpen(true)}
                        className="w-fit rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-950 dark:border-white/10 dark:bg-white dark:text-zinc-950"
                    >
                        Add card
                    </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {savedCards.length ? savedCards.map((method) => (
                        <div key={method.id} className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-semibold capitalize text-zinc-950 dark:text-white">
                                        {method.brand} ending {method.lastFour}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                        Expires {String(method.expMonth).padStart(2, '0')}/{method.expYear}
                                    </p>
                                </div>
                                {method.isDefault ? (
                                    <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white dark:bg-white dark:text-zinc-950">
                                        Default
                                    </span>
                                ) : null}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {!method.isDefault ? (
                                    <button
                                        type="button"
                                        onClick={() => router.patch(route('payment-methods.default', method.id), {}, { preserveScroll: true })}
                                        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/40"
                                    >
                                        Make default
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => router.delete(route('payment-methods.destroy', method.id), { preserveScroll: true })}
                                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/40"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className="rounded-[1.5rem] border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400 md:col-span-2">
                            No saved cards yet. Add a Visa or Mastercard after the payment gateway returns a secure token.
                        </p>
                    )}
                </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                    Recent wallet activity
                </p>
                <div className="mt-5 divide-y divide-zinc-200 dark:divide-white/10">
                    {walletList.flatMap((item) => item.transactions ?? []).length ? walletList.flatMap((item) => item.transactions ?? []).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between gap-4 py-4">
                            <div>
                                <p className="font-semibold text-zinc-950 dark:text-white">
                                    {transaction.description || formatStatus(transaction.type)}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                    {transaction.reference}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className={`font-display text-xl font-semibold ${transaction.direction === 'credit' ? 'text-zinc-950 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                    {transaction.direction === 'credit' ? '+' : '-'}{formatAmount(transaction.amount, transaction.currency, currencyOptions)}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Balance {formatAmount(transaction.balanceAfter, transaction.currency, currencyOptions)}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <p className="py-8 text-sm text-zinc-500 dark:text-zinc-400">No wallet activity yet.</p>
                    )}
                </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                    Funding requests
                </p>
                <div className="mt-5 divide-y divide-zinc-200 dark:divide-white/10">
                    {walletDepositRequests.length ? walletDepositRequests.map((deposit) => (
                        <div key={deposit.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-semibold text-zinc-950 dark:text-white">
                                    {formatAmount(deposit.amount, deposit.currency, currencyOptions)} from {formatStatus(deposit.source)}
                                </p>
                                {deposit.paymentMethod ? (
                                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                        {deposit.paymentMethod.label || deposit.paymentMethod.brand} ending {deposit.paymentMethod.lastFour}
                                    </p>
                                ) : null}
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                    {deposit.reference || deposit.gatewayProvider || 'No reference yet'}
                                </p>
                                {deposit.gatewayStatus ? (
                                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                        Gateway {formatStatus(deposit.gatewayStatus)}
                                    </p>
                                ) : null}
                                {deposit.reviewNotes ? (
                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                        {deposit.reviewNotes}
                                    </p>
                                ) : null}
                                {deposit.status === 'pending_gateway' ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {deposit.gatewayRedirectUrl ? (
                                            <a
                                                href={deposit.gatewayRedirectUrl}
                                                className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white dark:bg-white dark:text-zinc-950"
                                            >
                                                Continue checkout
                                            </a>
                                        ) : null}
                                        {deposit.gatewayProvider === 'Pesepay' ? (
                                            <button
                                                type="button"
                                                onClick={() => router.post(route('wallet.deposits.pesepay.sync', deposit.id), {}, { preserveScroll: true })}
                                                className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 dark:border-white/10 dark:text-zinc-300"
                                            >
                                                Sync status
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                            <span className="w-fit rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:text-zinc-300">
                                {formatStatus(deposit.status)}
                            </span>
                        </div>
                    )) : (
                        <p className="py-8 text-sm text-zinc-500 dark:text-zinc-400">
                            No wallet funding requests yet.
                        </p>
                    )}
                </div>
            </section>

            {canRequestPayout ? (
                <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                Provider payouts
                            </p>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                Withdraw released provider earnings from your Boma wallet.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsPayoutModalOpen(true)}
                            className="w-fit rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                        >
                            Request payout
                        </button>
                    </div>

                    <div className="mt-5 divide-y divide-zinc-200 dark:divide-white/10">
                        {payoutRequests.length ? payoutRequests.map((payout) => (
                            <div key={payout.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-semibold text-zinc-950 dark:text-white">
                                        {formatAmount(payout.amount, payout.currency, currencyOptions)} to {payout.destinationLabel}
                                    </p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                        {formatStatus(payout.destinationType)} · {payout.accountReference}
                                    </p>
                                    {payout.reviewNotes ? (
                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                            {payout.reviewNotes}
                                        </p>
                                    ) : null}
                                    {payout.settlementReference ? (
                                        <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-white">
                                            Settlement ref: {payout.settlementReference}
                                        </p>
                                    ) : null}
                                    {payout.settlementNotes ? (
                                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                            {payout.settlementNotes}
                                        </p>
                                    ) : null}
                                </div>
                                <span className="w-fit rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:text-zinc-300">
                                    {formatStatus(payout.status)}
                                </span>
                            </div>
                        )) : (
                            <p className="py-8 text-sm text-zinc-500 dark:text-zinc-400">
                                No payout requests yet.
                            </p>
                        )}
                    </div>
                </section>
            ) : null}

            <Modal show={isDepositModalOpen} onClose={closeDepositModal} maxWidth="2xl">
                <form onSubmit={submitDeposit} className="bg-white p-6 dark:bg-zinc-950">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                        Fund wallet
                    </p>
                    <h3 className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        Add money to your Boma wallet
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        Use online checkout for automatic wallet credit, or submit a manual deposit reference for admin approval.
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Deposit amount
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={depositForm.data.amount}
                                onChange={(event) => depositForm.setData('amount', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                placeholder="e.g. 50"
                            />
                            <InputError className="mt-2" message={depositForm.errors.amount} />
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Currency
                            </label>
                            <select
                                value={depositForm.data.currency}
                                onChange={(event) => depositForm.setData('currency', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                            >
                                {Object.entries(currencyOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            <InputError className="mt-2" message={depositForm.errors.currency} />
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Funding source
                            </label>
                            <select
                                value={depositForm.data.source}
                                onChange={(event) => {
                                    const nextSource = event.target.value;
                                    depositForm.setData({
                                        ...depositForm.data,
                                        source: nextSource,
                                        user_payment_method_id: nextSource === 'saved_card' ? String(defaultCard?.id ?? '') : '',
                                        reference: ['online_checkout', 'saved_card'].includes(nextSource) ? '' : depositForm.data.reference,
                                    });
                                }}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                            >
                                <option value="online_checkout">Online checkout</option>
                                <option value="saved_card">Saved card</option>
                                <option value="cash_deposit">Cash deposit</option>
                                <option value="mobile_money">Mobile money</option>
                                <option value="bank_transfer">Bank transfer</option>
                                <option value="card">Card</option>
                            </select>
                            <InputError className="mt-2" message={depositForm.errors.source} />
                        </div>

                        {depositForm.data.source === 'saved_card' ? (
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    Saved card
                                </label>
                                <select
                                    value={depositForm.data.user_payment_method_id}
                                    onChange={(event) => depositForm.setData('user_payment_method_id', event.target.value)}
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                >
                                    <option value="">Choose saved card</option>
                                    {savedCards.map((method) => (
                                        <option key={method.id} value={method.id}>
                                            {method.brand} ending {method.lastFour} {method.isDefault ? '(default)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <InputError className="mt-2" message={depositForm.errors.user_payment_method_id} />
                                {!savedCards.length ? (
                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                        Add a card first, then use it to fund your wallet.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        {!['online_checkout', 'saved_card'].includes(depositForm.data.source) ? (
                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    Reference
                                </label>
                                <input
                                    type="text"
                                    value={depositForm.data.reference}
                                    onChange={(event) => depositForm.setData('reference', event.target.value)}
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                    placeholder="Receipt, transfer, or deposit reference"
                                />
                                <InputError className="mt-2" message={depositForm.errors.reference} />
                            </div>
                        ) : (
                            <div className="sm:col-span-2 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                {depositForm.data.source === 'saved_card'
                                    ? 'Boma will charge the selected saved card through the payment gateway and credit your wallet after confirmation.'
                                    : 'Boma will send you to the secure payment checkout and credit your wallet after the gateway confirms the payment.'}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeDepositModal}
                            className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:border-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/40"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={depositForm.processing}
                            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                        >
                            {depositForm.processing
                                ? 'Funding...'
                                : (depositForm.data.source === 'online_checkout' ? 'Continue to checkout' : 'Submit for approval')}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={isCardModalOpen} onClose={closeCardModal} maxWidth="2xl">
                <form onSubmit={submitCard} className="bg-white p-6 dark:bg-zinc-950">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                        Add card
                    </p>
                    <h3 className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        Save a tokenized payment card
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        Boma stores only the card brand, last four digits, expiry, and gateway token.
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Brand
                            </label>
                            <select
                                value={cardForm.data.brand}
                                onChange={(event) => cardForm.setData('brand', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                            >
                                <option value="visa">Visa</option>
                                <option value="mastercard">Mastercard</option>
                                <option value="amex">Amex</option>
                                <option value="other">Other</option>
                            </select>
                            <InputError className="mt-2" message={cardForm.errors.brand} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Label
                            </label>
                            <input
                                value={cardForm.data.label}
                                onChange={(event) => cardForm.setData('label', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                placeholder="Eco bank Visa"
                            />
                            <InputError className="mt-2" message={cardForm.errors.label} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Last four
                            </label>
                            <input
                                maxLength="4"
                                value={cardForm.data.last_four}
                                onChange={(event) => cardForm.setData('last_four', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                placeholder="4242"
                            />
                            <InputError className="mt-2" message={cardForm.errors.last_four} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    Month
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={cardForm.data.exp_month}
                                    onChange={(event) => cardForm.setData('exp_month', event.target.value)}
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                    placeholder="07"
                                />
                                <InputError className="mt-2" message={cardForm.errors.exp_month} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    Year
                                </label>
                                <input
                                    type="number"
                                    value={cardForm.data.exp_year}
                                    onChange={(event) => cardForm.setData('exp_year', event.target.value)}
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                    placeholder="2030"
                                />
                                <InputError className="mt-2" message={cardForm.errors.exp_year} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Gateway token
                        </label>
                        <input
                            value={cardForm.data.gateway_token}
                            onChange={(event) => cardForm.setData('gateway_token', event.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                            placeholder="tok_sandbox_visa_4242"
                        />
                        <InputError className="mt-2" message={cardForm.errors.gateway_token} />
                    </div>

                    <label className="mt-4 flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                        <input
                            type="checkbox"
                            checked={cardForm.data.is_default}
                            onChange={(event) => cardForm.setData('is_default', event.target.checked)}
                        />
                        Use as default card
                    </label>

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeCardModal}
                            className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:border-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/40"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={cardForm.processing}
                            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                        >
                            {cardForm.processing ? 'Saving...' : 'Save card'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={isPayoutModalOpen} onClose={closePayoutModal} maxWidth="2xl">
                <form onSubmit={submitPayout} className="bg-white p-6 dark:bg-zinc-950">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                        Request payout
                    </p>
                    <h3 className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        Withdraw provider earnings
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        Payouts are reviewed by administrators before money is sent to your selected destination.
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Amount
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={payoutForm.data.amount}
                                onChange={(event) => payoutForm.setData('amount', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                placeholder="e.g. 120"
                            />
                            <InputError className="mt-2" message={payoutForm.errors.amount} />
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Currency
                            </label>
                            <select
                                value={payoutForm.data.currency}
                                onChange={(event) => payoutForm.setData('currency', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                            >
                                {Object.entries(currencyOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            <InputError className="mt-2" message={payoutForm.errors.currency} />
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Destination type
                            </label>
                            <select
                                value={payoutForm.data.destination_type}
                                onChange={(event) => payoutForm.setData('destination_type', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                            >
                                {Object.entries(payoutDestinationOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            <InputError className="mt-2" message={payoutForm.errors.destination_type} />
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Destination label
                            </label>
                            <input
                                value={payoutForm.data.destination_label}
                                onChange={(event) => payoutForm.setData('destination_label', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                placeholder="EcoCash, NMB, Visa card"
                            />
                            <InputError className="mt-2" message={payoutForm.errors.destination_label} />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Account or wallet reference
                            </label>
                            <input
                                value={payoutForm.data.account_reference}
                                onChange={(event) => payoutForm.setData('account_reference', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                placeholder="Phone number, account number, or token"
                            />
                            <InputError className="mt-2" message={payoutForm.errors.account_reference} />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Notes
                            </label>
                            <textarea
                                rows={3}
                                value={payoutForm.data.notes}
                                onChange={(event) => payoutForm.setData('notes', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                placeholder="Optional payout instructions"
                            />
                            <InputError className="mt-2" message={payoutForm.errors.notes} />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closePayoutModal}
                            className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:border-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/40"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={payoutForm.processing}
                            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                        >
                            {payoutForm.processing ? 'Requesting...' : 'Request payout'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
