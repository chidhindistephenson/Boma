import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function formatStatus(value) {
    return String(value || 'not set').replace(/_/g, ' ');
}

function currencyLabel(currency, currencyOptions = {}) {
    return currencyOptions[currency] ?? currency ?? 'USD';
}

function formatAmount(value, currency = 'USD', currencyOptions = {}) {
    const amount = Number(value || 0).toLocaleString();
    if (currency === 'all') {
        return `${amount} mixed`;
    }

    const label = currencyLabel(currency, currencyOptions);

    return currency === 'USD' ? `$${amount}` : `${label} ${amount}`;
}

function StatCard({ label, value, helper }) {
    return (
        <div className="boma-stat-card">
            <div className="flex items-center gap-3">
                <span className="boma-stat-card-icon">
                    <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.8"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v12m6-6H6"
                        />
                    </svg>
                </span>
                <p className="boma-stat-card-title">{label}</p>
            </div>
            <p className="boma-stat-card-value mt-5">{value}</p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{helper}</p>
        </div>
    );
}

function Panel({ title, subtitle, children }) {
    return (
        <section className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                    {title}
                </p>
                {subtitle ? (
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {subtitle}
                    </p>
                ) : null}
            </div>
            <div className="mt-5">{children}</div>
        </section>
    );
}

export default function Index({
    filters,
    currencyOptions,
    summary,
    recentPayments,
    recentTransactions,
    depositQueue,
    payoutQueue,
}) {
    const [currency, setCurrency] = useState(filters.currency);
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    useEffect(() => {
        setCurrency(filters.currency);
        setFrom(filters.from ?? '');
        setTo(filters.to ?? '');
    }, [filters.currency, filters.from, filters.to]);

    const filterPayload = () => ({
        ...(currency !== 'all' ? { currency } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
    });

    const applyCurrency = (event) => {
        event.preventDefault();

        router.get(
            route('admin.finance.index'),
            filterPayload(),
            { preserveScroll: true, replace: true },
        );
    };

    const displayCurrency = filters.currency;
    const cards = [
        ['Captured payments', summary.capturedPayments, 'Confirmed electronic funds'],
        ['Escrow held', summary.escrowHeld, 'Not released to providers yet'],
        ['Disputed escrow', summary.disputedEscrow, 'Paused for admin resolution'],
        ['Released earnings', summary.releasedEarnings, 'Credited to provider wallets'],
        ['Platform revenue', summary.platformRevenue, 'Fees retained by Boma'],
        ['Wallet liability', summary.walletLiability, 'Total user wallet balances'],
        ['Refunded payments', summary.refundedPayments, 'Returned to customer wallets'],
        ['Pending gateway', summary.pendingGateway, 'Checkout started but not paid'],
        ['Pending deposits', summary.pendingDeposits, 'Wallet top-ups awaiting approval'],
        ['Gateway deposits', summary.pendingGatewayDeposits, 'Wallet top-ups awaiting gateway confirmation'],
        ['Approved deposits', summary.approvedDeposits, 'Top-ups credited to wallets'],
        ['Manual external', summary.externalManual, 'Settled outside Boma'],
        ['Pending payouts', summary.pendingPayouts, 'Awaiting admin review'],
        ['Paid payouts', summary.paidPayouts, 'Completed payout requests'],
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Admin operations
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        Finance overview
                    </h2>
                </div>
            }
        >
            <Head title="Finance Overview" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <form
                        onSubmit={applyCurrency}
                        className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90 sm:flex-row sm:items-end sm:justify-between"
                    >
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                Financial control center
                            </p>
                            <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                Escrow, wallets, and payouts
                            </h3>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div>
                                <label className="boma-stat-card-title">
                                    Currency
                                </label>
                                <select
                                    value={currency}
                                    onChange={(event) => setCurrency(event.target.value)}
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                >
                                    <option value="all">All currencies</option>
                                    {Object.entries(currencyOptions).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="boma-stat-card-title">
                                    From
                                </label>
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(event) => setFrom(event.target.value)}
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="boma-stat-card-title">
                                    To
                                </label>
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(event) => setTo(event.target.value)}
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                />
                            </div>
                            <button
                                type="submit"
                                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white dark:bg-white dark:text-zinc-950"
                            >
                                Apply
                            </button>
                            <a
                                href={route('admin.finance.export', filterPayload())}
                                className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/40"
                            >
                                Export CSV
                            </a>
                        </div>
                    </form>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {cards.map(([label, value, helper]) => (
                            <StatCard
                                key={label}
                                label={label}
                                value={formatAmount(value, displayCurrency, currencyOptions)}
                                helper={helper}
                            />
                        ))}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                        <Panel
                            title="Recent payments"
                            subtitle="Newest request payments across gateway, wallet, and manual records."
                        >
                            <div className="divide-y divide-zinc-200 dark:divide-white/10">
                                {recentPayments.length ? recentPayments.map((payment) => (
                                    <div key={payment.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <Link
                                                href={route('requests.show', payment.requestId)}
                                                className="font-semibold text-zinc-950 underline-offset-4 hover:underline dark:text-white"
                                            >
                                                {payment.requestTitle}
                                            </Link>
                                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                {payment.customerName} to {payment.providerName || 'provider pending'}
                                            </p>
                                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                                {formatStatus(payment.status)} / escrow {formatStatus(payment.escrowStatus)}
                                            </p>
                                        </div>
                                        <div className="text-left lg:text-right">
                                            <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                {formatAmount(payment.amount, payment.currency, currencyOptions)}
                                            </p>
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Fee {formatAmount(payment.platformFeeAmount, payment.currency, currencyOptions)}
                                                {' / '}
                                                Net {formatAmount(payment.providerNetAmount, payment.currency, currencyOptions)}
                                            </p>
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                {payment.gatewayProvider || payment.reference || 'No gateway'}
                                            </p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="py-8 text-sm text-zinc-500 dark:text-zinc-400">
                                        No payments found.
                                    </p>
                                )}
                            </div>
                        </Panel>

                        <Panel
                            title="Deposit queue"
                            subtitle="Customer wallet funding requests waiting for admin approval."
                        >
                            <div className="divide-y divide-zinc-200 dark:divide-white/10">
                                {depositQueue.length ? depositQueue.map((deposit) => (
                                    <div key={deposit.id} className="py-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-semibold text-zinc-950 dark:text-white">
                                                    {deposit.userName}
                                                </p>
                                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                    {deposit.userEmail}
                                                </p>
                                            </div>
                                            <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:text-zinc-300">
                                                {formatStatus(deposit.status)}
                                            </span>
                                        </div>
                                        <p className="mt-3 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                            {formatAmount(deposit.amount, deposit.currency, currencyOptions)}
                                        </p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                            {formatStatus(deposit.source)}
                                            {' / '}
                                            {deposit.reference || deposit.gatewayProvider || 'No reference yet'}
                                        </p>
                                        {deposit.paymentMethod ? (
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                {deposit.paymentMethod.label || deposit.paymentMethod.brand} ending {deposit.paymentMethod.lastFour}
                                            </p>
                                        ) : null}
                                        {deposit.gatewayStatus ? (
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Gateway {formatStatus(deposit.gatewayStatus)}
                                            </p>
                                        ) : null}
                                    </div>
                                )) : (
                                    <p className="py-8 text-sm text-zinc-500 dark:text-zinc-400">
                                        No pending deposit requests.
                                    </p>
                                )}
                            </div>
                            <Link
                                href={route('admin.wallet-deposits.index')}
                                className="mt-5 inline-flex rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white dark:bg-white dark:text-zinc-950"
                            >
                                Open deposit review
                            </Link>
                        </Panel>
                    </div>

                    <Panel
                        title="Payout queue"
                        subtitle="Provider payout requests still requiring action."
                    >
                        <div className="divide-y divide-zinc-200 dark:divide-white/10">
                            {payoutQueue.length ? payoutQueue.map((payout) => (
                                <div key={payout.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <p className="font-semibold text-zinc-950 dark:text-white">
                                            {payout.providerName}
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                            {payout.destinationLabel}
                                        </p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                            {formatStatus(payout.status)}
                                        </p>
                                    </div>
                                    <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                        {formatAmount(payout.amount, payout.currency, currencyOptions)}
                                    </p>
                                </div>
                            )) : (
                                <p className="py-8 text-sm text-zinc-500 dark:text-zinc-400">
                                    No pending or approved payouts.
                                </p>
                            )}
                        </div>
                        <Link
                            href={route('admin.payouts.index')}
                            className="mt-5 inline-flex rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white dark:bg-white dark:text-zinc-950"
                        >
                            Open payout review
                        </Link>
                    </Panel>

                    <Panel
                        title="Wallet ledger"
                        subtitle="Newest platform wallet movements across customers and providers."
                    >
                        <div className="divide-y divide-zinc-200 dark:divide-white/10">
                            {recentTransactions.length ? recentTransactions.map((transaction) => (
                                <div key={transaction.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <p className="font-semibold text-zinc-950 dark:text-white">
                                            {transaction.description || formatStatus(transaction.type)}
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                            {transaction.userName} / {formatStatus(transaction.userRole)}
                                        </p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                            {transaction.reference}
                                        </p>
                                    </div>
                                    <div className="text-left lg:text-right">
                                        <p className={`font-display text-xl font-semibold ${transaction.direction === 'credit' ? 'text-zinc-950 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                            {transaction.direction === 'credit' ? '+' : '-'}
                                            {formatAmount(transaction.amount, transaction.currency, currencyOptions)}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            Balance {formatAmount(transaction.balanceAfter, transaction.currency, currencyOptions)}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <p className="py-8 text-sm text-zinc-500 dark:text-zinc-400">
                                    No wallet movements found.
                                </p>
                            )}
                        </div>
                    </Panel>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
