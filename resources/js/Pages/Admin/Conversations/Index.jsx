import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function formatDate(value) {
    if (!value) return 'No activity';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(date);
}

function ConversationCard({ conversation }) {
    const form = useForm({ action: '', moderation_notes: conversation.moderationNotes ?? '' });

    const moderate = (action) => {
        form.transform((data) => ({ ...data, action })).patch(
            route('admin.conversations.update', conversation.id),
            { preserveScroll: true },
        );
    };

    return (
        <article className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.07)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_55px_rgba(0,0,0,0.32)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${conversation.isRemoved || conversation.isMuted ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950' : 'border-zinc-300 text-zinc-600 dark:border-white/10 dark:text-zinc-300'}`}>
                            {conversation.isRemoved ? 'Removed' : conversation.isMuted ? 'Muted' : 'Active'}
                        </span>
                        {conversation.pendingReportCount ? (
                            <span className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                {conversation.pendingReportCount} pending report{conversation.pendingReportCount === 1 ? '' : 's'}
                            </span>
                        ) : null}
                    </div>
                    <h2 className="mt-4 font-display text-2xl font-semibold text-zinc-950 dark:text-white">{conversation.title}</h2>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{conversation.customerName} and {conversation.providerName} &middot; {conversation.category}</p>
                </div>
                <div className="flex gap-3">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Messages</p>
                        <p className="mt-1 font-display text-2xl font-semibold text-zinc-950 dark:text-white">{conversation.messageCount}</p>
                    </div>
                    <Link href={conversation.requestUrl} className="flex items-center rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-500 dark:border-white/10 dark:text-zinc-300">Inspect request</Link>
                </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
                <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Latest message</p>
                    <p className="mt-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">{conversation.lastMessage}</p>
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{formatDate(conversation.lastMessageAt)}</p>
                </div>
                <div className="space-y-3">
                    {conversation.reports.length ? conversation.reports.map((report) => (
                        <div key={report.id} className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold text-zinc-950 dark:text-white">{report.reason}</p>
                                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{report.status}</span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{report.reporterName} &middot; {formatDate(report.createdAt)}</p>
                            {report.details ? <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{report.details}</p> : null}
                        </div>
                    )) : (
                        <div className="rounded-[1.5rem] border border-dashed border-zinc-300 p-5 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">No participant reports.</div>
                    )}
                </div>
            </div>

            <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-white/10">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Moderation note</label>
                <textarea rows={2} value={form.data.moderation_notes} onChange={(event) => form.setData('moderation_notes', event.target.value)} className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white" placeholder="Required when muting or removing a conversation" />
                {form.errors.moderation_notes ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{form.errors.moderation_notes}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3">
                    {!conversation.isMuted && !conversation.isRemoved ? <button type="button" onClick={() => moderate('mute')} disabled={form.processing} className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950">Mute conversation</button> : null}
                    {conversation.pendingReportCount ? <button type="button" onClick={() => moderate('dismiss')} disabled={form.processing} className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300">Dismiss report</button> : null}
                    {conversation.isMuted || conversation.isRemoved ? <button type="button" onClick={() => moderate('restore')} disabled={form.processing} className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950">Restore conversation</button> : null}
                    {!conversation.isRemoved ? <button type="button" onClick={() => moderate('remove')} disabled={form.processing} className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300">Remove from inboxes</button> : null}
                </div>
            </div>
        </article>
    );
}

export default function Index({ filters, conversations, summary }) {
    const [form, setForm] = useState(filters);

    useEffect(() => setForm(filters), [filters.q, filters.status]);

    const submit = (event) => {
        event.preventDefault();
        router.get(route('admin.conversations.index'), form, { preserveState: true, replace: true });
    };

    return (
        <AuthenticatedLayout header={<div><p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">Trust and safety</p><h1 className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">Conversation moderation</h1></div>}>
            <Head title="Conversation Moderation" />
            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-3 sm:grid-cols-3">
                        {Object.entries(summary).map(([label, value]) => <div key={label} className="rounded-[1.5rem] border border-zinc-200/80 bg-white/90 p-5 dark:border-white/10 dark:bg-zinc-950/90"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{label}</p><p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">{value}</p></div>)}
                    </section>
                    <form onSubmit={submit} className="grid gap-3 rounded-[1.7rem] border border-zinc-200/80 bg-white/90 p-4 sm:grid-cols-[minmax(0,1fr)_190px_auto] dark:border-white/10 dark:bg-zinc-950/90">
                        <input type="search" value={form.q} onChange={(event) => setForm((current) => ({ ...current, q: event.target.value }))} className="rounded-xl border-zinc-300 bg-white text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white" placeholder="Customer, provider, or request" />
                        <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="rounded-xl border-zinc-300 bg-white text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"><option value="reported">Needs review</option><option value="active">Active</option><option value="muted">Muted</option><option value="removed">Removed</option><option value="all">All</option></select>
                        <button type="submit" className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">Apply filters</button>
                    </form>
                    {conversations.data.length ? <div className="space-y-5">{conversations.data.map((conversation) => <ConversationCard key={conversation.id} conversation={conversation} />)}</div> : <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white/70 px-6 py-16 text-center dark:border-white/10 dark:bg-zinc-950/60"><h2 className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">No conversations match this queue.</h2></div>}
                    {conversations.links.length > 3 ? <nav className="flex flex-wrap justify-center gap-2">{conversations.links.map((link) => <Link key={link.label} href={link.url ?? '#'} preserveScroll className={`rounded-full border px-4 py-2 text-sm ${link.active ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950' : 'border-zinc-300 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`} dangerouslySetInnerHTML={{ __html: link.label }} />)}</nav> : null}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
