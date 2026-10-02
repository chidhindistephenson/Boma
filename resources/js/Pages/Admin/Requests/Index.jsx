import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function formatStatus(value) {
    return value ? value.replace(/_/g, ' ') : 'not set';
}

function formatAmount(value) {
    return value ? Number(value).toLocaleString() : null;
}

function buildQuery(filters) {
    const query = {};

    if (filters.q.trim()) {
        query.q = filters.q.trim();
    }

    if (filters.status !== 'all') {
        query.status = filters.status;
    }

    if (filters.urgency !== 'all') {
        query.urgency = filters.urgency;
    }

    if (filters.category !== 'all') {
        query.category = filters.category;
    }

    if (filters.assignment !== 'all') {
        query.assignment = filters.assignment;
    }

    return query;
}

function requestSummaryIcon(label) {
    const normalized = String(label).toLowerCase();

    if (normalized.includes('active')) {
        return 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z';
    }

    if (normalized.includes('closed')) {
        return 'm4.5 12.75 6 6 9-13.5';
    }

    if (normalized.includes('unassigned')) {
        return 'M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z';
    }

    return 'M9 12h6m-6 4h6m2.25 5H6.75A2.25 2.25 0 0 1 4.5 18.75V5.25A2.25 2.25 0 0 1 6.75 3h7.5L19.5 8.25v10.5A2.25 2.25 0 0 1 17.25 21Z';
}

function RequestSummaryCard({ label, value }) {
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
                            d={requestSummaryIcon(label)}
                        />
                    </svg>
                </span>
                <p className="boma-stat-card-title">{label}</p>
            </div>
            <p className="boma-stat-card-value mt-5">{value}</p>
        </div>
    );
}

export default function Index({
    filters,
    categories,
    statusOptions,
    urgencyOptions,
    jobRequests,
    summary,
}) {
    const [form, setForm] = useState({
        q: filters.q,
        status: filters.status,
        urgency: filters.urgency,
        category: filters.category,
        assignment: filters.assignment,
    });
    const summaryCards = [
        ['Total requests', summary.total],
        ['Active', summary.active],
        ['Closed', summary.closed],
        ['Unassigned', summary.unassigned],
    ];

    useEffect(() => {
        setForm({
            q: filters.q,
            status: filters.status,
            urgency: filters.urgency,
            category: filters.category,
            assignment: filters.assignment,
        });
    }, [
        filters.assignment,
        filters.category,
        filters.q,
        filters.status,
        filters.urgency,
    ]);

    const submit = (event) => {
        event.preventDefault();

        router.get(route('admin.requests.index'), buildQuery(form), {
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const defaults = {
            q: '',
            status: 'all',
            urgency: 'all',
            category: 'all',
            assignment: 'all',
        };

        setForm(defaults);

        router.get(route('admin.requests.index'), {}, {
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Admin operations
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        Request oversight
                    </h2>
                </div>
            }
        >
            <Head title="Request Oversight" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {summaryCards.map(([label, value]) => (
                            <RequestSummaryCard
                                key={label}
                                label={label}
                                value={value}
                            />
                        ))}
                    </div>

                    <form
                        onSubmit={submit}
                        className="grid gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90 lg:grid-cols-[minmax(220px,1.2fr)_0.8fr_0.8fr_0.8fr_0.8fr_auto_auto]"
                    >
                        <div>
                            <label className="boma-stat-card-title">
                                Search
                            </label>
                            <input
                                type="search"
                                value={form.q}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        q: event.target.value,
                                    }))
                                }
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                placeholder="Title, customer, provider, location"
                            />
                        </div>

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
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
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
                            <label className="boma-stat-card-title">Urgency</label>
                            <select
                                value={form.urgency}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        urgency: event.target.value,
                                    }))
                                }
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                            >
                                <option value="all">All urgency levels</option>
                                {Object.entries(urgencyOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="boma-stat-card-title">Category</label>
                            <select
                                value={form.category}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        category: event.target.value,
                                    }))
                                }
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                            >
                                <option value="all">All categories</option>
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="boma-stat-card-title">Assignment</label>
                            <select
                                value={form.assignment}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        assignment: event.target.value,
                                    }))
                                }
                                className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                            >
                                <option value="all">All requests</option>
                                <option value="targeted">Targeted</option>
                                <option value="open">Open / no provider</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="self-end rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                        >
                            Apply
                        </button>
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="self-end rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                        >
                            Reset
                        </button>
                    </form>

                    <section className="space-y-6">
                            {jobRequests.data.length ? (
                                <>
                                    <div className="space-y-4">
                                        {jobRequests.data.map((jobRequest) => (
                                            <Link
                                                key={jobRequest.id}
                                                href={route(
                                                    'requests.show',
                                                    jobRequest.id,
                                                )}
                                                className="block rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                            >
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                    <div>
                                                        <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                            {jobRequest.title}
                                                        </p>
                                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                            {jobRequest.category} / from{' '}
                                                            {jobRequest.customerName}
                                                        </p>
                                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                            {jobRequest.providerLabel}
                                                        </p>
                                                        <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                            {jobRequest.locationLabel ||
                                                                'Location pending'}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {jobRequest.quoteStatus ? (
                                                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                Quote {formatStatus(jobRequest.quoteStatus)}
                                                            </span>
                                                        ) : null}
                                                        {jobRequest.quoteAmount ? (
                                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                Quote {formatAmount(jobRequest.quoteAmount)}
                                                            </span>
                                                        ) : null}
                                                        {jobRequest.scheduleStatus ? (
                                                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                Visit {formatStatus(jobRequest.scheduleStatus)}
                                                            </span>
                                                        ) : null}
                                                        {jobRequest.paymentStatus ? (
                                                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                Payment {formatStatus(jobRequest.paymentStatus)}
                                                            </span>
                                                        ) : null}
                                                        {jobRequest.paymentAmount ? (
                                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                Payment {formatAmount(jobRequest.paymentAmount)}
                                                            </span>
                                                        ) : null}
                                                        {jobRequest.paymentMethod ? (
                                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                {formatStatus(jobRequest.paymentMethod)}
                                                            </span>
                                                        ) : null}
                                                        {jobRequest.paymentProofUrl ? (
                                                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                Proof attached
                                                            </span>
                                                        ) : null}
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {formatStatus(
                                                                jobRequest.status,
                                                            )}
                                                        </span>
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {formatStatus(
                                                                jobRequest.urgency,
                                                            )}
                                                        </span>
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {jobRequest.messageCount}{' '}
                                                            message
                                                            {jobRequest.messageCount === 1
                                                                ? ''
                                                                : 's'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    <span>
                                                        Created {jobRequest.createdAt}
                                                    </span>
                                                    {jobRequest.scheduledFor ? (
                                                        <span>
                                                            Visit {jobRequest.scheduledFor}
                                                        </span>
                                                    ) : null}
                                                    <span>
                                                        Last message{' '}
                                                        {jobRequest.lastMessageAt ??
                                                            'none'}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>

                                    <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                            Page {jobRequests.current_page} of{' '}
                                            {jobRequests.last_page}
                                        </p>

                                        <div className="flex gap-3">
                                            {jobRequests.prev_page_url ? (
                                                <Link
                                                    href={jobRequests.prev_page_url}
                                                    preserveScroll
                                                    className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    Previous
                                                </Link>
                                            ) : (
                                                <span className="rounded-full border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-600">
                                                    Previous
                                                </span>
                                            )}

                                            {jobRequests.next_page_url ? (
                                                <Link
                                                    href={jobRequests.next_page_url}
                                                    preserveScroll
                                                    className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                >
                                                    Next
                                                </Link>
                                            ) : (
                                                <span className="rounded-full border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-600">
                                                    Next
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-8 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                    No job requests match this filter right now.
                                </div>
                            )}
                        </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
