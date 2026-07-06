import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function formatStatus(value) {
    return value ? value.replace(/_/g, ' ') : 'not set';
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

function UserModerationCard({ user }) {
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

    return (
        <article className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                            {formatStatus(user.role)}
                        </span>
                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                            {formatStatus(user.status)}
                        </span>
                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                            {user.emailVerified ? 'email verified' : 'email pending'}
                        </span>
                        {user.isSuspended ? (
                            <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                suspended
                            </span>
                        ) : null}
                    </div>

                    <h3 className="mt-4 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                        {user.name}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        {user.email} / {user.phone}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        {user.locationLabel || 'Location pending'}
                    </p>
                </div>

                {user.providerBusinessName ? (
                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Provider profile
                        </p>
                        <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                            {user.providerBusinessName}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {user.providerTradeCategory || 'Trade pending'}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            {formatStatus(
                                user.providerVerificationStatus ?? 'pending',
                            )}
                        </p>
                    </div>
                ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Customer requests
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {user.customerRequestCount}
                    </p>
                </div>
                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Provider requests
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {user.providerRequestCount}
                    </p>
                </div>
                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Saved shortlist
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {user.shortlistedProvidersCount}
                    </p>
                </div>
                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Added to Boma
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {user.createdAt}
                    </p>
                </div>
            </div>

            {user.isSuspended ? (
                <div className="mt-6 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Suspension context
                    </p>
                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        {user.suspensionReason || 'No suspension reason recorded.'}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        {user.suspendedAt
                            ? `Suspended ${user.suspendedAt}${
                                  user.suspendedByName
                                      ? ` by ${user.suspendedByName}`
                                      : ''
                              }`
                            : 'Suspension timestamp unavailable'}
                    </p>
                </div>
            ) : null}

            {user.canSuspend || user.canRestore ? (
                <div className="mt-6 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <label
                        htmlFor={`reason_${user.id}`}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400"
                    >
                        Moderation note
                    </label>
                    <textarea
                        id={`reason_${user.id}`}
                        rows={4}
                        value={data.reason}
                        onChange={(event) =>
                            setData('reason', event.target.value)
                        }
                        className="mt-3 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        placeholder="Explain why this account is being suspended or what cleared it for restoration."
                    />
                    <InputError className="mt-2" message={errors.reason} />

                    <div className="mt-6 flex flex-wrap gap-3">
                        {user.canSuspend ? (
                            <button
                                type="button"
                                onClick={() => submit('suspend')}
                                disabled={processing}
                                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                            >
                                {processing ? 'Saving...' : 'Suspend account'}
                            </button>
                        ) : null}

                        {user.canRestore ? (
                            <button
                                type="button"
                                onClick={() => submit('restore')}
                                disabled={processing}
                                className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                            >
                                {processing ? 'Saving...' : 'Restore account'}
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </article>
    );
}

export default function Index({ filters, users, summary }) {
    const [form, setForm] = useState({
        q: filters.q,
        role: filters.role,
        accountStatus: filters.accountStatus,
        suspension: filters.suspension,
    });

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

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Total users
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.totalUsers}
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Customers
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.customers}
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Providers
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.providers}
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Admins
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.admins}
                            </p>
                        </div>
                        <div className="rounded-[1.6rem] border border-zinc-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-zinc-950/82">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                Suspended
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {summary.suspendedUsers}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                        <aside className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                Filters
                            </p>
                            <h3 className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                Narrow the operational view.
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
                                        placeholder="Name, email, phone, business"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
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
                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                    >
                                        <option value="all">All roles</option>
                                        <option value="customer">Customer</option>
                                        <option value="provider">Provider</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                        Account state
                                    </label>
                                    <select
                                        value={form.accountStatus}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                accountStatus: event.target.value,
                                            }))
                                        }
                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                    >
                                        <option value="all">All states</option>
                                        <option value="active">Active</option>
                                        <option value="pending_verification">
                                            Pending verification
                                        </option>
                                        <option value="verification_rejected">
                                            Verification rejected
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
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
                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                    >
                                        <option value="all">All accounts</option>
                                        <option value="clear">Not suspended</option>
                                        <option value="suspended">Suspended only</option>
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
                            {users.data.length ? (
                                <>
                                    <div className="space-y-6">
                                        {users.data.map((user) => (
                                            <UserModerationCard
                                                key={user.id}
                                                user={user}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/88 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                            Page {users.current_page} of{' '}
                                            {users.last_page}
                                        </p>

                                        <div className="flex gap-3">
                                            {users.prev_page_url ? (
                                                <Link
                                                    href={users.prev_page_url}
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

                                            {users.next_page_url ? (
                                                <Link
                                                    href={users.next_page_url}
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
                                <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-8 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                    No users match this filter right now.
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
