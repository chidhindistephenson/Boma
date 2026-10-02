import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function money(value) {
    return value ? `$${Number(value).toLocaleString()}` : 'Open budget';
}

function budgetLabel(min, max) {
    if (min && max) return `${money(min)} - ${money(max)}`;
    if (min) return `From ${money(min)}`;
    if (max) return `Up to ${money(max)}`;
    return 'Budget discussed in proposal';
}

export default function Board({ filters, urgencyOptions, jobRequests, summary }) {
    const [form, setForm] = useState(filters);

    useEffect(() => setForm(filters), [filters]);

    const submit = (event) => {
        event.preventDefault();
        router.get(route('request-board.index'), form, {
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Provider opportunities
                    </p>
                    <h1 className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                        Matching job board
                    </h1>
                </div>
            }
        >
            <Head title="Job Board" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-3">
                        {[
                            ['Matching now', summary.matched],
                            ['Proposals waiting', summary.proposed],
                            ['Proposals accepted', summary.accepted],
                        ].map(([label, value]) => (
                            <div
                                key={label}
                                className="rounded-[1.6rem] border border-zinc-200/80 bg-white/90 p-5 dark:border-white/10 dark:bg-zinc-950/90"
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
                        className="grid gap-3 rounded-[1.7rem] border border-zinc-200/80 bg-white/90 p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] dark:border-white/10 dark:bg-zinc-950/90"
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
                            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                            placeholder="Search scope or location"
                        />
                        <select
                            value={form.urgency}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    urgency: event.target.value,
                                }))
                            }
                            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                        >
                            <option value="">All urgency levels</option>
                            {Object.entries(urgencyOptions).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <button className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">
                            Filter jobs
                        </button>
                    </form>

                    {jobRequests.data.length ? (
                        <section className="grid gap-5 lg:grid-cols-2">
                            {jobRequests.data.map((jobRequest) => (
                                <Link
                                    key={jobRequest.id}
                                    href={route('requests.show', jobRequest.id)}
                                    className="group rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.07)] transition hover:-translate-y-0.5 hover:border-zinc-400 dark:border-white/10 dark:bg-zinc-950/90 dark:hover:border-white/25"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white dark:bg-white dark:text-zinc-950">
                                            {jobRequest.urgency.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                            {jobRequest.category}
                                        </span>
                                    </div>
                                    <h2 className="mt-4 font-display text-2xl font-semibold text-zinc-950 group-hover:underline group-hover:decoration-zinc-300 dark:text-white">
                                        {jobRequest.title}
                                    </h2>
                                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        {jobRequest.description}
                                    </p>
                                    <div className="mt-5 grid grid-cols-2 gap-3">
                                        <div className="rounded-xl bg-zinc-100 px-4 py-3 dark:bg-white/[0.05]">
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Location</p>
                                            <p className="mt-1 text-sm font-semibold text-zinc-950 dark:text-white">
                                                {jobRequest.locationLabel}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-zinc-100 px-4 py-3 dark:bg-white/[0.05]">
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Customer budget</p>
                                            <p className="mt-1 text-sm font-semibold text-zinc-950 dark:text-white">
                                                {budgetLabel(jobRequest.budgetMin, jobRequest.budgetMax)}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Preferred date: {jobRequest.preferredDate ?? 'Flexible'}
                                    </p>
                                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-white/10">
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            Posted by {jobRequest.customerFirstName}
                                        </p>
                                        <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                                            {jobRequest.proposal
                                                ? `Proposal ${jobRequest.proposal.status}`
                                                : 'Send proposal'}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </section>
                    ) : (
                        <section className="rounded-[2rem] border border-dashed border-zinc-300 bg-white/70 px-6 py-16 text-center dark:border-white/10 dark:bg-zinc-950/60">
                            <h2 className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                No matching open jobs right now.
                            </h2>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                Only verified providers see requests matching their trade and service area.
                            </p>
                        </section>
                    )}

                    {jobRequests.links.length > 3 ? (
                        <nav className="flex flex-wrap justify-center gap-2">
                            {jobRequests.links.map((link) => (
                                <Link
                                    key={link.label}
                                    href={link.url ?? '#'}
                                    className={`rounded-full border px-4 py-2 text-sm ${link.active ? 'border-zinc-950 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950' : 'border-zinc-300 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
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
