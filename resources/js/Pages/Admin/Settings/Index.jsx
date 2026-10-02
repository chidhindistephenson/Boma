import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import { Head, router, useForm } from '@inertiajs/react';

function PlanForm({ plan, currencyOptions }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: plan.name,
        description: plan.description ?? '',
        price: plan.price,
        currency: plan.currency,
        billing_interval: plan.billingInterval,
        trial_days: plan.trialDays,
        service_limit: plan.serviceLimit,
        portfolio_limit: plan.portfolioLimit,
        featured_service_limit: plan.featuredServiceLimit,
        trade_category_limit: plan.tradeCategoryLimit,
        has_premium_analytics: plan.hasPremiumAnalytics,
        is_active: plan.isActive,
        sort_order: plan.sortOrder,
    });

    const submit = (event) => {
        event.preventDefault();
        patch(route('admin.settings.plans.update', plan.id), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                        {plan.code}
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        {plan.name}
                    </h3>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    <input
                        type="checkbox"
                        checked={data.is_active}
                        onChange={(event) => setData('is_active', event.target.checked)}
                    />
                    Active
                </label>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Name
                    <input className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm normal-case tracking-normal text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white" value={data.name} onChange={(event) => setData('name', event.target.value)} />
                    <InputError className="mt-2" message={errors.name} />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Price
                    <input type="number" min="0" className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm normal-case tracking-normal text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white" value={data.price} onChange={(event) => setData('price', event.target.value)} />
                    <InputError className="mt-2" message={errors.price} />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Currency
                    <select className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm normal-case tracking-normal text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white" value={data.currency} onChange={(event) => setData('currency', event.target.value)}>
                        {Object.entries(currencyOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <InputError className="mt-2" message={errors.currency} />
                </label>
                <label className="md:col-span-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Description
                    <textarea rows="2" className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm normal-case tracking-normal text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white" value={data.description} onChange={(event) => setData('description', event.target.value)} />
                    <InputError className="mt-2" message={errors.description} />
                </label>
                {[
                    ['trial_days', 'Trial days'],
                    ['service_limit', 'Services'],
                    ['portfolio_limit', 'Portfolio'],
                    ['featured_service_limit', 'Featured'],
                    ['trade_category_limit', 'Trades'],
                    ['sort_order', 'Sort'],
                ].map(([key, label]) => (
                    <label key={key} className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                        {label}
                        <input type="number" min="0" className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm normal-case tracking-normal text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white" value={data[key]} onChange={(event) => setData(key, event.target.value)} />
                        <InputError className="mt-2" message={errors[key]} />
                    </label>
                ))}
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    <input
                        type="checkbox"
                        checked={data.has_premium_analytics}
                        onChange={(event) => setData('has_premium_analytics', event.target.checked)}
                    />
                    Premium analytics
                </label>
            </div>

            <button type="submit" disabled={processing} className="mt-5 rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950">
                {processing ? 'Saving...' : 'Save plan'}
            </button>
        </form>
    );
}

export default function Index({ settings, plans, currencyOptions }) {
    const { data, setData, patch, processing, errors } = useForm({
        default_search_radius_km: settings.defaultSearchRadiusKm,
        featured_slots: settings.featuredSlots,
    });

    const exportReport = (report) => {
        window.location.href = route('admin.reports.export', report);
    };

    const submit = (event) => {
        event.preventDefault();
        patch(route('admin.settings.update'), { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Admin operations
                    </p>
                    <h2 className="font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                        System settings
                    </h2>
                </div>
            }
        >
            <Head title="System Settings" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <form onSubmit={submit} className="rounded-[2rem] border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                            Discovery defaults
                        </p>
                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                Default search radius
                                <input type="number" min="1" max="250" value={data.default_search_radius_km} onChange={(event) => setData('default_search_radius_km', event.target.value)} className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm normal-case tracking-normal text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white" />
                                <InputError className="mt-2" message={errors.default_search_radius_km} />
                            </label>
                            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                Featured slots
                                <input type="number" min="0" value={data.featured_slots} onChange={(event) => setData('featured_slots', event.target.value)} className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm normal-case tracking-normal text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white" />
                                <InputError className="mt-2" message={errors.featured_slots} />
                            </label>
                            <button type="submit" disabled={processing} className="self-end rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950">
                                Save settings
                            </button>
                        </div>
                    </form>

                    <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                            Admin exports
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            {[
                                ['subscriptions', 'Subscriptions'],
                                ['provider-performance', 'Provider performance'],
                                ['user-growth', 'User growth'],
                            ].map(([report, label]) => (
                                <button key={report} type="button" onClick={() => exportReport(report)} className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-800 transition hover:border-zinc-950 dark:border-white/10 dark:text-zinc-200 dark:hover:border-white/40">
                                    Export {label}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        {plans.map((plan) => (
                            <PlanForm key={plan.id} plan={plan} currencyOptions={currencyOptions} />
                        ))}
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
