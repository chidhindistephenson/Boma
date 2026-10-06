import ApplicationLogo from '@/Components/ApplicationLogo';
import ProviderMap from '@/Components/ProviderMap';
import ThemeToggle from '@/Components/ThemeToggle';
import VerifiedBadge from '@/Components/VerifiedBadge';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const availabilityOptions = [
    { value: 'any', label: 'Any availability' },
    { value: 'available', label: 'Available now' },
    { value: 'busy', label: 'Busy' },
    { value: 'offline', label: 'Offline' },
];

function buildQuery(filters) {
    const query = {};

    if (filters.q.trim()) {
        query.q = filters.q.trim();
    }

    if (filters.category) {
        query.category = filters.category;
    }

    if (filters.city) {
        query.city = filters.city;
    }

    if (filters.availability !== 'any') {
        query.availability = filters.availability;
    }

    if (!filters.verified) {
        query.verified = 0;
    }

    if (filters.latitude !== '' && filters.longitude !== '') {
        query.latitude = filters.latitude;
        query.longitude = filters.longitude;
        query.radius = filters.radius;
    }

    if (filters.min_rating !== '') {
        query.min_rating = filters.min_rating;
    }

    if (filters.price_min !== '') {
        query.price_min = filters.price_min;
    }

    if (filters.price_max !== '') {
        query.price_max = filters.price_max;
    }

    if (filters.sort !== 'newest') {
        query.sort = filters.sort;
    }

    return query;
}

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

export default function ProvidersIndex({
    canLogin,
    canRegister,
    categories,
    cities,
    filters,
    providers,
    mapProviders,
}) {
    const { auth } = usePage().props;
    const [form, setForm] = useState({
        q: filters.q,
        category: filters.category,
        city: filters.city,
        availability: filters.availability,
        verified: filters.verified,
        latitude: filters.latitude ?? '',
        longitude: filters.longitude ?? '',
        radius: filters.radius ?? 25,
        min_rating: filters.min_rating ?? '',
        price_min: filters.price_min ?? '',
        price_max: filters.price_max ?? '',
        sort: filters.sort ?? 'newest',
    });
    const [view, setView] = useState('list');
    const [locationStatus, setLocationStatus] = useState('');

    useEffect(() => {
        setForm({
            q: filters.q,
            category: filters.category,
            city: filters.city,
            availability: filters.availability,
            verified: filters.verified,
            latitude: filters.latitude ?? '',
            longitude: filters.longitude ?? '',
            radius: filters.radius ?? 25,
            min_rating: filters.min_rating ?? '',
            price_min: filters.price_min ?? '',
            price_max: filters.price_max ?? '',
            sort: filters.sort ?? 'newest',
        });
    }, [
        filters.availability,
        filters.category,
        filters.city,
        filters.q,
        filters.latitude,
        filters.longitude,
        filters.min_rating,
        filters.price_min,
        filters.price_max,
        filters.radius,
        filters.sort,
        filters.verified,
    ]);

    const hasSearchLocation =
        form.latitude !== '' && form.longitude !== '';

    const activeFilters = [
        form.q ? `Search: ${form.q}` : null,
        form.category ? form.category : null,
        form.city ? form.city : null,
        form.availability !== 'any'
            ? `Availability: ${formatStatus(form.availability)}`
            : null,
        form.verified ? 'Verified only' : 'All active providers',
        hasSearchLocation ? `Within ${form.radius} km` : null,
        form.min_rating ? `Rating ${form.min_rating}+` : null,
        form.price_min || form.price_max
            ? `Price ${form.price_min || '0'}-${form.price_max || 'any'}`
            : null,
        form.sort !== 'newest'
            ? `Sorted by ${formatStatus(form.sort)}`
            : null,
    ].filter(Boolean);

    const runSearch = (event) => {
        event.preventDefault();

        router.get(route('providers.index'), buildQuery(form), {
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const defaults = {
            q: '',
            category: '',
            city: '',
            availability: 'any',
            verified: true,
            latitude: '',
            longitude: '',
            radius: 25,
            min_rating: '',
            price_min: '',
            price_max: '',
            sort: 'newest',
        };

        setForm(defaults);

        router.get(route('providers.index'), {}, {
            preserveScroll: true,
            replace: true,
        });
    };

    const useCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('Location access is not supported by this browser.');
            return;
        }

        setLocationStatus('Finding your location...');

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const nextForm = {
                    ...form,
                    latitude: coords.latitude.toFixed(7),
                    longitude: coords.longitude.toFixed(7),
                    sort: 'distance',
                };

                setForm(nextForm);
                setLocationStatus('Location captured. Showing nearby providers.');
                router.get(route('providers.index'), buildQuery(nextForm), {
                    preserveScroll: true,
                    replace: true,
                });
            },
            () => {
                setLocationStatus(
                    'Location access was unavailable. Try again or search by city.',
                );
            },
            {
                enableHighAccuracy: true,
                maximumAge: 60000,
                timeout: 12000,
            },
        );
    };

    const clearSearchLocation = () => {
        setForm((current) => ({
            ...current,
            latitude: '',
            longitude: '',
            sort: current.sort === 'distance' ? 'newest' : current.sort,
        }));
        setLocationStatus('Location filter cleared. Apply filters to refresh.');
    };

    const handleRadiusChange = (event) => {
        if (event.target.value === 'locate_me') {
            useCurrentLocation();
            return;
        }

        setForm((current) => ({
            ...current,
            radius: event.target.value,
        }));
    };

    return (
        <>
            <Head title="Provider Directory" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="hero-grid absolute inset-0 opacity-70 dark:opacity-100" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.08),_transparent_26%),radial-gradient(circle_at_88%_14%,_rgba(0,0,0,0.06),_transparent_22%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(244,244,245,0.92))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_24%),radial-gradient(circle_at_88%_14%,_rgba(255,255,255,0.06),_transparent_20%),linear-gradient(180deg,_rgba(9,9,11,0.97),_rgba(15,15,15,0.96))]" />

                <div className="relative mx-auto min-h-screen max-w-7xl px-6 py-8 lg:px-8">
                    <header className="grid gap-4 py-4 lg:grid-cols-[auto_minmax(320px,1fr)_auto] lg:items-center">
                        <Link href={route('welcome')} className="flex items-center gap-3">
                            <ApplicationLogo className="h-11 w-11 text-zinc-950 dark:text-white" />
                            <div>
                                <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                    Boma
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Verified local service discovery
                                </p>
                            </div>
                        </Link>

                        <form onSubmit={runSearch} className="relative">
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
                                value={form.q}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        q: event.target.value,
                                    }))
                                }
                                placeholder="Search business, trade, service, area, or city"
                                className="w-full rounded-full border border-zinc-300 bg-white/90 py-3 pl-12 pr-28 text-sm text-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,0.06)] outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-950/80 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                            />
                            <div className="absolute inset-y-0 right-2 flex items-center gap-2">
                                {form.q ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setForm((current) => ({
                                                ...current,
                                                q: '',
                                            }))
                                        }
                                        className="inline-flex h-10 items-center rounded-full border border-zinc-300 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
                                    >
                                        Clear
                                    </button>
                                ) : null}
                                <button
                                    type="submit"
                                    className="inline-flex h-10 items-center rounded-full bg-zinc-950 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                    Search
                                </button>
                            </div>
                        </form>

                        <div className="flex items-center justify-end gap-3">
                            <Link
                                href={route('welcome')}
                                className="hidden rounded-full border border-zinc-300 bg-white/80 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-white/10 dark:bg-zinc-950/70 dark:text-white dark:hover:bg-zinc-900 sm:inline-flex"
                            >
                                Home
                            </Link>
                            <ThemeToggle />
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    {canLogin ? (
                                        <Link
                                            href={route('login')}
                                            className="rounded-full border border-zinc-300 bg-white/80 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-white/10 dark:bg-zinc-950/70 dark:text-white dark:hover:bg-zinc-900"
                                        >
                                            Log in
                                        </Link>
                                    ) : null}
                                    {canRegister ? (
                                        <Link
                                            href={route('register')}
                                            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                        >
                                            Join Boma
                                        </Link>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </header>

                    <main className="space-y-6 py-10">
                        <form
                            onSubmit={runSearch}
                            className="rounded-[1.7rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_24px_70px_rgba(0,0,0,0.38)]"
                        >
                            <div className="border-b border-zinc-200 pb-4 dark:border-white/10">
                                <p className="inline-flex border-b-2 border-zinc-950 pb-2 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-950 dark:border-white dark:text-white">
                                    Directory filters
                                </p>
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                                <label className="block">
                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        Category
                                    </span>
                                    <select
                                        value={form.category}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                category: event.target.value,
                                            }))
                                        }
                                        className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                    >
                                        <option value="">All categories</option>
                                        {categories.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        City
                                    </span>
                                    <select
                                        value={form.city}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                city: event.target.value,
                                            }))
                                        }
                                        className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                    >
                                        <option value="">All cities</option>
                                        {cities.map((city) => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        Availability
                                    </span>
                                    <select
                                        value={form.availability}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                availability: event.target.value,
                                            }))
                                        }
                                        className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                    >
                                        {availabilityOptions.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        Sort
                                    </span>
                                    <select
                                        value={form.sort}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                sort: event.target.value,
                                            }))
                                        }
                                        className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                    >
                                        <option value="newest">Newest</option>
                                        <option value="recently_active">
                                            Most recently active
                                        </option>
                                        <option value="rating">Highest rated</option>
                                        <option value="distance" disabled={!hasSearchLocation}>
                                            Nearest first
                                        </option>
                                    </select>
                                </label>

                                <div>
                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        Radius
                                    </span>
                                    <select
                                        value={form.radius}
                                        onChange={handleRadiusChange}
                                        className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                    >
                                        {[5, 10, 25, 50, 100].map((radius) => (
                                            <option key={radius} value={radius}>
                                                {radius} km
                                            </option>
                                        ))}
                                        <option value="locate_me">Locate me</option>
                                    </select>
                                </div>

                                <label className="block">
                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        Min rating
                                    </span>
                                    <select
                                        value={form.min_rating}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                min_rating: event.target.value,
                                            }))
                                        }
                                        className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                    >
                                        <option value="">Any rating</option>
                                        {[5, 4, 3, 2, 1].map((rating) => (
                                            <option key={rating} value={rating}>
                                                {rating}+ stars
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        Min price
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.price_min}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                price_min: event.target.value,
                                            }))
                                        }
                                        placeholder="e.g. 50"
                                        className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        Max price
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.price_max}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                price_max: event.target.value,
                                            }))
                                        }
                                        placeholder="e.g. 200"
                                        className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
                                    />
                                </label>

                                <label className="flex items-end gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                    <input
                                        type="checkbox"
                                        checked={form.verified}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                verified: event.target.checked,
                                            }))
                                        }
                                        className="mb-1 h-5 w-5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-400"
                                    />
                                    <span>
                                        <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                            Verified only
                                        </span>
                                        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                                            Trusted providers
                                        </span>
                                    </span>
                                </label>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="submit"
                                    className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                    Apply filters
                                </button>

                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:hover:border-white/20"
                                >
                                    Reset
                                </button>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                                <p>
                                    {locationStatus ||
                                        (hasSearchLocation
                                            ? 'Location filter ready.'
                                            : 'No location filter applied.')}
                                </p>
                                {hasSearchLocation ? (
                                    <button
                                        type="button"
                                        onClick={clearSearchLocation}
                                        className="font-semibold text-zinc-950 underline underline-offset-4 dark:text-white"
                                    >
                                        Clear location
                                    </button>
                                ) : null}
                            </div>
                        </form>

                        <section className="space-y-6">
                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                                            Search results
                                        </p>
                                        <h2 className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                            {providers.total} provider
                                            {providers.total === 1 ? '' : 's'} found
                                        </h2>
                                        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                            Showing
                                            {' '}
                                            {providers.from ?? 0}
                                            -
                                            {providers.to ?? 0}
                                            {' '}
                                            of
                                            {' '}
                                            {providers.total}
                                            {' '}
                                            results.
                                        </p>
                                    </div>

                                    {!auth.user ? (
                                        <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 px-4 py-3 text-sm leading-6 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            Create an account to shortlist providers and
                                            manage your service journey in one place.
                                        </div>
                                    ) : null}
                                </div>

                                <div className="mt-5 inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-white/10 dark:bg-white/[0.04]">
                                    <button
                                        type="button"
                                        onClick={() => setView('list')}
                                        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                                            view === 'list'
                                                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                                                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                                        }`}
                                    >
                                        List
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('map')}
                                        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                                            view === 'map'
                                                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                                                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                                        }`}
                                    >
                                        Map ({mapProviders.length})
                                    </button>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    {activeFilters.map((filter) => (
                                        <span
                                            key={filter}
                                            className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300"
                                        >
                                            {filter}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {view === 'map' ? (
                                <ProviderMap
                                    providers={mapProviders}
                                    searchLocation={
                                        hasSearchLocation
                                            ? {
                                                  latitude: form.latitude,
                                                  longitude: form.longitude,
                                              }
                                            : null
                                    }
                                />
                            ) : providers.data.length ? (
                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {providers.data.map((provider) => (
                                        <Link
                                            key={provider.id}
                                            href={route(
                                                'providers.show',
                                                provider.id,
                                            )}
                                            aria-label={`View ${provider.businessName} profile`}
                                            className="boma-stat-card block cursor-pointer rounded-[2rem] p-6 transition hover:-translate-y-1 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 dark:hover:border-white/20 dark:focus:ring-white/20"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold uppercase tracking-[0.16em] text-white dark:bg-white dark:text-zinc-950">
                                                        {initialsFor(
                                                            provider.businessName,
                                                        )}
                                                    </div>
                                                    <div>
                                            <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {provider.businessName}
                                            </p>
                                            {provider.headline ? (
                                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                                    {provider.headline}
                                                </p>
                                            ) : null}
                                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                {provider.providerName}
                                            </p>
                                        </div>
                                    </div>

                                                {provider.verificationStatus ===
                                                'verified' ? (
                                                    <VerifiedBadge className="shrink-0" />
                                                ) : (
                                                    <span
                                                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${badgeClasses(provider.verificationStatus)}`}
                                                    >
                                                        {formatStatus(
                                                            provider.verificationStatus,
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-5 flex flex-wrap gap-2">
                                                {(provider.categories?.length
                                                    ? provider.categories
                                                    : [provider.category]
                                                ).map((category) => (
                                                    <span
                                                        key={category}
                                                        className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300"
                                                    >
                                                        {category}
                                                    </span>
                                                ))}
                                                <span
                                                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badgeClasses(provider.availabilityStatus)}`}
                                                >
                                                    {formatStatus(
                                                        provider.availabilityStatus,
                                                    )}
                                                </span>
                                                <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                    {formatRating(
                                                        provider.averageRating,
                                                    )}
                                                </span>
                                                <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                    {provider.reviewCount} review
                                                    {provider.reviewCount === 1
                                                        ? ''
                                                        : 's'}
                                                </span>
                                            </div>

                                            <p className="mt-5 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                {provider.bio}
                                            </p>

                                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                                <div className="boma-stat-card rounded-[1.2rem] px-4 py-4">
                                                    <p className="boma-stat-card-title text-xs uppercase tracking-[0.18em]">
                                                        Starting from
                                                    </p>
                                                    <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-white">
                                                        {formatMoney(provider.basePriceFrom)}
                                                    </p>
                                                </div>
                                                <div className="boma-stat-card rounded-[1.2rem] px-4 py-4">
                                                    <p className="boma-stat-card-title text-xs uppercase tracking-[0.18em]">
                                                        Response time
                                                    </p>
                                                    <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-white">
                                                        {provider.responseTimeLabel ?? 'Not set'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-5 flex flex-wrap gap-2">
                                                {provider.yearsExperience ? (
                                                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                        {provider.yearsExperience} years
                                                    </span>
                                                ) : null}
                                                {provider.serviceRadiusKm ? (
                                                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                        {provider.serviceRadiusKm} km radius
                                                    </span>
                                                ) : null}
                                                <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                    {provider.servicesCount} service
                                                    {provider.servicesCount === 1 ? '' : 's'}
                                                </span>
                                            </div>

                                            {provider.featuredServices.length ? (
                                                <div className="mt-5 flex flex-wrap gap-2">
                                                    {provider.featuredServices.map((service) => (
                                                        <span
                                                            key={service}
                                                            className="inline-flex rounded-full border border-zinc-950/10 bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300"
                                                        >
                                                            {service}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}

                                            <div className="boma-stat-card mt-6 rounded-[1.5rem] px-4 py-4">
                                                <p className="boma-stat-card-title text-xs uppercase tracking-[0.22em]">
                                                    Location
                                                </p>
                                                <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-white">
                                                    {provider.locationLabel ||
                                                        'Location pending'}
                                                </p>
                                                {provider.distanceKm !== null ? (
                                                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                                        {provider.distanceKm} km away
                                                    </p>
                                                ) : null}
                                            </div>

                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white/90 p-10 text-center shadow-[0_18px_50px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                                        No matches yet
                                    </p>
                                    <h3 className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                        No providers matched that search.
                                    </h3>
                                    <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        Try a broader category, switch off verified-only,
                                        or search by area and city instead of a full
                                        business name.
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
                                            href={route('welcome')}
                                            className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Back home
                                        </Link>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Page
                                    {' '}
                                    {providers.current_page}
                                    {' '}
                                    of
                                    {' '}
                                    {providers.last_page}
                                </p>

                                <div className="flex gap-3">
                                    {providers.prev_page_url ? (
                                        <Link
                                            href={providers.prev_page_url}
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

                                    {providers.next_page_url ? (
                                        <Link
                                            href={providers.next_page_url}
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
                        </section>
                    </main>
                </div>
            </div>
        </>
    );
}
