import VerifiedBadge from '@/Components/VerifiedBadge';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

function formatStatus(value) {
    return value ? value.replace(/_/g, ' ') : 'not set';
}

function formatRating(value) {
    if (value === null || value === undefined || value === '') {
        return 'No reviews yet';
    }

    return `${Number(value).toFixed(1)}/5`;
}

function formatAmount(value) {
    return value ? `$${Number(value).toLocaleString()}` : 'Not set';
}

function formatPercent(value) {
    return value === null || value === undefined ? 'N/A' : `${value}%`;
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

function customerAttentionLabel(jobRequest) {
    if (jobRequest.unreadCount) {
        return `${jobRequest.unreadCount} unread`;
    }

    if (jobRequest.quoteNeedsResponse) {
        return 'Quote needs your decision';
    }

    if (jobRequest.scheduleNeedsResponse) {
        return 'Visit needs your confirmation';
    }

    if (jobRequest.paymentNeedsUpdate) {
        return 'Payment needs review';
    }

    if (jobRequest.canReview && !jobRequest.hasReview) {
        return 'Review ready to publish';
    }

    return null;
}

function providerAttentionLabel(jobRequest) {
    if (jobRequest.unreadCount) {
        return `${jobRequest.unreadCount} unread`;
    }

    if (
        !jobRequest.hasQuote &&
        ['targeted', 'in_conversation'].includes(jobRequest.status)
    ) {
        return 'Send a quote';
    }

    if (jobRequest.hasPayment && jobRequest.paymentStatus === 'submitted') {
        return 'Confirm payment';
    }

    if (jobRequest.hasSchedule && jobRequest.scheduleStatus === 'proposed') {
        return 'Visit awaiting customer';
    }

    return null;
}

function requestProgressLine(jobRequest, viewerRole) {
    if (jobRequest.paymentAmount) {
        return `Payment ${formatAmount(jobRequest.paymentAmount)}`;
    }

    if (jobRequest.quoteAmount) {
        return `Quote ${formatAmount(jobRequest.quoteAmount)}`;
    }

    if (jobRequest.hasSchedule && jobRequest.scheduledFor) {
        return `Visit ${formatDateTime(jobRequest.scheduledFor)}`;
    }

    if (viewerRole === 'provider' && !jobRequest.hasQuote) {
        return 'No quote has been sent yet';
    }

    if (viewerRole === 'customer' && jobRequest.providerLabel === 'Open request') {
        return 'No provider targeted yet';
    }

    return `Status ${formatStatus(jobRequest.status)}`;
}

function statIconPath(label) {
    const normalized = String(label).toLowerCase();

    if (normalized.includes('provider') || normalized.includes('storefront')) {
        return 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z';
    }

    if (normalized.includes('message') || normalized.includes('unread')) {
        return 'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 21.75a5.972 5.972 0 0 1-.474-3.255A8.25 8.25 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z';
    }

    if (normalized.includes('attention') || normalized.includes('pending') || normalized.includes('risk')) {
        return 'M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z';
    }

    if (normalized.includes('rating') || normalized.includes('review')) {
        return 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557L3.04 10.385a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345l2.125-5.111Z';
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

function SectionHeader({ eyebrow, title, description, action }) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                    {eyebrow}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                    {title}
                </h3>
                {description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        {description}
                    </p>
                ) : null}
            </div>
            {action ? action : null}
        </div>
    );
}

function ActionTile({ title, body, href, cta }) {
    return (
        <Link
            href={href}
            className="rounded-[1.6rem] border border-zinc-200/80 bg-zinc-50/90 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
        >
            <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                {title}
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                {body}
            </p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                {cta}
            </p>
        </Link>
    );
}

function RequestPreview({ jobRequest, viewerRole = 'customer' }) {
    const isProvider = viewerRole === 'provider';
    const attention = isProvider
        ? providerAttentionLabel(jobRequest)
        : customerAttentionLabel(jobRequest);
    const participant = isProvider
        ? jobRequest.customerName
        : jobRequest.providerLabel;

    return (
        <Link
            href={route('requests.show', jobRequest.id)}
            className="block rounded-[1.6rem] border border-zinc-200/80 bg-zinc-50/90 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                            {jobRequest.title}
                        </p>
                        {attention ? (
                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                {attention}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {jobRequest.category} with {participant}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                        {formatStatus(jobRequest.status)}
                    </span>
                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                        {jobRequest.messageCount} message
                        {jobRequest.messageCount === 1 ? '' : 's'}
                    </span>
                </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Location
                    </p>
                    <p className="mt-2 text-zinc-800 dark:text-zinc-200">
                        {jobRequest.locationLabel || 'Location pending'}
                    </p>
                </div>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Progress
                    </p>
                    <p className="mt-2 text-zinc-800 dark:text-zinc-200">
                        {requestProgressLine(jobRequest, viewerRole)}
                    </p>
                </div>
            </div>
        </Link>
    );
}

function customerRequestStage(jobRequest) {
    if (jobRequest.paymentStatus === 'confirmed') {
        return 'Payment confirmed';
    }

    if (jobRequest.paymentNeedsUpdate) {
        return 'Payment needs update';
    }

    if (jobRequest.scheduleNeedsResponse) {
        return 'Visit proposed';
    }

    if (jobRequest.quoteNeedsResponse) {
        return 'Quote ready';
    }

    if (jobRequest.providerLabel === 'Open request') {
        return 'Finding providers';
    }

    return formatStatus(jobRequest.status);
}

function CustomerRequestCard({ jobRequest }) {
    const attention = customerAttentionLabel(jobRequest);

    return (
        <Link
            href={route('requests.show', jobRequest.id)}
            className="group block rounded-[2rem] border border-zinc-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_26px_70px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-zinc-950/90 dark:hover:border-white/20"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                        {customerRequestStage(jobRequest)}
                    </p>
                    <h4 className="mt-3 font-display text-2xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        {jobRequest.title}
                    </h4>
                </div>
                {attention ? (
                    <span className="shrink-0 rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white dark:bg-white dark:text-zinc-950">
                        Action
                    </span>
                ) : null}
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                        Provider
                    </p>
                    <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                        {jobRequest.providerLabel}
                    </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                        Progress
                    </p>
                    <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                        {requestProgressLine(jobRequest, 'customer')}
                    </p>
                </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {jobRequest.locationLabel || 'Location pending'} |{' '}
                    {jobRequest.messageCount} message
                    {jobRequest.messageCount === 1 ? '' : 's'}
                </p>
                <span className="text-sm font-semibold text-zinc-950 transition group-hover:translate-x-1 dark:text-white">
                    Open request
                </span>
            </div>
        </Link>
    );
}

function CustomerProviderCard({ provider }) {
    return (
        <Link
            href={route('providers.show', provider.id)}
            className="block rounded-[2rem] border border-zinc-200/80 bg-zinc-50/90 p-5 transition hover:-translate-y-1 hover:border-zinc-300 hover:bg-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                        {provider.category}
                    </p>
                    <h4 className="mt-3 font-display text-2xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        {provider.businessName}
                    </h4>
                </div>
                {provider.verificationStatus === 'verified' ? <VerifiedBadge /> : null}
            </div>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                {provider.locationLabel || 'Location pending'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
                    {formatStatus(provider.availabilityStatus)}
                </span>
                <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
                    {formatRating(provider.averageRating)}
                </span>
            </div>
        </Link>
    );
}

function MiniBars({ values = [] }) {
    const max = Math.max(...values, 1);

    return (
        <div className="flex h-12 items-end gap-1">
            {values.map((value, index) => (
                <span
                    key={`${value}-${index}`}
                    className="w-1.5 rounded-full bg-zinc-300 dark:bg-white/30"
                    style={{ height: `${Math.max(18, (value / max) * 100)}%` }}
                />
            ))}
        </div>
    );
}

function AdminKpiCard({ label, value, helper, values }) {
    return (
        <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                        {label}
                    </p>
                    <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                        {value}
                    </p>
                </div>
                <MiniBars values={values} />
            </div>
            <p className="mt-4 border-t border-zinc-200 pt-3 text-xs font-medium text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                {helper}
            </p>
        </div>
    );
}

function AdminProviderRow({ provider }) {
    return (
        <Link
            href={route('admin.providers.index', { status: 'pending' })}
            className="grid gap-4 rounded-[1.3rem] border border-zinc-200 bg-zinc-50 p-4 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900 lg:grid-cols-[1.4fr_0.8fr_0.6fr_0.7fr]"
        >
            <div>
                <p className="font-semibold text-zinc-950 dark:text-white">
                    {provider.businessName}
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {provider.providerName}
                </p>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Trade
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {provider.tradeCategory || 'Not set'}
                </p>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Evidence
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {provider.documentCount} docs
                </p>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Submitted
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {formatDateTime(provider.submittedAt, { timeStyle: undefined })}
                </p>
            </div>
        </Link>
    );
}

function AdminProgressRow({ label, value, total, href }) {
    const width = total > 0 ? Math.max(6, Math.min(100, (value / total) * 100)) : 0;

    return (
        <Link href={href} className="block rounded-2xl p-3 transition hover:bg-zinc-50 dark:hover:bg-white/[0.04]">
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {label}
                </p>
                <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                    {value}
                </p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-zinc-200 dark:bg-white/10">
                <div
                    className="h-full rounded-full bg-zinc-950 dark:bg-white"
                    style={{ width: `${width}%` }}
                />
            </div>
        </Link>
    );
}

function AdminActivityRow({ row }) {
    return (
        <Link
            href={row.href}
            className="grid gap-4 border-b border-zinc-200 px-4 py-4 transition hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/[0.04] md:grid-cols-[0.8fr_1.5fr_0.9fr_0.8fr]"
        >
            <div>
                <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                    {row.type}
                </span>
            </div>
            <div>
                <p className="font-semibold text-zinc-950 dark:text-white">
                    {row.title}
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {row.subtitle}
                </p>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Status
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {row.status}
                </p>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Date
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {formatDateTime(row.date, { timeStyle: undefined })}
                </p>
            </div>
        </Link>
    );
}

export default function Dashboard({
    shortlistedProviders = [],
    customerJobRequests = [],
    providerJobRequests = [],
    providerSummary = null,
    platformSummary = null,
    adminQueues = null,
}) {
    const { auth } = usePage().props;
    const user = auth.user;
    const isProvider = user.role === 'provider';
    const isAdmin = user.role === 'admin';
    const isCustomer = user.role === 'customer';

    const customerUnreadMessages = customerJobRequests.reduce(
        (total, jobRequest) => total + (jobRequest.unreadCount ?? 0),
        0,
    );
    const providerUnreadMessages = providerJobRequests.reduce(
        (total, jobRequest) => total + (jobRequest.unreadCount ?? 0),
        0,
    );
    const customerPendingQuotes = customerJobRequests.reduce(
        (total, jobRequest) => total + (jobRequest.quoteNeedsResponse ? 1 : 0),
        0,
    );
    const customerPendingSchedules = customerJobRequests.reduce(
        (total, jobRequest) => total + (jobRequest.scheduleNeedsResponse ? 1 : 0),
        0,
    );
    const customerPaymentsNeedingReview = customerJobRequests.reduce(
        (total, jobRequest) => total + (jobRequest.paymentNeedsUpdate ? 1 : 0),
        0,
    );
    const customerPendingReviews = customerJobRequests.reduce(
        (total, jobRequest) =>
            total + (jobRequest.canReview && !jobRequest.hasReview ? 1 : 0),
        0,
    );
    const customerNeedsAttention =
        customerPendingQuotes +
        customerPendingSchedules +
        customerPaymentsNeedingReview +
        customerPendingReviews;

    const providerPendingQuotes = providerSummary?.quotesPendingResponse ?? 0;
    const providerPendingPayments =
        providerSummary?.paymentsPendingConfirmation ?? 0;
    const providerNeedsQuoteDraft = providerJobRequests.reduce(
        (total, jobRequest) =>
            total +
            (!jobRequest.hasQuote &&
            ['targeted', 'in_conversation'].includes(jobRequest.status)
                ? 1
                : 0),
        0,
    );
    const providerNeedsAttention =
        providerUnreadMessages +
        providerNeedsQuoteDraft +
        providerPendingPayments;

    const pendingProviders = adminQueues?.pendingProviders ?? [];
    const requestAlerts = adminQueues?.requestAlerts ?? [];
    const recentModeration = adminQueues?.recentModeration ?? [];

    const heading = isAdmin
        ? 'Admin dashboard'
        : isProvider
          ? 'Provider dashboard'
          : 'Customer dashboard';
    const heroTitle = isAdmin
        ? 'Keep the marketplace healthy.'
        : isProvider
          ? 'Run your service from one place.'
          : 'Everything you need for your next job.';
    const heroBody = isAdmin
        ? 'Review provider trust, marketplace risk, and stalled request flow without digging through multiple screens.'
        : isProvider
          ? 'Focus on incoming work, storefront clarity, and the few actions that move requests forward.'
          : 'Browse providers, keep conversations moving, and act on the requests that need your decision next.';

    const primaryAction = isAdmin
        ? {
              href: route('admin.providers.index'),
              label: 'Review provider queue',
          }
        : isProvider
          ? { href: route('requests.index'), label: 'Open request inbox' }
          : { href: route('requests.create'), label: 'Post a new request' };
    const secondaryAction = isAdmin
        ? { href: route('admin.requests.index'), label: 'Open request oversight' }
        : isProvider
          ? {
                href: route('providers.show', user.id),
                label: 'Preview storefront',
            }
          : { href: route('providers.index'), label: 'Browse providers' };

    const statCards = isAdmin
        ? [
              {
                  label: 'Pending providers',
                  value: platformSummary?.pendingProviderVerifications ?? 0,
                  helper: 'Waiting for trust review',
              },
              {
                  label: 'Flagged reviews',
                  value: platformSummary?.flaggedReviews ?? 0,
                  helper: 'Waiting for moderation',
              },
              {
                  label: 'Suspended users',
                  value: platformSummary?.suspendedUsers ?? 0,
                  helper: 'Accounts under restriction',
              },
              {
                  label: 'Verified providers',
                  value: platformSummary?.verifiedProviders ?? 0,
                  helper: 'Live in the directory',
              },
          ]
        : isProvider
          ? [
                {
                    label: 'Unread messages',
                    value: providerUnreadMessages,
                    helper: 'Conversations that moved',
                },
                {
                    label: 'Needs attention',
                    value: providerNeedsAttention,
                    helper: 'Replies, quotes, and confirmations',
                },
              {
                  label: 'Matching jobs',
                  value: providerSummary?.matchingOpenRequests ?? 0,
                  helper: 'Open opportunities in your area',
                },
                {
                    label: 'Storefront status',
                    value: providerSummary?.profileVisible ? 'Live' : 'Private',
                    helper: 'Public discovery state',
                },
            ]
          : [
                {
                    label: 'Saved providers',
                    value: user.shortlistedProvidersCount ?? 0,
                    helper: 'Providers you can revisit quickly',
                },
                {
                    label: 'Unread messages',
                    value: customerUnreadMessages,
                    helper: 'Replies across recent requests',
                },
                {
                    label: 'Needs attention',
                    value: customerNeedsAttention,
                    helper: 'Quotes, visits, payments, and reviews',
                },
                {
                    label: 'Recent requests',
                    value: customerJobRequests.length,
                    helper: 'Most recent job threads',
                },
            ];

    const focusActions = isAdmin
        ? [
              {
                  title: 'Review pending providers',
                  body: `${platformSummary?.pendingProviderVerifications ?? 0} provider account${
                      (platformSummary?.pendingProviderVerifications ?? 0) === 1
                          ? ''
                          : 's'
                  } waiting for a verification decision.`,
                  href: route('admin.providers.index'),
                  cta: 'Open provider queue',
              },
              {
                  title: 'Moderate flagged reviews',
                  body: `${platformSummary?.flaggedReviews ?? 0} review${
                      (platformSummary?.flaggedReviews ?? 0) === 1 ? '' : 's'
                  } waiting for a trust and safety decision.`,
                  href: route('admin.reviews.index'),
                  cta: 'Open review moderation',
              },
              {
                  title: 'Inspect request alerts',
                  body: `${requestAlerts.length} request thread${
                      requestAlerts.length === 1 ? '' : 's'
                  } currently need intervention or oversight.`,
                  href: route('admin.requests.index'),
                  cta: 'Open request oversight',
              },
              {
                  title: 'Moderate platform users',
                  body: `${platformSummary?.suspendedUsers ?? 0} suspended account${
                      (platformSummary?.suspendedUsers ?? 0) === 1 ? '' : 's'
                  } and ${platformSummary?.totalUsers ?? 0} total user${
                      (platformSummary?.totalUsers ?? 0) === 1 ? '' : 's'
                  } on the platform.`,
                  href: route('admin.users.index'),
                  cta: 'Open user directory',
              },
          ]
        : isProvider
          ? [
                {
                    title: 'Reply to customers',
                    body: `${providerUnreadMessages} unread message${
                        providerUnreadMessages === 1 ? '' : 's'
                    } are waiting in your inbox.`,
                    href: route('requests.index'),
                    cta: 'Open request inbox',
                },
                {
                    title: 'Send missing quotes',
                    body: `${providerNeedsQuoteDraft} request${
                        providerNeedsQuoteDraft === 1 ? '' : 's'
                    } still need a first quote from you.`,
                    href: route('requests.index'),
                    cta: 'Review active requests',
                },
                {
                    title: 'Confirm payments',
                    body: `${providerPendingPayments} payment record${
                        providerPendingPayments === 1 ? '' : 's'
                    } are waiting for confirmation.`,
                    href: route('requests.index'),
                    cta: 'Open payment tasks',
                },
                {
                    title: 'Explore matching work',
                    body: `${providerSummary?.matchingOpenRequests ?? 0} open job${
                        (providerSummary?.matchingOpenRequests ?? 0) === 1
                            ? ''
                            : 's'
                    } match your trade and service area.`,
                    href: route('request-board.index'),
                    cta: 'Open job board',
                },
            ]
          : [
                {
                    title: 'Continue conversations',
                    body: `${customerUnreadMessages} unread message${
                        customerUnreadMessages === 1 ? '' : 's'
                    } are waiting across your recent requests.`,
                    href: route('requests.index'),
                    cta: 'Open my requests',
                },
                {
                    title: 'Decide on quotes',
                    body: `${customerPendingQuotes} quote${
                        customerPendingQuotes === 1 ? '' : 's'
                    } need your approval or decline.`,
                    href: route('requests.index'),
                    cta: 'Review quotes',
                },
                {
                    title: 'Confirm next steps',
                    body: `${customerPendingSchedules + customerPaymentsNeedingReview} visit or payment task${
                        customerPendingSchedules + customerPaymentsNeedingReview === 1
                            ? ''
                            : 's'
                    } still need your confirmation.`,
                    href: route('requests.index'),
                    cta: 'Open active tasks',
                },
                {
                    title: 'Find another provider',
                    body: 'Browse the directory again when you need a better fit, a new trade, or a second option.',
                    href: route('providers.index'),
                    cta: 'Open directory',
                },
            ];

    const accountTitle = isAdmin
        ? 'Platform access is active.'
        : isProvider
          ? user.providerProfile?.verificationStatus === 'verified'
              ? 'Your storefront is verified.'
              : user.providerProfile?.verificationStatus === 'rejected'
                ? 'Verification needs another pass.'
                : 'Verification is still pending.'
          : 'Your customer account is ready.';
    const accountBody = isAdmin
        ? `${platformSummary?.paymentsAwaitingConfirmation ?? 0} payment confirmation${
              (platformSummary?.paymentsAwaitingConfirmation ?? 0) === 1
                  ? ''
                  : 's'
          } and ${platformSummary?.targetedWithoutQuote ?? 0} targeted request${
              (platformSummary?.targetedWithoutQuote ?? 0) === 1 ? '' : 's'
          } without quotes are visible from the admin layer.`
        : isProvider
          ? user.providerProfile?.verificationStatus === 'verified'
              ? `Customers can now discover your profile. Current rating: ${formatRating(providerSummary?.averageRating)}.`
              : user.providerProfile?.verificationStatus === 'rejected'
                ? 'Update your provider details and verification notes before resubmitting for review.'
                : 'Finish verification so the profile can move from private preview to live discovery.'
          : `${customerPendingReviews} closed request${
                customerPendingReviews === 1 ? '' : 's'
            } can already become public provider reviews.`;

    const featuredCustomerRequest =
        customerJobRequests.find((jobRequest) => customerAttentionLabel(jobRequest)) ??
        customerJobRequests[0] ??
        null;

    const adminKpis = [
        {
            label: 'Total users',
            value: platformSummary?.totalUsers ?? 0,
            helper: `${platformSummary?.activeCustomers ?? 0} active customers`,
            values: [
                platformSummary?.activeCustomers ?? 0,
                platformSummary?.verifiedProviders ?? 0,
                platformSummary?.suspendedUsers ?? 0,
                platformSummary?.pendingProviderVerifications ?? 0,
            ],
        },
        {
            label: 'Verified providers',
            value: platformSummary?.verifiedProviders ?? 0,
            helper: `${platformSummary?.categories ?? 0} categories represented`,
            values: [
                platformSummary?.categories ?? 0,
                platformSummary?.verifiedProviders ?? 0,
                platformSummary?.shortlists ?? 0,
                platformSummary?.jobRequests ?? 0,
            ],
        },
        {
            label: 'Job requests',
            value: platformSummary?.jobRequests ?? 0,
            helper: `${platformSummary?.unassignedRequests ?? 0} unassigned`,
            values: [
                platformSummary?.unassignedRequests ?? 0,
                platformSummary?.targetedWithoutQuote ?? 0,
                platformSummary?.paymentsAwaitingConfirmation ?? 0,
                platformSummary?.jobRequests ?? 0,
            ],
        },
        {
            label: 'Moderation risk',
            value:
                (platformSummary?.flaggedReviews ?? 0) +
                (platformSummary?.suspendedUsers ?? 0),
            helper: `${platformSummary?.flaggedReviews ?? 0} flagged reviews`,
            values: [
                platformSummary?.flaggedReviews ?? 0,
                platformSummary?.suspendedUsers ?? 0,
                platformSummary?.rejectedProviders ?? 0,
                platformSummary?.pendingProviderVerifications ?? 0,
            ],
        },
    ];
    const adminConversionCards = [
        {
            label: 'Quote coverage',
            value: formatPercent(platformSummary?.quoteCoverageRate),
            helper: `${platformSummary?.quoteCount ?? 0} quote${
                (platformSummary?.quoteCount ?? 0) === 1 ? '' : 's'
            } on targeted work`,
        },
        {
            label: 'Quote acceptance',
            value: formatPercent(platformSummary?.quoteAcceptanceRate),
            helper: `${platformSummary?.acceptedQuoteCount ?? 0} accepted quote${
                (platformSummary?.acceptedQuoteCount ?? 0) === 1 ? '' : 's'
            }`,
        },
        {
            label: 'Average quote',
            value: formatAmount(platformSummary?.averageQuoteAmount),
            helper: 'Mean submitted quote value',
        },
        {
            label: 'Review completion',
            value: formatPercent(platformSummary?.reviewCompletionRate),
            helper: `${platformSummary?.reviewCount ?? 0} published review${
                (platformSummary?.reviewCount ?? 0) === 1 ? '' : 's'
            }`,
        },
    ];

    const adminQueueTotal = Math.max(
        1,
        (platformSummary?.pendingProviderVerifications ?? 0) +
            (platformSummary?.flaggedReviews ?? 0) +
            requestAlerts.length +
            (platformSummary?.suspendedUsers ?? 0),
    );
    const adminActivityRows = [
        ...pendingProviders.map((provider) => ({
            type: 'Provider',
            title: provider.businessName,
            subtitle: `${provider.tradeCategory || 'Trade pending'} in ${
                provider.locationLabel || 'location pending'
            }`,
            status: `${provider.documentCount} document${
                provider.documentCount === 1 ? '' : 's'
            }`,
            date: provider.submittedAt,
            href: route('admin.providers.index', { status: 'pending' }),
        })),
        ...requestAlerts.map((jobRequest) => ({
            type: 'Request',
            title: jobRequest.title,
            subtitle: `${jobRequest.customerName} with ${jobRequest.providerLabel}`,
            status: jobRequest.alertLabel,
            date: jobRequest.createdAt,
            href: route('admin.requests.index'),
        })),
        ...recentModeration.map((entry) => ({
            type: 'Account',
            title: entry.name,
            subtitle: entry.suspensionReason || 'No reason recorded',
            status: formatStatus(entry.status),
            date: entry.suspendedAt,
            href: route('admin.users.index'),
        })),
    ].slice(0, 8);
    const adminChartBars = [
        platformSummary?.activeCustomers ?? 0,
        platformSummary?.verifiedProviders ?? 0,
        platformSummary?.jobRequests ?? 0,
        platformSummary?.shortlists ?? 0,
        platformSummary?.pendingProviderVerifications ?? 0,
        platformSummary?.targetedWithoutQuote ?? 0,
        platformSummary?.paymentsAwaitingConfirmation ?? 0,
        platformSummary?.flaggedReviews ?? 0,
        platformSummary?.suspendedUsers ?? 0,
    ];
    const adminChartMax = Math.max(...adminChartBars, 1);

    if (isCustomer) {
        return (
            <AuthenticatedLayout
                header={
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                            Control center
                        </p>
                        <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                            {heading}
                        </h2>
                    </div>
                }
            >
                <Head title="Dashboard" />

                <div className="py-10">
                    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                        <section className="relative overflow-hidden rounded-[2.6rem] border border-zinc-200/80 bg-white/90 p-8 text-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:shadow-[0_34px_100px_rgba(0,0,0,0.28)] sm:p-10">
                            <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border border-zinc-200 dark:border-white/10" />
                            <div className="absolute bottom-8 right-16 h-32 w-32 rounded-full bg-zinc-200/70 blur-2xl dark:bg-white/10" />
                            <div className="absolute left-1/2 top-10 h-px w-1/2 bg-gradient-to-r from-zinc-300 to-transparent dark:from-white/30" />
                            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                                        Welcome back
                                    </p>
                                    <h3 className="mt-4 max-w-4xl font-display text-5xl font-semibold leading-[0.95] text-zinc-950 dark:text-white sm:text-6xl">
                                        Boma, keep your jobs moving.
                                    </h3>
                                    <p className="mt-4 text-base text-zinc-600 dark:text-zinc-300">
                                        Track requests, replies, and next steps in one place.
                                    </p>

                                    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                Unread
                                            </p>
                                            <p className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                                {customerUnreadMessages}
                                            </p>
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Provider replies waiting
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                Quotes
                                            </p>
                                            <p className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                                {customerPendingQuotes}
                                            </p>
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Need approval or decline
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                Visits
                                            </p>
                                            <p className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                                {customerPendingSchedules}
                                            </p>
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Need confirmation
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                Reviews
                                            </p>
                                            <p className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                                {customerPendingReviews}
                                            </p>
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Ready after completed work
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex w-full flex-col gap-3 sm:w-64">
                                    <Link
                                        href={route('requests.index', {
                                            attention: 1,
                                        })}
                                        className="rounded-full bg-zinc-950 px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    >
                                        Needs action
                                    </Link>
                                    <Link
                                        href={route('requests.create')}
                                        className="rounded-full border border-zinc-300 px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/20 dark:text-white dark:hover:border-white/40 dark:hover:bg-white/10"
                                    >
                                        New request
                                    </Link>
                                    <Link
                                        href={route('providers.index')}
                                        className="rounded-full border border-zinc-300 px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/20 dark:text-white dark:hover:border-white/40 dark:hover:bg-white/10"
                                    >
                                        Browse providers
                                    </Link>
                                </div>
                            </div>
                        </section>

                        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
                            <div className="rounded-[2.3rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_60px_rgba(0,0,0,0.34)]">
                                <SectionHeader
                                    eyebrow="Active work"
                                    title="Requests worth opening first"
                                    description="Recent job threads are shown with the current stage and the provider attached to each job."
                                    action={
                                        <Link
                                            href={route('requests.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            View all
                                        </Link>
                                    }
                                />

                                {customerJobRequests.length ? (
                                    <div className="mt-6 space-y-4">
                                        {customerJobRequests
                                            .slice(0, 3)
                                            .map((jobRequest) => (
                                                <CustomerRequestCard
                                                    key={jobRequest.id}
                                                    jobRequest={jobRequest}
                                                />
                                            ))}
                                    </div>
                                ) : (
                                    <div className="mt-6 rounded-[1.8rem] border border-dashed border-zinc-300 bg-zinc-50 p-8 dark:border-white/10 dark:bg-white/[0.03]">
                                        <h4 className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                            No requests yet
                                        </h4>
                                        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                            Start with one clear request. Boma will keep provider replies, quotes, visits, payments, and reviews in one flow.
                                        </p>
                                        <Link
                                            href={route('requests.create')}
                                            className="mt-6 inline-flex rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white dark:bg-white dark:text-zinc-950"
                                        >
                                            Post first request
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                {featuredCustomerRequest ? (
                                    <div className="rounded-[2.3rem] border border-zinc-200/80 bg-white/90 p-6 text-zinc-950 shadow-[0_18px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:shadow-[0_28px_90px_rgba(0,0,0,0.26)]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                            Featured thread
                                        </p>
                                        <h4 className="mt-3 font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                                            {featuredCustomerRequest.title}
                                        </h4>
                                        <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                                            {customerAttentionLabel(featuredCustomerRequest) ??
                                                requestProgressLine(
                                                    featuredCustomerRequest,
                                                    'customer',
                                                )}
                                        </p>
                                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                    Provider
                                                </p>
                                                <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                                                    {featuredCustomerRequest.providerLabel}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                    Status
                                                </p>
                                                <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                                                    {formatStatus(featuredCustomerRequest.status)}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            href={route(
                                                'requests.show',
                                                featuredCustomerRequest.id,
                                            )}
                                            className="mt-6 inline-flex rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                        >
                                            Open thread
                                        </Link>
                                    </div>
                                ) : null}

                                <div className="rounded-[2.3rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_60px_rgba(0,0,0,0.34)]">
                                    <SectionHeader
                                        eyebrow="Shortlist"
                                        title="Providers kept close"
                                        description="Saved providers stay here for repeat work, second opinions, or follow-up requests."
                                        action={
                                            <Link
                                                href={route('shortlist.index')}
                                                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                            >
                                                Open shortlist
                                            </Link>
                                        }
                                    />

                                    {shortlistedProviders.length ? (
                                        <div className="mt-6 space-y-4">
                                            {shortlistedProviders
                                                .slice(0, 3)
                                                .map((provider) => (
                                                    <CustomerProviderCard
                                                        key={provider.id}
                                                        provider={provider}
                                                    />
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.8rem] border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No saved providers yet. Browse the directory and shortlist the providers you trust for later.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    if (isAdmin) {
        return (
            <AuthenticatedLayout
                header={
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                            Platform command
                        </p>
                        <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                            Admin dashboard
                        </h2>
                    </div>
                }
            >
                <Head title="Admin Dashboard" />

                <div className="py-8">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_24px_90px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_34px_110px_rgba(0,0,0,0.38)]">
                            <div className="min-h-[760px]">
                                <main className="bg-white p-5 dark:bg-zinc-950 sm:p-7">
                                    <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-white/10 xl:flex-row xl:items-center xl:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Overview
                                            </p>
                                            <h3 className="mt-2 font-display text-4xl font-semibold text-zinc-950 dark:text-white">
                                                Marketplace operations
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Link
                                                href={route('admin.providers.index', { status: 'pending' })}
                                                className="rounded-full bg-zinc-950 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                                            >
                                                Review queue
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        {adminKpis.map((card) => (
                                            <AdminKpiCard key={card.label} {...card} />
                                        ))}
                                    </div>

                                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        {adminConversionCards.map((card) => (
                                            <StatCard
                                                key={card.label}
                                                label={card.label}
                                                value={card.value}
                                                helper={card.helper}
                                            />
                                        ))}
                                    </div>

                                    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_360px]">
                                        <section className="rounded-[1.7rem] border border-zinc-200 bg-zinc-50/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                        Platform signal
                                                    </p>
                                                    <h4 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        Activity distribution
                                                    </h4>
                                                </div>
                                                <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                    Live snapshot
                                                </span>
                                            </div>

                                            <div className="mt-8 flex h-72 items-end gap-3 border-b border-l border-zinc-200 px-3 pb-3 dark:border-white/10">
                                                {adminChartBars.map((value, index) => (
                                                    <div key={`${value}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                                                        <div
                                                            className="w-full max-w-10 rounded-t-2xl bg-zinc-950 transition dark:bg-white"
                                                            style={{
                                                                height: `${Math.max(8, (value / adminChartMax) * 230)}px`,
                                                            }}
                                                        />
                                                        <span className="text-[10px] font-semibold text-zinc-400">
                                                            {index + 1}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-5 grid gap-3 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-3">
                                                <p>1 Customers</p>
                                                <p>2 Providers</p>
                                                <p>3 Requests</p>
                                                <p>4 Shortlists</p>
                                                <p>5 Pending</p>
                                                <p>6 No quote</p>
                                                <p>7 Payments</p>
                                                <p>8 Reviews</p>
                                                <p>9 Suspended</p>
                                            </div>
                                        </section>

                                        <section className="rounded-[1.7rem] border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Decision mix
                                            </p>
                                            <h4 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                What needs attention
                                            </h4>
                                            <div className="mt-5 space-y-1">
                                                <AdminProgressRow
                                                    label="Provider verification"
                                                    value={platformSummary?.pendingProviderVerifications ?? 0}
                                                    total={adminQueueTotal}
                                                    href={route('admin.providers.index', { status: 'pending' })}
                                                />
                                                <AdminProgressRow
                                                    label="Request alerts"
                                                    value={requestAlerts.length}
                                                    total={adminQueueTotal}
                                                    href={route('admin.requests.index')}
                                                />
                                                <AdminProgressRow
                                                    label="Flagged reviews"
                                                    value={platformSummary?.flaggedReviews ?? 0}
                                                    total={adminQueueTotal}
                                                    href={route('admin.reviews.index')}
                                                />
                                                <AdminProgressRow
                                                    label="Suspended users"
                                                    value={platformSummary?.suspendedUsers ?? 0}
                                                    total={adminQueueTotal}
                                                    href={route('admin.users.index')}
                                                />
                                            </div>
                                        </section>
                                    </div>

                                    <section className="mt-5 overflow-hidden rounded-[1.7rem] border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950">
                                        <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                    Operations table
                                                </p>
                                                <h4 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                    Latest admin work
                                                </h4>
                                            </div>
                                            <Link
                                                href={route('admin.requests.index')}
                                                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20"
                                            >
                                                Open request oversight
                                            </Link>
                                        </div>

                                        <div className="hidden border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400 md:grid md:grid-cols-[0.8fr_1.5fr_0.9fr_0.8fr]">
                                            <span>Type</span>
                                            <span>Item</span>
                                            <span>Status</span>
                                            <span>Date</span>
                                        </div>

                                        {adminActivityRows.length ? (
                                            adminActivityRows.map((row) => (
                                                <AdminActivityRow
                                                    key={`${row.type}-${row.title}-${row.date}`}
                                                    row={row}
                                                />
                                            ))
                                        ) : (
                                            <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
                                                No admin work is waiting right now.
                                            </div>
                                        )}
                                    </section>
                                </main>
                            </div>
                        </section>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Control center
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        {heading}
                    </h2>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="rounded-[2.2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
                        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                            <div className="max-w-3xl">
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Welcome back
                                </p>
                                <h3 className="mt-3 font-display text-4xl font-semibold text-zinc-950 dark:text-white sm:text-5xl">
                                    {heroTitle}
                                </h3>
                                <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-400">
                                    {heroBody}
                                </p>
                                <div className="mt-8 flex flex-wrap gap-3">
                                    <Link
                                        href={primaryAction.href}
                                        className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    >
                                        {primaryAction.label}
                                    </Link>
                                    <Link
                                        href={secondaryAction.href}
                                        className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        {secondaryAction.label}
                                    </Link>
                                </div>
                            </div>

                            <div className="w-full max-w-sm rounded-[1.8rem] border border-zinc-200/80 bg-zinc-50/90 p-6 dark:border-white/10 dark:bg-white/[0.03]">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                    Account state
                                </p>
                                <h4 className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                    {accountTitle}
                                </h4>
                                <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                    {accountBody}
                                </p>
                            </div>
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

                    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                            <SectionHeader
                                eyebrow="Focus today"
                                title="Clear next actions"
                                description="The highest-value actions are surfaced here so users do not have to decode the whole workspace before moving forward."
                            />
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {focusActions.map((action) => (
                                    <ActionTile key={action.title} {...action} />
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                            <SectionHeader
                                eyebrow="Navigation"
                                title="Keep the workspace simple"
                                description={
                                    isAdmin
                                        ? 'Move between the four admin destinations without drilling through secondary screens first.'
                                        : isProvider
                                          ? 'The provider flow is now centered on inbox, storefront, and account updates.'
                                          : 'The customer flow is now centered on directory, requests, shortlist, and account.'
                                }
                            />
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href={route('providers.index')}
                                    className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                >
                                    Directory
                                </Link>
                                {(isCustomer || isProvider) && (
                                    <Link
                                        href={route('requests.index')}
                                        className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        {isProvider ? 'Request inbox' : 'My requests'}
                                    </Link>
                                )}
                                {isCustomer && (
                                    <Link
                                        href={route('shortlist.index')}
                                        className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        Shortlist
                                    </Link>
                                )}
                                {isProvider && (
                                    <Link
                                        href={route('profile.edit')}
                                        className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        Storefront settings
                                    </Link>
                                )}
                                {isAdmin && (
                                    <>
                                        <Link
                                            href={route('admin.providers.index')}
                                            className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Provider queue
                                        </Link>
                                        <Link
                                            href={route('admin.requests.index')}
                                            className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Request oversight
                                        </Link>
                                        <Link
                                            href={route('admin.reviews.index')}
                                            className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Review moderation
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {isCustomer ? (
                        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                <SectionHeader
                                    eyebrow="Recent requests"
                                    title="Continue active job threads"
                                    description="The most recent request conversations sit here so you can jump straight back into the work that is moving."
                                    action={
                                        <Link
                                            href={route('requests.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Open all requests
                                        </Link>
                                    }
                                />

                                {customerJobRequests.length ? (
                                    <div className="mt-6 space-y-4">
                                        {customerJobRequests.map((jobRequest) => (
                                            <RequestPreview
                                                key={jobRequest.id}
                                                jobRequest={jobRequest}
                                                viewerRole="customer"
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                        No requests yet. Start with one clear request and Boma will keep the provider conversation and decisions in one thread.
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                <SectionHeader
                                    eyebrow="Shortlist"
                                    title="Saved providers"
                                    description="These are the providers you marked for faster follow-up later."
                                    action={
                                        <Link
                                            href={route('shortlist.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Open shortlist
                                        </Link>
                                    }
                                />

                                {shortlistedProviders.length ? (
                                    <div className="mt-6 space-y-4">
                                        {shortlistedProviders.map((provider) => (
                                            <Link
                                                key={provider.id}
                                                href={route('providers.show', provider.id)}
                                                className="block rounded-[1.6rem] border border-zinc-200/80 bg-zinc-50/90 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                            >
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                            {provider.businessName}
                                                        </p>
                                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                            {provider.category}
                                                        </p>
                                                        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                            {provider.locationLabel || 'Location pending'}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {formatStatus(provider.availabilityStatus)}
                                                        </span>
                                                        {provider.verificationStatus === 'verified' ? (
                                                            <VerifiedBadge />
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                                    {formatRating(provider.averageRating)} from {provider.reviewCount} review
                                                    {provider.reviewCount === 1 ? '' : 's'}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                        No saved providers yet. Use the directory to compare options and keep the best fits close.
                                    </div>
                                )}
                            </div>
                        </section>
                    ) : null}

                    {isProvider ? (
                        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                <SectionHeader
                                    eyebrow="Incoming work"
                                    title="Requests targeting your storefront"
                                    description="This list stays focused on the active customer work you are most likely to respond to next."
                                    action={
                                        <Link
                                            href={route('requests.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Open request inbox
                                        </Link>
                                    }
                                />

                                {providerJobRequests.length ? (
                                    <div className="mt-6 space-y-4">
                                        {providerJobRequests.map((jobRequest) => (
                                            <RequestPreview
                                                key={jobRequest.id}
                                                jobRequest={jobRequest}
                                                viewerRole="provider"
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                        No customer requests have targeted this provider account yet. Keep the storefront clear so it is ready when the first request lands.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <SectionHeader
                                        eyebrow="Storefront health"
                                        title="What customers see first"
                                        description="The essentials are grouped here so you can adjust the storefront without wading through too many summary boxes."
                                    />
                                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                        <StatCard
                                            label="Starting from"
                                            value={formatAmount(providerSummary?.basePriceFrom)}
                                            helper="First visible price cue"
                                        />
                                        <StatCard
                                            label="Response time"
                                            value={providerSummary?.responseTimeLabel ?? 'Not set'}
                                            helper="Expectation set for new leads"
                                        />
                                        <StatCard
                                            label="Rating"
                                            value={formatRating(providerSummary?.averageRating)}
                                            helper="Public review signal"
                                        />
                                        <StatCard
                                            label="Saved by customers"
                                            value={providerSummary?.shortlistedByCustomersCount ?? 0}
                                            helper="Repeat discovery interest"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <SectionHeader
                                        eyebrow="Recent reviews"
                                        title="Public trust from closed work"
                                        description="A compact view of the most recent customer feedback on this provider account."
                                    />
                                    {providerSummary?.recentReviews?.length ? (
                                        <div className="mt-6 space-y-4">
                                            {providerSummary.recentReviews.map((review) => (
                                                <div
                                                    key={review.id}
                                                    className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            {formatRating(review.rating)}
                                                        </span>
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {review.customerName}
                                                        </span>
                                                    </div>
                                                    {review.headline ? (
                                                        <p className="mt-4 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                            {review.headline}
                                                        </p>
                                                    ) : null}
                                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                        {review.body}
                                                    </p>
                                                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Published {formatDateTime(review.createdAt)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No reviews have been published yet. Completed requests will start filling this section automatically.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {isAdmin ? (
                        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                <SectionHeader
                                    eyebrow="Provider queue"
                                    title="Verification work waiting now"
                                    description="A smaller queue view keeps admin review focused on the most recent provider submissions."
                                    action={
                                        <Link
                                            href={route('admin.providers.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Open provider queue
                                        </Link>
                                    }
                                />

                                {pendingProviders.length ? (
                                    <div className="mt-6 space-y-4">
                                        {pendingProviders.map((provider) => (
                                            <div
                                                key={provider.id}
                                                className="rounded-[1.6rem] border border-zinc-200/80 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                                            >
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                            {provider.businessName}
                                                        </p>
                                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                            {provider.tradeCategory} in{' '}
                                                            {provider.locationLabel ||
                                                                'Location pending'}
                                                        </p>
                                                        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                            {provider.documentCount} document
                                                            {provider.documentCount === 1
                                                                ? ''
                                                                : 's'}{' '}
                                                            and {provider.serviceCount} service
                                                            card
                                                            {provider.serviceCount === 1
                                                                ? ''
                                                                : 's'}{' '}
                                                            uploaded
                                                        </p>
                                                    </div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Submitted{' '}
                                                        {formatDateTime(provider.submittedAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                        No providers are currently waiting in the verification queue.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <SectionHeader
                                        eyebrow="Request alerts"
                                        title="Threads needing admin visibility"
                                        description="These are the marketplace flows most likely to stall or require intervention."
                                    />
                                    {requestAlerts.length ? (
                                        <div className="mt-6 space-y-4">
                                            {requestAlerts.map((jobRequest) => (
                                                <Link
                                                    key={jobRequest.id}
                                                    href={route('admin.requests.index')}
                                                    className="block rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            {jobRequest.alertLabel}
                                                        </span>
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {formatStatus(jobRequest.urgency)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-4 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                        {jobRequest.title}
                                                    </p>
                                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                        {jobRequest.customerName} with{' '}
                                                        {jobRequest.providerLabel}
                                                    </p>
                                                    <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                        {jobRequest.locationLabel ||
                                                            'Location pending'}
                                                    </p>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No request alerts are active right now.
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <SectionHeader
                                        eyebrow="Recent moderation"
                                        title="Latest restricted accounts"
                                        description="A short moderation history helps admin users keep context without opening another table first."
                                    />
                                    {recentModeration.length ? (
                                        <div className="mt-6 space-y-4">
                                            {recentModeration.map((entry) => (
                                                <div
                                                    key={entry.id}
                                                    className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            {formatStatus(entry.role)}
                                                        </span>
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {formatStatus(entry.status)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-4 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                        {entry.name}
                                                    </p>
                                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                        Suspended by{' '}
                                                        {entry.suspendedByName || 'system'}
                                                    </p>
                                                    <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                        {entry.suspensionReason ||
                                                            'No reason recorded.'}
                                                    </p>
                                                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Suspended{' '}
                                                        {formatDateTime(entry.suspendedAt)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No recent moderation actions to surface here.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    ) : null}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
