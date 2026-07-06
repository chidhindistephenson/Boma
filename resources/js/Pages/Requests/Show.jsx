import ApplicationLogo from '@/Components/ApplicationLogo';
import InputError from '@/Components/InputError';
import ThemeToggle from '@/Components/ThemeToggle';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function formatStatus(value) {
    return value.replace(/_/g, ' ');
}

function formatRating(value) {
    return `${value}/5`;
}

function formatAmount(value) {
    return value ? Number(value).toLocaleString() : 'Not set';
}

function formatDateTime(value, options = {}) {
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
        timeStyle: 'short',
        ...options,
    }).format(date);
}

function roleLabel(message) {
    if (message.sender.role === 'provider' && message.sender.businessName) {
        return message.sender.businessName;
    }

    return message.sender.name;
}

function quoteStatusBody(status) {
    if (status === 'accepted') {
        return 'This quote has been accepted and now anchors the commercial side of the request.';
    }

    if (status === 'declined') {
        return 'This quote was declined. The provider can revise the scope, amount, or timing and resend it.';
    }

    return 'This quote is live and waiting for the customer to either accept it or send it back.';
}

function scheduleStatusBody(status) {
    if (status === 'confirmed') {
        return 'The visit is confirmed. Both sides now have a shared on-site time to work against.';
    }

    if (status === 'completed') {
        return 'The provider marked the visit complete. Close the request once the whole job is fully settled.';
    }

    if (status === 'cancelled') {
        return 'The last scheduled visit was cancelled. The provider can now propose a new time.';
    }

    return 'A visit has been proposed and is waiting for customer confirmation.';
}

function paymentStatusBody(status) {
    if (status === 'confirmed') {
        return 'The provider confirmed that the payment has been received and reconciled against this request.';
    }

    if (status === 'revision_requested') {
        return 'The provider flagged the payment record for revision. Update the amount, method, timing, or reference details and resend it.';
    }

    return 'A payment has been recorded and is waiting for the provider to confirm receipt.';
}

export default function Show({ jobRequest, permissions, paymentMethodOptions }) {
    const { auth } = usePage().props;
    const isCustomer = auth.user.role === 'customer';
    const isAdmin = auth.user.role === 'admin';
    const [statusAction, setStatusAction] = useState(null);
    const [quoteAction, setQuoteAction] = useState(null);
    const [scheduleAction, setScheduleAction] = useState(null);
    const [paymentAction, setPaymentAction] = useState(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        body: '',
    });
    const {
        data: quoteData,
        setData: setQuoteData,
        put: putQuote,
        processing: quoteProcessing,
        errors: quoteErrors,
    } = useForm({
        amount: jobRequest.quote?.amount ?? '',
        timeline_days: jobRequest.quote?.timelineDays ?? '',
        summary: jobRequest.quote?.summary ?? '',
        notes: jobRequest.quote?.notes ?? '',
        valid_until: jobRequest.quote?.validUntil ?? '',
    });
    const {
        data: scheduleData,
        setData: setScheduleData,
        put: putSchedule,
        processing: scheduleProcessing,
        errors: scheduleErrors,
    } = useForm({
        scheduled_for: jobRequest.schedule?.scheduledFor
            ? jobRequest.schedule.scheduledFor.replace(' ', 'T').slice(0, 16)
            : '',
        duration_hours: jobRequest.schedule?.durationHours ?? '',
        notes: jobRequest.schedule?.notes ?? '',
    });
    const {
        data: reviewData,
        setData: setReviewData,
        put,
        processing: reviewProcessing,
        errors: reviewErrors,
    } = useForm({
        rating: jobRequest.review?.rating ?? 5,
        headline: jobRequest.review?.headline ?? '',
        body: jobRequest.review?.body ?? '',
    });
    const {
        data: paymentData,
        setData: setPaymentData,
        put: putPayment,
        processing: paymentProcessing,
        errors: paymentErrors,
    } = useForm({
        amount: jobRequest.payment?.amount ?? jobRequest.quote?.amount ?? '',
        method:
            jobRequest.payment?.method ??
            Object.keys(paymentMethodOptions ?? {})[0] ??
            'cash',
        reference: jobRequest.payment?.reference ?? '',
        notes: jobRequest.payment?.notes ?? '',
        paid_at: jobRequest.payment?.paidAt
            ? jobRequest.payment.paidAt.replace(' ', 'T').slice(0, 16)
            : '',
    });

    const submit = (event) => {
        event.preventDefault();

        post(route('requests.messages.store', jobRequest.id), {
            preserveScroll: true,
            onSuccess: () => reset('body'),
        });
    };

    const submitQuote = (event) => {
        event.preventDefault();

        putQuote(route('requests.quote.upsert', jobRequest.id), {
            preserveScroll: true,
        });
    };

    const submitSchedule = (event) => {
        event.preventDefault();

        putSchedule(route('requests.schedule.upsert', jobRequest.id), {
            preserveScroll: true,
        });
    };

    const submitReview = (event) => {
        event.preventDefault();

        put(route('requests.review.upsert', jobRequest.id), {
            preserveScroll: true,
        });
    };

    const submitPayment = (event) => {
        event.preventDefault();

        putPayment(route('requests.payment.upsert', jobRequest.id), {
            preserveScroll: true,
        });
    };

    const submitStatus = (action) => {
        setStatusAction(action);

        router.patch(
            route('requests.status.update', jobRequest.id),
            { action },
            {
                preserveScroll: true,
                onFinish: () => setStatusAction(null),
            },
        );
    };

    const submitQuoteResponse = (action) => {
        setQuoteAction(action);

        router.patch(
            route('requests.quote.status.update', jobRequest.id),
            { action },
            {
                preserveScroll: true,
                onFinish: () => setQuoteAction(null),
            },
        );
    };

    const submitScheduleStatus = (action) => {
        setScheduleAction(action);

        router.patch(
            route('requests.schedule.status.update', jobRequest.id),
            { action },
            {
                preserveScroll: true,
                onFinish: () => setScheduleAction(null),
            },
        );
    };

    const submitPaymentStatus = (action) => {
        setPaymentAction(action);

        router.patch(
            route('requests.payment.status.update', jobRequest.id),
            { action },
            {
                preserveScroll: true,
                onFinish: () => setPaymentAction(null),
            },
        );
    };

    const hasLifecycleActions =
        permissions.canAccept || permissions.canDecline || permissions.canClose;
    const showQuoteSection = Boolean(
        jobRequest.provider &&
            (jobRequest.quote ||
                isCustomer ||
                permissions.canManageQuote ||
                isAdmin),
    );
    const showScheduleSection = Boolean(
        jobRequest.provider &&
            (jobRequest.status === 'accepted' ||
                jobRequest.schedule ||
                permissions.canManageSchedule),
    );
    const showPaymentSection = Boolean(
        jobRequest.provider &&
            ((jobRequest.quote?.status === 'accepted' &&
                ['accepted', 'closed'].includes(jobRequest.status)) ||
                jobRequest.payment ||
                permissions.canManagePayment ||
                permissions.canRespondToPayment),
    );
    const showCustomerTools = Boolean(
        isCustomer && permissions.canCreateFollowUp,
    );

    return (
        <>
            <Head title={jobRequest.title} />

            <div className="relative min-h-screen overflow-hidden">
                <div className="hero-grid absolute inset-0 opacity-70 dark:opacity-100" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.08),_transparent_24%),radial-gradient(circle_at_84%_16%,_rgba(0,0,0,0.06),_transparent_20%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(244,244,245,0.92))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_24%),radial-gradient(circle_at_84%_16%,_rgba(255,255,255,0.06),_transparent_18%),linear-gradient(180deg,_rgba(9,9,11,0.97),_rgba(15,15,15,0.96))]" />

                <div className="relative mx-auto min-h-screen max-w-7xl px-6 py-8 lg:px-8">
                    <header className="grid gap-4 py-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                        <Link href={route('welcome')} className="flex items-center gap-3">
                            <ApplicationLogo className="h-11 w-11 text-zinc-950 dark:text-white" />
                            <div>
                                <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                    Boma
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Request thread
                                </p>
                            </div>
                        </Link>

                        <div className="hidden justify-center lg:flex">
                            <Link
                                href={
                                    isCustomer
                                        ? route('requests.index')
                                        : !isAdmin
                                          ? route('requests.index')
                                          : route('dashboard')
                                }
                                className="rounded-full border border-zinc-300 bg-white/80 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white dark:border-white/10 dark:bg-zinc-950/70 dark:text-white dark:hover:bg-zinc-900"
                            >
                                {isCustomer || !isAdmin
                                    ? 'Back to requests'
                                    : 'Back to dashboard'}
                            </Link>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <ThemeToggle />
                            <Link
                                href={route('dashboard')}
                                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                            >
                                Dashboard
                            </Link>
                        </div>
                    </header>

                    <main className="grid gap-6 py-10 lg:grid-cols-[1.02fr_0.98fr]">
                        <section className="space-y-6">
                            <div className="rounded-[2.2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Job request
                                </p>
                                <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-zinc-950 dark:text-white sm:text-5xl">
                                    {jobRequest.title}
                                </h1>
                                <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-400">
                                    {jobRequest.description}
                                </p>

                                <div className="mt-8 flex flex-wrap gap-2">
                                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                        {jobRequest.tradeCategory}
                                    </span>
                                    <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                        {formatStatus(jobRequest.urgency)}
                                    </span>
                                    <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                        {formatStatus(jobRequest.status)}
                                    </span>
                                    {jobRequest.quote ? (
                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                            Quote {formatStatus(jobRequest.quote.status)}
                                        </span>
                                    ) : null}
                                    {jobRequest.schedule ? (
                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                            Visit {formatStatus(jobRequest.schedule.status)}
                                        </span>
                                    ) : null}
                                    {jobRequest.payment ? (
                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                            Payment {formatStatus(jobRequest.payment.status)}
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            {showQuoteSection ? (
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Quote
                                    </p>
                                    <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {jobRequest.quote
                                            ? 'Commercial terms for this request'
                                            : permissions.canManageQuote
                                              ? 'Turn the thread into a concrete offer'
                                              : 'Waiting for the provider quote'}
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        {jobRequest.quote
                                            ? quoteStatusBody(jobRequest.quote.status)
                                            : permissions.canManageQuote
                                              ? 'Quote clearly enough that the customer can decide without needing a second clarification round.'
                                              : 'Once the provider prices the scope, you will be able to review the amount, timing, and notes here.'}
                                    </p>

                                    {jobRequest.quote ? (
                                        <div className="mt-6 space-y-5">
                                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Quote amount
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatAmount(
                                                            jobRequest.quote.amount,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Lead time
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {jobRequest.quote.timelineDays} day
                                                        {jobRequest.quote.timelineDays === 1
                                                            ? ''
                                                            : 's'}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Valid until
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {jobRequest.quote.validUntil ??
                                                            'Open'}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        State
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatStatus(
                                                            jobRequest.quote.status,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Scope summary
                                                </p>
                                                <p className="mt-3 text-base font-medium text-zinc-950 dark:text-white">
                                                    {jobRequest.quote.summary}
                                                </p>
                                                {jobRequest.quote.notes ? (
                                                    <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                        {jobRequest.quote.notes}
                                                    </p>
                                                ) : null}
                                                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    {jobRequest.quote.respondedAt
                                                        ? `Responded ${jobRequest.quote.respondedAt}`
                                                        : `Updated ${jobRequest.quote.updatedAt}`}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            {permissions.canManageQuote
                                                ? 'No quote has been sent yet. Add amount, timing, and a short scope summary below.'
                                                : 'No quote has been published on this request yet.'}
                                        </div>
                                    )}

                                    {permissions.canRespondToQuote ? (
                                        <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                Accept if the amount and timeline work for you. Declining keeps the thread open so the provider can revise the offer.
                                            </p>
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        submitQuoteResponse(
                                                            'accept',
                                                        )
                                                    }
                                                    disabled={quoteAction !== null}
                                                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                >
                                                    {quoteAction === 'accept'
                                                        ? 'Accepting...'
                                                        : 'Accept quote'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        submitQuoteResponse(
                                                            'decline',
                                                        )
                                                    }
                                                    disabled={quoteAction !== null}
                                                    className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    {quoteAction === 'decline'
                                                        ? 'Declining...'
                                                        : 'Decline quote'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}

                                    {permissions.canManageQuote ? (
                                        <form
                                            onSubmit={submitQuote}
                                            className="mt-6 space-y-5"
                                        >
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Quote amount
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={quoteData.amount}
                                                        onChange={(event) =>
                                                            setQuoteData(
                                                                'amount',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                        placeholder="e.g. 180"
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            quoteErrors.amount
                                                        }
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Lead time in days
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={
                                                            quoteData.timeline_days
                                                        }
                                                        onChange={(event) =>
                                                            setQuoteData(
                                                                'timeline_days',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                        placeholder="e.g. 3"
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            quoteErrors.timeline_days
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Scope summary
                                                </label>
                                                <input
                                                    type="text"
                                                    value={quoteData.summary}
                                                    onChange={(event) =>
                                                        setQuoteData(
                                                            'summary',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                    placeholder="Inspection, parts sourcing, installation, and testing."
                                                />
                                                <InputError
                                                    className="mt-2"
                                                    message={
                                                        quoteErrors.summary
                                                    }
                                                />
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Notes
                                                    </label>
                                                    <textarea
                                                        rows={5}
                                                        value={quoteData.notes}
                                                        onChange={(event) =>
                                                            setQuoteData(
                                                                'notes',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                        placeholder="Clarify assumptions, materials, or what could change the final amount."
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={quoteErrors.notes}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Valid until
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={
                                                            quoteData.valid_until
                                                        }
                                                        onChange={(event) =>
                                                            setQuoteData(
                                                                'valid_until',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            quoteErrors.valid_until
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={quoteProcessing}
                                                className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                            >
                                                {quoteProcessing
                                                    ? 'Saving...'
                                                    : jobRequest.quote
                                                      ? 'Update quote'
                                                      : 'Send quote'}
                                            </button>
                                        </form>
                                    ) : null}
                                </div>
                            ) : null}

                            {showScheduleSection ? (
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Visit schedule
                                    </p>
                                    <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {jobRequest.schedule
                                            ? 'Field visit timing for this accepted job'
                                            : permissions.canManageSchedule
                                              ? 'Propose the first on-site visit'
                                              : 'Waiting for the provider to schedule the visit'}
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        {jobRequest.schedule
                                            ? scheduleStatusBody(jobRequest.schedule.status)
                                            : permissions.canManageSchedule
                                              ? 'Set a concrete visit date, time, and expected duration so the customer can confirm the job window.'
                                              : 'Once the provider proposes a time, the customer will be able to confirm or reject it here.'}
                                    </p>

                                    {jobRequest.schedule ? (
                                        <div className="mt-6 space-y-5">
                                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Scheduled for
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatDateTime(jobRequest.schedule.scheduledFor)}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Duration
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {jobRequest.schedule.durationHours} hour
                                                        {jobRequest.schedule.durationHours === 1
                                                            ? ''
                                                            : 's'}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Status
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatStatus(
                                                            jobRequest.schedule.status,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Proposed by
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {jobRequest.schedule.proposedByName}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Visit notes
                                                </p>
                                                <p className="mt-3 text-base font-medium text-zinc-950 dark:text-white">
                                                    {jobRequest.schedule.notes ||
                                                        'No extra visit notes were added.'}
                                                </p>
                                                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    {jobRequest.schedule.completedAt
                                                        ? `Completed ${jobRequest.schedule.completedAt}`
                                                        : jobRequest.schedule.confirmedAt
                                                          ? `Confirmed ${jobRequest.schedule.confirmedAt}`
                                                          : jobRequest.schedule.cancelledAt
                                                            ? `Cancelled ${jobRequest.schedule.cancelledAt}`
                                                            : `Updated ${jobRequest.schedule.updatedAt}`}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            {permissions.canManageSchedule
                                                ? 'No visit has been proposed yet. Add the first slot below.'
                                                : 'No visit has been proposed on this accepted request yet.'}
                                        </div>
                                    )}

                                    {permissions.canRespondToSchedule ? (
                                        <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                Confirm the slot if it works. Cancelling sends the visit back for rescheduling.
                                            </p>
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        submitScheduleStatus(
                                                            'confirm',
                                                        )
                                                    }
                                                    disabled={scheduleAction !== null}
                                                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                >
                                                    {scheduleAction === 'confirm'
                                                        ? 'Confirming...'
                                                        : 'Confirm visit'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        submitScheduleStatus(
                                                            'cancel',
                                                        )
                                                    }
                                                    disabled={scheduleAction !== null}
                                                    className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    {scheduleAction === 'cancel'
                                                        ? 'Cancelling...'
                                                        : 'Cancel visit'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}

                                    {permissions.canCancelSchedule &&
                                    ! permissions.canRespondToSchedule ? (
                                        <div className="mt-6 flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    submitScheduleStatus(
                                                        'cancel',
                                                    )
                                                }
                                                disabled={scheduleAction !== null}
                                                className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                            >
                                                {scheduleAction === 'cancel'
                                                    ? 'Cancelling...'
                                                    : 'Cancel visit'}
                                            </button>
                                            {permissions.canCompleteSchedule ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        submitScheduleStatus(
                                                            'complete',
                                                        )
                                                    }
                                                    disabled={scheduleAction !== null}
                                                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                >
                                                    {scheduleAction === 'complete'
                                                        ? 'Marking...'
                                                        : 'Mark visit complete'}
                                                </button>
                                            ) : null}
                                        </div>
                                    ) : permissions.canCompleteSchedule ? (
                                        <div className="mt-6 flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    submitScheduleStatus(
                                                        'complete',
                                                    )
                                                }
                                                disabled={scheduleAction !== null}
                                                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                            >
                                                {scheduleAction === 'complete'
                                                    ? 'Marking...'
                                                    : 'Mark visit complete'}
                                            </button>
                                        </div>
                                    ) : null}

                                    {permissions.canManageSchedule ? (
                                        <form
                                            onSubmit={submitSchedule}
                                            className="mt-6 space-y-5"
                                        >
                                            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Scheduled start
                                                    </label>
                                                    <input
                                                        type="datetime-local"
                                                        value={
                                                            scheduleData.scheduled_for
                                                        }
                                                        onChange={(event) =>
                                                            setScheduleData(
                                                                'scheduled_for',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            scheduleErrors.scheduled_for
                                                        }
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Duration in hours
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="24"
                                                        value={
                                                            scheduleData.duration_hours
                                                        }
                                                        onChange={(event) =>
                                                            setScheduleData(
                                                                'duration_hours',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                        placeholder="e.g. 2"
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            scheduleErrors.duration_hours
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Visit notes
                                                </label>
                                                <textarea
                                                    rows={4}
                                                    value={scheduleData.notes}
                                                    onChange={(event) =>
                                                        setScheduleData(
                                                            'notes',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="mt-2 block w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                    placeholder="Arrival instructions, equipment expectations, or any assumption tied to this visit."
                                                />
                                                <InputError
                                                    className="mt-2"
                                                    message={scheduleErrors.notes}
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={scheduleProcessing}
                                                className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                            >
                                                {scheduleProcessing
                                                    ? 'Saving...'
                                                    : jobRequest.schedule
                                                      ? 'Update visit'
                                                      : 'Propose visit'}
                                            </button>
                                        </form>
                                    ) : null}
                                </div>
                            ) : null}

                            {showPaymentSection ? (
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Payment
                                    </p>
                                    <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {jobRequest.payment
                                            ? 'Manual payment tracking for this request'
                                            : permissions.canManagePayment
                                              ? 'Record the payment against the accepted quote'
                                              : 'Waiting for the customer payment record'}
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        {jobRequest.payment
                                            ? paymentStatusBody(jobRequest.payment.status)
                                            : permissions.canManagePayment
                                              ? 'Use this to capture how and when the payment was made before the provider confirms receipt.'
                                              : 'Once the customer records a payment, the provider can confirm it here.'}
                                    </p>

                                    {jobRequest.payment ? (
                                        <div className="mt-6 space-y-5">
                                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Payment amount
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatAmount(
                                                            jobRequest.payment.amount,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Method
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatStatus(
                                                            jobRequest.payment.method,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Paid at
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {jobRequest.payment.paidAt}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        State
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatStatus(
                                                            jobRequest.payment.status,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Payment details
                                                </p>
                                                <p className="mt-3 text-base font-medium text-zinc-950 dark:text-white">
                                                    {jobRequest.payment.reference
                                                        ? `Reference: ${jobRequest.payment.reference}`
                                                        : 'No payment reference was supplied.'}
                                                </p>
                                                {jobRequest.payment.notes ? (
                                                    <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                        {jobRequest.payment.notes}
                                                    </p>
                                                ) : null}
                                                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    {jobRequest.payment.confirmedAt
                                                        ? `Confirmed ${jobRequest.payment.confirmedAt}`
                                                        : jobRequest.payment.revisionRequestedAt
                                                          ? `Revision requested ${jobRequest.payment.revisionRequestedAt}`
                                                          : `Updated ${jobRequest.payment.updatedAt}`}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            {permissions.canManagePayment
                                                ? 'No payment has been recorded yet. Add the amount, method, time, and reference below.'
                                                : 'No payment has been recorded on this request yet.'}
                                        </div>
                                    )}

                                    {permissions.canRespondToPayment ? (
                                        <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                Confirm the payment if it matches what you received. If something is off, send it back for revision and continue the explanation in the thread.
                                            </p>
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        submitPaymentStatus(
                                                            'confirm',
                                                        )
                                                    }
                                                    disabled={paymentAction !== null}
                                                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                >
                                                    {paymentAction === 'confirm'
                                                        ? 'Confirming...'
                                                        : 'Confirm payment'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        submitPaymentStatus(
                                                            'request_revision',
                                                        )
                                                    }
                                                    disabled={paymentAction !== null}
                                                    className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    {paymentAction ===
                                                    'request_revision'
                                                        ? 'Requesting...'
                                                        : 'Request revision'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}

                                    {permissions.canManagePayment ? (
                                        <form
                                            onSubmit={submitPayment}
                                            className="mt-6 space-y-5"
                                        >
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Amount paid
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={paymentData.amount}
                                                        onChange={(event) =>
                                                            setPaymentData(
                                                                'amount',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                        placeholder="e.g. 180"
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            paymentErrors.amount
                                                        }
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Payment method
                                                    </label>
                                                    <select
                                                        value={paymentData.method}
                                                        onChange={(event) =>
                                                            setPaymentData(
                                                                'method',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                    >
                                                        {Object.entries(
                                                            paymentMethodOptions,
                                                        ).map(
                                                            ([
                                                                value,
                                                                label,
                                                            ]) => (
                                                                <option
                                                                    key={value}
                                                                    value={value}
                                                                >
                                                                    {label}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            paymentErrors.method
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Paid at
                                                    </label>
                                                    <input
                                                        type="datetime-local"
                                                        value={
                                                            paymentData.paid_at
                                                        }
                                                        onChange={(event) =>
                                                            setPaymentData(
                                                                'paid_at',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            paymentErrors.paid_at
                                                        }
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Reference
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={
                                                            paymentData.reference
                                                        }
                                                        onChange={(event) =>
                                                            setPaymentData(
                                                                'reference',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                        placeholder="Cash note, transfer ID, or merchant reference."
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            paymentErrors.reference
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Payment notes
                                                </label>
                                                <textarea
                                                    rows={4}
                                                    value={paymentData.notes}
                                                    onChange={(event) =>
                                                        setPaymentData(
                                                            'notes',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="mt-2 block w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                    placeholder="Anything the provider should know when reconciling the payment."
                                                />
                                                <InputError
                                                    className="mt-2"
                                                    message={paymentErrors.notes}
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={paymentProcessing}
                                                className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                            >
                                                {paymentProcessing
                                                    ? 'Saving...'
                                                    : jobRequest.payment
                                                      ? 'Update payment'
                                                      : 'Record payment'}
                                            </button>
                                        </form>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                            Conversation
                                        </p>
                                        <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                            Discussion around this request
                                        </h2>
                                    </div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        {jobRequest.messages.length} message
                                        {jobRequest.messages.length === 1 ? '' : 's'}
                                    </p>
                                </div>

                                {jobRequest.messages.length ? (
                                    <div className="mt-6 space-y-4">
                                        {jobRequest.messages.map((message) => {
                                            const isOwnMessage =
                                                auth.user.id === message.sender.id;

                                            return (
                                                <div
                                                    key={message.id}
                                                    className={`rounded-[1.5rem] border px-5 py-5 ${
                                                        isOwnMessage
                                                            ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                                            : 'border-zinc-200 bg-zinc-50/85 text-zinc-950 dark:border-white/10 dark:bg-white/[0.03] dark:text-white'
                                                    }`}
                                                >
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                        <p
                                                            className={`text-sm font-semibold uppercase tracking-[0.18em] ${
                                                                isOwnMessage
                                                                    ? 'text-white/75 dark:text-zinc-600'
                                                                    : 'text-zinc-500 dark:text-zinc-400'
                                                            }`}
                                                        >
                                                            {roleLabel(message)}
                                                        </p>
                                                        <p
                                                            className={`text-xs ${
                                                                isOwnMessage
                                                                    ? 'text-white/60 dark:text-zinc-500'
                                                                    : 'text-zinc-500 dark:text-zinc-400'
                                                            }`}
                                                        >
                                                            {formatDateTime(message.createdAt)}
                                                        </p>
                                                    </div>
                                                    <p className="mt-4 text-sm leading-7">
                                                        {message.body}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                        No messages yet. Use the composer below to start the conversation if this request already targets a provider.
                                    </div>
                                )}

                                {permissions.canMessage ? (
                                    <form onSubmit={submit} className="mt-6 space-y-4">
                                        <textarea
                                            value={data.body}
                                            onChange={(event) =>
                                                setData('body', event.target.value)
                                            }
                                            rows={5}
                                            className="block w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                            placeholder="Write a clear update, question, or response."
                                        />
                                        <InputError message={errors.body} />
                                        <div className="flex gap-3">
                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                            >
                                                {processing
                                                    ? 'Sending...'
                                                    : 'Send message'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                        {jobRequest.status === 'closed'
                                            ? 'This request has been closed, so the thread is read-only now.'
                                            : jobRequest.status === 'declined'
                                              ? 'This request was declined, so the thread is now read-only.'
                                              : jobRequest.provider
                                                ? 'This thread is visible to you, but only the customer and the targeted provider can post messages here.'
                                                : 'This request is still open and has no targeted provider yet, so messaging is not active.'}
                                    </div>
                                )}
                            </div>
                        </section>

                        <aside className="space-y-6">
                            {showCustomerTools ? (
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Customer tools
                                    </p>
                                    <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        Reuse this scope without reopening the old thread
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        Create a follow-up request when you need a clean restart, want to target another provider, or need a second pass on similar work.
                                    </p>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <Link
                                            href={route(
                                                'requests.followup.create',
                                                jobRequest.id,
                                            )}
                                            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                        >
                                            Create follow-up
                                        </Link>
                                        <Link
                                            href={route('providers.index')}
                                            className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Browse providers
                                        </Link>
                                    </div>
                                </div>
                            ) : null}

                            {hasLifecycleActions ? (
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Request actions
                                    </p>
                                    <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        Move the request forward
                                    </h2>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        {permissions.canAccept ? (
                                            <button
                                                type="button"
                                                onClick={() => submitStatus('accept')}
                                                disabled={statusAction !== null}
                                                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                            >
                                                {statusAction === 'accept'
                                                    ? 'Accepting...'
                                                    : 'Accept request'}
                                            </button>
                                        ) : null}

                                        {permissions.canDecline ? (
                                            <button
                                                type="button"
                                                onClick={() => submitStatus('decline')}
                                                disabled={statusAction !== null}
                                                className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                            >
                                                {statusAction === 'decline'
                                                    ? 'Declining...'
                                                    : 'Decline request'}
                                            </button>
                                        ) : null}

                                        {permissions.canClose ? (
                                            <button
                                                type="button"
                                                onClick={() => submitStatus('close')}
                                                disabled={statusAction !== null}
                                                className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                            >
                                                {statusAction === 'close'
                                                    ? 'Closing...'
                                                    : 'Close request'}
                                            </button>
                                        ) : null}
                                    </div>
                                    <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        Providers can accept or decline active work requests. Any participant or admin can close the thread once the work is complete or no longer moving forward.
                                    </p>
                                </div>
                            ) : null}

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-zinc-950 p-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.24)] dark:border-white/10 dark:bg-white dark:text-zinc-950">
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-600">
                                    Participants
                                </p>
                                <div className="mt-6 space-y-4">
                                    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Customer
                                        </p>
                                        <p className="mt-2 text-base font-medium text-white dark:text-zinc-950">
                                            {jobRequest.customer.name}
                                        </p>
                                    </div>

                                    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 dark:border-zinc-200 dark:bg-zinc-100">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                            Provider
                                        </p>
                                        <p className="mt-2 text-base font-medium text-white dark:text-zinc-950">
                                            {jobRequest.provider?.businessName ??
                                                'Not targeted yet'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Request details
                                </p>
                                <div className="mt-5 space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
                                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Location
                                        </p>
                                        <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                            {jobRequest.locationLabel || 'Not set'}
                                        </p>
                                    </div>

                                    {jobRequest.locationNotes ? (
                                        <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                Access notes
                                            </p>
                                            <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                                {jobRequest.locationNotes}
                                            </p>
                                        </div>
                                    ) : null}

                                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Budget
                                        </p>
                                        <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                            {jobRequest.budgetMin || jobRequest.budgetMax
                                                ? `${jobRequest.budgetMin ?? 0} - ${
                                                      jobRequest.budgetMax ?? 'open'
                                                  }`
                                                : 'Not specified'}
                                        </p>
                                    </div>

                                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Activity
                                        </p>
                                        <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                            {jobRequest.messages.length} message
                                            {jobRequest.messages.length === 1 ? '' : 's'}
                                        </p>
                                    </div>

                                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Created
                                        </p>
                                        <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                            {formatDateTime(jobRequest.createdAt)}
                                        </p>
                                    </div>

                                    {jobRequest.sourceRequest ? (
                                        <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                Follow-up to
                                            </p>
                                            <Link
                                                href={route(
                                                    'requests.show',
                                                    jobRequest.sourceRequest.id,
                                                )}
                                                className="mt-2 block text-base font-medium text-zinc-950 transition hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300"
                                            >
                                                {jobRequest.sourceRequest.title}
                                            </Link>
                                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                {jobRequest.sourceRequest.providerLabel}
                                            </p>
                                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                {formatStatus(
                                                    jobRequest.sourceRequest.status,
                                                )}{' '}
                                                • {formatDateTime(jobRequest.sourceRequest.createdAt)}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {jobRequest.provider &&
                            (jobRequest.review || permissions.canReview) ? (
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Completion review
                                    </p>
                                    <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {permissions.canReview
                                            ? 'Rate how this provider handled the work.'
                                            : 'Published customer review'}
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        {permissions.canReview
                                            ? 'Closed requests can now turn into public trust signals. Leave a clear rating and a short written review.'
                                            : 'This review now contributes to the provider storefront and directory reputation.'}
                                    </p>

                                    {permissions.canReview ? (
                                        <form
                                            onSubmit={submitReview}
                                            className="mt-6 space-y-5"
                                        >
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Rating
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {[1, 2, 3, 4, 5].map(
                                                        (ratingValue) => (
                                                            <button
                                                                key={ratingValue}
                                                                type="button"
                                                                onClick={() =>
                                                                    setReviewData(
                                                                        'rating',
                                                                        ratingValue,
                                                                    )
                                                                }
                                                                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                                                    reviewData.rating ===
                                                                    ratingValue
                                                                        ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                                                        : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-zinc-950'
                                                                }`}
                                                            >
                                                                {formatRating(
                                                                    ratingValue,
                                                                )}
                                                            </button>
                                                        ),
                                                    )}
                                                </div>
                                                <InputError
                                                    className="mt-2"
                                                    message={reviewErrors.rating}
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Headline
                                                </label>
                                                <input
                                                    type="text"
                                                    value={reviewData.headline}
                                                    onChange={(event) =>
                                                        setReviewData(
                                                            'headline',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                    placeholder="Short summary of the outcome"
                                                />
                                                <InputError
                                                    className="mt-2"
                                                    message={
                                                        reviewErrors.headline
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Review
                                                </label>
                                                <textarea
                                                    rows={5}
                                                    value={reviewData.body}
                                                    onChange={(event) =>
                                                        setReviewData(
                                                            'body',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="mt-2 block w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                    placeholder="What went well, what was clear, and whether the provider delivered as expected."
                                                />
                                                <InputError
                                                    className="mt-2"
                                                    message={reviewErrors.body}
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={reviewProcessing}
                                                className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                            >
                                                {reviewProcessing
                                                    ? 'Saving...'
                                                    : jobRequest.review
                                                      ? 'Update review'
                                                      : 'Publish review'}
                                            </button>
                                        </form>
                                    ) : jobRequest.review ? (
                                        <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-white dark:bg-white dark:text-zinc-950">
                                                    {formatRating(
                                                        jobRequest.review.rating,
                                                    )}
                                                </span>
                                                <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                    {jobRequest.review.customerName}
                                                </span>
                                            </div>
                                            {jobRequest.review.headline ? (
                                                <p className="mt-4 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                    {jobRequest.review.headline}
                                                </p>
                                            ) : null}
                                            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                {jobRequest.review.body}
                                            </p>
                                            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                Published {formatDateTime(jobRequest.review.createdAt)}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </aside>
                    </main>
                </div>
            </div>
        </>
    );
}
