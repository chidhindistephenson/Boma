import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import { router, useForm, usePage } from '@inertiajs/react';

function formatMoney(value) {
    if (value === null || value === undefined || value === '') {
        return 'Custom quote';
    }

    return `From $${Number(value).toLocaleString()}`;
}

function ProviderServiceCard({ service }) {
    const { patch, data, setData, processing, errors } = useForm({
        title: service.title,
        short_description: service.shortDescription,
        price_from: service.priceFrom ?? '',
        turnaround_label: service.turnaroundLabel ?? '',
        is_featured: service.isFeatured,
        sort_order: service.sortOrder ?? 0,
    });

    const submit = (event) => {
        event.preventDefault();

        patch(route('provider.services.update', service.id), {
            preserveScroll: true,
        });
    };

    return (
        <form
            onSubmit={submit}
            className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
        >
            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <InputLabel htmlFor={`service_title_${service.id}`} value="Service title" />
                    <input
                        id={`service_title_${service.id}`}
                        type="text"
                        value={data.title}
                        onChange={(event) => setData('title', event.target.value)}
                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                    />
                    <InputError className="mt-2" message={errors.title} />
                </div>

                <div>
                    <InputLabel htmlFor={`service_turnaround_${service.id}`} value="Turnaround" />
                    <input
                        id={`service_turnaround_${service.id}`}
                        type="text"
                        value={data.turnaround_label}
                        onChange={(event) =>
                            setData('turnaround_label', event.target.value)
                        }
                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        placeholder="Same day"
                    />
                    <InputError className="mt-2" message={errors.turnaround_label} />
                </div>

                <div className="md:col-span-2">
                    <InputLabel
                        htmlFor={`service_description_${service.id}`}
                        value="Short description"
                    />
                    <textarea
                        id={`service_description_${service.id}`}
                        rows={3}
                        value={data.short_description}
                        onChange={(event) =>
                            setData('short_description', event.target.value)
                        }
                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                    />
                    <InputError className="mt-2" message={errors.short_description} />
                </div>

                <div>
                    <InputLabel htmlFor={`service_price_${service.id}`} value="Starting price" />
                    <input
                        id={`service_price_${service.id}`}
                        type="number"
                        min="0"
                        value={data.price_from}
                        onChange={(event) => setData('price_from', event.target.value)}
                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        placeholder="75"
                    />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                        {formatMoney(data.price_from)}
                    </p>
                    <InputError className="mt-2" message={errors.price_from} />
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                        <InputLabel htmlFor={`service_sort_${service.id}`} value="Sort order" />
                        <input
                            id={`service_sort_${service.id}`}
                            type="number"
                            min="0"
                            value={data.sort_order}
                            onChange={(event) => setData('sort_order', event.target.value)}
                            className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        />
                        <InputError className="mt-2" message={errors.sort_order} />
                    </div>

                    <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white">
                        <input
                            type="checkbox"
                            checked={data.is_featured}
                            onChange={(event) =>
                                setData('is_featured', event.target.checked)
                            }
                            className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-400"
                        />
                        Featured
                    </label>
                </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                    {processing ? 'Saving...' : 'Save service'}
                </button>
                <button
                    type="button"
                    onClick={() =>
                        router.delete(route('provider.services.destroy', service.id), {
                            preserveScroll: true,
                        })
                    }
                    className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                >
                    Remove
                </button>
            </div>
        </form>
    );
}

export default function ProviderServicesPanel({ services = [] }) {
    const { auth } = usePage().props;
    const isProvider = auth.user.role === 'provider';
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        short_description: '',
        price_from: '',
        turnaround_label: '',
        is_featured: false,
        sort_order: 0,
    });

    if (!isProvider) {
        return null;
    }

    const submit = (event) => {
        event.preventDefault();

        post(route('provider.services.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
            },
        });
    };

    return (
        <section className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                        Service catalog
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        Shape the public storefront customers compare
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        Add named services with pricing cues and turnaround so your
                        profile shows more than a generic bio.
                    </p>
                </div>
                <span className="rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
                    {services.length} service{services.length === 1 ? '' : 's'}
                </span>
            </div>

            {services.length ? (
                <div className="mt-6 space-y-4">
                    {services.map((service) => (
                        <ProviderServiceCard key={service.id} service={service} />
                    ))}
                </div>
            ) : (
                <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                    No services listed yet. Add at least two concrete offerings so
                    customers can tell what they can request from you.
                </div>
            )}

            <form onSubmit={submit} className="mt-6 grid gap-5 lg:grid-cols-2">
                <div>
                    <InputLabel htmlFor="new_service_title" value="Service title" />
                    <input
                        id="new_service_title"
                        type="text"
                        value={data.title}
                        onChange={(event) => setData('title', event.target.value)}
                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        placeholder="DB board rewiring"
                    />
                    <InputError className="mt-2" message={errors.title} />
                </div>

                <div>
                    <InputLabel htmlFor="new_service_turnaround" value="Turnaround" />
                    <input
                        id="new_service_turnaround"
                        type="text"
                        value={data.turnaround_label}
                        onChange={(event) =>
                            setData('turnaround_label', event.target.value)
                        }
                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        placeholder="Within 24 hours"
                    />
                    <InputError className="mt-2" message={errors.turnaround_label} />
                </div>

                <div className="lg:col-span-2">
                    <InputLabel
                        htmlFor="new_service_description"
                        value="Short description"
                    />
                    <textarea
                        id="new_service_description"
                        rows={3}
                        value={data.short_description}
                        onChange={(event) =>
                            setData('short_description', event.target.value)
                        }
                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        placeholder="What the service includes and where it is most useful."
                    />
                    <InputError className="mt-2" message={errors.short_description} />
                </div>

                <div>
                    <InputLabel htmlFor="new_service_price" value="Starting price" />
                    <input
                        id="new_service_price"
                        type="number"
                        min="0"
                        value={data.price_from}
                        onChange={(event) => setData('price_from', event.target.value)}
                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        placeholder="75"
                    />
                    <InputError className="mt-2" message={errors.price_from} />
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                        <InputLabel htmlFor="new_service_sort_order" value="Sort order" />
                        <input
                            id="new_service_sort_order"
                            type="number"
                            min="0"
                            value={data.sort_order}
                            onChange={(event) => setData('sort_order', event.target.value)}
                            className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        />
                        <InputError className="mt-2" message={errors.sort_order} />
                    </div>

                    <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white">
                        <input
                            type="checkbox"
                            checked={data.is_featured}
                            onChange={(event) =>
                                setData('is_featured', event.target.checked)
                            }
                            className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-400"
                        />
                        Featured
                    </label>
                </div>

                <div className="lg:col-span-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                        {processing ? 'Adding...' : 'Add service'}
                    </button>
                </div>
            </form>
        </section>
    );
}
