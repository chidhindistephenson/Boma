import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import VerifiedBadge from '@/Components/VerifiedBadge';
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
    return value ? Number(value).toLocaleString() : null;
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
        (total, jobRequest) =>
            total + (jobRequest.scheduleNeedsResponse ? 1 : 0),
        0,
    );
    const customerPaymentsNeedingReview = customerJobRequests.reduce(
        (total, jobRequest) => total + (jobRequest.paymentNeedsUpdate ? 1 : 0),
        0,
    );
    const providerPendingQuotes = providerSummary?.quotesPendingResponse ?? 0;
    const providerPendingSchedules = providerSummary?.proposedSchedules ?? 0;
    const providerPendingPayments =
        providerSummary?.paymentsPendingConfirmation ?? 0;

    const heading = isAdmin
        ? 'Admin dashboard'
        : isProvider
          ? 'Provider dashboard'
          : 'Customer dashboard';

    const intro = isAdmin
        ? 'You have platform-level access for trust, user moderation, provider verification, and request oversight across the marketplace.'
        : isProvider
          ? 'Your account now has a live storefront: availability, service cards, pricing cues, and request threads all shape how customers judge you.'
          : 'Your account can now move from discovery into action: shortlist providers, post structured job requests, and manage live request conversations from one place.';

    const actions = isAdmin
          ? [
                'Review newly onboarded providers and approve or reject verification requests.',
                'Suspend or restore accounts when marketplace behavior needs intervention.',
                'Inspect request flow health so stalled or unassigned work does not pile up silently.',
                'Read platform analytics to see which categories, cities, and providers are actually converting.',
            ]
        : isProvider
          ? [
                'Keep your storefront specific: add services, pricing cues, and response commitments.',
                'Review unread customer messages and respond while demand is still warm.',
                'Send clear quotes quickly so requests do not stall in vague back-and-forth.',
                'Adjust availability the moment your schedule tightens so discovery stays honest.',
            ]
          : [
                'Browse providers by category, city, and availability.',
                'Save shortlisted providers and compare your best options.',
                'Track fresh quotes and accept the ones that match your timing and budget.',
                'Use request threads to keep conversations and status changes in one place.',
            ];

    const metrics = isAdmin
        ? [
              { label: 'Role', value: 'platform admin' },
              {
                  label: 'Email',
                  value: user.email_verified_at ? 'verified' : 'pending',
              },
              {
                  label: 'Queue',
                  value: `${platformSummary?.pendingProviderVerifications ?? 0} pending`,
              },
           ]
        : isProvider
          ? [
                {
                    label: 'Visibility',
                    value: providerSummary?.profileVisible ? 'live' : 'private',
                },
                {
                    label: 'Rating',
                    value: formatRating(providerSummary?.averageRating),
                },
                {
                    label: 'Reviews',
                    value: `${providerSummary?.reviewCount ?? 0} published`,
                },
            ]
          : [
                { label: 'Role', value: 'customer' },
                {
                    label: 'Shortlist',
                    value: `${user.shortlistedProvidersCount ?? 0} saved`,
                },
                {
                    label: 'Requests',
                    value: `${customerJobRequests.length} recent`,
                },
            ];

    const statusBody = isAdmin
        ? 'Admin accounts can now review provider submissions, approve verified listings, and reject weak applications with review notes.'
        : isProvider
          ? user.providerProfile?.verificationStatus === 'verified'
              ? 'Your provider listing is verified. Keep the storefront sharp so customers can compare you on speed, services, and price clarity.'
              : user.providerProfile?.verificationStatus === 'rejected'
                ? 'Your last verification review was rejected. Update your profile details, strengthen your verification notes, and resubmit for review.'
                : 'Providers remain in pending verification until an admin approves the listing review.'
          : 'Customer accounts are active immediately after registration, with email verification used for trust and account recovery.';

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

            <div className="py-12">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
                    <div className="space-y-6">
                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                Welcome back
                            </p>
                            <h3 className="mt-3 font-display text-4xl font-semibold text-zinc-950 dark:text-white">
                                {user.name}
                            </h3>
                            <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-400">
                                {intro}
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                {metrics.map((metric) => (
                                    <div
                                        key={metric.label}
                                        className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                                    >
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                            {metric.label}
                                        </p>
                                        <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                            {metric.value}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href={route('providers.index')}
                                    className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                >
                                    Browse directory
                                </Link>
                                {isCustomer ? (
                                    <Link
                                        href={route('requests.create')}
                                        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    >
                                        Post job request
                                    </Link>
                                ) : isAdmin ? (
                                    <Link
                                        href={route('admin.users.index')}
                                        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    >
                                        Open user directory
                                    </Link>
                                ) : (
                                    <Link
                                        href={route('profile.edit')}
                                        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    >
                                        Update account
                                    </Link>
                                )}
                            </div>
                        </div>

                        {isCustomer ? (
                            <>
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Shortlist
                                            </p>
                                            <h4 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                Saved providers for faster follow-up
                                            </h4>
                                        </div>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                            {shortlistedProviders.length}{' '}
                                            recent saved provider
                                            {shortlistedProviders.length === 1 ? '' : 's'}
                                        </p>
                                        <Link
                                            href={route('shortlist.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Open shortlist
                                        </Link>
                                    </div>

                                    {shortlistedProviders.length ? (
                                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                            {shortlistedProviders.map((provider) => (
                                                <Link
                                                    key={provider.id}
                                                    href={route('providers.show', provider.id)}
                                                    className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                        {provider.businessName}
                                                    </p>
                                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                        {provider.category}
                                                    </p>
                                                    <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                        {provider.locationLabel ||
                                                            'Location pending'}
                                                    </p>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {formatStatus(
                                                                provider.availabilityStatus,
                                                            )}
                                                        </span>
                                                        {provider.verificationStatus ===
                                                        'verified' ? (
                                                            <VerifiedBadge />
                                                        ) : null}
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {formatRating(
                                                                provider.averageRating,
                                                            )}
                                                        </span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            You have not saved any providers yet. Open the
                                            directory, inspect profiles, and shortlist the
                                            ones you want to revisit.
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Job requests
                                            </p>
                                            <h4 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                Recent requests you have posted
                                            </h4>
                                            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {customerUnreadMessages} unread message
                                                {customerUnreadMessages === 1 ? '' : 's'} across
                                                active request threads
                                                {customerPendingQuotes
                                                    ? ` and ${customerPendingQuotes} pending quote decision${
                                                          customerPendingQuotes ===
                                                          1
                                                              ? ''
                                                              : 's'
                                                      }`
                                                    : ''}
                                                {customerPendingSchedules
                                                    ? `${customerPendingQuotes ? ',' : ' and'} ${customerPendingSchedules} visit confirmation${
                                                          customerPendingSchedules ===
                                                          1
                                                              ? ''
                                                              : 's'
                                                      }`
                                                    : ''}
                                                {customerPaymentsNeedingReview
                                                    ? `${customerPendingQuotes || customerPendingSchedules ? ',' : ' and'} ${customerPaymentsNeedingReview} payment update${
                                                          customerPaymentsNeedingReview ===
                                                          1
                                                              ? ''
                                                              : 's'
                                                      }`
                                                    : ''}
                                            </p>
                                        </div>
                                        <Link
                                            href={route('requests.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            View all
                                        </Link>
                                    </div>

                                    {customerJobRequests.length ? (
                                        <div className="mt-6 space-y-4">
                                            {customerJobRequests.map((jobRequest) => (
                                                <Link
                                                    key={jobRequest.id}
                                                    href={route('requests.show', jobRequest.id)}
                                                    className="block rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                                {jobRequest.title}
                                                            </p>
                                                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                                {jobRequest.category} -{' '}
                                                                {jobRequest.providerLabel}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {jobRequest.hasReview ? (
                                                                <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                    Review {jobRequest.reviewRating}/5
                                                                </span>
                                                            ) : jobRequest.canReview ? (
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
                                                                    {jobRequest.quoteNeedsResponse
                                                                        ? 'Quote waiting on you'
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
                                                                    {jobRequest.scheduleNeedsResponse
                                                                        ? 'Visit waiting on you'
                                                                        : `Visit ${formatStatus(jobRequest.scheduleStatus)}`}
                                                                </span>
                                                            ) : null}
                                                            {jobRequest.hasPayment ? (
                                                                <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                    {jobRequest.paymentNeedsUpdate
                                                                        ? 'Payment needs review'
                                                                        : `Payment ${formatStatus(jobRequest.paymentStatus)}`}
                                                                </span>
                                                            ) : null}
                                                            {jobRequest.paymentAmount ? (
                                                                <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                    Payment {formatAmount(jobRequest.paymentAmount)}
                                                                </span>
                                                            ) : null}
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
                                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                {formatStatus(jobRequest.status)}
                                                            </span>
                                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                {formatStatus(jobRequest.urgency)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                        {jobRequest.locationLabel ||
                                                            'Location pending'}
                                                    </p>
                                                    {jobRequest.hasSchedule ? (
                                                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                            Visit {formatDateTime(jobRequest.scheduledFor)}
                                                        </p>
                                                    ) : null}
                                                    {jobRequest.sourceRequestTitle ? (
                                                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                            Based on {jobRequest.sourceRequestTitle}
                                                        </p>
                                                    ) : null}
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No job requests posted yet. Use the request
                                            builder when you want to define the work and
                                            target a provider directly.
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}

                        {isProvider ? (
                            <>
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Storefront snapshot
                                            </p>
                                            <h4 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                What customers can judge before they message
                                            </h4>
                                        </div>
                                        <Link
                                            href={route('profile.edit')}
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Edit storefront
                                        </Link>
                                        <Link
                                            href={route('providers.show', user.id)}
                                            className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                        >
                                            Preview storefront
                                        </Link>
                                    </div>

                                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Services
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {providerSummary?.serviceCount ?? 0}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Saved by customers
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {providerSummary?.shortlistedByCustomersCount ?? 0}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Starting from
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {providerSummary?.basePriceFrom
                                                    ? `$${Number(providerSummary.basePriceFrom).toLocaleString()}`
                                                    : 'Flexible'}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Response time
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {providerSummary?.responseTimeLabel ?? 'Not set'}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Average rating
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {formatRating(
                                                    providerSummary?.averageRating,
                                                )}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Published reviews
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {providerSummary?.reviewCount ?? 0}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Quotes waiting
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {providerSummary?.quotesPendingResponse ?? 0}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Accepted quotes
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {providerSummary?.acceptedQuotes ?? 0}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Visits waiting
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {providerSummary?.proposedSchedules ?? 0}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Confirmed visits
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {providerSummary?.confirmedSchedules ?? 0}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Payments waiting
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {providerSummary?.paymentsPendingConfirmation ??
                                                    0}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Confirmed payments
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {providerSummary?.confirmedPayments ?? 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Recent reviews
                                            </p>
                                            <h4 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                Public trust signals from closed work
                                            </h4>
                                        </div>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                            {providerSummary?.reviewCount ?? 0} total review
                                            {(providerSummary?.reviewCount ?? 0) === 1
                                                ? ''
                                                : 's'}
                                        </p>
                                    </div>

                                    {providerSummary?.recentReviews?.length ? (
                                        <div className="mt-6 space-y-4">
                                            {providerSummary.recentReviews.map(
                                                (review) => (
                                                    <div
                                                        key={review.id}
                                                        className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                                                    >
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                {formatRating(
                                                                    review.rating,
                                                                )}
                                                            </span>
                                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
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
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No customer reviews have been published yet.
                                            Closed requests will begin feeding this trust
                                            layer automatically once customers rate the
                                            completed work.
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Incoming requests
                                            </p>
                                            <h4 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                Customers are now targeting your profile
                                            </h4>
                                            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {providerUnreadMessages} unread message
                                                {providerUnreadMessages === 1 ? '' : 's'} across
                                                active request threads
                                                {providerPendingQuotes
                                                    ? ` and ${providerPendingQuotes} quote${
                                                          providerPendingQuotes ===
                                                          1
                                                              ? ''
                                                              : 's'
                                                      } waiting on customer response`
                                                    : ''}
                                                {providerPendingSchedules
                                                    ? `${providerPendingQuotes ? ',' : ' and'} ${providerPendingSchedules} visit proposal${
                                                          providerPendingSchedules ===
                                                          1
                                                              ? ''
                                                              : 's'
                                                      } waiting on customer confirmation`
                                                    : ''}
                                                {providerPendingPayments
                                                    ? `${providerPendingQuotes || providerPendingSchedules ? ',' : ' and'} ${providerPendingPayments} payment confirmation${
                                                          providerPendingPayments ===
                                                          1
                                                              ? ''
                                                              : 's'
                                                      } waiting on you`
                                                    : ''}
                                            </p>
                                        </div>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                            {providerJobRequests.length} recent request
                                            {providerJobRequests.length === 1 ? '' : 's'}
                                        </p>
                                    </div>

                                    {providerJobRequests.length ? (
                                        <div className="mt-6 space-y-4">
                                            {providerJobRequests.map((jobRequest) => (
                                                <Link
                                                    key={jobRequest.id}
                                                    href={route('requests.show', jobRequest.id)}
                                                    className="block rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                                {jobRequest.title}
                                                            </p>
                                                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                                {jobRequest.category} - from{' '}
                                                                {jobRequest.customerName}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {jobRequest.hasQuote ? (
                                                                <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                    Quote {formatStatus(jobRequest.quoteStatus)}
                                                                </span>
                                                            ) : null}
                                                            {jobRequest.sourceRequestId ? (
                                                                <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                    Follow-up
                                                                </span>
                                                            ) : null}
                                                            {jobRequest.quoteAmount ? (
                                                                <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                    Quote {formatAmount(jobRequest.quoteAmount)}
                                                                </span>
                                                            ) : null}
                                                            {jobRequest.hasSchedule ? (
                                                                <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                    Visit {formatStatus(jobRequest.scheduleStatus)}
                                                                </span>
                                                            ) : null}
                                                            {jobRequest.hasPayment ? (
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
                                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                {formatStatus(jobRequest.status)}
                                                            </span>
                                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                {formatStatus(jobRequest.urgency)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                        {jobRequest.locationLabel ||
                                                            'Location pending'}
                                                    </p>
                                                    {jobRequest.hasSchedule ? (
                                                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                            Visit {formatDateTime(jobRequest.scheduledFor)}
                                                        </p>
                                                    ) : null}
                                                    {jobRequest.sourceRequestTitle ? (
                                                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                            Based on {jobRequest.sourceRequestTitle}
                                                        </p>
                                                    ) : null}
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No targeted customer requests have reached you yet.
                                            Tighten the storefront and keep availability
                                            accurate so the first wave of demand converts
                                            better.
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}

                        {isAdmin && platformSummary ? (
                            <>
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Verification queue
                                            </p>
                                            <h4 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                Providers waiting on trust review
                                            </h4>
                                        </div>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                            {platformSummary.pendingProviderVerifications}{' '}
                                            pending review
                                            {platformSummary.pendingProviderVerifications ===
                                            1
                                                ? ''
                                                : 's'}
                                        </p>
                                    </div>

                                    {adminQueues?.pendingProviders?.length ? (
                                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                            {adminQueues.pendingProviders.map((provider) => (
                                                <Link
                                                    key={provider.id}
                                                    href={route(
                                                        'admin.providers.index',
                                                    )}
                                                    className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                        {provider.businessName}
                                                    </p>
                                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                        {provider.tradeCategory}
                                                    </p>
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            {provider.documentCount}{' '}
                                                            document
                                                            {provider.documentCount === 1
                                                                ? ''
                                                                : 's'}
                                                        </span>
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {provider.serviceCount}{' '}
                                                            service
                                                            {provider.serviceCount === 1
                                                                ? ''
                                                                : 's'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                        {provider.locationLabel ||
                                                            'Location pending'}
                                                    </p>
                                                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Submitted{' '}
                                                        {formatDateTime(provider.submittedAt)}
                                                    </p>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No providers are waiting in the
                                            verification queue right now.
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Request alerts
                                            </p>
                                            <h4 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                Threads that need operational attention
                                            </h4>
                                        </div>
                                        <Link
                                            href={route('admin.requests.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Open request oversight
                                        </Link>
                                    </div>

                                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                        <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                Unassigned requests
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {platformSummary.unassignedRequests}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                Targeted without quote
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {platformSummary.targetedWithoutQuote}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                Payments awaiting confirmation
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {
                                                    platformSummary.paymentsAwaitingConfirmation
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {adminQueues?.requestAlerts?.length ? (
                                        <div className="mt-6 space-y-4">
                                            {adminQueues.requestAlerts.map((jobRequest) => (
                                                <Link
                                                    key={jobRequest.id}
                                                    href={route(
                                                        'requests.show',
                                                        jobRequest.id,
                                                    )}
                                                    className="block rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                                {jobRequest.title}
                                                            </p>
                                                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                                {
                                                                    jobRequest.customerName
                                                                }{' '}
                                                                -{' '}
                                                                {
                                                                    jobRequest.providerLabel
                                                                }
                                                            </p>
                                                            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                                {jobRequest.locationLabel ||
                                                                    'Location pending'}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                {
                                                                    jobRequest.alertLabel
                                                                }
                                                            </span>
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
                                                        </div>
                                                    </div>
                                                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Created{' '}
                                                        {formatDateTime(jobRequest.createdAt)}
                                                    </p>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No request alerts are stacked right
                                            now.
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Moderation
                                            </p>
                                            <h4 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                Recent account interventions
                                            </h4>
                                        </div>
                                        <Link
                                            href={route('admin.users.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Open user directory
                                        </Link>
                                    </div>

                                    {adminQueues?.recentModeration?.length ? (
                                        <div className="mt-6 space-y-4">
                                            {adminQueues.recentModeration.map(
                                                (moderatedUser) => (
                                                    <div
                                                        key={moderatedUser.id}
                                                        className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                                                    >
                                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                            <div>
                                                                <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                                    {
                                                                        moderatedUser.name
                                                                    }
                                                                </p>
                                                                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                                    {formatStatus(
                                                                        moderatedUser.role,
                                                                    )}
                                                                </p>
                                                                {moderatedUser.suspensionReason ? (
                                                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                                        {
                                                                            moderatedUser.suspensionReason
                                                                        }
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                    Suspended
                                                                </span>
                                                                <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                    By{' '}
                                                                    {
                                                                        moderatedUser.suspendedByName
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            Suspended{' '}
                                                            {formatDateTime(moderatedUser.suspendedAt)}
                                                        </p>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No accounts are currently suspended.
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Marketplace summary
                                    </p>
                                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Total users
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {platformSummary.totalUsers}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Verified providers
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {platformSummary.verifiedProviders}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Active customers
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {platformSummary.activeCustomers}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Suspended accounts
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {platformSummary.suspendedUsers}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Saved shortlists
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {platformSummary.shortlists}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Active categories
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {platformSummary.categories}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Total job requests
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {platformSummary.jobRequests}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Pending reviews
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {
                                                    platformSummary.pendingProviderVerifications
                                                }
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03] sm:col-span-2">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                                Rejected providers
                                            </p>
                                            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {platformSummary.rejectedProviders}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <Link
                                            href={route('admin.users.index')}
                                            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                        >
                                            Open user directory
                                        </Link>
                                        <Link
                                            href={route('admin.requests.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Open request oversight
                                        </Link>
                                        <Link
                                            href={route('admin.analytics.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Open analytics
                                        </Link>
                                        <Link
                                            href={route('admin.providers.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Open provider queue
                                        </Link>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-[2rem] border border-zinc-200/80 bg-zinc-950 p-8 text-white shadow-[0_30px_80px_rgba(0,0,0,0.22)] dark:border-white/10 dark:bg-white dark:text-zinc-950">
                            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-400 dark:text-zinc-600">
                                Next steps
                            </p>
                            <ul className="mt-6 space-y-4 text-sm leading-7 text-white/90 dark:text-zinc-700">
                                {actions.map((action) => (
                                    <li
                                        key={action}
                                        className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 dark:border-zinc-200 dark:bg-zinc-100"
                                    >
                                        {action}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                Account status
                            </p>
                            <h4 className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                {formatStatus(user.status)}
                            </h4>
                            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                {statusBody}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
