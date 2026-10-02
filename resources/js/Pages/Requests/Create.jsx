import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const stepFields = [
    ['provider_id', 'trade_category', 'title', 'description'],
    ['urgency', 'preferred_date', 'budget_min', 'budget_max'],
    ['city', 'area', 'location_notes'],
    [],
];

const steps = [
    {
        eyebrow: 'Step 1',
        title: 'Scope',
        helper: 'Choose the provider path and describe the job clearly.',
    },
    {
        eyebrow: 'Step 2',
        title: 'Timing',
        helper: 'Set the date, urgency, and expected budget range.',
    },
    {
        eyebrow: 'Step 3',
        title: 'Location',
        helper: 'Tell the provider where to go and what to expect.',
    },
    {
        eyebrow: 'Step 4',
        title: 'Review',
        helper: 'Confirm the request before sending it.',
    },
];

function fieldHasError(errors, fields) {
    return fields.some((field) => Boolean(errors[field]));
}

function displayValue(value, fallback = 'Not set') {
    return value || fallback;
}

function formatBudget(minimum, maximum) {
    if (!minimum && !maximum) {
        return 'Open';
    }

    return `$${minimum || 0} - ${maximum ? `$${maximum}` : 'open'}`;
}

function FieldGroup({ label, children, error }) {
    return (
        <div>
            <InputLabel value={label} />
            <div className="mt-2">{children}</div>
            <InputError message={error} className="mt-2" />
        </div>
    );
}

function SelectInput({ value, onChange, children }) {
    return (
        <select
            value={value}
            onChange={onChange}
            className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
        >
            {children}
        </select>
    );
}

function SummaryRow({ label, value }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 py-3 last:border-b-0 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                {label}
            </p>
            <p className="max-w-[12rem] text-right text-sm font-semibold text-zinc-950 dark:text-white">
                {value}
            </p>
        </div>
    );
}

export default function Create({
    tradeCategories,
    urgencyOptions,
    providers,
    defaultValues,
    sourceRequest,
    lockedProvider = false,
}) {
    const [activeStep, setActiveStep] = useState(0);
    const [clientErrors, setClientErrors] = useState({});
    const { data, setData, post, processing, errors } = useForm({
        source_job_request_id: defaultValues.sourceJobRequestId ?? '',
        provider_id: defaultValues.providerId ?? '',
        trade_category: defaultValues.tradeCategory ?? '',
        title: defaultValues.title ?? '',
        description: defaultValues.description ?? '',
        urgency: defaultValues.urgency ?? 'flexible',
        preferred_date: defaultValues.preferredDate ?? '',
        budget_min: defaultValues.budgetMin ?? '',
        budget_max: defaultValues.budgetMax ?? '',
        city: defaultValues.city ?? '',
        area: defaultValues.area ?? '',
        location_notes: defaultValues.locationNotes ?? '',
    });

    const selectedProvider = providers.find(
        (provider) => String(provider.id) === String(data.provider_id),
    );

    const selectedProviderTradeCategories =
        selectedProvider?.tradeCategories?.length > 0
            ? selectedProvider.tradeCategories
            : selectedProvider?.category
              ? [selectedProvider.category]
              : [];

    const providerRestrictsTrade =
        Boolean(selectedProvider) && selectedProviderTradeCategories.length > 0;

    const tradeCategoryOptions = providerRestrictsTrade
        ? selectedProviderTradeCategories
        : tradeCategories;

    const tradeCategoryLocked =
        Boolean(selectedProvider) && selectedProviderTradeCategories.length <= 1;

    const urgencyLabel =
        urgencyOptions.find((option) => option.value === data.urgency)?.label ??
        data.urgency;

    const budgetLabel = formatBudget(data.budget_min, data.budget_max);

    const locationLabel = [data.area, data.city].filter(Boolean).join(', ');

    const combinedErrors = {
        ...errors,
        ...clientErrors,
    };

    const setField = (field, value) => {
        setData(field, value);

        if (clientErrors[field]) {
            setClientErrors((current) => {
                const updated = { ...current };
                delete updated[field];

                return updated;
            });
        }
    };

    const getStepErrors = (stepIndex) => {
        const stepErrors = {};

        if (stepIndex === 0) {
            if (!data.trade_category) {
                stepErrors.trade_category = 'Choose a trade category.';
            }

            if (!data.title.trim()) {
                stepErrors.title = 'Enter a request title before continuing.';
            }

            if (!data.description.trim()) {
                stepErrors.description = 'Describe the work before continuing.';
            }
        }

        if (stepIndex === 1) {
            if (!data.urgency) {
                stepErrors.urgency = 'Choose an urgency level.';
            }

            if (!data.preferred_date) {
                stepErrors.preferred_date = 'Choose a preferred service date.';
            }

            if (
                data.budget_min &&
                data.budget_max &&
                Number(data.budget_max) < Number(data.budget_min)
            ) {
                stepErrors.budget_max =
                    'Maximum budget must be greater than or equal to the minimum.';
            }
        }

        if (stepIndex === 2 && !data.city.trim()) {
            stepErrors.city = 'Enter the city for this request.';
        }

        return stepErrors;
    };

    const validateStep = (stepIndex) => {
        const stepErrors = getStepErrors(stepIndex);
        const fields = stepFields[stepIndex];

        setClientErrors((current) => {
            const updated = { ...current };

            fields.forEach((field) => {
                delete updated[field];
            });

            return {
                ...updated,
                ...stepErrors,
            };
        });

        return Object.keys(stepErrors).length === 0;
    };

    const validateBeforeSubmit = () => {
        const allErrors = {};
        let firstErrorStep = -1;

        stepFields.forEach((_, index) => {
            const stepErrors = getStepErrors(index);

            if (Object.keys(stepErrors).length && firstErrorStep === -1) {
                firstErrorStep = index;
            }

            Object.assign(allErrors, stepErrors);
        });

        setClientErrors(allErrors);

        if (firstErrorStep >= 0) {
            setActiveStep(firstErrorStep);

            return false;
        }

        return true;
    };

    useEffect(() => {
        const firstErrorStep = stepFields.findIndex((fields) =>
            fieldHasError(combinedErrors, fields),
        );

        if (firstErrorStep >= 0) {
            setActiveStep(firstErrorStep);
        }
    }, [errors]);

    useEffect(() => {
        if (!providerRestrictsTrade) {
            return;
        }

        if (!selectedProviderTradeCategories.includes(data.trade_category)) {
            setField('trade_category', selectedProviderTradeCategories[0] ?? '');
        }
    }, [data.provider_id]);

    const submit = (event) => {
        event.preventDefault();

        if (!validateBeforeSubmit()) {
            return;
        }

        post(route('requests.store'));
    };

    const goNext = () => {
        if (!validateStep(activeStep)) {
            return;
        }

        setActiveStep((current) => Math.min(current + 1, steps.length - 1));
    };

    const goBack = () => {
        setActiveStep((current) => Math.max(current - 1, 0));
    };

    const backHref = sourceRequest
        ? route('requests.show', sourceRequest.id)
        : route('dashboard');

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Customer request flow
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        {sourceRequest ? 'Create follow-up request' : 'Post a job request'}
                    </h2>
                </div>
            }
        >
            <Head title="New Job Request" />

            <div className="py-10 dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_34%),#050505]">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-8">
                    <section className="rounded-[2.2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_24px_70px_rgba(0,0,0,0.46)] sm:p-8">
                        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    {sourceRequest ? 'Follow-up request' : 'Guided request'}
                                </p>
                                <h3 className="mt-3 font-display text-4xl font-semibold text-zinc-950 dark:text-white">
                                    {steps[activeStep].title}
                                </h3>
                                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                    {steps[activeStep].helper}
                                </p>
                            </div>

                            <Link
                                href={backHref}
                                className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                            >
                                {sourceRequest ? 'Back to source' : 'Back to dashboard'}
                            </Link>
                        </div>

                        <div className="mt-8 grid gap-3 sm:grid-cols-4">
                            {steps.map((step, index) => {
                                const isActive = activeStep === index;
                                const hasErrors = fieldHasError(
                                    combinedErrors,
                                    stepFields[index],
                                );

                                return (
                                    <button
                                        key={step.title}
                                        type="button"
                                        onClick={() => {
                                            if (index <= activeStep) {
                                                setActiveStep(index);

                                                return;
                                            }

                                            if (validateStep(activeStep)) {
                                                setActiveStep((current) =>
                                                    Math.min(current + 1, index),
                                                );
                                            }
                                        }}
                                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                                            isActive
                                                ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                                : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 dark:hover:border-white/20 dark:hover:bg-white/[0.07]'
                                        }`}
                                    >
                                        <span className="block text-[10px] font-semibold uppercase tracking-[0.22em]">
                                            {hasErrors ? 'Needs fix' : step.eyebrow}
                                        </span>
                                        <span className="mt-1 block font-display text-lg font-semibold">
                                            {step.title}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {Object.keys(combinedErrors).length ? (
                            <div className="mt-6 rounded-2xl border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
                                Some details need attention before the request can be sent.
                            </div>
                        ) : null}

                        <form onSubmit={submit} className="mt-8">
                            {activeStep === 0 ? (
                                <div className="space-y-6">
                                    {!lockedProvider ? (
                                        <FieldGroup
                                            label="Target provider"
                                            error={combinedErrors.provider_id}
                                        >
                                            <SelectInput
                                                value={data.provider_id}
                                                onChange={(event) =>
                                                    setField(
                                                        'provider_id',
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Open request - no provider yet
                                                </option>
                                                {providers.map((provider) => (
                                                    <option
                                                        key={provider.id}
                                                        value={provider.id}
                                                    >
                                                        {provider.businessName} - {provider.category}
                                                    </option>
                                                ))}
                                            </SelectInput>
                                        </FieldGroup>
                                    ) : null}

                                    <FieldGroup
                                        label="Trade category"
                                        error={combinedErrors.trade_category}
                                    >
                                        {tradeCategoryLocked ? (
                                            <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                                                <span className="font-semibold text-zinc-950 dark:text-white">
                                                    {data.trade_category ||
                                                        selectedProviderTradeCategories[0] ||
                                                        'No verified trade listed'}
                                                </span>
                                                <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
                                                    Locked
                                                </span>
                                            </div>
                                        ) : (
                                            <SelectInput
                                                value={data.trade_category}
                                                onChange={(event) =>
                                                    setField(
                                                        'trade_category',
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    {providerRestrictsTrade
                                                        ? 'Select one of this provider\'s trades'
                                                        : 'Select a category'}
                                                </option>
                                                {tradeCategoryOptions.map((category) => (
                                                    <option key={category} value={category}>
                                                        {category}
                                                    </option>
                                                ))}
                                            </SelectInput>
                                        )}
                                    </FieldGroup>

                                    <FieldGroup
                                        label="Request title"
                                        error={combinedErrors.title}
                                    >
                                        <TextInput
                                            value={data.title}
                                            onChange={(event) =>
                                                setField('title', event.target.value)
                                            }
                                            className="block w-full"
                                            placeholder="Example: Need urgent bathroom pipe repair"
                                        />
                                    </FieldGroup>

                                    <FieldGroup
                                        label="Describe the work"
                                        error={combinedErrors.description}
                                    >
                                        <textarea
                                            value={data.description}
                                            onChange={(event) =>
                                                setField(
                                                    'description',
                                                    event.target.value,
                                                )
                                            }
                                            rows={6}
                                            className="block w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                            placeholder="What happened, what needs fixing, and what outcome do you expect?"
                                        />
                                    </FieldGroup>
                                </div>
                            ) : null}

                            {activeStep === 1 ? (
                                <div className="space-y-6">
                                    <div className="grid gap-5 md:grid-cols-2">
                                        <FieldGroup
                                            label="Urgency"
                                            error={combinedErrors.urgency}
                                        >
                                            <SelectInput
                                                value={data.urgency}
                                                onChange={(event) =>
                                                    setField('urgency', event.target.value)
                                                }
                                            >
                                                {urgencyOptions.map((option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </SelectInput>
                                        </FieldGroup>

                                        <FieldGroup
                                            label="Preferred service date"
                                            error={combinedErrors.preferred_date}
                                        >
                                            <TextInput
                                                type="date"
                                                min={new Date().toISOString().slice(0, 10)}
                                                value={data.preferred_date}
                                                onChange={(event) =>
                                                    setField(
                                                        'preferred_date',
                                                        event.target.value,
                                                    )
                                                }
                                                className="block w-full"
                                            />
                                        </FieldGroup>
                                    </div>

                                    <div className="grid gap-5 md:grid-cols-2">
                                        <FieldGroup
                                            label="Minimum budget"
                                            error={combinedErrors.budget_min}
                                        >
                                            <TextInput
                                                type="number"
                                                min="0"
                                                value={data.budget_min}
                                                onChange={(event) =>
                                                    setField('budget_min', event.target.value)
                                                }
                                                className="block w-full"
                                                placeholder="Optional"
                                            />
                                        </FieldGroup>

                                        <FieldGroup
                                            label="Maximum budget"
                                            error={combinedErrors.budget_max}
                                        >
                                            <TextInput
                                                type="number"
                                                min="0"
                                                value={data.budget_max}
                                                onChange={(event) =>
                                                    setField('budget_max', event.target.value)
                                                }
                                                className="block w-full"
                                                placeholder="Optional"
                                            />
                                        </FieldGroup>
                                    </div>
                                </div>
                            ) : null}

                            {activeStep === 2 ? (
                                <div className="space-y-6">
                                    <div className="grid gap-5 md:grid-cols-2">
                                        <FieldGroup
                                            label="City"
                                            error={combinedErrors.city}
                                        >
                                            <TextInput
                                                value={data.city}
                                                onChange={(event) =>
                                                    setField('city', event.target.value)
                                                }
                                                className="block w-full"
                                            />
                                        </FieldGroup>

                                        <FieldGroup
                                            label="Area or suburb"
                                            error={combinedErrors.area}
                                        >
                                            <TextInput
                                                value={data.area}
                                                onChange={(event) =>
                                                    setField('area', event.target.value)
                                                }
                                                className="block w-full"
                                            />
                                        </FieldGroup>
                                    </div>

                                    <FieldGroup
                                        label="Access and arrival notes"
                                        error={combinedErrors.location_notes}
                                    >
                                        <textarea
                                            value={data.location_notes}
                                            onChange={(event) =>
                                                setField(
                                                    'location_notes',
                                                    event.target.value,
                                                )
                                            }
                                            rows={5}
                                            className="block w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                            placeholder="Gate code, landmark, parking notes, or the best way to reach you on arrival."
                                        />
                                    </FieldGroup>
                                </div>
                            ) : null}

                            {activeStep === 3 ? (
                                <div className="space-y-4">
                                    <div className="rounded-[1.8rem] border border-zinc-200 bg-zinc-50/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                                            Provider path
                                        </p>
                                        <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                            {selectedProvider?.businessName ??
                                                'Open request'}
                                        </p>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                Scope
                                            </p>
                                            <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                                                {displayValue(data.title)}
                                            </p>
                                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                {displayValue(data.trade_category)}
                                            </p>
                                        </div>
                                        <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                                Timing and budget
                                            </p>
                                            <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                                                {displayValue(data.preferred_date)}
                                            </p>
                                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                {urgencyLabel} / {budgetLabel}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-[1.8rem] border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                            Location
                                        </p>
                                        <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                                            {displayValue(locationLabel)}
                                        </p>
                                        {data.location_notes ? (
                                            <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                {data.location_notes}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}

                            <div className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                                <button
                                    type="button"
                                    onClick={goBack}
                                    disabled={activeStep === 0}
                                    className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                                >
                                    Back
                                </button>

                                {activeStep < steps.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    >
                                        Continue
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    >
                                        {processing
                                            ? 'Sending...'
                                            : sourceRequest
                                              ? 'Create follow-up'
                                              : 'Post request'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>

                    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                        {sourceRequest ? (
                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.42)]">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Source request
                                </p>
                                <h4 className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                    {sourceRequest.title}
                                </h4>
                                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                    {sourceRequest.providerLabel}
                                </p>
                                <span className="mt-5 inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                    {sourceRequest.status.replace(/_/g, ' ')}
                                </span>
                            </div>
                        ) : null}

                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 text-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:text-white dark:shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-500">
                                Live request summary
                            </p>
                            <h4 className="mt-3 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                {data.title || 'Untitled request'}
                            </h4>
                            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                {data.description
                                    ? data.description.slice(0, 150)
                                    : 'Add a short description so providers understand the work.'}
                            </p>

                            <div className="mt-6">
                                <SummaryRow
                                    label="Provider"
                                    value={
                                        selectedProvider?.businessName ??
                                        'Open request'
                                    }
                                />
                                <SummaryRow
                                    label="Trade"
                                    value={displayValue(data.trade_category)}
                                />
                                <SummaryRow label="Urgency" value={urgencyLabel} />
                                <SummaryRow
                                    label="Date"
                                    value={displayValue(data.preferred_date)}
                                />
                                <SummaryRow label="Budget" value={budgetLabel} />
                                <SummaryRow
                                    label="Location"
                                    value={displayValue(locationLabel)}
                                />
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.42)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                Defaults
                            </p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        Radius
                                    </p>
                                    <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                                        {defaultValues.preferredRadiusKm} km
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        Saved budget
                                    </p>
                                    <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                                        {formatBudget(
                                            defaultValues.budgetMin,
                                            defaultValues.budgetMax,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
