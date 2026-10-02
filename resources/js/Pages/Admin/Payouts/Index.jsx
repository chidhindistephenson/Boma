import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function formatStatus(value) {
    return String(value || '').replace(/_/g, ' ');
}

function currencyLabel(currency, currencyOptions = {}) {
    return currencyOptions[currency] ?? currency ?? 'USD';
}

function formatAmount(value, currency = 'USD', currencyOptions = {}) {
    const amount = Number(value || 0).toLocaleString();
    const label = currencyLabel(currency, currencyOptions);

    return currency === 'USD' ? `$${amount}` : `${label} ${amount}`;
}

function StatCard({ label, value }) {
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
        </div>
    );
}

function PayoutActions({ payout }) {
    const { data, setData, errors, reset } = useForm({
        review_notes: '',
        settlement_reference: '',
        settlement_notes: '',
    });
    const [processingAction, setProcessingAction] = useState(null);
    const terminal = ['paid', 'rejected'].includes(payout.status);

    const submit = (action) => {
        setProcessingAction(action);

        router.patch(
            route('admin.payouts.update', payout.id),
            {
                action,
                review_notes: data.review_notes,
                settlement_reference: data.settlement_reference,
                settlement_notes: data.settlement_notes,
            },
            {
                preserveScroll: true,
                onSuccess: () => reset(),
                onFinish: () => setProcessingAction(null),
            },
        );
    };

    if (terminal) {
        return null;
    }

    return (
        <div className="mt-5 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <textarea
                rows={2}
                value={data.review_notes}
                onChange={(event) => setData('review_notes', event.target.value)}
                className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                placeholder="Admin note. Required when rejecting."
            />
            {errors.review_notes ? (
                <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                    {errors.review_notes}
                </p>
            ) : null}
            {payout.status === 'approved' ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Settlement reference
                        </label>
                        <input
                            value={data.settlement_reference}
                            onChange={(event) =>
                                setData('settlement_reference', event.target.value)
                            }
                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                            placeholder="Bank/EcoCash transfer reference"
                        />
                        {errors.settlement_reference ? (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                                {errors.settlement_reference}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Settlement note
                        </label>
                        <input
                            value={data.settlement_notes}
                            onChange={(event) =>
                                setData('settlement_notes', event.target.value)
                            }
                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                            placeholder="Optional payout confirmation note"
                        />
                        {errors.settlement_notes ? (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                                {errors.settlement_notes}
                            </p>
                        ) : null}
                    </div>
                </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
                {payout.status === 'pending' ? (
                    <button
                        type="button"
                        onClick={() => submit('approve')}
                        disabled={processingAction !== null}
                        className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                    >
                        Approve
                    </button>
                ) : null}
                {payout.status === 'approved' ? (
                    <button
                        type="button"
                        onClick={() => submit('mark_paid')}
                        disabled={processingAction !== null}
                        className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                    >
                        Mark paid
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={() => submit('reject')}
                    disabled={processingAction !== null}
                    className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-950 disabled:opacity-60 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/40"
                >
                    Reject and refund
                </button>
            </div>
        </div>
    );
}

export default function Index({
    filters,
    statusOptions,
    currencyOptions,
    destinationOptions,
    payouts,
    summary,
}) {
    const [form, setForm] = useState({
        status: filters.status,
        currency: filters.currency,
    });

    useEffect(() => {
        setForm({
            status: filters.status,
            currency: filters.currency,
        });
    }, [filters.currency, filters.status]);

    const submit = (event) => {
        event.preventDefault();

        router.get(
            route('admin.payouts.index'),
            {
                ...(form.status !== 'all' ? { status: form.status } : {}),
                ...(form.currency !== 'all' ? { currency: form.currency } : {}),
            },
            { preserveScroll: true, replace: true },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Admin operations
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        Payout review
                    </h2>
                </div>
            }
        >
            <Head title="Payout Review" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Pending" value={summary.pending} />
                        <StatCard label="Approved" value={summary.approved} />
                        <StatCard label="Paid" value={summary.paid} />
                        <StatCard label="Rejected" value={summary.rejected} />
                    </div>

                    <form
                        onSubmit={submit}
                        className="grid gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90 sm:grid-cols-[1fr_1fr_auto]"
                    >
                        <div>
                            <label className="boma-stat-card-title">Status</label>
                            <select
                                value={form.status}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        status: event.target.value,
                                    }))
                                }
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                            >
                                <option value="all">All statuses</option>
                                {Object.entries(statusOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="boma-stat-card-title">Currency</label>
                            <select
                                value={form.currency}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        currency: event.target.value,
                                    }))
                                }
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
                        <div className="flex items-end">
                            <button
                                type="submit"
                                className="w-full rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white dark:bg-white dark:text-zinc-950"
                            >
                                Apply
                            </button>
                        </div>
                    </form>

                    <div className="space-y-4">
                        {payouts.data.length ? payouts.data.map((payout) => (
                            <article
                                key={payout.id}
                                className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90"
                            >
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                            {formatStatus(payout.status)}
                                        </p>
                                        <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                            {formatAmount(payout.amount, payout.currency, currencyOptions)}
                                        </h3>
                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                            {payout.provider.businessName || payout.provider.name} · {payout.provider.email}
                                        </p>
                                    </div>
                                    <div className="rounded-[1.3rem] border border-zinc-200 bg-zinc-50/90 p-4 text-sm dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="font-semibold text-zinc-950 dark:text-white">
                                            {payout.destinationLabel}
                                        </p>
                                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                                            {destinationOptions[payout.destinationType] ?? formatStatus(payout.destinationType)}
                                        </p>
                                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                                            {payout.accountReference}
                                        </p>
                                    </div>
                                </div>
                                {payout.notes ? (
                                    <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        {payout.notes}
                                    </p>
                                ) : null}
                                {payout.settlementReference ? (
                                    <div className="mt-4 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 p-4 text-sm dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Settlement
                                        </p>
                                        <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                                            {payout.settlementReference}
                                        </p>
                                        {payout.settlementNotes ? (
                                            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                                                {payout.settlementNotes}
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                                <PayoutActions payout={payout} />
                            </article>
                        )) : (
                            <div className="rounded-[2rem] border border-dashed border-zinc-300 p-10 text-center dark:border-white/10">
                                <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                    No payout requests found.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
