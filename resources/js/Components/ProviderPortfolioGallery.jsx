import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function PortfolioMedia({ item, onOpen }) {
    if (item.mediaType === 'image') {
        return (
            <button
                type="button"
                onClick={() => onOpen(item)}
                className="group block h-64 w-full overflow-hidden bg-zinc-100 text-left dark:bg-zinc-900"
                aria-label={`Open ${item.title}`}
            >
                <img
                    src={item.mediaUrl}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                />
            </button>
        );
    }

    if (item.mediaType === 'video') {
        return (
            <video
                src={item.mediaUrl}
                className="h-64 w-full bg-zinc-950 object-cover"
                controls
                preload="metadata"
            >
                <track kind="captions" />
            </video>
        );
    }

    return (
        <a
            href={item.mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-64 flex-col items-center justify-center bg-zinc-100 px-6 text-center transition hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
            <span className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:border-white/15 dark:text-zinc-300">
                PDF project file
            </span>
            <span className="mt-4 max-w-xs text-sm font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4 dark:text-white dark:decoration-zinc-600">
                Open {item.originalName}
            </span>
        </a>
    );
}

export default function ProviderPortfolioGallery({
    items,
    isOwnerPreview,
    actionHref,
    actionLabel,
}) {
    const [activeImage, setActiveImage] = useState(null);
    const [canScrollBack, setCanScrollBack] = useState(false);
    const [canScrollForward, setCanScrollForward] = useState(false);
    const carouselRef = useRef(null);

    useEffect(() => {
        const carousel = carouselRef.current;

        if (!carousel) {
            return undefined;
        }

        const updateControls = () => {
            const maximumScroll = carousel.scrollWidth - carousel.clientWidth;

            setCanScrollBack(carousel.scrollLeft > 4);
            setCanScrollForward(carousel.scrollLeft < maximumScroll - 4);
        };

        const resizeObserver = new ResizeObserver(updateControls);
        const animationFrame = window.requestAnimationFrame(updateControls);

        carousel.addEventListener('scroll', updateControls, { passive: true });
        resizeObserver.observe(carousel);

        return () => {
            window.cancelAnimationFrame(animationFrame);
            carousel.removeEventListener('scroll', updateControls);
            resizeObserver.disconnect();
        };
    }, [items.length]);

    useEffect(() => {
        if (!activeImage) {
            return undefined;
        }

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setActiveImage(null);
            }
        };

        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [activeImage]);

    const scrollPortfolio = (direction) => {
        const carousel = carouselRef.current;

        if (!carousel) {
            return;
        }

        carousel.scrollBy({
            left: direction * Math.max(carousel.clientWidth * 0.82, 280),
            behavior: 'smooth',
        });
    };

    if (!items.length && !isOwnerPreview) {
        return null;
    }

    return (
        <section className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_20px_70px_rgba(0,0,0,0.34)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                        Portfolio
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        Work you can inspect
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        Completed projects, demonstrations, and supporting documents
                        shared directly by this provider.
                    </p>
                </div>
                {items.length ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        {items.length} item{items.length === 1 ? '' : 's'}
                    </span>
                ) : null}
            </div>

            {items.length ? (
                <div className="relative mt-6">
                    <button
                        type="button"
                        onClick={() => scrollPortfolio(-1)}
                        disabled={!canScrollBack}
                        className="absolute -left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-950 shadow-lg transition hover:bg-zinc-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-zinc-950 dark:border-white/15 dark:bg-zinc-950 dark:text-white dark:hover:bg-white dark:hover:text-zinc-950 dark:disabled:hover:bg-zinc-950 dark:disabled:hover:text-white"
                        aria-label="View previous portfolio projects"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5"
                            aria-hidden="true"
                        >
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </button>

                    <div
                        ref={carouselRef}
                        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {items.map((item) => (
                            <article
                                key={item.id}
                                className="flex w-[88%] shrink-0 snap-start flex-col overflow-hidden rounded-[1.6rem] border border-zinc-200 bg-zinc-50/90 sm:w-[calc((100%_-_1rem)/2)] xl:w-[calc((100%_-_2rem)/3)] dark:border-white/10 dark:bg-white/[0.03]"
                            >
                                <PortfolioMedia item={item} onOpen={setActiveImage} />
                                <div className="flex flex-1 flex-col p-5">
                                    {item.serviceTitle ? (
                                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                            {item.serviceTitle}
                                        </p>
                                    ) : null}
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                            {item.title}
                                        </h3>
                                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            {item.mediaType}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        {item.description}
                                    </p>
                                </div>
                            </article>
                        ))}

                        {items.length < 3 && actionHref ? (
                            <article className="flex w-[88%] shrink-0 snap-start flex-col overflow-hidden rounded-[1.6rem] border border-zinc-200 bg-white text-zinc-950 sm:w-[calc((100%_-_1rem)/2)] xl:w-[calc((100%_-_2rem)/3)] dark:border-white/10 dark:bg-zinc-950 dark:text-white">
                                <div className="flex h-64 flex-col justify-between bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.08),transparent_42%)] p-6 dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_42%)]">
                                    <span className="w-fit rounded-full border border-zinc-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] dark:border-white/20">
                                        Start here
                                    </span>
                                    <p className="max-w-xs font-display text-3xl font-semibold leading-tight">
                                        Your project could be next.
                                    </p>
                                </div>
                                <div className="flex flex-1 flex-col p-5">
                                    <h3 className="font-display text-xl font-semibold">
                                        Need something similar?
                                    </h3>
                                    <p className="mt-3 flex-1 text-sm leading-7 text-zinc-600 dark:text-white/70">
                                        Share the work you need and discuss scope, timing, and
                                        budget directly through Boma.
                                    </p>
                                    <Link
                                        href={actionHref}
                                        className="mt-5 inline-flex w-fit rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    >
                                        {actionLabel}
                                    </Link>
                                </div>
                            </article>
                        ) : null}
                    </div>

                    <button
                        type="button"
                        onClick={() => scrollPortfolio(1)}
                        disabled={!canScrollForward}
                        className="absolute -right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-950 shadow-lg transition hover:bg-zinc-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-zinc-950 dark:border-white/15 dark:bg-zinc-950 dark:text-white dark:hover:bg-white dark:hover:text-zinc-950 dark:disabled:hover:bg-zinc-950 dark:disabled:hover:text-white"
                        aria-label="View more portfolio projects"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5"
                            aria-hidden="true"
                        >
                            <path d="m9 18 6-6-6-6" />
                        </svg>
                    </button>
                </div>
            ) : (
                <div className="mt-6 rounded-[1.6rem] border border-dashed border-zinc-300 px-6 py-8 text-center dark:border-white/15">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Your public gallery is empty.
                    </p>
                    <Link
                        href={route('profile.edit')}
                        className="mt-4 inline-flex rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950"
                    >
                        Add portfolio work
                    </Link>
                </div>
            )}

            {activeImage ? (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 sm:p-8"
                    role="dialog"
                    aria-modal="true"
                    aria-label={activeImage.title}
                >
                    <button
                        type="button"
                        onClick={() => setActiveImage(null)}
                        className="absolute right-5 top-5 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
                    >
                        Close
                    </button>
                    <div className="max-h-full max-w-6xl overflow-auto text-center">
                        <img
                            src={activeImage.mediaUrl}
                            alt={activeImage.title}
                            className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain"
                        />
                        <p className="mt-4 font-display text-2xl font-semibold text-white">
                            {activeImage.title}
                        </p>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
