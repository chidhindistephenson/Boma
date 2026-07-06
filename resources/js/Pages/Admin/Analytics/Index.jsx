import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function formatAmount(value) {
    return value ? Number(value).toLocaleString() : 'No quotes yet';
}

function formatPercent(value) {
    return value === null ? 'N/A' : `${value}%`;
}

function formatCount(value, singular, plural = null) {
    const label = value === 1 ? singular : plural ?? `${singular}s`;

    return `${value} ${label}`;
}

function buildQuery(filters) {
    const query = {};

    if (filters.period !== '30d') {
        query.period = filters.period;
    }

    if (filters.category !== 'all') {
        query.category = filters.category;
    }

    return query;
}

export default function Index({
    filters,
    periodOptions,
    categories,
    summary,
    statusBreakdown,
    quoteBreakdown,
    categoryBreakdown,
    cityBreakdown,
    providerPerformance,
    operationalHealth,
    trend,
}) {
    const [form, setForm] = useState({
        period: filters.period,
        category: filters.category,
    });

    useEffect(() => {
        setForm({
            period: filters.period,
            category: filters.category,
        });
    }, [filters.category, filters.period]);

    const submit = (event) => {
        event.preventDefault();

        router.get(route('admin.analytics.index'), buildQuery(form), {
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const defaults = {
            period: '30d',
            category: 'all',
        };

        setForm(defaults);

        router.get(route('admin.analytics.index'), {}, {
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Admin reporting
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        Platform Analytics
                    </h2>
                </div>
            }
        >
            <Head title="Platform Analytics" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Requests
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.requestCount}
                            </p>
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                {summary.periodLabel}
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Targeted
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.targetedRequestCount}
                            </p>
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                Requests assigned to a provider
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Quote coverage
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {formatPercent(summary.quoteCoverageRate)}
                            </p>
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                Targeted requests that received a quote
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Quote acceptance
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {formatPercent(summary.quoteAcceptanceRate)}
                            </p>
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                Quotes converted into accepted work
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Average quote
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.averageQuoteAmount
                                    ? formatAmount(summary.averageQuoteAmount)
                                    : 'N/A'}
                            </p>
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                Mean amount across submitted quotes
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Review completion
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {formatPercent(summary.reviewCompletionRate)}
                            </p>
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                Closed targeted requests with customer reviews
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                        <aside className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                Reporting scope
                            </p>
                            <h3 className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                Read marketplace health from one place.
                            </h3>
                            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                Filter by reporting window or category to see where demand, quoting, and trust are moving cleanly or breaking down.
                            </p>

                            <form onSubmit={submit} className="mt-8 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                        Window
                                    </label>
                                    <select
                                        value={form.period}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                period: event.target.value,
                                            }))
                                        }
                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                    >
                                        {periodOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
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
                                        <option value="all">All categories</option>
                                        {categories.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
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

                            <div className="mt-8 space-y-3">
                                <Link
                                    href={route('admin.requests.index')}
                                    className="block rounded-[1.3rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                >
                                    Open request oversight
                                </Link>
                                <Link
                                    href={route('admin.providers.index')}
                                    className="block rounded-[1.3rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                >
                                    Open provider queue
                                </Link>
                                <Link
                                    href={route('admin.users.index')}
                                    className="block rounded-[1.3rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                >
                                    Open user directory
                                </Link>
                            </div>
                        </aside>

                        <section className="space-y-6">
                            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Activity trend
                                            </p>
                                            <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                Requests, quotes, accepted quotes, and reviews
                                            </h3>
                                        </div>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                            {summary.periodLabel}
                                        </p>
                                    </div>

                                    <div className="mt-8 overflow-x-auto">
                                        <div className="flex min-w-[640px] items-end gap-4">
                                            {trend.map((bucket) => (
                                                <div
                                                    key={bucket.label}
                                                    className="flex min-w-0 flex-1 flex-col items-center gap-3"
                                                >
                                                    <div className="flex h-44 items-end gap-1.5">
                                                        <div className="flex w-4 items-end rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                                                            <div
                                                                className="w-full rounded-full bg-zinc-950 dark:bg-white"
                                                                style={{
                                                                    height: `${Math.max(bucket.requestHeight, 6)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex w-4 items-end rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                                                            <div
                                                                className="w-full rounded-full bg-zinc-500 dark:bg-zinc-400"
                                                                style={{
                                                                    height: `${Math.max(bucket.quoteHeight, 6)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex w-4 items-end rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                                                            <div
                                                                className="w-full rounded-full bg-zinc-300 dark:bg-zinc-600"
                                                                style={{
                                                                    height: `${Math.max(bucket.acceptedQuoteHeight, 6)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex w-4 items-end rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                                                            <div
                                                                className="w-full rounded-full bg-zinc-700 dark:bg-zinc-200"
                                                                style={{
                                                                    height: `${Math.max(bucket.reviewHeight, 6)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                                            {bucket.label}
                                                        </p>
                                                        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                                                            {bucket.requestCount} req / {bucket.quoteCount} q
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        <span>Black: requests</span>
                                        <span>Mid gray: quotes</span>
                                        <span>Light gray: accepted quotes</span>
                                        <span>Dark gray: reviews</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                            Request funnel
                                        </p>
                                        <div className="mt-6 space-y-3">
                                            {statusBreakdown.map((item) => (
                                                <div
                                                    key={item.status}
                                                    className="flex items-center justify-between rounded-[1.2rem] border border-zinc-200 bg-zinc-50/85 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                                                >
                                                    <p className="text-sm font-medium text-zinc-950 dark:text-white">
                                                        {item.label}
                                                    </p>
                                                    <span className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {item.count}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                            Quote states
                                        </p>
                                        <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                                            {quoteBreakdown.map((item) => (
                                                <div
                                                    key={item.status}
                                                    className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]"
                                                >
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        {item.label}
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {item.count}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 xl:grid-cols-2">
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Demand by category
                                    </p>
                                    <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        Where customers are asking for work
                                    </h3>

                                    {categoryBreakdown.length ? (
                                        <div className="mt-6 space-y-4">
                                            {categoryBreakdown.map((category) => (
                                                <div
                                                    key={category.category}
                                                    className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                                                >
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                                {category.category}
                                                            </p>
                                                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                                {formatCount(category.requestCount, 'request')}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                {formatCount(
                                                                    category.targetedRequestCount,
                                                                    'targeted request',
                                                                )}
                                                            </span>
                                                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                Coverage {formatPercent(category.quoteCoverageRate)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                        <div className="rounded-[1.2rem] border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
                                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                Accepted quotes
                                                            </p>
                                                            <p className="mt-2 text-base font-semibold text-zinc-950 dark:text-white">
                                                                {category.acceptedQuotes}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-[1.2rem] border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
                                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                Average quote
                                                            </p>
                                                            <p className="mt-2 text-base font-semibold text-zinc-950 dark:text-white">
                                                                {category.averageQuoteAmount
                                                                    ? formatAmount(
                                                                          category.averageQuoteAmount,
                                                                      )
                                                                    : 'No quote yet'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No requests match the current scope.
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Demand by city
                                    </p>
                                    <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        Where requests are clustering
                                    </h3>

                                    {cityBreakdown.length ? (
                                        <div className="mt-6 space-y-4">
                                            {cityBreakdown.map((city) => (
                                                <div
                                                    key={city.city}
                                                    className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                                                >
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                                {city.city}
                                                            </p>
                                                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                                {formatCount(city.requestCount, 'request')}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                {city.activeCount} active
                                                            </span>
                                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                {city.closedCount} closed
                                                            </span>
                                                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                                {city.acceptedQuotes} accepted quote
                                                                {city.acceptedQuotes === 1 ? '' : 's'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            No city-level demand to compare in this window.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                            Provider performance
                                        </p>
                                        <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                            Which storefronts are converting and earning trust
                                        </h3>
                                    </div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        {providerPerformance.length} provider
                                        {providerPerformance.length === 1 ? '' : 's'} with activity
                                    </p>
                                </div>

                                {providerPerformance.length ? (
                                    <div className="mt-6 grid gap-4 xl:grid-cols-2">
                                        {providerPerformance.map((provider) => (
                                            <div
                                                key={provider.id}
                                                className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                                            >
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                            {provider.businessName}
                                                        </p>
                                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                            {provider.category ?? 'Category pending'}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                            {provider.requestCount} request
                                                            {provider.requestCount === 1 ? '' : 's'}
                                                        </span>
                                                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                            {provider.acceptedQuotes} accepted
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                                    <div className="rounded-[1.2rem] border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            Quote acceptance
                                                        </p>
                                                        <p className="mt-2 text-base font-semibold text-zinc-950 dark:text-white">
                                                            {formatPercent(
                                                                provider.quoteAcceptanceRate,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-[1.2rem] border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            Reviews
                                                        </p>
                                                        <p className="mt-2 text-base font-semibold text-zinc-950 dark:text-white">
                                                            {provider.reviewCount}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-[1.2rem] border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            Average rating
                                                        </p>
                                                        <p className="mt-2 text-base font-semibold text-zinc-950 dark:text-white">
                                                            {provider.averageRating
                                                                ? `${provider.averageRating}/5`
                                                                : 'No rating'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                        No provider performance data matches this scope yet.
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-zinc-950 p-8 text-white shadow-[0_30px_80px_rgba(0,0,0,0.22)] dark:border-white/10 dark:bg-white dark:text-zinc-950">
                                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-400 dark:text-zinc-600">
                                    Operations health
                                </p>
                                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Verified providers
                                        </p>
                                        <p className="mt-2 font-display text-2xl font-semibold text-white dark:text-zinc-950">
                                            {operationalHealth.verifiedProviders}
                                        </p>
                                    </div>
                                    <div className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Pending verifications
                                        </p>
                                        <p className="mt-2 font-display text-2xl font-semibold text-white dark:text-zinc-950">
                                            {operationalHealth.pendingProviderVerifications}
                                        </p>
                                    </div>
                                    <div className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Suspended users
                                        </p>
                                        <p className="mt-2 font-display text-2xl font-semibold text-white dark:text-zinc-950">
                                            {operationalHealth.suspendedUsers}
                                        </p>
                                    </div>
                                    <div className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Rejected providers
                                        </p>
                                        <p className="mt-2 font-display text-2xl font-semibold text-white dark:text-zinc-950">
                                            {operationalHealth.rejectedProviders}
                                        </p>
                                    </div>
                                    <div className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Targeted without quote
                                        </p>
                                        <p className="mt-2 font-display text-2xl font-semibold text-white dark:text-zinc-950">
                                            {operationalHealth.targetedWithoutQuoteCount}
                                        </p>
                                    </div>
                                    <div className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Closed without review
                                        </p>
                                        <p className="mt-2 font-display text-2xl font-semibold text-white dark:text-zinc-950">
                                            {operationalHealth.unreviewedClosedRequestCount}
                                        </p>
                                    </div>
                                    <div className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Avg messages / request
                                        </p>
                                        <p className="mt-2 font-display text-2xl font-semibold text-white dark:text-zinc-950">
                                            {operationalHealth.averageMessagesPerRequest}
                                        </p>
                                    </div>
                                    <div className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Avg quote lead days
                                        </p>
                                        <p className="mt-2 font-display text-2xl font-semibold text-white dark:text-zinc-950">
                                            {operationalHealth.averageQuoteLeadDays ?? 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
