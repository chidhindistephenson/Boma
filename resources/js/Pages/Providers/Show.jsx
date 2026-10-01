import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/ThemeToggle';
import VerifiedBadge from '@/Components/VerifiedBadge';
import { Head, Link, router, usePage } from '@inertiajs/react';

function formatStatus(value) {
    return value.replace(/_/g, ' ');
}

function formatMoney(value) {
    if (value === null || value === undefined || value === '') {
        return 'Custom quote';
    }

    return `From $${Number(value).toLocaleString()}`;
}

function formatRating(value) {
    if (value === null || value === undefined || value === '') {
        return 'No reviews yet';
    }

    return `${Number(value).toFixed(1)}/5`;
}

function initialsFor(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

function badgeClasses(status) {
    if (status === 'verified') {
        return 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950';
    }

    if (status === 'available') {
        return 'border-zinc-300 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300';
    }

    return 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300';
}

function SectionHeader({ eyebrow, title, description, badge }) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                    {eyebrow}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                    {title}
                </h2>
                {description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        {description}
                    </p>
                ) : null}
            </div>
            {badge ? badge : null}
        </div>
    );
}

function StatCard({ label, value, helper }) {
    return (
        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-zinc-950/78 dark:shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                {label}
            </p>
            <p className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
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

function DetailItem({ label, value }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200/70 py-4 last:border-b-0 dark:border-white/10">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                {label}
            </span>
            <span className="text-right text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {value}
            </span>
        </div>
    );
}

export default function ProvidersShow({
    provider,
    canRevealContact,
    canShortlist,
    isShortlisted,
    isOwnerPreview,
    isPubliclyVisible,
    relatedProviders,
}) {
    const { auth } = usePage().props;

    const handleShortlist = () => {
        if (isShortlisted) {
            router.delete(route('providers.shortlist.destroy', provider.id), {
                preserveScroll: true,
            });

            return;
        }

        router.post(route('providers.shortlist.store', provider.id), {}, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={provider.businessName} />

            <div className="relative min-h-screen overflow-hidden bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-white">
                <div className="hero-grid absolute inset-0 opacity-50 dark:opacity-90" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.08),_transparent_24%),radial-gradient(circle_at_88%_18%,_rgba(0,0,0,0.06),_transparent_18%),linear-gradient(180deg,_rgba(255,255,255,0.97),_rgba(244,244,245,0.94))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_24%),radial-gradient(circle_at_88%_18%,_rgba(255,255,255,0.07),_transparent_18%),linear-gradient(180deg,_rgba(9,9,11,0.97),_rgba(15,15,15,0.96))]" />

                <div className="relative mx-auto max-w-7xl px-6 py-8 lg:px-8">
                    <header className="grid gap-4 py-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                        <Link href={route('welcome')} className="flex items-center gap-3">
                            <ApplicationLogo className="h-11 w-11 text-zinc-950 dark:text-white" />
                            <div>
                                <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                    Boma
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Provider profile
                                </p>
                            </div>
                        </Link>

                        <div className="hidden justify-center lg:flex">
                            <Link
                                href={route('providers.index')}
                                className="rounded-full border border-zinc-300 bg-white/85 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-white/10 dark:bg-zinc-950/75 dark:text-white dark:hover:bg-zinc-900"
                            >
                                Back to directory
                            </Link>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <ThemeToggle />
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className="rounded-full border border-zinc-300 bg-white/85 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-white/10 dark:bg-zinc-950/75 dark:text-white dark:hover:bg-zinc-900"
                                >
                                    Log in
                                </Link>
                            )}
                        </div>
                    </header>

                    <main className="grid gap-8 py-10 xl:grid-cols-[minmax(0,1.35fr)_360px]">
                        <section className="space-y-8">
                            {isOwnerPreview ? (
                                <div className="rounded-[1.8rem] border border-zinc-200/80 bg-white/86 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/78 dark:shadow-[0_20px_60px_rgba(0,0,0,0.32)]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Storefront preview
                                    </p>
                                    <h2 className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {isPubliclyVisible
                                            ? 'This storefront is live in the public directory.'
                                            : 'This storefront is private until the profile becomes publicly visible.'}
                                    </h2>
                                    <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        {isPubliclyVisible
                                            ? 'Customers can already discover this profile through search and see the same presentation below.'
                                            : 'Use this page to inspect how your public presence reads before customers can access it.'}
                                    </p>
                                </div>
                            ) : null}

                            <div className="overflow-hidden rounded-[2.3rem] border border-zinc-200/80 bg-white/90 shadow-[0_28px_90px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
                                <div className="border-b border-zinc-200/80 px-7 py-6 dark:border-white/10">
                                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex items-start gap-5">
                                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.7rem] bg-zinc-950 text-xl font-semibold uppercase tracking-[0.18em] text-white dark:bg-white dark:text-zinc-950">
                                                {initialsFor(provider.businessName)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {provider.verificationStatus === 'verified' ? (
                                                        <VerifiedBadge />
                                                    ) : (
                                                        <span
                                                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeClasses(provider.verificationStatus)}`}
                                                        >
                                                            {formatStatus(provider.verificationStatus)}
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeClasses(provider.availabilityStatus)}`}
                                                    >
                                                        {formatStatus(provider.availabilityStatus)}
                                                    </span>
                                                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                        {provider.category}
                                                    </span>
                                                </div>

                                                <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight text-zinc-950 dark:text-white sm:text-5xl">
                                                    {provider.businessName}
                                                </h1>

                                                {provider.headline ? (
                                                    <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-400">
                                                        {provider.headline}
                                                    </p>
                                                ) : null}

                                                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                    <span>Operated by {provider.providerName}</span>
                                                    <span>{provider.locationLabel || 'Location pending'}</span>
                                                    <span>
                                                        {formatRating(provider.averageRating)} and{' '}
                                                        {provider.reviewCount} review
                                                        {provider.reviewCount === 1 ? '' : 's'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2 lg:w-[260px]">
                                            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                    Starting from
                                                </p>
                                                <p className="mt-3 text-lg font-semibold text-zinc-950 dark:text-white">
                                                    {formatMoney(provider.basePriceFrom)}
                                                </p>
                                            </div>
                                            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                    Response time
                                                </p>
                                                <p className="mt-3 text-lg font-semibold text-zinc-950 dark:text-white">
                                                    {provider.responseTimeLabel ?? 'Not set'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-6 px-7 py-7 lg:grid-cols-[minmax(0,1fr)_280px]">
                                    <div>
                                        <p className="max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-400">
                                            {provider.bio}
                                        </p>

                                        <div className="mt-6 flex flex-wrap gap-3">
                                            {canShortlist ? (
                                                <>
                                                    <Link
                                                        href={route(
                                                            'providers.requests.create',
                                                            provider.id,
                                                        )}
                                                        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                    >
                                                        Request provider
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={handleShortlist}
                                                        className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                    >
                                                        {isShortlisted
                                                            ? 'Saved to shortlist'
                                                            : 'Save to shortlist'}
                                                    </button>
                                                </>
                                            ) : !auth.user ? (
                                                <Link
                                                    href={route('login')}
                                                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                >
                                                    Log in to request service
                                                </Link>
                                            ) : null}
                                            <Link
                                                href={route('providers.index')}
                                                className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                            >
                                                Browse more providers
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="rounded-[1.8rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                            Quick facts
                                        </p>
                                        <div className="mt-2">
                                            <DetailItem
                                                label="Experience"
                                                value={
                                                    provider.yearsExperience
                                                        ? `${provider.yearsExperience} years`
                                                        : 'Not shared'
                                                }
                                            />
                                            <DetailItem
                                                label="Service radius"
                                                value={
                                                    provider.serviceRadiusKm
                                                        ? `${provider.serviceRadiusKm} km`
                                                        : 'Flexible'
                                                }
                                            />
                                            <DetailItem
                                                label="Verified on"
                                                value={provider.verifiedAt ?? 'Pending'}
                                            />
                                            <DetailItem
                                                label="On Boma since"
                                                value={provider.memberSince}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <StatCard
                                    label="Average rating"
                                    value={formatRating(provider.averageRating)}
                                    helper="Based on published customer reviews"
                                />
                                <StatCard
                                    label="Reviews"
                                    value={provider.reviewCount}
                                    helper="Completed work with public feedback"
                                />
                                <StatCard
                                    label="Location"
                                    value={provider.locationLabel || 'Not set'}
                                    helper="Primary operating area"
                                />
                                <StatCard
                                    label="Availability"
                                    value={formatStatus(provider.availabilityStatus)}
                                    helper="Current working status"
                                />
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/78 dark:shadow-[0_20px_70px_rgba(0,0,0,0.34)]">
                                <SectionHeader
                                    eyebrow="Signature services"
                                    title="Service catalogue"
                                    description="A clear view of the kinds of work this provider actively offers."
                                    badge={
                                        <span className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                            {provider.services.length} service
                                            {provider.services.length === 1 ? '' : 's'}
                                        </span>
                                    }
                                />

                                {provider.services.length ? (
                                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                                        {provider.services.map((service) => (
                                            <div
                                                key={service.id}
                                                className="rounded-[1.7rem] border border-zinc-200 bg-zinc-50/90 p-5 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {service.isFeatured ? (
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            Featured
                                                        </span>
                                                    ) : null}
                                                    {service.turnaroundLabel ? (
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {service.turnaroundLabel}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <h3 className="mt-4 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                    {service.title}
                                                </h3>
                                                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                    {service.shortDescription}
                                                </p>
                                                <div className="mt-5 flex items-center justify-between gap-4">
                                                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        {formatMoney(service.priceFrom)}
                                                    </p>
                                                    {canShortlist ? (
                                                        <Link
                                                            href={route(
                                                                'providers.requests.create',
                                                                provider.id,
                                                            )}
                                                            className="text-sm font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-950 dark:text-white dark:decoration-white/30 dark:hover:decoration-white"
                                                        >
                                                            Request service
                                                        </Link>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-6 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        This provider has not published named services yet.
                                        Use the request flow if the profile still looks like a fit.
                                    </p>
                                )}
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/78 dark:shadow-[0_20px_70px_rgba(0,0,0,0.34)]">
                                <SectionHeader
                                    eyebrow="Customer reviews"
                                    title="Trust signals from completed work"
                                    description="Feedback shown here comes from closed requests and helps customers judge quality before reaching out."
                                    badge={
                                        <span className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                            {provider.reviewCount} total
                                        </span>
                                    }
                                />

                                {provider.reviews.length ? (
                                    <div className="mt-6 space-y-4">
                                        {provider.reviews.map((review) => (
                                            <div
                                                key={review.id}
                                                className="rounded-[1.7rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                        {formatRating(review.rating)}
                                                    </span>
                                                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                        {review.customerName}
                                                    </span>
                                                </div>
                                                {review.headline ? (
                                                    <h3 className="mt-4 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {review.headline}
                                                    </h3>
                                                ) : null}
                                                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                    {review.body}
                                                </p>
                                                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Published {review.createdAt}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-6 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        No customer reviews have been published yet. Closed
                                        requests will start building public proof here.
                                    </p>
                                )}
                            </div>
                        </section>

                        <aside className="space-y-6">
                            <div className="rounded-[2rem] border border-zinc-200/80 bg-zinc-950 p-6 text-white shadow-[0_30px_90px_rgba(0,0,0,0.24)] dark:border-white/10 dark:bg-white dark:text-zinc-950">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-600">
                                    Contact access
                                </p>
                                <h2 className="mt-3 font-display text-2xl font-semibold text-white dark:text-zinc-950">
                                    Ready to move this forward?
                                </h2>
                                <p className="mt-3 text-sm leading-7 text-white/80 dark:text-zinc-600">
                                    Direct contact is only shown when the viewer is allowed to engage through Boma.
                                </p>

                                {canRevealContact ? (
                                    <div className="mt-6 space-y-4 text-sm">
                                        <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 dark:border-zinc-200 dark:bg-zinc-100">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                                Phone
                                            </p>
                                            <p className="mt-2 text-base font-medium text-white dark:text-zinc-950">
                                                {provider.phone}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 dark:border-zinc-200 dark:bg-zinc-100">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                                Email
                                            </p>
                                            <p className="mt-2 text-base font-medium text-white dark:text-zinc-950">
                                                {provider.email}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5 text-sm leading-7 text-white/90 dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-700">
                                        Sign in as a customer or admin to reveal direct contact details and manage your shortlist.
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/78 dark:shadow-[0_20px_70px_rgba(0,0,0,0.34)]">
                                <SectionHeader
                                    eyebrow="Profile summary"
                                    title="What customers can expect"
                                    description="A quick read on commercial readiness, location coverage, and responsiveness."
                                />
                                <div className="mt-4">
                                    <DetailItem
                                        label="Category"
                                        value={provider.category}
                                    />
                                    <DetailItem
                                        label="Starting budget"
                                        value={formatMoney(provider.basePriceFrom)}
                                    />
                                    <DetailItem
                                        label="Response time"
                                        value={provider.responseTimeLabel ?? 'Not set'}
                                    />
                                    <DetailItem
                                        label="Rating"
                                        value={formatRating(provider.averageRating)}
                                    />
                                </div>
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/78 dark:shadow-[0_20px_70px_rgba(0,0,0,0.34)]">
                                <SectionHeader
                                    eyebrow="Similar providers"
                                    title="More options in this trade"
                                    description="Comparable providers with nearby offers in the same category."
                                />

                                {relatedProviders.length ? (
                                    <div className="mt-5 space-y-3">
                                        {relatedProviders.map((relatedProvider) => (
                                            <Link
                                                key={relatedProvider.id}
                                                href={route(
                                                    'providers.show',
                                                    relatedProvider.id,
                                                )}
                                                className="block rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                            {relatedProvider.businessName}
                                                        </p>
                                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                            {relatedProvider.locationLabel ||
                                                                'Location pending'}
                                                        </p>
                                                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            {formatRating(
                                                                relatedProvider.averageRating,
                                                            )}{' '}
                                                            and {relatedProvider.reviewCount}{' '}
                                                            review
                                                            {relatedProvider.reviewCount === 1
                                                                ? ''
                                                                : 's'}
                                                        </p>
                                                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            {formatMoney(
                                                                relatedProvider.basePriceFrom,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeClasses(relatedProvider.availabilityStatus)}`}
                                                    >
                                                        {formatStatus(
                                                            relatedProvider.availabilityStatus,
                                                        )}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-5 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        More related providers will appear here as the directory grows.
                                    </p>
                                )}
                            </div>
                        </aside>
                    </main>
                </div>
            </div>
        </>
    );
}
