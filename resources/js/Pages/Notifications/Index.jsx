import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

const CATEGORY_LABELS = {
    messages: 'Message',
    requests: 'Request',
    payments: 'Payment',
    reviews: 'Review',
    account: 'Account',
};

function CategoryIcon({ category }) {
    const paths = {
        messages: <path d="M8 18.5 4 20l1.5-4A8 8 0 1 1 8 18.5Z" />,
        payments: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></>,
        reviews: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
        account: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
        requests: <><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    };

    return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                {paths[category] ?? paths.requests}
            </svg>
        </span>
    );
}

export default function Index({ activeTab, notifications, summary, preferences }) {
    const { auth } = usePage().props;
    const preferenceForm = useForm(Object.fromEntries(
        preferences.map((preference) => [preference.key, preference.enabled]),
    ));

    useEffect(() => {
        if (!window.Echo) return undefined;

        const channelName = `user.${auth.user.id}`;
        const channel = window.Echo.private(channelName);
        const handleNotification = () => router.reload({
            only: ['notifications', 'summary', 'auth'],
            preserveState: true,
            preserveScroll: true,
        });

        channel.listen('.notification.created', handleNotification);

        return () => channel.stopListening('.notification.created', handleNotification);
    }, [auth.user.id]);

    const savePreferences = (event) => {
        event.preventDefault();
        preferenceForm.patch(route('notifications.preferences.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">Activity center</p>
                        <h1 className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">Notifications</h1>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{summary.unread ? `${summary.unread} unread` : 'You are all caught up'}</p>
                </div>
            }
        >
            <Head title="Notifications" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
                    <section className="flex flex-col gap-4 rounded-[1.7rem] border border-zinc-200/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="flex items-center gap-3">
                            <Link href={route('notifications.index')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === 'all' ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'}`}>All <span className="ml-1 opacity-65">{summary.total}</span></Link>
                            <Link href={route('notifications.index', { tab: 'unread' })} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === 'unread' ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'}`}>Unread <span className="ml-1 opacity-65">{summary.unread}</span></Link>
                        </div>
                        {summary.unread ? <Link href={route('notifications.markAll')} method="post" as="button" preserveScroll className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-500 dark:border-white/10 dark:text-zinc-300">Mark all as read</Link> : null}
                    </section>

                    <form onSubmit={savePreferences} className="rounded-[1.7rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div><h2 className="font-display text-lg font-semibold text-zinc-950 dark:text-white">Email alerts</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose which activity should also reach your email.</p></div>
                            <button type="submit" disabled={preferenceForm.processing || !preferenceForm.isDirty} className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35 dark:bg-white dark:text-zinc-950">{preferenceForm.processing ? 'Saving...' : 'Save preferences'}</button>
                        </div>
                        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                            {preferences.map((preference) => (
                                <label key={preference.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-medium text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                    <span>{preference.label}</span>
                                    <input type="checkbox" checked={Boolean(preferenceForm.data[preference.key])} onChange={(event) => preferenceForm.setData(preference.key, event.target.checked)} className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-500 dark:border-white/20 dark:bg-zinc-950 dark:text-white" />
                                </label>
                            ))}
                        </div>
                    </form>

                    {notifications.data.length ? (
                        <section className="overflow-hidden rounded-[1.8rem] border border-zinc-200/80 bg-white/90 shadow-[0_18px_55px_rgba(0,0,0,0.07)] dark:border-white/10 dark:bg-zinc-950/90">
                            {notifications.data.map((notification) => (
                                <Link key={notification.id} href={route('notifications.visit', notification.id)} className={`group flex gap-4 border-b border-zinc-200/80 p-4 transition last:border-b-0 hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/[0.04] sm:p-5 ${notification.isRead ? '' : 'bg-zinc-50/80 dark:bg-white/[0.025]'}`}>
                                    <CategoryIcon category={notification.category} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><span className="flex min-w-0 items-center gap-2">{!notification.isRead ? <span className="h-2 w-2 shrink-0 rounded-full bg-zinc-950 dark:bg-white" /> : null}<span className="truncate text-sm font-semibold text-zinc-950 dark:text-white">{notification.title}</span></span><span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">{notification.createdLabel}</span></span>
                                        {notification.body ? <span className="mt-1.5 block text-sm leading-6 text-zinc-600 dark:text-zinc-400">{notification.body}</span> : null}
                                        <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{CATEGORY_LABELS[notification.category] ?? 'Activity'} <span aria-hidden="true">&rarr;</span></span>
                                    </span>
                                </Link>
                            ))}
                        </section>
                    ) : (
                        <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white/75 px-6 py-16 text-center dark:border-white/10 dark:bg-zinc-950/60">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M9 17a3 3 0 0 0 6 0" /></svg></span>
                            <h2 className="mt-5 font-display text-2xl font-semibold text-zinc-950 dark:text-white">Nothing new here</h2>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">New marketplace activity will appear automatically.</p>
                        </div>
                    )}

                    {notifications.last_page > 1 ? (
                        <nav className="flex items-center justify-between rounded-[1.5rem] border border-zinc-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-zinc-950/90">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Page {notifications.current_page} of {notifications.last_page}</p>
                            <div className="flex gap-2">{notifications.prev_page_url ? <Link href={notifications.prev_page_url} preserveScroll className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-white/10 dark:text-zinc-300">Previous</Link> : null}{notifications.next_page_url ? <Link href={notifications.next_page_url} preserveScroll className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">Next</Link> : null}</div>
                        </nav>
                    ) : null}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
