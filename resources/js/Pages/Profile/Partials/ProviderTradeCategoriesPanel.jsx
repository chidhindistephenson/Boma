import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import { router, useForm } from '@inertiajs/react';

function formatStatus(value) {
    return value ? value.replace(/_/g, ' ') : 'pending';
}

function statusClasses(status) {
    if (status === 'verified') {
        return 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950';
    }

    if (status === 'rejected') {
        return 'border-zinc-400 bg-zinc-200 text-zinc-950 dark:border-white/20 dark:bg-white/10 dark:text-white';
    }

    return 'border-zinc-300 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300';
}

export default function ProviderTradeCategoriesPanel({
    tradeCategories = [],
    availableCategories = [],
}) {
    const existingCategories = new Set(
        tradeCategories.map((category) => category.tradeCategory),
    );
    const options = availableCategories.filter(
        (category) => !existingCategories.has(category),
    );
    const { data, setData, post, processing, errors, reset } = useForm({
        trade_category: options[0] ?? '',
    });

    const submit = (event) => {
        event.preventDefault();

        post(route('provider.trade-categories.store'), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <section className="border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_50px_rgba(0,0,0,0.26)] sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                        Trade coverage
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        Verified categories
                    </h3>
                </div>
                <span className="border border-zinc-300 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
                    {tradeCategories.filter((category) => category.verificationStatus === 'verified').length} verified
                </span>
            </div>

            {tradeCategories.length ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {tradeCategories.map((category) => (
                        <article
                            key={category.id}
                            className="border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.035]"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h4 className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                        {category.tradeCategory}
                                    </h4>
                                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        {category.verifiedAt
                                            ? `Verified ${category.verifiedAt}`
                                            : category.submittedAt
                                              ? `Submitted ${category.submittedAt}`
                                              : 'Not submitted'}
                                    </p>
                                </div>
                                <span
                                    className={`shrink-0 border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses(category.verificationStatus)}`}
                                >
                                    {formatStatus(category.verificationStatus)}
                                </span>
                            </div>

                            {category.reviewNotes ? (
                                <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                                    {category.reviewNotes}
                                </p>
                            ) : null}

                            {category.verificationStatus !== 'verified' ? (
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {category.verificationStatus === 'rejected' ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.post(
                                                    route('provider.trade-categories.store'),
                                                    {
                                                        trade_category:
                                                            category.tradeCategory,
                                                    },
                                                    { preserveScroll: true },
                                                )
                                            }
                                            className="border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Resubmit
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.delete(
                                                route(
                                                    'provider.trade-categories.destroy',
                                                    category.id,
                                                ),
                                                { preserveScroll: true },
                                            )
                                        }
                                        className="border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : null}
                        </article>
                    ))}
                </div>
            ) : (
                <div className="mt-6 border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/[0.035] dark:text-zinc-400">
                    Add at least one trade category for admin verification.
                </div>
            )}

            {options.length ? (
                <form onSubmit={submit} className="mt-6 grid gap-4 border-t border-zinc-200 pt-6 dark:border-white/10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div>
                        <InputLabel htmlFor="trade_category" value="Add another trade" />
                        <select
                            id="trade_category"
                            value={data.trade_category}
                            onChange={(event) =>
                                setData('trade_category', event.target.value)
                            }
                            className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                            required
                        >
                            {options.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                        <InputError className="mt-2" message={errors.trade_category} />
                    </div>
                    <button
                        type="submit"
                        disabled={processing || !data.trade_category}
                        className="bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                        {processing ? 'Adding...' : 'Add trade'}
                    </button>
                </form>
            ) : null}
        </section>
    );
}
