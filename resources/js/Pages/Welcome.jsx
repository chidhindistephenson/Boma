import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/ThemeToggle';
import { Head, Link, router } from '@inertiajs/react';
import { useDeferredValue, useState } from 'react';

const platformSignals = [
    {
        title: 'Verified-first discovery',
        body: 'Profiles, ratings, and public work samples come before contact details so trust is built in the open.',
    },
    {
        title: 'Conversations stay inside',
        body: 'Customers and providers can negotiate, clarify scope, and keep a record of every interaction in one thread.',
    },
    {
        title: 'Payments with accountability',
        body: 'Escrow-style releases and subscription-backed provider visibility keep both sides aligned after a deal is made.',
    },
];

const liveProviders = [
    {
        name: 'Muna Plumbing Co.',
        meta: 'Borrowdale - 2.4 km',
        category: 'Plumbing',
        status: 'Available now',
        rating: '4.9',
    },
    {
        name: 'Nyasha Electrical',
        meta: 'Avondale - 4.1 km',
        category: 'Electrical',
        status: 'Responds in 12 min',
        rating: '4.8',
    },
    {
        name: 'Tariro Cleaners',
        meta: 'Mount Pleasant - 5.3 km',
        category: 'Cleaning',
        status: 'Top reviewed this week',
        rating: '4.7',
    },
];

const liveMoments = [
    'A customer posted a plumbing request in Avondale.',
    'A provider unlocked their 30-day trial listing.',
    'A verified electrician received a new proposal request.',
];

export default function Welcome({
    auth,
    canLogin,
    canRegister,
    featuredCategories,
    searchRadiusKm,
    laravelVersion,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const deferredQuery = useDeferredValue(searchQuery);
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    const filteredProviders = normalizedQuery
        ? liveProviders.filter((provider) =>
              [
                  provider.name,
                  provider.meta,
                  provider.category,
                  provider.status,
              ]
                  .join(' ')
                  .toLowerCase()
                  .includes(normalizedQuery),
          )
        : liveProviders;

    const categoryStream = [...featuredCategories, ...featuredCategories];

    return (
        <>
            <Head title="Boma" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="hero-grid absolute inset-0 opacity-70 dark:opacity-100" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.09),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(0,0,0,0.06),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(244,244,245,0.92))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_24%),radial-gradient(circle_at_85%_15%,_rgba(255,255,255,0.06),_transparent_20%),linear-gradient(180deg,_rgba(9,9,11,0.96),_rgba(15,15,15,0.96))]" />

                <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-8">
                    <header className="grid gap-4 py-4 lg:grid-cols-[auto_minmax(320px,1fr)_auto] lg:items-center">
                        <div className="flex items-center gap-3">
                            <ApplicationLogo className="h-11 w-11 text-zinc-950 dark:text-white" />
                            <div>
                                <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                    Boma
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Local services, rebuilt for trust
                                </p>
                            </div>
                        </div>

                        <form
                            onSubmit={(event) => {
                                event.preventDefault();

                                router.get(
                                    route('providers.index'),
                                    searchQuery.trim()
                                        ? { q: searchQuery.trim() }
                                        : {},
                                );
                            }}
                            className="relative"
                        >
                            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-400 dark:text-zinc-500">
                                <svg
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="m20 20-3.5-3.5" />
                                </svg>
                            </span>
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search provider, category, or area"
                                className="w-full rounded-full border border-zinc-300 bg-white/90 py-3 pl-12 pr-16 text-sm text-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,0.06)] outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-950/80 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                            />
                            {searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-3 my-auto inline-flex h-10 items-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
                                >
                                    Clear
                                </button>
                            ) : null}
                        </form>

                        <div className="flex items-center justify-end gap-3">
                            <ThemeToggle />

                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                    Open dashboard
                                </Link>
                            ) : (
                                <>
                                    {canLogin && (
                                        <Link
                                            href={route('login')}
                                            className="rounded-full border border-zinc-300 bg-white/80 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-white/10 dark:bg-zinc-950/70 dark:text-white dark:hover:bg-zinc-900"
                                        >
                                            Log in
                                        </Link>
                                    )}
                                    {canRegister && (
                                        <Link
                                            href={route('register')}
                                            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                        >
                                            Join Boma
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>
                    </header>

                    <main className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.08fr_0.92fr]">
                        <section className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300/80 bg-white/75 px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600 backdrop-blur dark:border-white/10 dark:bg-zinc-950/70 dark:text-zinc-400">
                                <span className="h-2 w-2 rounded-full bg-zinc-950 dark:bg-white" />
                                Hyperlocal marketplace
                            </div>

                            <h1 className="mt-8 font-display text-5xl font-semibold leading-[0.96] text-zinc-950 dark:text-white sm:text-6xl lg:text-7xl">
                                Find reliable local service providers without the
                                referral maze.
                            </h1>

                            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                                Boma helps customers search nearby tradespeople,
                                inspect verified profiles, compare ratings, and keep
                                the whole job journey accountable in one place.
                            </p>

                            <div className="mt-10 flex flex-wrap gap-3">
                                <Link
                                    href={route('providers.index')}
                                    className="rounded-full bg-zinc-950 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                    Browse providers
                                </Link>
                                {canRegister && !auth.user ? (
                                    <>
                                        <Link
                                            href={route('register')}
                                            className="rounded-full border border-zinc-300 bg-white/80 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-950 transition hover:bg-white dark:border-white/10 dark:bg-zinc-950/70 dark:text-white dark:hover:bg-zinc-900"
                                        >
                                            Join as customer
                                        </Link>
                                        <Link
                                            href={`${route('register')}?role=provider`}
                                            className="rounded-full border border-zinc-300 bg-white/80 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-950 transition hover:bg-white dark:border-white/10 dark:bg-zinc-950/70 dark:text-white dark:hover:bg-zinc-900"
                                        >
                                            List your service
                                        </Link>
                                    </>
                                ) : null}
                            </div>

                            <div className="mt-12 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.07)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/70 dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Search radius
                                    </p>
                                    <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                        {searchRadiusKm} km
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        Nearby results tuned for neighbourhood trust.
                                    </p>
                                </div>

                                <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.07)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/70 dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Provider trial
                                    </p>
                                    <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                        30 days
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        Enough runway to onboard real supply before paid tiers.
                                    </p>
                                </div>

                                <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.07)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/70 dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Stack
                                    </p>
                                    <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                        Laravel {laravelVersion}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        Web MVP foundation with room for Reverb and PWA slices.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="relative">
                            <div className="absolute inset-0 -rotate-2 rounded-[2.4rem] border border-zinc-300/70 bg-white/45 dark:border-white/10 dark:bg-white/[0.03]" />
                            <div className="relative rounded-[2.4rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.11)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_28px_90px_rgba(0,0,0,0.45)] sm:p-7">
                                <div className="flex items-center justify-between gap-4 border-b border-zinc-200/80 pb-5 dark:border-white/10">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                                            Marketplace preview
                                        </p>
                                        <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                            Live demand meets local supply
                                        </h2>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-700 dark:border-white/10 dark:text-zinc-300">
                                            {filteredProviders.length} match
                                            {filteredProviders.length === 1
                                                ? ''
                                                : 'es'}
                                        </div>
                                        <Link
                                            href={route(
                                                'providers.index',
                                                normalizedQuery
                                                    ? { q: searchQuery.trim() }
                                                    : {},
                                            )}
                                            className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                        >
                                            Open directory
                                        </Link>
                                    </div>
                                </div>

                                <div className="mt-6 rounded-[1.7rem] border border-zinc-200/80 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-500">
                                                Preview filter
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-zinc-950 dark:text-white">
                                                {normalizedQuery
                                                    ? `Showing results for "${searchQuery}"`
                                                    : 'Showing featured nearby providers'}
                                            </p>
                                        </div>
                                        {normalizedQuery ? (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
                                            >
                                                Reset
                                            </button>
                                        ) : null}
                                    </div>

                                    <div className="space-y-3">
                                        {filteredProviders.length ? (
                                            filteredProviders.map((provider) => (
                                                <div
                                                    key={provider.name}
                                                    className="rounded-[1.35rem] border border-zinc-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-950"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                                {provider.name}
                                                            </p>
                                                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                                {provider.meta}
                                                            </p>
                                                        </div>

                                                        <div className="text-right">
                                                            <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                                                                {provider.rating}
                                                            </p>
                                                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                                                                rating
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                                        <span className="inline-flex rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:text-zinc-300">
                                                            {provider.category}
                                                        </span>
                                                        <span className="inline-flex rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:text-zinc-300">
                                                            {provider.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-[1.35rem] border border-dashed border-zinc-300 bg-white/75 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-zinc-950/70 dark:text-zinc-400">
                                                No preview providers match that search yet. Try a
                                                trade like Plumbing, Electrical, or an area like
                                                Borrowdale.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                    {liveMoments.map((moment) => (
                                        <div
                                            key={moment}
                                            className="rounded-[1.4rem] border border-zinc-200/80 bg-white/80 p-4 text-sm leading-6 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400"
                                        >
                                            {moment}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </main>

                    <section className="pb-10">
                        <div className="overflow-hidden rounded-full border border-zinc-200/80 bg-white/80 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.05)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/75 dark:shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                            <div className="flex w-max animate-marquee gap-3 px-3">
                                {categoryStream.map((category, index) => (
                                    <span
                                        key={`${category}-${index}`}
                                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300"
                                    >
                                        {category}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 grid gap-5 lg:grid-cols-3">
                            {platformSignals.map((signal, index) => (
                                <article
                                    key={signal.title}
                                    className="rounded-[2rem] border border-zinc-200/80 bg-white/80 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_20px_70px_rgba(0,0,0,0.38)]"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold uppercase tracking-[0.24em] text-white dark:bg-white dark:text-zinc-950">
                                            0{index + 1}
                                        </span>
                                        <h3 className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                            {signal.title}
                                        </h3>
                                    </div>
                                    <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        {signal.body}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
