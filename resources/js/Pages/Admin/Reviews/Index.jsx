import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function formatDateTime(value) {
    if (!value) return 'Not reviewed';

    const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));

    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(date);
}

function statusClasses(status) {
    if (status === 'flagged') {
        return 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950';
    }

    return 'border-zinc-300 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300';
}

function ReviewCard({ review }) {
    const { data, setData, transform, patch, processing, errors } = useForm({
        action: '',
        moderation_notes: review.moderationNotes ?? '',
    });

    const moderate = (action) => {
        transform((current) => ({ ...current, action })).patch(
            route('admin.reviews.update', review.id),
            {
            preserveScroll: true,
            },
        );
    };

    return (
        <article className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.07)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_55px_rgba(0,0,0,0.32)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClasses(review.status)}`}
                        >
                            {review.status}
                        </span>
                        <span className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
                            {review.rating}/5
                        </span>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Review #{review.id} · {formatDateTime(review.createdAt)}
                        </span>
                    </div>
                    <h2 className="mt-4 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        {review.headline || 'Customer review'}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {review.customerName} reviewed {review.providerName} for{' '}
                        <Link
                            href={route('requests.show', review.jobRequestId)}
                            className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4 dark:text-white"
                        >
                            {review.jobTitle}
                        </Link>
                    </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Reports
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        {review.reportCount}
                    </p>
                </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
                <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                        {review.body}
                    </p>
                    {review.providerResponse ? (
                        <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-white/10">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Provider response
                            </p>
                            <p className="mt-2 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                                {review.providerResponse}
                            </p>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-3">
                    <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Flag signal
                        </p>
                        <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                            {review.flagReason || 'No automated or user flag.'}
                        </p>
                    </div>
                    {review.reports.map((report) => (
                        <div
                            key={report.id}
                            className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900"
                        >
                            <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                                {report.reason}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {report.reporterName} · {formatDateTime(report.createdAt)}
                            </p>
                            {report.details ? (
                                <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                                    {report.details}
                                </p>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-white/10">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Moderation note
                </label>
                <textarea
                    rows={3}
                    value={data.moderation_notes}
                    onChange={(event) =>
                        setData('moderation_notes', event.target.value)
                    }
                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                    placeholder="Required when removing a review; optional when approving it."
                />
                {errors.moderation_notes ? (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.moderation_notes}
                    </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => moderate('publish')}
                        disabled={processing}
                        className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                    >
                        Publish review
                    </button>
                    <button
                        type="button"
                        onClick={() => moderate('remove')}
                        disabled={processing}
                        className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950 disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-white dark:hover:text-white"
                    >
                        Remove review
                    </button>
                </div>
                {review.moderatedAt ? (
                    <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                        Last decision {formatDateTime(review.moderatedAt)} by{' '}
                        {review.moderatedByName}
                    </p>
                ) : null}
            </div>
        </article>
    );
}

export default function Index({ filters, reviews, summary }) {
    const [form, setForm] = useState({
        q: filters.q,
        status: filters.status,
        rating: filters.rating ?? '',
    });

    useEffect(() => {
        setForm({
            q: filters.q,
            status: filters.status,
            rating: filters.rating ?? '',
        });
    }, [filters.q, filters.rating, filters.status]);

    const submit = (event) => {
        event.preventDefault();

        router.get(route('admin.reviews.index'), form, {
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Trust and safety
                    </p>
                    <h1 className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                        Review moderation
                    </h1>
                </div>
            }
        >
            <Head title="Review Moderation" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {Object.entries(summary).map(([label, value]) => (
                            <div
                                key={label}
                                className="rounded-[1.5rem] border border-zinc-200/80 bg-white/90 p-5 dark:border-white/10 dark:bg-zinc-950/90"
                            >
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                    {label}
                                </p>
                                <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                    {value}
                                </p>
                            </div>
                        ))}
                    </section>

                    <form
                        onSubmit={submit}
                        className="grid gap-3 rounded-[1.7rem] border border-zinc-200/80 bg-white/90 p-4 sm:grid-cols-[minmax(0,1fr)_190px_140px_auto] dark:border-white/10 dark:bg-zinc-950/90"
                    >
                        <input
                            type="search"
                            value={form.q}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    q: event.target.value,
                                }))
                            }
                            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                            placeholder="Search review, customer, or provider"
                        />
                        <select
                            value={form.status}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    status: event.target.value,
                                }))
                            }
                            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                        >
                            <option value="flagged">Needs moderation</option>
                            <option value="published">Published</option>
                            <option value="removed">Removed</option>
                            <option value="all">All reviews</option>
                        </select>
                        <select
                            value={form.rating}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    rating: event.target.value,
                                }))
                            }
                            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                        >
                            <option value="">All ratings</option>
                            {[5, 4, 3, 2, 1].map((rating) => (
                                <option key={rating} value={rating}>
                                    {rating}/5
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950"
                        >
                            Apply filters
                        </button>
                    </form>

                    {reviews.data.length ? (
                        <div className="space-y-5">
                            {reviews.data.map((review) => (
                                <ReviewCard key={review.id} review={review} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white/70 px-6 py-16 text-center dark:border-white/10 dark:bg-zinc-950/60">
                            <h2 className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                No reviews match this queue.
                            </h2>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                Change the status, rating, or search filter to inspect another set.
                            </p>
                        </div>
                    )}

                    {reviews.links.length > 3 ? (
                        <nav className="flex flex-wrap justify-center gap-2">
                            {reviews.links.map((link) => (
                                <Link
                                    key={link.label}
                                    href={link.url ?? '#'}
                                    preserveScroll
                                    className={`rounded-full border px-4 py-2 text-sm ${
                                        link.active
                                            ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                            : 'border-zinc-300 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300'
                                    } ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </nav>
                    ) : null}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
