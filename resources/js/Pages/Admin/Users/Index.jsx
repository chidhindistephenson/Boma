import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function formatStatus(value) {
    return value ? value.replace(/_/g, ' ') : 'not set';
}

function formatDate(value) {
    if (!value) {
        return 'Not set';
    }

    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
    }).format(date);
}

function initials(name) {
    return String(name || 'User')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function buildQuery(filters) {
    const query = {};

    if (filters.q.trim()) {
        query.q = filters.q.trim();
    }

    if (filters.role !== 'all') {
        query.role = filters.role;
    }

    if (filters.accountStatus !== 'all') {
        query.account_status = filters.accountStatus;
    }

    if (filters.suspension !== 'all') {
        query.suspension = filters.suspension;
    }

    return query;
}

function StatusPill({ children, strong = false }) {
    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                strong
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                    : 'border border-zinc-300 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
        >
            {children}
        </span>
    );
}

function SummaryCard({ label, value, icon, chip }) {
    return (
        <div className="rounded-[1.35rem] border border-zinc-300/70 bg-zinc-300/80 p-4 text-zinc-950 shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-white/10 dark:text-white">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-200">
                        {icon}
                    </span>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {label}
                    </p>
                </div>
            </div>
            <div className="mt-5 flex items-end justify-between gap-3">
                <p className="font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                    {value}
                </p>
                <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-950/70 dark:text-zinc-300">
                    {chip}
                </span>
            </div>
            <p className="mt-1 text-right text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                Current
            </p>
        </div>
    );
}

function UserModerationControls({ user, compact = false }) {
    const { data, setData, transform, patch, processing, errors, reset } =
        useForm({
            action: 'suspend',
            reason: user.suspensionReason ?? '',
        });

    const submit = (action) => {
        transform(() => ({
            action,
            reason: data.reason,
        }));

        patch(route('admin.users.update', user.id), {
            preserveScroll: true,
            onSuccess: () => {
                if (action === 'restore') {
                    reset('reason');
                }
            },
        });
    };

    if (!user.canSuspend && !user.canRestore) {
        return null;
    }

    return (
        <div className={compact ? 'mt-4 space-y-3' : 'mt-5 space-y-3'}>
            <textarea
                id={`reason_${user.id}`}
                rows={compact ? 2 : 3}
                value={data.reason}
                onChange={(event) => setData('reason', event.target.value)}
                className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                placeholder="Moderation note"
            />
            <InputError className="mt-2" message={errors.reason} />
            <div className="flex flex-wrap gap-2">
                {user.canSuspend ? (
                    <button
                        type="button"
                        onClick={() => submit('suspend')}
                        disabled={processing}
                        className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                        {processing ? 'Saving...' : 'Suspend'}
                    </button>
                ) : null}
                {user.canRestore ? (
                    <button
                        type="button"
                        onClick={() => submit('restore')}
                        disabled={processing}
                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                    >
                        {processing ? 'Saving...' : 'Restore'}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function UserActions({ user, onEdit }) {
    const resetPassword = () => {
        if (window.confirm(`Send a password reset link to ${user.email}?`)) {
            router.post(route('admin.users.reset-password', user.id), {}, {
                preserveScroll: true,
            });
        }
    };

    const toggleSuspension = () => {
        if (user.canRestore) {
            router.patch(
                route('admin.users.update', user.id),
                { action: 'restore', reason: '' },
                { preserveScroll: true },
            );

            return;
        }

        router.patch(
            route('admin.users.update', user.id),
            {
                action: 'suspend',
                reason: 'Suspended by an administrator from the users directory.',
            },
            { preserveScroll: true },
        );
    };

    const deleteUser = () => {
        if (
            window.confirm(
                `Delete ${user.name}? This removes the account and related records that are configured to cascade.`,
            )
        ) {
            router.delete(route('admin.users.destroy', user.id), {
                preserveScroll: true,
            });
        }
    };

    const iconButtonClass =
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:text-white';
    const strongIconButtonClass =
        'inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200';

    return (
        <div className="flex flex-wrap gap-2">
            {user.canEdit ? (
                <button
                    type="button"
                    onClick={() => onEdit(user)}
                    className={iconButtonClass}
                    title="Edit user"
                    aria-label={`Edit ${user.name}`}
                >
                    <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                        />
                    </svg>
                </button>
            ) : null}
            {user.canSuspend || user.canRestore ? (
                <button
                    type="button"
                    onClick={toggleSuspension}
                    className={strongIconButtonClass}
                    title={user.canRestore ? 'Restore user' : 'Suspend user'}
                    aria-label={`${user.canRestore ? 'Restore' : 'Suspend'} ${user.name}`}
                >
                    <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        {user.canRestore ? (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.5 10.5V6.75a3.75 3.75 0 1 1 7.5 0v3.75M6.75 10.5h10.5A2.25 2.25 0 0 1 19.5 12.75v5.25A2.25 2.25 0 0 1 17.25 20.25H6.75A2.25 2.25 0 0 1 4.5 18v-5.25A2.25 2.25 0 0 1 6.75 10.5Z"
                            />
                        ) : (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75M6.75 10.5h10.5A2.25 2.25 0 0 1 19.5 12.75v5.25A2.25 2.25 0 0 1 17.25 20.25H6.75A2.25 2.25 0 0 1 4.5 18v-5.25A2.25 2.25 0 0 1 6.75 10.5Z"
                            />
                        )}
                    </svg>
                </button>
            ) : null}
            {user.canEdit ? (
                <button
                    type="button"
                    onClick={resetPassword}
                    className={iconButtonClass}
                    title="Send password reset"
                    aria-label={`Send password reset to ${user.name}`}
                >
                    <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 5.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 21a7.5 7.5 0 0 1 15 0M19.5 8.25v5.25m2.625-2.625H16.875"
                        />
                    </svg>
                </button>
            ) : null}
            {user.canDelete ? (
                <button
                    type="button"
                    onClick={deleteUser}
                    className={iconButtonClass}
                    title="Delete user"
                    aria-label={`Delete ${user.name}`}
                >
                    <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21.75H8.084A2.25 2.25 0 0 1 5.84 19.673L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                    </svg>
                </button>
            ) : null}
        </div>
    );
}

function EditUserModal({ user, onClose }) {
    const { data, setData, patch, processing, errors } = useForm({
        action: 'update',
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        status: user?.status ?? 'active',
        city: user?.city ?? '',
        area: user?.area ?? '',
    });

    const submit = (event) => {
        event.preventDefault();

        patch(route('admin.users.update', user.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Modal show={Boolean(user)} onClose={onClose} maxWidth="2xl">
            <form onSubmit={submit} className="bg-white p-6 dark:bg-zinc-950">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                    Edit user
                </p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                    {user?.name}
                </h3>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Name
                        </label>
                        <input
                            value={data.name}
                            onChange={(event) => setData('name', event.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                        />
                        <InputError className="mt-2" message={errors.name} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Email
                        </label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(event) => setData('email', event.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                        />
                        <InputError className="mt-2" message={errors.email} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Phone
                        </label>
                        <input
                            value={data.phone}
                            onChange={(event) => setData('phone', event.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                        />
                        <InputError className="mt-2" message={errors.phone} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Status
                        </label>
                        <select
                            value={data.status}
                            onChange={(event) => setData('status', event.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                        >
                            <option value="active">Active</option>
                            <option value="pending_verification">Pending verification</option>
                            <option value="verification_rejected">Verification rejected</option>
                        </select>
                        <InputError className="mt-2" message={errors.status} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            City
                        </label>
                        <input
                            value={data.city}
                            onChange={(event) => setData('city', event.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                        />
                        <InputError className="mt-2" message={errors.city} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Area
                        </label>
                        <input
                            value={data.area}
                            onChange={(event) => setData('area', event.target.value)}
                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                        />
                        <InputError className="mt-2" message={errors.area} />
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:border-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/40"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                    >
                        {processing ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function UserTile({ user, onEdit }) {
    return (
        <article className="rounded-[1.8rem] border border-zinc-200 bg-white p-5 shadow-[0_16px_45px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950">
            <div className="flex justify-end">
                <span className="text-xl leading-none text-zinc-400">...</span>
            </div>
            <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 font-display text-lg font-semibold text-zinc-950 dark:border-white/10 dark:bg-white/[0.08] dark:text-white">
                    {initials(user.name)}
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                    {user.name}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {user.providerBusinessName || formatStatus(user.role)}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <StatusPill strong={user.isSuspended}>
                        {user.isSuspended ? 'suspended' : formatStatus(user.status)}
                    </StatusPill>
                    <StatusPill>{formatStatus(user.role)}</StatusPill>
                </div>
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-zinc-50 p-4 text-sm dark:bg-white/[0.03]">
                <p className="truncate text-zinc-700 dark:text-zinc-300">
                    {user.email}
                </p>
                <p className="text-zinc-500 dark:text-zinc-400">
                    {user.phone || 'Phone pending'}
                </p>
                <p className="text-zinc-500 dark:text-zinc-400">
                    {user.locationLabel || 'Location pending'}
                </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-zinc-200 p-3 dark:border-white/10">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                        Requests
                    </p>
                    <p className="mt-1 font-semibold text-zinc-950 dark:text-white">
                        {user.customerRequestCount + user.providerRequestCount}
                    </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-3 dark:border-white/10">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                        Joined
                    </p>
                    <p className="mt-1 font-semibold text-zinc-950 dark:text-white">
                        {formatDate(user.createdAt)}
                    </p>
                </div>
            </div>

            {user.isSuspended ? (
                <p className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                    {user.suspensionReason || 'No suspension reason recorded.'}
                </p>
            ) : null}

            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-white/10">
                <UserActions user={user} onEdit={onEdit} />
            </div>
        </article>
    );
}

function UserListRow({ user, onEdit }) {
    return (
        <div className="grid gap-4 border-b border-zinc-200 px-5 py-4 transition hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/[0.04] lg:grid-cols-[1.35fr_1.15fr_0.65fr_0.75fr_0.75fr_0.9fr]">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 font-display text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">
                    {initials(user.name)}
                </div>
                <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-950 dark:text-white">
                        {user.name}
                    </p>
                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {user.providerBusinessName || user.locationLabel || 'Profile pending'}
                    </p>
                </div>
            </div>
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {user.email}
                </p>
                <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {user.phone || 'Phone pending'}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <StatusPill>{formatStatus(user.role)}</StatusPill>
                {user.isSuspended ? <StatusPill strong>suspended</StatusPill> : null}
            </div>
            <div>
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                    {formatStatus(user.status)}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {user.emailVerified ? 'Email verified' : 'Email pending'}
                </p>
            </div>
            <div>
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                    {formatDate(user.createdAt)}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {user.customerRequestCount + user.providerRequestCount} requests
                </p>
            </div>
            <UserActions user={user} onEdit={onEdit} />
            {user.isSuspended ? (
                <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400 lg:col-span-6">
                    {user.suspensionReason || 'No suspension reason recorded.'}
                </p>
            ) : null}
        </div>
    );
}

export default function Index({ filters, users, summary }) {
    const [form, setForm] = useState({
        q: filters.q,
        role: filters.role,
        accountStatus: filters.accountStatus,
        suspension: filters.suspension,
    });
    const [viewMode, setViewMode] = useState('list');
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        setForm({
            q: filters.q,
            role: filters.role,
            accountStatus: filters.accountStatus,
            suspension: filters.suspension,
        });
    }, [filters.accountStatus, filters.q, filters.role, filters.suspension]);

    const submit = (event) => {
        event.preventDefault();

        router.get(route('admin.users.index'), buildQuery(form), {
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const defaults = {
            q: '',
            role: 'all',
            accountStatus: 'all',
            suspension: 'all',
        };

        setForm(defaults);

        router.get(route('admin.users.index'), {}, {
            preserveScroll: true,
            replace: true,
        });
    };

    const stats = [
        {
            label: 'Total users',
            value: summary.totalUsers,
            meta: 'All accounts',
            icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
        },
        {
            label: 'Customers',
            value: summary.customers,
            meta: 'Service buyers',
            icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.941 3.199.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a5.971 5.971 0 0 0-.941 3.197',
        },
        {
            label: 'Providers',
            value: summary.providers,
            meta: 'Service sellers',
            icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
        },
        {
            label: 'Admins',
            value: summary.admins,
            meta: 'Operators',
            icon: 'M15.75 5.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 21a7.5 7.5 0 0 1 15 0M16.5 10.5l1.5 1.5 3-3',
        },
        {
            label: 'Suspended',
            value: summary.suspendedUsers,
            meta: 'Restricted',
            icon: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75M6.75 10.5h10.5A2.25 2.25 0 0 1 19.5 12.75v5.25A2.25 2.25 0 0 1 17.25 20.25H6.75A2.25 2.25 0 0 1 4.5 18v-5.25A2.25 2.25 0 0 1 6.75 10.5Z',
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Admin operations
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        User directory
                    </h2>
                </div>
            }
        >
            <Head title="User Directory" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
                    <section className="overflow-hidden rounded-[2.3rem] bg-zinc-950 text-white shadow-[0_24px_80px_rgba(0,0,0,0.08)] dark:border dark:border-white/10 dark:bg-white/[0.04]">
                        <div className="p-6 sm:p-8">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                {stats.map((card) => (
                                    <div
                                        key={card.label}
                                        className="boma-stat-card"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="boma-stat-card-icon">
                                                <svg
                                                    aria-hidden="true"
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d={card.icon}
                                                    />
                                                </svg>
                                            </span>
                                            <p className="boma-stat-card-title">
                                                {card.label}
                                            </p>
                                        </div>
                                        <div className="mt-5 flex items-end justify-between gap-3">
                                            <p className="boma-stat-card-value">
                                                {card.value}
                                            </p>
                                            <span className="boma-stat-card-meta text-right">
                                                {card.meta}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-[2.1rem] border border-zinc-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950">
                        <form
                            onSubmit={submit}
                            className="grid gap-4 border-b border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950 lg:grid-cols-[minmax(220px,1.2fr)_0.8fr_0.8fr_0.8fr_auto_auto]"
                        >
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
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
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                    placeholder="Name, email, phone, business"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    Role
                                </label>
                                <select
                                    value={form.role}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            role: event.target.value,
                                        }))
                                    }
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                >
                                    <option value="all">All roles</option>
                                    <option value="customer">Customer</option>
                                    <option value="provider">Provider</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    Status
                                </label>
                                <select
                                    value={form.accountStatus}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            accountStatus: event.target.value,
                                        }))
                                    }
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                >
                                    <option value="all">All states</option>
                                    <option value="active">Active</option>
                                    <option value="pending_verification">Pending verification</option>
                                    <option value="verification_rejected">Verification rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    Suspension
                                </label>
                                <select
                                    value={form.suspension}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            suspension: event.target.value,
                                        }))
                                    }
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                >
                                    <option value="all">All accounts</option>
                                    <option value="clear">Not suspended</option>
                                    <option value="suspended">Suspended only</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="self-end rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                            >
                                Apply
                            </button>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="self-end rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                            >
                                Reset
                            </button>
                        </form>

                        <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Showing {users.from ?? users.data.length} - {users.to ?? users.data.length} of {users.total ?? users.data.length} users
                            </p>
                            <div className="inline-flex w-fit rounded-full border border-zinc-300 bg-zinc-100 p-1 dark:border-white/10 dark:bg-white/[0.04]">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                                        viewMode === 'list'
                                            ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                                            : 'text-zinc-600 dark:text-zinc-300'
                                    }`}
                                >
                                    List
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                                        viewMode === 'grid'
                                            ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                                            : 'text-zinc-600 dark:text-zinc-300'
                                    }`}
                                >
                                    Grid
                                </button>
                            </div>
                        </div>

                        {users.data.length ? (
                            viewMode === 'list' ? (
                                <div>
                                    <div className="hidden border-b border-zinc-200 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400 lg:grid lg:grid-cols-[1.35fr_1.15fr_0.65fr_0.75fr_0.75fr_0.9fr]">
                                        <span>Name</span>
                                        <span>Email</span>
                                        <span>Role</span>
                                        <span>Status</span>
                                        <span>Added</span>
                                        <span>Actions</span>
                                    </div>
                                    {users.data.map((directoryUser) => (
                                        <UserListRow
                                            key={directoryUser.id}
                                            user={directoryUser}
                                            onEdit={setEditingUser}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                                    {users.data.map((directoryUser) => (
                                        <UserTile
                                            key={directoryUser.id}
                                            user={directoryUser}
                                            onEdit={setEditingUser}
                                        />
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className="p-8">
                                <div className="rounded-[1.8rem] border border-dashed border-zinc-300 bg-zinc-50 p-8 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                    No users match this filter right now.
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-4 border-t border-zinc-200 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Page {users.current_page} of {users.last_page}
                            </p>
                            <div className="flex gap-3">
                                {users.prev_page_url ? (
                                    <Link
                                        href={users.prev_page_url}
                                        preserveScroll
                                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                                    >
                                        Previous
                                    </Link>
                                ) : (
                                    <span className="rounded-full border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-600">
                                        Previous
                                    </span>
                                )}

                                {users.next_page_url ? (
                                    <Link
                                        href={users.next_page_url}
                                        preserveScroll
                                        className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
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
                </div>
            </div>

            {editingUser ? (
                <EditUserModal
                    key={editingUser.id}
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                />
            ) : null}
        </AuthenticatedLayout>
    );
}
