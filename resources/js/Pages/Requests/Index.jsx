import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function formatStatus(value) {
    return value.replace(/_/g, ' ');
}

function formatAmount(value) {
    return value ? `$${Number(value).toLocaleString()}` : 'Not set';
}

function formatDateTime(value, options = {}) {
    if (!value) {
        return 'Not set';
    }

    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        ...options,
    }).format(date);
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

    if (filters.attention) {
        query.attention = 1;
    }

    return query;
}

function attentionLabel(jobRequest, isProvider) {
    if (jobRequest.unreadCount) {
        return `${jobRequest.unreadCount} unread`;
    }

    if (!isProvider && jobRequest.quoteNeedsResponse) {
        return 'Quote waiting on you';
    }

    if (!isProvider && jobRequest.proposalCount) {
        return `${jobRequest.proposalCount} proposal${jobRequest.proposalCount === 1 ? '' : 's'} to compare`;
    }

    if (!isProvider && jobRequest.scheduleNeedsResponse) {
        return 'Visit waiting on you';
    }

    if (!isProvider && jobRequest.paymentNeedsUpdate) {
        return 'Payment needs review';
    }

    if (!isProvider && jobRequest.canReview && !jobRequest.hasReview) {
        return 'Review pending';
    }

    if (
        isProvider &&
        !jobRequest.hasQuote &&
        ['targeted', 'in_conversation'].includes(jobRequest.status)
    ) {
        return 'Quote still needed';
    }

    if (isProvider && jobRequest.hasPayment && jobRequest.paymentStatus === 'submitted') {
        return 'Confirm payment';
    }

    if (isProvider && jobRequest.hasSchedule && jobRequest.scheduleStatus === 'proposed') {
        return 'Visit awaiting customer';
    }

    return null;
}

function activityLine(jobRequest, isProvider) {
    if (jobRequest.paymentAmount) {
        return `Payment ${formatAmount(jobRequest.paymentAmount)} (${formatStatus(jobRequest.paymentStatus)})`;
    }

    if (jobRequest.quoteAmount) {
        return `Quote ${formatAmount(jobRequest.quoteAmount)} (${formatStatus(jobRequest.quoteStatus)})`;
    }

    if (!isProvider && jobRequest.proposalCount) {
        return `${jobRequest.proposalCount} provider proposal${jobRequest.proposalCount === 1 ? '' : 's'} waiting`;
    }

    if (jobRequest.hasSchedule && jobRequest.scheduledFor) {
        return `Visit ${formatStatus(jobRequest.scheduleStatus)} on ${formatDateTime(jobRequest.scheduledFor)}`;
    }

    if (jobRequest.sourceRequestTitle) {
        return `Follow-up to ${jobRequest.sourceRequestTitle}`;
    }

    if (jobRequest.hasReview) {
        return `Review ${jobRequest.reviewRating}/5 published`;
    }

    return isProvider ? 'No commercial milestone yet.' : 'Waiting for the next update.';
}

function nextActionSummary(jobRequest, isProvider) {
    if (isProvider) {
        if (
            !jobRequest.hasQuote &&
            ['targeted', 'in_conversation'].includes(jobRequest.status)
        ) {
            return 'Send quote or accept the request';
        }

        if (jobRequest.hasPayment && jobRequest.paymentStatus === 'submitted') {
            return 'Confirm or query payment';
        }

        return 'Open for provider actions';
    }

    if (jobRequest.unreadCount) {
        return 'Read the latest message';
    }

    if (jobRequest.proposalCount) {
        return 'Compare provider proposals';
    }

    if (jobRequest.quoteNeedsResponse) {
        return 'Accept or decline the quote';
    }

    if (jobRequest.scheduleNeedsResponse) {
        return 'Confirm the proposed visit';
    }

    if (jobRequest.paymentNeedsUpdate) {
        return 'Update payment details';
    }

    if (jobRequest.canReview && !jobRequest.hasReview) {
        return 'Leave a review';
    }

    if (jobRequest.status === 'closed') {
        return 'Closed';
    }

    return 'Waiting for the next provider update';
}

function customerMilestones(jobRequest) {
    return [
        {
            label: 'Request',
            complete: !['open', 'targeted', 'in_conversation'].includes(
                jobRequest.status,
            ),
            active: ['open', 'targeted', 'in_conversation'].includes(
                jobRequest.status,
            ),
        },
        {
            label: 'Quote',
            complete: jobRequest.quoteStatus === 'accepted',
            active: jobRequest.quoteStatus === 'pending',
        },
        {
            label: 'Visit',
            complete: ['confirmed', 'completed'].includes(
                jobRequest.scheduleStatus,
            ),
            active: jobRequest.scheduleStatus === 'proposed',
        },
        {
            label: 'Payment',
            complete: jobRequest.paymentStatus === 'confirmed',
            active: ['submitted', 'revision_requested'].includes(
                jobRequest.paymentStatus,
            ),
        },
        {
            label: 'Review',
            complete: jobRequest.hasReview,
            active: jobRequest.canReview && !jobRequest.hasReview,
        },
    ];
}

function milestoneClass(milestone) {
    if (milestone.complete) {
        return 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950';
    }

    if (milestone.active) {
        return 'border-zinc-400 bg-zinc-100 text-zinc-950 dark:border-white/30 dark:bg-white/10 dark:text-white';
    }

    return 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500';
}

function statIconPath(label) {
    const normalized = String(label).toLowerCase();

    if (normalized.includes('active')) {
        return 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z';
    }

    if (normalized.includes('unread') || normalized.includes('message')) {
        return 'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 21.75a5.972 5.972 0 0 1-.474-3.255A8.25 8.25 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z';
    }

    if (normalized.includes('attention') || normalized.includes('pending')) {
        return 'M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z';
    }

    return 'M9 12h6m-6 4h6m2.25 5H6.75A2.25 2.25 0 0 1 4.5 18.75V5.25A2.25 2.25 0 0 1 6.75 3h7.5L19.5 8.25v10.5A2.25 2.25 0 0 1 17.25 21Z';
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
                            d={statIconPath(label)}
                        />
                    </svg>
                </span>
                <p className="boma-stat-card-title">{label}</p>
            </div>
            <p className="boma-stat-card-value mt-5">{value}</p>
            {helper ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {helper}
                </p>
            ) : null}
        </div>
    );
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
    const pageTitle = isProvider ? 'Request Inbox' : 'My Requests';
    const intro = isProvider
        ? 'A simpler view of incoming work, customer replies, and the few items that need a provider decision.'
        : 'A simpler view of your job threads, provider replies, and the decisions still waiting on you.';
    const searchPlaceholder = isProvider
        ? 'Search title, customer, or location'
        : 'Search title, provider, or location';
    const primaryActionHref = isProvider
        ? route('dashboard')
        : route('requests.create');
    const primaryActionLabel = isProvider ? 'Open dashboard' : 'New request';

    const [form, setForm] = useState({
        q: filters.q,
        status: filters.status,
        urgency: filters.urgency,
        attention: Boolean(filters.attention),
    });

    useEffect(() => {
        setForm({
            q: filters.q,
            status: filters.status,
            urgency: filters.urgency,
            attention: Boolean(filters.attention),
        });
    }, [filters.attention, filters.q, filters.status, filters.urgency]);

    const submit = (event) => {
        event.preventDefault();

        router.get(route('requests.index'), buildQuery(form), {
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const defaults = { q: '', status: '', urgency: '', attention: false };

        setForm(defaults);

        router.get(route('requests.index'), {}, {
            preserveScroll: true,
            replace: true,
        });
    };

    const needsAttention = isProvider
        ? summary.pendingRequests + summary.pendingQuotes + summary.pendingPayments
        : summary.pendingReviews +
          summary.pendingProposals +
          summary.pendingQuotes +
          summary.pendingSchedules +
          summary.paymentsNeedingUpdate;

    const statCards = [
        {
            label: 'Tracked',
            value: summary.total,
            helper: 'All requests in this view',
        },
        {
            label: 'Active',
            value: summary.active,
            helper: 'Still moving or awaiting updates',
        },
        {
            label: 'Unread messages',
            value: summary.unreadMessages,
            helper: 'Replies you have not opened yet',
        },
        {
            label: 'Needs attention',
            value: needsAttention,
            helper: 'The requests most likely to need action',
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        {isProvider ? 'Provider workspace' : 'Customer workspace'}
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        {pageTitle}
                    </h2>
                </div>
            }
        >
            <Head title={pageTitle} />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="rounded-[2.2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
                        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                            <div className="max-w-3xl">
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Requests
                                </p>
                                <h3 className="mt-3 font-display text-4xl font-semibold text-zinc-950 dark:text-white sm:text-5xl">
                                    Keep request work readable.
                                </h3>
                                <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-400">
                                    {intro}
                                </p>
                            </div>

                            <Link
                                href={primaryActionHref}
                                className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                            >
                                {primaryActionLabel}
                            </Link>
                        </div>

                        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {statCards.map((card) => (
                                <StatCard
                                    key={card.label}
                                    label={card.label}
                                    value={card.value}
                                    helper={card.helper}
                                />
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Filters
                                </p>
                                <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                    Narrow the list without leaving the page
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                            >
                                Reset filters
                            </button>
                        </div>

                        <form
                            onSubmit={submit}
                            className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px_220px_auto_auto]"
                        >
                            <input
                                type="search"
                                value={form.q}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        q: event.target.value,
                                    }))
                                }
                                className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                placeholder={searchPlaceholder}
                            />

                            <select
                                value={form.status}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        status: event.target.value,
                                    }))
                                }
                                className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                            >
                                <option value="">All statuses</option>
                                {Object.entries(statusOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={form.urgency}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        urgency: event.target.value,
                                    }))
                                }
                                className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                            >
                                <option value="">All urgency levels</option>
                                {Object.entries(urgencyOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={() =>
                                    setForm((current) => ({
                                        ...current,
                                        attention: !current.attention,
                                    }))
                                }
                                className={`rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] transition ${
                                    form.attention
                                        ? 'bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200'
                                        : 'border border-zinc-300 bg-white text-zinc-950 hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900'
                                }`}
                            >
                                Needs action
                            </button>

                            <button
                                type="submit"
                                className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                            >
                                Apply
                            </button>
                        </form>
                    </section>

                    {jobRequests.data.length ? (
                        <>
                            <section className="space-y-4">
                                {jobRequests.data.map((jobRequest) => {
                                    const label = attentionLabel(jobRequest, isProvider);
                                    const participant = isProvider
                                        ? jobRequest.customerName
                                        : jobRequest.providerLabel;
                                    const nextAction = nextActionSummary(
                                        jobRequest,
                                        isProvider,
                                    );
                                    const milestones = isProvider
                                        ? []
                                        : customerMilestones(jobRequest);

                                    return (
                                        <Link
                                            key={jobRequest.id}
                                            href={route('requests.show', jobRequest.id)}
                                            className="block rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                            {jobRequest.title}
                                                        </h3>
                                                        {label ? (
                                                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                {label}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                        {jobRequest.category} with {participant}
                                                    </p>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {formatStatus(jobRequest.status)}
                                                        </span>
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {formatStatus(jobRequest.urgency)}
                                                        </span>
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {jobRequest.messageCount} message
                                                            {jobRequest.messageCount === 1
                                                                ? ''
                                                                : 's'}
                                                        </span>
                                                        {jobRequest.unreadCount ? (
                                                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                {jobRequest.unreadCount} unread
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="shrink-0 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-4 text-left dark:border-white/10 dark:bg-white/[0.03] xl:w-72">
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                        Next action
                                                    </p>
                                                    <p className="mt-2 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                        {nextAction}
                                                    </p>
                                                    <span className="mt-4 inline-flex rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white">
                                                        Open request
                                                    </span>
                                                </div>
                                            </div>

                                            {!isProvider ? (
                                                <div className="mt-5 grid gap-2 sm:grid-cols-5">
                                                    {milestones.map((milestone, index) => (
                                                        <div
                                                            key={milestone.label}
                                                            className={`rounded-2xl border px-3 py-3 ${milestoneClass(milestone)}`}
                                                        >
                                                            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] opacity-70">
                                                                {String(index + 1).padStart(
                                                                    2,
                                                                    '0',
                                                                )}
                                                            </p>
                                                            <p className="mt-1 text-sm font-semibold">
                                                                {milestone.label}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}

                                            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Location
                                                    </p>
                                                    <p className="mt-2 text-zinc-800 dark:text-zinc-200">
                                                        {jobRequest.locationLabel ||
                                                            'Location pending'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Activity
                                                    </p>
                                                    <p className="mt-2 text-zinc-800 dark:text-zinc-200">
                                                        {activityLine(jobRequest, isProvider)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Created
                                                    </p>
                                                    <p className="mt-2 text-zinc-800 dark:text-zinc-200">
                                                        {formatDateTime(jobRequest.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </section>

                            <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Page {jobRequests.current_page} of {jobRequests.last_page}
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
                        <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white/90 p-10 text-center shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                            <h3 className="font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                No requests match that filter.
                            </h3>
                            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                Reset the filters or return to the broader workspace if
                                you want a cleaner starting point.
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
                                    href={primaryActionHref}
                                    className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                >
                                    {primaryActionLabel}
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
