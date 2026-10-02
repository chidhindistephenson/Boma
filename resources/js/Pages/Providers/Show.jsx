import ApplicationLogo from '@/Components/ApplicationLogo';
import ProviderChatLauncher from '@/Components/ProviderChatLauncher';
import ProviderPortfolioGallery from '@/Components/ProviderPortfolioGallery';
import ThemeToggle from '@/Components/ThemeToggle';
import UserAvatar from '@/Components/UserAvatar';
import VerifiedBadge from '@/Components/VerifiedBadge';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

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

function RatingStars({ rating }) {
    return (
        <div
            className="flex items-center justify-center gap-1"
            aria-label={`${rating} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`h-4 w-4 ${
                        star <= rating ? 'opacity-100' : 'opacity-25'
                    }`}
                    aria-hidden="true"
                >
                    <path d="m12 2.6 2.82 5.72 6.31.92-4.57 4.45 1.08 6.29L12 17.01l-5.64 2.97 1.08-6.29-4.57-4.45 6.31-.92L12 2.6Z" />
                </svg>
            ))}
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
    chatThread,
    shouldOpenChat,
    relatedProviders,
    reviewReportReasons,
}) {
    const { auth } = usePage().props;
    const [reportingReviewId, setReportingReviewId] = useState(null);
    const reviewRailRef = useRef(null);
    const reviewMotionPaused = useRef(false);
    const {
        data: reportData,
        setData: setReportData,
        post: postReport,
        processing: reportProcessing,
        errors: reportErrors,
        reset: resetReport,
    } = useForm({
        reason: Object.keys(reviewReportReasons ?? {})[0] ?? 'other',
        details: '',
    });
    const reviewsShouldMove = provider.reviews.length > 3;
    const visibleReviews = reviewsShouldMove
        ? [...provider.reviews, ...provider.reviews]
        : provider.reviews;

    useEffect(() => {
        const reviewRail = reviewRailRef.current;

        if (!reviewsShouldMove || !reviewRail) {
            return undefined;
        }

        let animationFrame;
        let previousTime;

        const moveReviews = (currentTime) => {
            if (previousTime !== undefined && !reviewMotionPaused.current) {
                reviewRail.scrollLeft += (currentTime - previousTime) * 0.028;

                if (reviewRail.scrollLeft >= reviewRail.scrollWidth / 2) {
                    reviewRail.scrollLeft -= reviewRail.scrollWidth / 2;
                }
            }

            previousTime = currentTime;
            animationFrame = window.requestAnimationFrame(moveReviews);
        };

        animationFrame = window.requestAnimationFrame(moveReviews);

        return () => window.cancelAnimationFrame(animationFrame);
    }, [reviewsShouldMove]);

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

    const submitReport = (event, reviewId) => {
        event.preventDefault();

        postReport(route('reviews.reports.store', reviewId), {
            preserveScroll: true,
            onSuccess: () => {
                resetReport();
                setReportingReviewId(null);
            },
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
                                className="rounded-full border border-zinc-300 bg-white/90 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-white/10 dark:bg-zinc-950/75 dark:text-white dark:hover:bg-zinc-900"
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
                                    className="rounded-full border border-zinc-300 bg-white/90 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-white/10 dark:bg-zinc-950/75 dark:text-white dark:hover:bg-zinc-900"
                                >
                                    Log in
                                </Link>
                            )}
                        </div>
                    </header>

                    <main className="grid items-stretch gap-8 py-10 xl:grid-cols-[minmax(0,1.35fr)_360px]">
                        <section className="space-y-8 xl:contents xl:space-y-0 xl:[&>*]:col-start-1">
                            {isOwnerPreview ? (
                                <div className="rounded-[1.8rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_20px_60px_rgba(0,0,0,0.32)]">
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

                            <div className="overflow-hidden rounded-[2.3rem] border border-zinc-200/80 bg-white/90 shadow-[0_28px_90px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
                                <div className="border-b border-zinc-200/80 px-7 py-6 dark:border-white/10">
                                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex items-start gap-5">
                                            <UserAvatar
                                                name={provider.businessName}
                                                src={provider.profilePhotoUrl}
                                                className="h-20 w-20 rounded-[1.7rem]"
                                                textClassName="text-xl uppercase tracking-[0.18em]"
                                            />
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
                                                    {(provider.categories?.length
                                                        ? provider.categories
                                                        : [provider.category]
                                                    ).map((category) => (
                                                        <span
                                                            key={category}
                                                            className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300"
                                                        >
                                                            {category}
                                                        </span>
                                                    ))}
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

                                        <div className="mt-6 flex max-w-sm flex-col gap-3">
                                            {canShortlist ? (
                                                <>
                                                    <Link
                                                        href={route(
                                                            'providers.requests.create',
                                                            provider.id,
                                                        )}
                                                        className="w-full rounded-full bg-zinc-950 px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                    >
                                                        Request provider
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={handleShortlist}
                                                        className="w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                    >
                                                        {isShortlisted
                                                            ? 'Saved to shortlist'
                                                            : 'Save to shortlist'}
                                                    </button>
                                                </>
                                            ) : !auth.user ? (
                                                <Link
                                                    href={route('login')}
                                                    className="w-full rounded-full bg-zinc-950 px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                >
                                                    Log in to request service
                                                </Link>
                                            ) : null}
                                            <Link
                                                href={route('providers.index')}
                                                className="w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
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

                            {provider.portfolioItems.length || isOwnerPreview ? (
                                <div className="xl:col-span-2 xl:col-start-1">
                                    <ProviderPortfolioGallery
                                        items={provider.portfolioItems}
                                        isOwnerPreview={isOwnerPreview}
                                        actionHref={
                                            isOwnerPreview
                                                ? route('profile.edit')
                                                : canShortlist
                                                  ? route(
                                                        'providers.requests.create',
                                                        provider.id,
                                                    )
                                                  : !auth.user
                                                    ? route('login')
                                                    : route('providers.index')
                                        }
                                        actionLabel={
                                            isOwnerPreview
                                                ? 'Add portfolio work'
                                                : canShortlist
                                                  ? 'Request this provider'
                                                  : !auth.user
                                                    ? 'Log in to request'
                                                    : 'Browse providers'
                                        }
                                    />
                                </div>
                            ) : null}

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.06)] backdrop-blur xl:col-span-2 xl:col-start-1 dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_20px_70px_rgba(0,0,0,0.34)]">
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

                            <div className="overflow-hidden rounded-[2.3rem] border border-zinc-200/80 bg-white/90 px-6 py-10 text-zinc-950 shadow-[0_28px_90px_rgba(0,0,0,0.08)] xl:col-span-2 xl:col-start-1 sm:px-10 sm:py-12 dark:border-white/10 dark:bg-zinc-950/80 dark:text-white dark:shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
                                <div className="mx-auto max-w-3xl text-center">
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
                                        Customer reviews
                                    </p>
                                    <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                                        What customers are saying
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        Verified feedback from completed, paid work on Boma.
                                    </p>
                                </div>

                                {provider.reviews.length ? (
                                    <div
                                        ref={reviewRailRef}
                                        onMouseEnter={() => {
                                            reviewMotionPaused.current = true;
                                        }}
                                        onMouseLeave={() => {
                                            reviewMotionPaused.current = false;
                                        }}
                                        onFocusCapture={() => {
                                            reviewMotionPaused.current = true;
                                        }}
                                        onBlurCapture={(event) => {
                                            if (
                                                !event.currentTarget.contains(
                                                    event.relatedTarget,
                                                )
                                            ) {
                                                reviewMotionPaused.current = false;
                                            }
                                        }}
                                        className={`mt-12 pt-7 ${
                                            reviewsShouldMove
                                                ? 'overflow-hidden'
                                                : 'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                                        }`}
                                    >
                                        <div
                                            className={`flex items-stretch gap-4 ${
                                                reviewsShouldMove
                                                    ? 'justify-start'
                                                    : 'justify-start xl:justify-center'
                                            }`}
                                        >
                                            {visibleReviews.map((review, index) => (
                                                <article
                                                    key={`${review.id}-${index}`}
                                                    aria-hidden={
                                                        index >= provider.reviews.length
                                                            ? true
                                                            : undefined
                                                    }
                                                    className="flex w-[88%] shrink-0 flex-col rounded-[1.8rem] border border-zinc-200 bg-zinc-100 px-6 pb-6 text-zinc-950 shadow-[0_20px_55px_rgba(0,0,0,0.08)] sm:w-[calc((100%_-_1rem)/2)] xl:w-[calc((100%_-_2rem)/3)] dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:shadow-[0_20px_55px_rgba(0,0,0,0.2)]"
                                                >
                                                <div className="-mt-7 flex justify-center">
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-zinc-50 bg-zinc-950 font-display text-lg font-semibold text-white shadow-lg dark:border-zinc-950 dark:bg-white dark:text-zinc-950">
                                                        {initialsFor(review.customerName)}
                                                    </div>
                                                </div>

                                                <div className="mt-4 text-center">
                                                    <RatingStars rating={review.rating} />
                                                    <p className="mt-3 font-display text-lg font-semibold">
                                                        {review.customerName}
                                                    </p>
                                                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                        Verified customer
                                                    </p>
                                                </div>

                                                {review.headline ? (
                                                    <h3 className="mt-6 text-center font-display text-xl font-semibold">
                                                        {review.headline}
                                                    </h3>
                                                ) : null}

                                                <blockquote className="mt-4 flex-1 text-center text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                                                    &ldquo;{review.body}&rdquo;
                                                </blockquote>

                                                {review.providerResponse ? (
                                                    <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 text-left dark:border-white/10 dark:bg-black/20">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            Provider response
                                                        </p>
                                                        <p className="mt-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                                                            {review.providerResponse}
                                                        </p>
                                                    </div>
                                                ) : null}

                                                <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                                    Published {review.createdAt}
                                                </p>

                                                {review.canReport &&
                                                index < provider.reviews.length ? (
                                                    <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-white/10">
                                                        {reportingReviewId ===
                                                        review.id ? (
                                                            <form
                                                                onSubmit={(event) =>
                                                                    submitReport(
                                                                        event,
                                                                        review.id,
                                                                    )
                                                                }
                                                                className="space-y-3"
                                                            >
                                                                <p className="text-sm font-semibold">
                                                                    Report this review
                                                                </p>
                                                                <select
                                                                    value={
                                                                        reportData.reason
                                                                    }
                                                                    onChange={(event) =>
                                                                        setReportData(
                                                                            'reason',
                                                                            event.target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 dark:border-white/15 dark:bg-zinc-900 dark:text-white"
                                                                >
                                                                    {Object.entries(
                                                                        reviewReportReasons ??
                                                                            {},
                                                                    ).map(
                                                                        ([
                                                                            value,
                                                                            label,
                                                                        ]) => (
                                                                            <option
                                                                                key={
                                                                                    value
                                                                                }
                                                                                value={
                                                                                    value
                                                                                }
                                                                            >
                                                                                {
                                                                                    label
                                                                                }
                                                                            </option>
                                                                        ),
                                                                    )}
                                                                </select>
                                                                <textarea
                                                                    rows={3}
                                                                    value={
                                                                        reportData.details
                                                                    }
                                                                    onChange={(event) =>
                                                                        setReportData(
                                                                            'details',
                                                                            event.target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 dark:border-white/15 dark:bg-zinc-900 dark:text-white"
                                                                    placeholder="Optional context for the moderator"
                                                                />
                                                                {reportErrors.reason ||
                                                                reportErrors.details ? (
                                                                    <p className="text-sm text-red-600 dark:text-red-400">
                                                                        {reportErrors.reason ??
                                                                            reportErrors.details}
                                                                    </p>
                                                                ) : null}
                                                                <div className="flex flex-wrap gap-2">
                                                                    <button
                                                                        type="submit"
                                                                        disabled={
                                                                            reportProcessing
                                                                        }
                                                                        className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                                                                    >
                                                                        {reportProcessing
                                                                            ? 'Sending...'
                                                                            : 'Send report'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setReportingReviewId(
                                                                                null,
                                                                            )
                                                                        }
                                                                        className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 dark:border-white/20 dark:text-zinc-300"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setReportingReviewId(
                                                                        review.id,
                                                                    )
                                                                }
                                                                className="w-full text-center text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-white"
                                                            >
                                                                Report review
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : null}
                                                </article>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mx-auto mt-10 max-w-2xl rounded-[1.8rem] border border-dashed border-zinc-300 bg-zinc-100 px-6 py-10 text-center dark:border-white/15 dark:bg-zinc-900">
                                        <p className="font-display text-xl font-semibold">
                                            No customer reviews yet
                                        </p>
                                        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                            Completed requests will build verified feedback here.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <aside
                            className={`space-y-6 xl:col-start-2 xl:flex xl:h-full xl:flex-col xl:gap-6 xl:space-y-0 ${
                                isOwnerPreview ? 'xl:row-start-2' : 'xl:row-start-1'
                            }`}
                        >
                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 text-zinc-950 shadow-[0_20px_70px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/80 dark:text-white dark:shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Contact access
                                </p>

                                {canRevealContact ? (
                                    <div className="mt-6 space-y-4 text-sm">
                                        <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                Phone
                                            </p>
                                            <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                                {provider.phone}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                Email
                                            </p>
                                            <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                                {provider.email}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 px-5 py-5 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
                                        Sign in as a customer or admin to reveal direct contact details and manage your shortlist.
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.06)] backdrop-blur xl:flex-1 dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_20px_70px_rgba(0,0,0,0.34)]">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Similar providers
                                </p>

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

                    <ProviderChatLauncher
                        provider={provider}
                        canChat={canShortlist && !isOwnerPreview}
                        isAuthenticated={Boolean(auth.user)}
                        thread={chatThread}
                        initiallyOpen={shouldOpenChat}
                    />
                </div>
            </div>
        </>
    );
}
