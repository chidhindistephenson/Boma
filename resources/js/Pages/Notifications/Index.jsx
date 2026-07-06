import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

function tabClasses(active) {
    return active
        ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
        : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-zinc-950';
}

export default function Index({ activeTab, notifications, summary }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Notification center
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        Notifications
                    </h2>
                </div>
            }
        >
            <Head title="Notifications" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Total
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.total}
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Unread
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.unread}
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Actions
                            </p>
                            <div className="mt-3 flex flex-wrap gap-3">
                                <Link
                                    href={route('notifications.index')}
                                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${tabClasses(activeTab === 'all')}`}
                                >
                                    All
                                </Link>
                                <Link
                                    href={route('notifications.index', {
                                        tab: 'unread',
                                    })}
                                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${tabClasses(activeTab === 'unread')}`}
                                >
                                    Unread only
                                </Link>
                                {summary.unread ? (
                                    <Link
                                        href={route('notifications.markAll')}
                                        method="post"
                                        as="button"
                                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-zinc-950"
                                    >
                                        Mark all read
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {notifications.data.length ? (
                        <>
                            <div className="space-y-4">
                                {notifications.data.map((notification) => (
                                    <Link
                                        key={notification.id}
                                        href={route(
                                            'notifications.visit',
                                            notification.id,
                                        )}
                                        className={`block rounded-[2rem] border p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] transition hover:border-zinc-300 hover:bg-white dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] dark:hover:border-white/20 dark:hover:bg-zinc-900 ${
                                            notification.isRead
                                                ? 'border-zinc-200/80 bg-white/88 dark:border-white/10 dark:bg-zinc-950/82'
                                                : 'border-zinc-950/10 bg-zinc-50/92 dark:border-white/10 dark:bg-zinc-900'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="max-w-3xl">
                                                <div className="flex items-center gap-3">
                                                    {!notification.isRead ? (
                                                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-zinc-950 dark:bg-white" />
                                                    ) : null}
                                                    <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {notification.title}
                                                    </p>
                                                </div>
                                                {notification.body ? (
                                                    <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                        {notification.body}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="flex flex-col items-start gap-2 sm:items-end">
                                                <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                    {notification.isRead
                                                        ? 'Read'
                                                        : 'Unread'}
                                                </span>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    {notification.createdLabel}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/88 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Page {notifications.current_page} of{' '}
                                    {notifications.last_page}
                                </p>

                                <div className="flex gap-3">
                                    {notifications.prev_page_url ? (
                                        <Link
                                            href={notifications.prev_page_url}
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

                                    {notifications.next_page_url ? (
                                        <Link
                                            href={notifications.next_page_url}
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
                                No notifications in this view.
                            </h3>
                            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                New request activity, provider verification decisions,
                                and customer reviews will show up here as the
                                marketplace moves.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
