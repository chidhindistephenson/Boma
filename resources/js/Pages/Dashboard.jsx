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

function StatCard({ label, value, helper }) {
    return (
        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                {label}
            </p>
            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                {value}
            </p>
            {helper ? (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
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
            className="rounded-[1.6rem] border border-zinc-200/80 bg-zinc-50/85 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
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
            className="block rounded-[1.6rem] border border-zinc-200/80 bg-zinc-50/85 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
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
        ? { href: route('admin.analytics.index'), label: 'Open analytics' }
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
                  label: 'Request alerts',
                  value: requestAlerts.length,
                  helper: 'Threads needing admin attention',
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
                    label: 'Services live',
                    value: providerSummary?.serviceCount ?? 0,
                    helper: 'Visible storefront service cards',
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
              {
                  title: 'Check platform analytics',
                  body: `${platformSummary?.jobRequests ?? 0} request${
                      (platformSummary?.jobRequests ?? 0) === 1 ? '' : 's'
                  } and ${platformSummary?.categories ?? 0} active service categor${
                      (platformSummary?.categories ?? 0) === 1 ? 'y' : 'ies'
                  } tracked across Boma.`,
                  href: route('admin.analytics.index'),
                  cta: 'Open analytics',
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
                    title: 'Tighten your storefront',
                    body: 'Keep pricing cues, services, and availability current so customers do not have to guess.',
                    href: route('profile.edit'),
                    cta: 'Edit storefront',
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
                    <section className="rounded-[2.2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
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

                            <div className="w-full max-w-sm rounded-[1.8rem] border border-zinc-200/80 bg-zinc-50/85 p-6 dark:border-white/10 dark:bg-white/[0.03]">
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
                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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

                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                    className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href={route('providers.index')}
                                    className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                >
                                    Directory
                                </Link>
                                {(isCustomer || isProvider) && (
                                    <Link
                                        href={route('requests.index')}
                                        className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        {isProvider ? 'Request inbox' : 'My requests'}
                                    </Link>
                                )}
                                {isCustomer && (
                                    <Link
                                        href={route('shortlist.index')}
                                        className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        Shortlist
                                    </Link>
                                )}
                                {isProvider && (
                                    <Link
                                        href={route('profile.edit')}
                                        className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        Storefront settings
                                    </Link>
                                )}
                                {isAdmin && (
                                    <>
                                        <Link
                                            href={route('admin.providers.index')}
                                            className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Provider queue
                                        </Link>
                                        <Link
                                            href={route('admin.requests.index')}
                                            className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Request oversight
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {isCustomer ? (
                        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                    <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                        No requests yet. Start with one clear request and Boma will keep the provider conversation and decisions in one thread.
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                                className="block rounded-[1.6rem] border border-zinc-200/80 bg-zinc-50/85 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
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
                                    <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                        No saved providers yet. Use the directory to compare options and keep the best fits close.
                                    </div>
                                )}
                            </div>
                        </section>
                    ) : null}

                    {isProvider ? (
                        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                    <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                        No customer requests have targeted this provider account yet. Keep the storefront clear so it is ready when the first request lands.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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

                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                                    className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
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
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No reviews have been published yet. Completed requests will start filling this section automatically.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {isAdmin ? (
                        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                                className="rounded-[1.6rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
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
                                    <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                        No providers are currently waiting in the verification queue.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                                    className="block rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
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
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No request alerts are active right now.
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                                    className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
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
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
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
