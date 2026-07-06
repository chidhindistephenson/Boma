import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function formatStatus(value) {
    return value.replace(/_/g, ' ');
}

function formatAmount(value) {
    return value ? Number(value).toLocaleString() : null;
}

function buildQuery(filters) {
    const query = {};

    if (filters.q.trim()) {
        query.q = filters.q.trim();
    }

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.urgency) {
        query.urgency = filters.urgency;
    }

    return query;
}

export default function Index({
    viewerRole = 'customer',
    filters,
    statusOptions,
    urgencyOptions,
    jobRequests,
    summary,
}) {
    const isProvider = viewerRole === 'provider';
    const workspaceLabel = isProvider
        ? 'Provider workspace'
        : 'Customer workspace';
    const pageTitle = isProvider ? 'Request Inbox' : 'My Requests';
    const filterHeading = isProvider
        ? 'Manage every incoming request from one place.'
        : 'Track every request from one place.';
    const searchPlaceholder = isProvider
        ? 'Title, customer, location'
        : 'Title, provider, location';
    const summaryHeading = isProvider ? 'Request inbox' : 'Request summary';
    const participantLine = (jobRequest) =>
        isProvider
            ? `${jobRequest.category} - from ${jobRequest.customerName}`
            : `${jobRequest.category} - ${jobRequest.providerLabel}`;
    const primaryActionHref = isProvider
        ? route('dashboard')
        : route('requests.create');
    const primaryActionLabel = isProvider ? 'Open dashboard' : 'New request';
    const emptyBody = isProvider
        ? 'Reset the filters or return to the dashboard if you want to focus on the most urgent incoming work first.'
        : 'Reset the filters or post a new request if you are ready to start a fresh conversation.';
    const emptyActionHref = isProvider
        ? route('dashboard')
        : route('requests.create');
    const emptyActionLabel = isProvider ? 'Open dashboard' : 'New request';

    const [form, setForm] = useState({
        q: filters.q,
        status: filters.status,
        urgency: filters.urgency,
    });

    useEffect(() => {
        setForm({
            q: filters.q,
            status: filters.status,
            urgency: filters.urgency,
        });
    }, [filters.q, filters.status, filters.urgency]);

    const submit = (event) => {
        event.preventDefault();

        router.get(route('requests.index'), buildQuery(form), {
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const defaults = { q: '', status: '', urgency: '' };

        setForm(defaults);

        router.get(route('requests.index'), {}, {
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        {workspaceLabel}
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        {pageTitle}
                    </h2>
                </div>
            }
        >
            <Head title={pageTitle} />

            <div className="py-12">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
                    <aside className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                            Filter requests
                        </p>
                        <h3 className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                            {filterHeading}
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
                                    placeholder={searchPlaceholder}
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
                                    <option value="">All statuses</option>
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
                                    <option value="">All urgency levels</option>
                                    {Object.entries(urgencyOptions).map(
                                        ([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ),
                                    )}
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
                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        {summaryHeading}
                                    </p>
                                    <h3 className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                        {summary.total} request
                                        {summary.total === 1 ? '' : 's'} tracked
                                    </h3>
                                </div>
                                <Link
                                    href={primaryActionHref}
                                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                    {primaryActionLabel}
                                </Link>
                            </div>

                            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        Active
                                    </p>
                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {summary.active}
                                    </p>
                                </div>
                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        Unread messages
                                    </p>
                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {summary.unreadMessages}
                                    </p>
                                </div>
                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        Closed
                                    </p>
                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {summary.closed}
                                    </p>
                                </div>
                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        {isProvider ? 'Awaiting decision' : 'Pending reviews'}
                                    </p>
                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {isProvider
                                            ? summary.pendingRequests
                                            : summary.pendingReviews}
                                    </p>
                                </div>
                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        {isProvider ? 'Accepted requests' : 'Pending quotes'}
                                    </p>
                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {isProvider
                                            ? summary.acceptedRequests
                                            : summary.pendingQuotes}
                                    </p>
                                </div>
                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        {isProvider ? 'Declined requests' : 'Accepted quotes'}
                                    </p>
                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {isProvider
                                            ? summary.declinedRequests
                                            : summary.acceptedQuotes}
                                    </p>
                                </div>
                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        {isProvider ? 'Quotes awaiting customer' : 'Pending visits'}
                                    </p>
                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {isProvider
                                            ? summary.pendingQuotes
                                            : summary.pendingSchedules}
                                    </p>
                                </div>
                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        {isProvider ? 'Accepted quotes' : 'Confirmed visits'}
                                    </p>
                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {isProvider
                                            ? summary.acceptedQuotes
                                            : summary.confirmedSchedules}
                                    </p>
                                </div>
                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        {isProvider ? 'Visits proposed' : 'Payments waiting'}
                                    </p>
                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {isProvider
                                            ? summary.pendingSchedules
                                            : summary.pendingPayments}
                                    </p>
                                </div>
                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        {isProvider ? 'Visits confirmed' : 'Confirmed payments'}
                                    </p>
                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {isProvider
                                            ? summary.confirmedSchedules
                                            : summary.confirmedPayments}
                                    </p>
                                </div>
                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        {isProvider ? 'Payments awaiting confirmation' : 'Payments to review'}
                                    </p>
                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {isProvider
                                            ? summary.pendingPayments
                                            : summary.paymentsNeedingUpdate}
                                    </p>
                                </div>
                                {isProvider ? (
                                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Confirmed payments
                                        </p>
                                        <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                            {summary.confirmedPayments}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {jobRequests.data.length ? (
                            <>
                                <div className="space-y-4">
                                    {jobRequests.data.map((jobRequest) => (
                                        <Link
                                            key={jobRequest.id}
                                            href={route('requests.show', jobRequest.id)}
                                            className="block rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                <div>
                                                    <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {jobRequest.title}
                                                    </p>
                                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                        {participantLine(jobRequest)}
                                                    </p>
                                                    <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                        {jobRequest.locationLabel ||
                                                            'Location pending'}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {jobRequest.hasReview ? (
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            Review {jobRequest.reviewRating}/5
                                                        </span>
                                                    ) : !isProvider &&
                                                      jobRequest.canReview ? (
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            Review pending
                                                        </span>
                                                    ) : null}
                                                    {jobRequest.sourceRequestId ? (
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            Follow-up
                                                        </span>
                                                    ) : null}
                                                    {jobRequest.hasQuote ? (
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            {!isProvider &&
                                                            jobRequest.quoteNeedsResponse
                                                                ? 'Quote waiting on you'
                                                                : isProvider &&
                                                                    jobRequest.quoteStatus ===
                                                                        'pending'
                                                                  ? 'Quote waiting on customer'
                                                                : `Quote ${formatStatus(jobRequest.quoteStatus)}`}
                                                        </span>
                                                    ) : null}
                                                    {jobRequest.quoteAmount ? (
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            Quote {formatAmount(jobRequest.quoteAmount)}
                                                        </span>
                                                    ) : null}
                                                    {jobRequest.hasSchedule ? (
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            {!isProvider &&
                                                            jobRequest.scheduleNeedsResponse
                                                                ? 'Visit waiting on you'
                                                                : `Visit ${formatStatus(jobRequest.scheduleStatus)}`}
                                                        </span>
                                                    ) : null}
                                                    {jobRequest.hasPayment ? (
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            {!isProvider &&
                                                            jobRequest.paymentNeedsUpdate
                                                                ? 'Payment needs review'
                                                                : isProvider &&
                                                                    jobRequest.paymentStatus ===
                                                                        'submitted'
                                                                  ? 'Payment awaiting confirmation'
                                                                : `Payment ${formatStatus(jobRequest.paymentStatus)}`}
                                                        </span>
                                                    ) : null}
                                                    {jobRequest.paymentAmount ? (
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            Payment {formatAmount(jobRequest.paymentAmount)}
                                                        </span>
                                                    ) : null}
                                                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                        {formatStatus(jobRequest.status)}
                                                    </span>
                                                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                        {formatStatus(jobRequest.urgency)}
                                                    </span>
                                                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                        {jobRequest.messageCount} message
                                                        {jobRequest.messageCount === 1
                                                            ? ''
                                                            : 's'}
                                                    </span>
                                                    {jobRequest.unreadCount ? (
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            {jobRequest.unreadCount} unread
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {jobRequest.hasSchedule ? (
                                                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                    Visit {jobRequest.scheduledFor}
                                                </p>
                                            ) : null}

                                            {jobRequest.sourceRequestTitle ? (
                                                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                    Based on {jobRequest.sourceRequestTitle}
                                                </p>
                                            ) : null}

                                            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                Created {jobRequest.createdAt}
                                            </p>
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
                            <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white/88 p-10 text-center shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                <h3 className="font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                    No requests match that filter.
                                </h3>
                                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                    {emptyBody}
                                </p>
                                <div className="mt-8 flex justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    >
                                        Reset filters
                                    </button>
                                    <Link
                                        href={emptyActionHref}
                                        className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        {emptyActionLabel}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
