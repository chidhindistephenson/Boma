import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import ThemeToggle from '@/Components/ThemeToggle';
import UserAvatar from '@/Components/UserAvatar';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const sharedNotifications = auth.notifications ?? {
        unreadCount: 0,
        recent: [],
    };
    const sharedMessages = auth.messages ?? { unreadCount: 0 };
    const [notifications, setNotifications] = useState(sharedNotifications);
    const [messages, setMessages] = useState(sharedMessages);

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);
    const requestLabel = user.role === 'provider' ? 'Work' : 'Requests';
    const requestActive =
        route().current('requests.*') || route().current('providers.requests.*');

    useEffect(() => setNotifications(sharedNotifications), [auth.notifications]);
    useEffect(() => setMessages(sharedMessages), [auth.messages]);

    useEffect(() => {
        if (!window.Echo || !user) return undefined;

        const channelName = `user.${user.id}`;
        const channel = window.Echo.private(channelName);
        const handleNotification = (event) => {
            const notification = event.notification;

            setNotifications((current) => {
                if (current.recent.some((item) => item.id === notification.id)) {
                    return current;
                }

                return {
                    unreadCount: current.unreadCount + 1,
                    recent: [notification, ...current.recent].slice(0, 5),
                };
            });
        };
        const handleMessage = () => {
            if (!route().current('inbox.*')) {
                setMessages((current) => ({
                    unreadCount: current.unreadCount + 1,
                }));
            }
        };

        channel.listen('.notification.created', handleNotification);
        channel.listen('.message.sent', handleMessage);

        return () => {
            channel.stopListening('.notification.created', handleNotification);
            channel.stopListening('.message.sent', handleMessage);
        };
    }, [user.id]);

    return (
        <div className="min-h-screen bg-transparent">
            <nav className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-zinc-950/90">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
                        <div className="flex min-w-0 items-center">
                            <div className="flex shrink-0 items-center">
                                <Link href="/" className="flex items-center gap-3">
                                    <ApplicationLogo className="block h-10 w-10 text-zinc-950 dark:text-white" />
                                    <div className="hidden sm:block">
                                        <p className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
                                            Boma
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {user.city}
                                            {user.area ? `, ${user.area}` : ''}
                                        </p>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        <div className="hidden justify-center gap-5 sm:-my-px sm:flex">
                                <NavLink
                                    href={route('dashboard')}
                                    active={route().current('dashboard')}
                                    className=" whitespace-nowrap"
                                >
                                    Dashboard
                                </NavLink>

                                {user.role !== 'admin' ? (
                                    <NavLink
                                        href={route('providers.index')}
                                        active={
                                            route().current('providers.index') ||
                                            (user.role === 'customer' &&
                                                route().current('providers.show'))
                                        }
                                        className=" whitespace-nowrap"
                                    >
                                        Directory
                                    </NavLink>
                                ) : null}

                                {user.role === 'customer' ||
                                user.role === 'provider' ? (
                                    <NavLink
                                        href={route('inbox.index')}
                                        active={route().current('inbox.*')}
                                        className=" whitespace-nowrap"
                                    >
                                        <span className="relative">
                                            Inbox
                                            {messages.unreadCount ? (
                                                <span className="absolute -right-5 -top-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-zinc-950 px-1 text-[9px] font-semibold text-white dark:bg-white dark:text-zinc-950">
                                                    {messages.unreadCount > 9 ? '9+' : messages.unreadCount}
                                                </span>
                                            ) : null}
                                        </span>
                                    </NavLink>
                                ) : null}

                                {user.role === 'customer' ||
                                user.role === 'provider' ? (
                                    <NavLink
                                        href={route('requests.index')}
                                        active={requestActive}
                                        className=" whitespace-nowrap"
                                    >
                                        {requestLabel}
                                    </NavLink>
                                ) : null}

                                {user.role === 'customer' ? (
                                    <>
                                        <NavLink
                                            href={route('requests.create')}
                                            active={route().current('requests.create')}
                                            className=" whitespace-nowrap"
                                        >
                                            New Request
                                        </NavLink>
                                        <NavLink
                                            href={route('shortlist.index')}
                                            active={route().current('shortlist.*')}
                                            className=" whitespace-nowrap"
                                        >
                                            Shortlist
                                        </NavLink>
                                    </>
                                ) : null}

                                {user.role === 'provider' ? (
                                    <>
                                        <NavLink
                                            href={route('request-board.index')}
                                            active={route().current('request-board.*')}
                                            className=" whitespace-nowrap"
                                        >
                                            Job Board
                                        </NavLink>
                                        <NavLink
                                            href={route('providers.show', user.id)}
                                            active={route().current('providers.show')}
                                            className=" whitespace-nowrap"
                                        >
                                            Storefront
                                        </NavLink>
                                    </>
                                ) : null}

                                {user.role === 'admin' ? (
                                    <>
                                        <NavLink
                                            href={route('admin.users.index')}
                                            active={route().current('admin.users.*')}
                                            className=" whitespace-nowrap"
                                        >
                                            Users
                                        </NavLink>
                                        <NavLink
                                            href={route('admin.requests.index')}
                                            active={route().current('admin.requests.*')}
                                            className=" whitespace-nowrap"
                                        >
                                            Requests
                                        </NavLink>
                                        <NavLink
                                            href={route('admin.reviews.index')}
                                            active={route().current('admin.reviews.*')}
                                            className=" whitespace-nowrap"
                                        >
                                            Reviews
                                        </NavLink>
                                        <NavLink
                                            href={route('admin.conversations.index')}
                                            active={route().current('admin.conversations.*')}
                                            className=" whitespace-nowrap"
                                        >
                                            Safety
                                        </NavLink>
                                        <NavLink
                                            href={route('admin.providers.index')}
                                            active={route().current('admin.providers.*')}
                                            className=" whitespace-nowrap"
                                        >
                                            Providers
                                        </NavLink>
                                        <NavLink
                                            href={route('admin.payouts.index')}
                                            active={route().current('admin.payouts.*')}
                                            className=" whitespace-nowrap"
                                        >
                                            Payouts
                                        </NavLink>
                                        <NavLink
                                            href={route('admin.finance.index')}
                                            active={route().current('admin.finance.*')}
                                            className=" whitespace-nowrap"
                                        >
                                            Finance
                                        </NavLink>
                                        <NavLink
                                            href={route('admin.wallet-deposits.index')}
                                            active={route().current('admin.wallet-deposits.*')}
                                            className=" whitespace-nowrap"
                                        >
                                            Deposits
                                        </NavLink>
                                        <NavLink
                                            href={route('admin.settings.index')}
                                            active={route().current('admin.settings.*')}
                                            className=" whitespace-nowrap"
                                        >
                                            Settings
                                        </NavLink>
                                    </>
                                ) : null}
                        </div>

                        <div className="hidden justify-end sm:flex sm:items-center sm:gap-4">
                            <ThemeToggle />
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        aria-label="Open notifications"
                                        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-950"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="h-5 w-5"
                                        >
                                            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.17V11a6 6 0 1 0-12 0v3.17a2 2 0 0 1-.59 1.42L4 17h5" />
                                            <path d="M9 17a3 3 0 0 0 6 0" />
                                        </svg>
                                        {notifications.unreadCount ? (
                                            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1.5 text-[10px] font-semibold text-white dark:bg-white dark:text-zinc-950">
                                                {notifications.unreadCount > 9
                                                    ? '9+'
                                                    : notifications.unreadCount}
                                            </span>
                                        ) : null}
                                    </button>
                                </Dropdown.Trigger>

                                <Dropdown.Content
                                    width="80"
                                    contentClasses="flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden border border-zinc-200/80 bg-white/95 p-2 dark:border-white/10 dark:bg-zinc-950/95"
                                >
                                    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/90 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                                                    Notifications
                                                </p>
                                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    {notifications.unreadCount}{' '}
                                                    unread
                                                </p>
                                            </div>
                                            {notifications.unreadCount ? (
                                                <Dropdown.Link
                                                    href={route(
                                                        'notifications.markAll',
                                                    )}
                                                    method="post"
                                                    as="button"
                                                    className="rounded-lg px-0 py-0 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400"
                                                >
                                                    Mark all read
                                                </Dropdown.Link>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
                                        {notifications.recent.length ? (
                                            notifications.recent.map(
                                                (notification) => (
                                                    <Link
                                                        key={notification.id}
                                                        href={route(
                                                            'notifications.visit',
                                                            notification.id,
                                                        )}
                                                        className={`block rounded-xl border px-3 py-2.5 transition ${
                                                            notification.isRead
                                                                ? 'border-zinc-200/80 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-zinc-900'
                                                                : 'border-zinc-950/10 bg-zinc-50 text-zinc-950 hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <p className="truncate text-sm font-semibold">
                                                                {
                                                                    notification.title
                                                                }
                                                            </p>
                                                            {!notification.isRead ? (
                                                                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-zinc-950 dark:bg-white" />
                                                            ) : null}
                                                        </div>
                                                        {notification.body ? (
                                                            <p className="mt-1 max-h-10 overflow-hidden text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                                                                {
                                                                    notification.body
                                                                }
                                                            </p>
                                                        ) : null}
                                                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            {
                                                                notification.createdLabel
                                                            }
                                                        </p>
                                                    </Link>
                                                ),
                                            )
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/90 px-4 py-6 text-sm leading-6 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                                No notifications yet.
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-2">
                                        <Dropdown.Link
                                            href={route('notifications.index')}
                                        >
                                            View all notifications
                                        </Dropdown.Link>
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        aria-label="Open account menu"
                                        className="flex rounded-full transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
                                    >
                                        <UserAvatar
                                            name={user.name}
                                            src={user.profilePhotoUrl}
                                            className="h-11 w-11"
                                        />
                                    </button>
                                </Dropdown.Trigger>

                                <Dropdown.Content
                                    contentClasses="border border-zinc-200/80 bg-white/95 p-2 dark:border-white/10 dark:bg-zinc-950/95"
                                >
                                    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/90 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                                            {user.name}
                                        </p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            {user.role.replace('_', ' ')}
                                        </p>
                                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            {user.email}
                                        </p>
                                    </div>

                                    <div className="mt-2 space-y-1">
                                        <Dropdown.Link href={route('profile.edit')}>
                                            Account
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                            className="rounded-lg font-medium text-zinc-950 dark:text-white"
                                        >
                                            Log Out
                                        </Dropdown.Link>
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <ThemeToggle className="me-2" />
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus:bg-zinc-100 focus:text-zinc-950 focus:outline-none dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white dark:focus:bg-white/5 dark:focus:text-white"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={
                        (showingNavigationDropdown ? 'block' : 'hidden') +
                        ' sm:hidden'
                    }
                >
                    <div className="space-y-1 pb-3 pt-2">
                        <ResponsiveNavLink
                            href={route('providers.index')}
                            active={
                                route().current('providers.index') ||
                                route().current('providers.show')
                            }
                        >
                            Directory
                        </ResponsiveNavLink>
                        {user.role === 'customer' ||
                        user.role === 'provider' ? (
                            <ResponsiveNavLink
                                href={route('inbox.index')}
                                active={route().current('inbox.*')}
                            >
                                Inbox{messages.unreadCount ? ` (${messages.unreadCount})` : ''}
                            </ResponsiveNavLink>
                        ) : null}
                        {user.role === 'customer' ||
                        user.role === 'provider' ? (
                            <ResponsiveNavLink
                                href={route('requests.index')}
                                active={requestActive}
                            >
                                {requestLabel}
                            </ResponsiveNavLink>
                        ) : null}
                        {user.role === 'provider' ? (
                            <ResponsiveNavLink
                                href={route('request-board.index')}
                                active={route().current('request-board.*')}
                            >
                                Job Board
                            </ResponsiveNavLink>
                        ) : null}
                        {user.role === 'customer' ? (
                            <>
                                <ResponsiveNavLink
                                    href={route('shortlist.index')}
                                    active={route().current('shortlist.*')}
                                >
                                    Shortlist
                                </ResponsiveNavLink>
                            </>
                        ) : null}
                        {user.role === 'customer' ? (
                            <ResponsiveNavLink href={route('requests.create')}>
                                New Request
                            </ResponsiveNavLink>
                        ) : null}
                        <ResponsiveNavLink
                            href={route('notifications.index')}
                            active={route().current('notifications.*')}
                        >
                            Notifications
                        </ResponsiveNavLink>
                        <ResponsiveNavLink
                            href={route('dashboard')}
                            active={route().current('dashboard')}
                        >
                            Dashboard
                        </ResponsiveNavLink>
                        {user.role === 'provider' ? (
                            <ResponsiveNavLink
                                href={route('providers.show', user.id)}
                                active={route().current('providers.show')}
                            >
                                My Storefront
                            </ResponsiveNavLink>
                        ) : null}
                        {user.role === 'admin' ? (
                            <>
                                <ResponsiveNavLink
                                    href={route('admin.users.index')}
                                    active={route().current('admin.users.*')}
                                >
                                    User Directory
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    href={route('admin.requests.index')}
                                    active={route().current('admin.requests.*')}
                                >
                                    Request Oversight
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    href={route('admin.reviews.index')}
                                    active={route().current('admin.reviews.*')}
                                >
                                    Review Moderation
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    href={route('admin.conversations.index')}
                                    active={route().current('admin.conversations.*')}
                                >
                                    Conversation Safety
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    href={route('admin.providers.index')}
                                    active={route().current('admin.providers.*')}
                                >
                                    Provider Queue
                                </ResponsiveNavLink>
                            </>
                        ) : null}
                        <ResponsiveNavLink
                            href={route('profile.edit')}
                            active={route().current('profile.*')}
                        >
                            Account
                        </ResponsiveNavLink>
                    </div>

                    <div className="border-t border-zinc-200/80 pb-1 pt-4 dark:border-white/10">
                        <div className="px-4">
                            <div className="text-base font-medium text-zinc-950 dark:text-white">
                                {user.name}
                            </div>
                            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                {user.email}
                            </div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>
                                Profile
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                method="post"
                                href={route('logout')}
                                as="button"
                            >
                                Log Out
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="bg-white/70 shadow-sm backdrop-blur dark:bg-zinc-950/60">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main>{children}</main>
        </div>
    );
}
