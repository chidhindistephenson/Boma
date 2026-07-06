import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Create({
    tradeCategories,
    urgencyOptions,
    providers,
    defaultValues,
    sourceRequest,
}) {
    const { data, setData, post, processing, errors } = useForm({
        source_job_request_id: defaultValues.sourceJobRequestId ?? '',
        provider_id: defaultValues.providerId ?? '',
        trade_category: defaultValues.tradeCategory ?? '',
        title: defaultValues.title ?? '',
        description: defaultValues.description ?? '',
        urgency: defaultValues.urgency ?? 'flexible',
        budget_min: defaultValues.budgetMin ?? '',
        budget_max: defaultValues.budgetMax ?? '',
        city: defaultValues.city ?? '',
        area: defaultValues.area ?? '',
        location_notes: defaultValues.locationNotes ?? '',
    });

    const selectedProvider = providers.find(
        (provider) => String(provider.id) === String(data.provider_id),
    );

    const submit = (event) => {
        event.preventDefault();
        post(route('requests.store'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Request builder
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        Post a job request
                    </h2>
                </div>
            }
        >
            <Head title="New Job Request" />

            <div className="py-12">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
                    <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                            {sourceRequest ? 'Follow-up request' : 'Scope the work'}
                        </p>
                        <h3 className="mt-3 font-display text-4xl font-semibold text-zinc-950 dark:text-white">
                            {sourceRequest
                                ? 'Start a fresh thread from an existing request.'
                                : 'Turn your need into a structured request.'}
                        </h3>
                        <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-400">
                            {sourceRequest
                                ? 'The original request stays intact. This new request copies the scope so you can target a different provider or restart the work cleanly.'
                                : 'You can target one shortlisted provider directly or leave the request open so the scope is captured first and you can branch into a fresh follow-up thread when you are ready.'}
                        </p>

                        <form onSubmit={submit} className="mt-8 space-y-6">
                            <div>
                                <InputLabel value="Target provider" />
                                <select
                                    value={data.provider_id}
                                    onChange={(event) =>
                                        setData('provider_id', event.target.value)
                                    }
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                >
                                    <option value="">Open request - no provider yet</option>
                                    {providers.map((provider) => (
                                        <option key={provider.id} value={provider.id}>
                                            {provider.businessName} - {provider.category}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.provider_id} className="mt-2" />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <InputLabel value="Trade category" />
                                    <select
                                        value={data.trade_category}
                                        onChange={(event) =>
                                            setData('trade_category', event.target.value)
                                        }
                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                    >
                                        <option value="">Select a category</option>
                                        {tradeCategories.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.trade_category} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel value="Urgency" />
                                    <select
                                        value={data.urgency}
                                        onChange={(event) =>
                                            setData('urgency', event.target.value)
                                        }
                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                    >
                                        {urgencyOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.urgency} className="mt-2" />
                                </div>
                            </div>

                            <div>
                                <InputLabel value="Request title" />
                                <TextInput
                                    value={data.title}
                                    onChange={(event) => setData('title', event.target.value)}
                                    className="mt-2 block w-full"
                                    placeholder="Example: Need urgent bathroom pipe repair"
                                />
                                <InputError message={errors.title} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel value="Describe the work" />
                                <textarea
                                    value={data.description}
                                    onChange={(event) =>
                                        setData('description', event.target.value)
                                    }
                                    rows={6}
                                    className="mt-2 block w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                    placeholder="Explain the issue, expected outcome, access constraints, or anything else a provider should know."
                                />
                                <InputError message={errors.description} className="mt-2" />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <InputLabel value="Minimum budget" />
                                    <TextInput
                                        type="number"
                                        min="0"
                                        value={data.budget_min}
                                        onChange={(event) =>
                                            setData('budget_min', event.target.value)
                                        }
                                        className="mt-2 block w-full"
                                        placeholder="Optional"
                                    />
                                    <InputError message={errors.budget_min} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel value="Maximum budget" />
                                    <TextInput
                                        type="number"
                                        min="0"
                                        value={data.budget_max}
                                        onChange={(event) =>
                                            setData('budget_max', event.target.value)
                                        }
                                        className="mt-2 block w-full"
                                        placeholder="Optional"
                                    />
                                    <InputError message={errors.budget_max} className="mt-2" />
                                </div>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <InputLabel value="City" />
                                    <TextInput
                                        value={data.city}
                                        onChange={(event) => setData('city', event.target.value)}
                                        className="mt-2 block w-full"
                                    />
                                    <InputError message={errors.city} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel value="Area or suburb" />
                                    <TextInput
                                        value={data.area}
                                        onChange={(event) => setData('area', event.target.value)}
                                        className="mt-2 block w-full"
                                    />
                                    <InputError message={errors.area} className="mt-2" />
                                </div>
                            </div>

                            <div>
                                <InputLabel value="Access and arrival notes" />
                                <textarea
                                    value={data.location_notes}
                                    onChange={(event) =>
                                        setData(
                                            'location_notes',
                                            event.target.value,
                                        )
                                    }
                                    rows={4}
                                    className="mt-2 block w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                    placeholder="Gate code, landmark, parking notes, or the best way to reach you on arrival."
                                />
                                <InputError
                                    message={errors.location_notes}
                                    className="mt-2"
                                />
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                    {processing
                                        ? 'Sending...'
                                        : sourceRequest
                                          ? 'Create follow-up request'
                                          : 'Post request'}
                                </button>
                                <Link
                                    href={
                                        sourceRequest
                                            ? route(
                                                  'requests.show',
                                                  sourceRequest.id,
                                              )
                                            : route('dashboard')
                                    }
                                    className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                >
                                    {sourceRequest
                                        ? 'Back to source request'
                                        : 'Back to dashboard'}
                                </Link>
                            </div>
                        </form>
                    </div>

                    <div className="space-y-6">
                        {sourceRequest ? (
                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Source request
                                </p>
                                <h4 className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                    {sourceRequest.title}
                                </h4>
                                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                    {sourceRequest.providerLabel}
                                </p>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                        {sourceRequest.status.replace(
                                            /_/g,
                                            ' ',
                                        )}
                                    </span>
                                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                        Created {sourceRequest.createdAt}
                                    </span>
                                </div>
                                <p className="mt-5 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                    Use this follow-up when the work needs a fresh provider, a restarted negotiation, or a clean new thread without carrying old messages into the next step.
                                </p>
                            </div>
                        ) : null}

                        <div className="rounded-[2rem] border border-zinc-200/80 bg-zinc-950 p-8 text-white shadow-[0_30px_80px_rgba(0,0,0,0.22)] dark:border-white/10 dark:bg-white dark:text-zinc-950">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-600">
                                Request defaults
                            </p>
                            <div className="mt-6 space-y-4">
                                {selectedProvider ? (
                                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="font-display text-2xl font-semibold text-white dark:text-zinc-950">
                                            {selectedProvider.businessName}
                                        </p>
                                        <p className="mt-2 text-sm text-white/75 dark:text-zinc-600">
                                            {selectedProvider.category}
                                        </p>
                                        <p className="mt-4 text-sm text-white/85 dark:text-zinc-700">
                                            {selectedProvider.locationLabel || 'Location pending'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5 text-sm leading-7 text-white/85 dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-700">
                                        No provider selected yet. Leave the request open if
                                        you want to lock the scope first and create a targeted
                                        follow-up once you decide who should take it.
                                    </div>
                                )}

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Preferred radius
                                        </p>
                                        <p className="mt-2 text-base font-medium text-white dark:text-zinc-950">
                                            {defaultValues.preferredRadiusKm} km
                                        </p>
                                    </div>
                                    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Saved budget
                                        </p>
                                        <p className="mt-2 text-base font-medium text-white dark:text-zinc-950">
                                            {defaultValues.budgetMin || defaultValues.budgetMax
                                                ? `${defaultValues.budgetMin ?? 0} - ${defaultValues.budgetMax ?? 'open'}`
                                                : 'Not set'}
                                        </p>
                                    </div>
                                </div>

                                {defaultValues.locationNotes ? (
                                    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-white/85 dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-700">
                                        {defaultValues.locationNotes}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                Guidance
                            </p>
                            <ul className="mt-5 space-y-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                <li>Use a specific title so providers understand the scope at a glance.</li>
                                <li>Explain the issue, location context, and whether materials are already available.</li>
                                <li>Targeting a provider sends a more directed signal than leaving the request open.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
