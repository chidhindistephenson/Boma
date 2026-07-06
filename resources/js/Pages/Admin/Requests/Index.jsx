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
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Total requests
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.total}
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Active
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.active}
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Closed
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.closed}
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Unassigned
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.unassigned}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                        <aside className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                Filters
                            </p>
                            <h3 className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                Trace demand across the marketplace.
                            </h3>

                            <form onSubmit={submit} className="mt-8 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
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
                                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                        Status
                                    </label>
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
                                        {Object.entries(statusOptions).map(
                                            ([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                        Urgency
                                    </label>
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
                                        {Object.entries(urgencyOptions).map(
                                            ([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                        Category
                                    </label>
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
                                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                        Assignment
                                    </label>
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

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        className="flex-1 rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </form>
                        </aside>

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
                                                className="block rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] dark:hover:border-white/20 dark:hover:bg-zinc-900"
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

                                    <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/88 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] sm:flex-row sm:items-center sm:justify-between">
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
                                <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-8 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                    No job requests match this filter right now.
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
