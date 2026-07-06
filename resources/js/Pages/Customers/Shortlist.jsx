import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import VerifiedBadge from '@/Components/VerifiedBadge';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

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

    return query;
}

export default function Shortlist({
    filters,
    categories,
    cities,
    availabilityOptions,
    providers,
}) {
    const [form, setForm] = useState({
        q: filters.q,
        category: filters.category,
        city: filters.city,
        availability: filters.availability,
    });

    useEffect(() => {
        setForm({
            q: filters.q,
            category: filters.category,
            city: filters.city,
            availability: filters.availability,
        });
    }, [filters.availability, filters.category, filters.city, filters.q]);

    const submit = (event) => {
        event.preventDefault();

        router.get(route('shortlist.index'), buildQuery(form), {
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
        };

        setForm(defaults);

        router.get(route('shortlist.index'), {}, {
            preserveScroll: true,
            replace: true,
        });
    };

    const removeProvider = (providerId) => {
        router.delete(route('providers.shortlist.destroy', providerId), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Customer workspace
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        Shortlist
                    </h2>
                </div>
            }
        >
            <Head title="Shortlist" />

            <div className="py-12">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
                    <aside className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                            Refine shortlist
                        </p>
                        <h3 className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                            Compare saved providers with less noise.
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
                                    placeholder="Business, trade, service"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                    Category
                                </label>
                                <select
                                    value={form.category}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            category: event.target.value,
                                        }))
                                    }
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                >
                                    <option value="">All categories</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                    City
                                </label>
                                <select
                                    value={form.city}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            city: event.target.value,
                                        }))
                                    }
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                >
                                    <option value="">All cities</option>
                                    {cities.map((city) => (
                                        <option key={city} value={city}>
                                            {city}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                    Availability
                                </label>
                                <select
                                    value={form.availability}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            availability: event.target.value,
                                        }))
                                    }
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                >
                                    <option value="any">Any availability</option>
                                    {availabilityOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {formatStatus(option)}
                                        </option>
                                    ))}
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
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Saved providers
                                    </p>
                                    <h3 className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                        {providers.total} provider
                                        {providers.total === 1 ? '' : 's'} in your shortlist
                                    </h3>
                                </div>
                                <Link
                                    href={route('requests.create')}
                                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                    New request
                                </Link>
                            </div>
                        </div>

                        {providers.data.length ? (
                            <>
                                <div className="grid gap-5 md:grid-cols-2">
                                    {providers.data.map((provider) => (
                                        <article
                                            key={provider.id}
                                            className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {provider.businessName}
                                                    </p>
                                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                        {provider.category}
                                                    </p>
                                                    {provider.headline ? (
                                                        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                            {provider.headline}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                    {formatStatus(provider.availabilityStatus)}
                                                </span>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {provider.verificationStatus ===
                                                'verified' ? (
                                                    <VerifiedBadge />
                                                ) : null}
                                                <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                    {formatRating(
                                                        provider.averageRating,
                                                    )}
                                                </span>
                                                <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                    {provider.reviewCount} review
                                                    {provider.reviewCount === 1
                                                        ? ''
                                                        : 's'}
                                                </span>
                                            </div>

                                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Starting from
                                                    </p>
                                                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                                                        {formatMoney(provider.basePriceFrom)}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Response time
                                                    </p>
                                                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                                                        {provider.responseTimeLabel ?? 'Not set'}
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
                                                {provider.locationLabel || 'Location pending'}
                                            </p>

                                            {provider.featuredServices.length ? (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {provider.featuredServices.map((service) => (
                                                        <span
                                                            key={service}
                                                            className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300"
                                                        >
                                                            {service}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}

                                            <div className="mt-6 flex flex-wrap gap-3">
                                                <Link
                                                    href={route('providers.show', provider.id)}
                                                    className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    View profile
                                                </Link>
                                                <Link
                                                    href={route('providers.requests.create', provider.id)}
                                                    className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                >
                                                    Request provider
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeProvider(provider.id)
                                                    }
                                                    className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/88 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Page {providers.current_page} of {providers.last_page}
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
                            </>
                        ) : (
                            <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white/88 p-10 text-center shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                <h3 className="font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                    No shortlisted providers match that filter.
                                </h3>
                                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                    Adjust the filters or head back to the directory to
                                    save stronger options.
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
                                        href={route('providers.index')}
                                        className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        Browse directory
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
