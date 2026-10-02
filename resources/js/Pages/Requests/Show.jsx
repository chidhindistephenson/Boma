import ApplicationLogo from '@/Components/ApplicationLogo';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import ThemeToggle from '@/Components/ThemeToggle';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function formatStatus(value) {
    return value.replace(/_/g, ' ');
}

function formatRating(value) {
    return `${value}/5`;
}

function currencyLabel(currency, currencyOptions = {}) {
    return currencyOptions[currency] ?? currency ?? 'USD';
}

function formatAmount(value, currency = 'USD', currencyOptions = {}) {
    if (value === null || value === undefined || value === '') {
        return 'Not set';
    }

    const amount = Number(value).toLocaleString();
    const label = currencyLabel(currency, currencyOptions);

    return currency === 'USD' ? `$${amount}` : `${label} ${amount}`;
}

function formatFileSize(sizeBytes) {
    if (!sizeBytes) {
        return 'Unknown size';
    }

    if (sizeBytes >= 1024 * 1024) {
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
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
        return 'The payment is confirmed. System-processed funds stay in escrow until the customer releases them or the hold expires.';
    }

    if (status === 'pending_gateway') {
        return 'The payment checkout has started. Complete it on the secure gateway page, then refresh the status here.';
    }

    if (status === 'revision_requested') {
        return 'The provider flagged the payment record for revision. Update the amount, method, timing, or reference details and resend it.';
    }

    if (status === 'refunded') {
        return 'This payment was refunded to the customer wallet. It is no longer held for provider release.';
    }

    return 'A payment has been recorded and is waiting for the provider to confirm receipt.';
}

function escrowStatusBody(payment) {
    if (!payment) {
        return '';
    }

    if (payment.status === 'pending_gateway') {
        return 'The gateway checkout has started, but Boma is not holding the money yet.';
    }

    if (payment.escrowStatus === 'held') {
        return payment.releaseDueAt
            ? `Boma is holding these funds. They can be released now by the customer, or automatically after ${formatDateTime(payment.releaseDueAt)}.`
            : 'Boma is holding these funds until the customer releases them.';
    }

    if (payment.escrowStatus === 'disputed') {
        return payment.disputedAt
            ? `Auto-release is paused because this payment was disputed ${formatDateTime(payment.disputedAt)}. An admin must release or refund the held funds.`
            : 'Auto-release is paused because this payment is disputed. An admin must release or refund the held funds.';
    }

    if (payment.escrowStatus === 'released') {
        return payment.releasedAt
            ? `Funds were released ${formatDateTime(payment.releasedAt)}.`
            : 'Funds have been released to the provider payout flow.';
    }

    if (payment.escrowStatus === 'refunded') {
        return payment.refundedAt
            ? `Funds were refunded to the customer wallet ${formatDateTime(payment.refundedAt)}.`
            : 'Funds were refunded to the customer wallet.';
    }

    if (payment.escrowStatus === 'external') {
        return 'This was settled outside Boma, so there are no platform-held funds to release.';
    }

    return 'No funds are being held by Boma for this payment yet.';
}

function workflowTone(step, status) {
    if (step.complete) {
        return 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950';
    }

    if (step.active) {
        return 'border-zinc-400 bg-zinc-100 text-zinc-950 dark:border-white/30 dark:bg-white/10 dark:text-white';
    }

    return 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500';
}

export default function Show({
    jobRequest,
    permissions,
    paymentMethodOptions,
    paymentChannelOptions,
    wallet,
    wallets,
    currencyOptions,
    savedPaymentMethods,
}) {
    const { auth } = usePage().props;
    const isCustomer = auth.user.role === 'customer';
    const isAdmin = auth.user.role === 'admin';
    const paymentProofInputRef = useRef(null);
    const [statusAction, setStatusAction] = useState(null);
    const [quoteAction, setQuoteAction] = useState(null);
    const [scheduleAction, setScheduleAction] = useState(null);
    const [paymentAction, setPaymentAction] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [proposalAction, setProposalAction] = useState(null);
    const ownProposal = jobRequest.proposals.find(
        (proposal) => proposal.providerId === auth.user.id,
    );
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
        data: proposalData,
        setData: setProposalData,
        put: putProposal,
        processing: proposalProcessing,
        errors: proposalErrors,
    } = useForm({
        amount: ownProposal?.amount ?? '',
        timeline_days: ownProposal?.timelineDays ?? '',
        summary: ownProposal?.summary ?? '',
        notes: ownProposal?.notes ?? '',
        valid_until: ownProposal?.validUntil ?? '',
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
        data: reviewResponseData,
        setData: setReviewResponseData,
        patch: patchReviewResponse,
        processing: reviewResponseProcessing,
        errors: reviewResponseErrors,
    } = useForm({
        response: '',
    });
    const {
        data: paymentData,
        setData: setPaymentData,
        put: putPayment,
        processing: paymentProcessing,
        errors: paymentErrors,
    } = useForm({
        amount: jobRequest.payment?.amount ?? jobRequest.quote?.amount ?? '',
        currency:
            jobRequest.payment?.currency ??
            wallet?.currency ??
            'USD',
        channel: jobRequest.payment?.channel ?? 'electronic',
        method:
            jobRequest.payment?.method ??
            'mobile_money',
        payer_name: jobRequest.payment?.payerName ?? auth.user.name ?? '',
        payer_email: jobRequest.payment?.payerEmail ?? auth.user.email ?? '',
        payer_phone: jobRequest.payment?.payerPhone ?? auth.user.phone ?? '',
        user_payment_method_id:
            jobRequest.payment?.paymentMethod?.id ??
            savedPaymentMethods?.find((method) => method.isDefault)?.id ??
            '',
        checkout_token: '',
        reference: jobRequest.payment?.reference ?? '',
        notes: jobRequest.payment?.notes ?? '',
        paid_at: jobRequest.payment?.paidAt
            ? jobRequest.payment.paidAt.replace(' ', 'T').slice(0, 16)
            : '',
        proof: null,
    });
    const {
        data: paymentStatusData,
        setData: setPaymentStatusData,
        transform: transformPaymentStatus,
        patch: patchPaymentStatus,
        processing: paymentStatusProcessing,
        errors: paymentStatusErrors,
    } = useForm({
        review_notes: '',
    });
    const {
        data: refundData,
        setData: setRefundData,
        post: postRefund,
        processing: refundProcessing,
        errors: refundErrors,
    } = useForm({
        reason: '',
    });
    const {
        data: disputeData,
        setData: setDisputeData,
        post: postDispute,
        processing: disputeProcessing,
        errors: disputeErrors,
    } = useForm({
        reason: '',
    });
    const paymentMethodEntries = Object.entries(paymentMethodOptions ?? {});
    const electronicPaymentMethods = paymentMethodEntries.filter(([value]) =>
        ['wallet', 'saved_card', 'mobile_money', 'bank_transfer', 'card', 'other'].includes(value),
    );
    const manualPaymentMethods = paymentMethodEntries.filter(([value]) =>
        ['cash', 'manual_record'].includes(value),
    );
    const activePaymentMethods =
        paymentData.channel === 'manual'
            ? manualPaymentMethods
            : electronicPaymentMethods;
    const selectedWallet = (wallets ?? []).find(
        (item) => item.currency === paymentData.currency,
    ) ?? wallet;
    const paymentChannelEntries = Object.entries(paymentChannelOptions ?? {
        electronic: 'Electronic payment',
        manual: 'Manual or offline payment',
    });

    const submitQuote = (event) => {
        event.preventDefault();

        putQuote(route('requests.quote.upsert', jobRequest.id), {
            preserveScroll: true,
        });
    };

    const submitProposal = (event) => {
        event.preventDefault();

        putProposal(route('requests.proposal.upsert', jobRequest.id), {
            preserveScroll: true,
        });
    };

    const respondToProposal = (proposalId, action) => {
        setProposalAction(`${proposalId}:${action}`);
        router.patch(
            route('requests.proposals.respond', [jobRequest.id, proposalId]),
            { action },
            {
                preserveScroll: true,
                onFinish: () => setProposalAction(null),
            },
        );
    };

    const withdrawProposal = () => {
        setProposalAction('withdraw');
        router.patch(
            route('requests.proposal.withdraw', jobRequest.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setProposalAction(null),
            },
        );
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

    const submitReviewResponse = (event) => {
        event.preventDefault();

        patchReviewResponse(route('reviews.response', jobRequest.review.id), {
            preserveScroll: true,
        });
    };

    const submitPayment = (event) => {
        event.preventDefault();

        putPayment(route('requests.payment.upsert', jobRequest.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsPaymentModalOpen(false);
                setPaymentData('proof', null);

                if (paymentProofInputRef.current) {
                    paymentProofInputRef.current.value = '';
                }
            },
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

        transformPaymentStatus(() => ({
            action,
            review_notes: paymentStatusData.review_notes,
        }));

        patchPaymentStatus(route('requests.payment.status.update', jobRequest.id), {
            preserveScroll: true,
            onFinish: () => setPaymentAction(null),
        });
    };

    const syncGatewayPayment = () => {
        setPaymentAction('sync');

        router.post(
            route('requests.payment.sync', jobRequest.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setPaymentAction(null),
            },
        );
    };

    const releaseEscrowPayment = () => {
        setPaymentAction('release');

        router.post(
            route('requests.payment.release', jobRequest.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setPaymentAction(null),
            },
        );
    };

    const refundEscrowPayment = (event) => {
        event.preventDefault();
        setPaymentAction('refund');

        postRefund(route('requests.payment.refund', jobRequest.id), {
            preserveScroll: true,
            onSuccess: () => setRefundData('reason', ''),
            onFinish: () => setPaymentAction(null),
        });
    };

    const disputeEscrowPayment = (event) => {
        event.preventDefault();
        setPaymentAction('dispute');

        postDispute(route('requests.payment.dispute', jobRequest.id), {
            preserveScroll: true,
            onSuccess: () => setDisputeData('reason', ''),
            onFinish: () => setPaymentAction(null),
        });
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
    const requestFlowSteps = [
        {
            label: 'Request',
            detail: formatStatus(jobRequest.status),
            complete: !['open', 'targeted', 'in_conversation'].includes(
                jobRequest.status,
            ),
            active: ['open', 'targeted', 'in_conversation'].includes(
                jobRequest.status,
            ),
        },
        {
            label: 'Quote',
            detail: jobRequest.quote
                ? formatStatus(jobRequest.quote.status)
                : 'Waiting',
            complete: jobRequest.quote?.status === 'accepted',
            active: jobRequest.quote?.status === 'pending',
        },
        {
            label: 'Visit',
            detail: jobRequest.schedule
                ? formatStatus(jobRequest.schedule.status)
                : 'Not set',
            complete: ['confirmed', 'completed'].includes(
                jobRequest.schedule?.status,
            ),
            active: jobRequest.schedule?.status === 'proposed',
        },
        {
            label: 'Payment',
            detail: jobRequest.payment
                ? formatStatus(jobRequest.payment.status)
                : 'Not recorded',
            complete: jobRequest.payment?.status === 'confirmed',
            active: ['pending_gateway', 'submitted', 'revision_requested'].includes(
                jobRequest.payment?.status,
            ),
        },
        {
            label: 'Review',
            detail: jobRequest.review ? 'Published' : 'Pending',
            complete: Boolean(jobRequest.review),
            active: permissions.canReview,
        },
    ];
    const nextStep = (() => {
        if (isCustomer && jobRequest.status === 'open' && jobRequest.proposals.length) {
            return {
                label: 'Compare proposals',
                body: `${jobRequest.proposals.length} provider offer${jobRequest.proposals.length === 1 ? '' : 's'} are ready for a decision.`,
                target: '#proposals',
                actionLabel: 'Compare offers',
            };
        }

        if (isCustomer && jobRequest.status === 'open') {
            return {
                label: 'Waiting for providers',
                body: 'Verified providers matching this request can still send proposals.',
                target: '#proposals',
                actionLabel: 'View opportunity',
            };
        }

        if (isCustomer && permissions.canRespondToQuote) {
            return {
                label: 'Review quote',
                body: 'Accept the quote if the amount and timeline work, or decline it for revision.',
                target: '#quote',
                actionLabel: 'Review quote',
            };
        }

        if (isCustomer && permissions.canRespondToSchedule) {
            return {
                label: 'Confirm visit',
                body: 'The provider proposed a visit slot. Confirm it or send it back for rescheduling.',
                target: '#visit',
                actionLabel: 'Review visit',
            };
        }

        if (isCustomer && permissions.canManagePayment) {
            return {
                label: jobRequest.payment ? 'Update payment' : 'Record payment',
                body: 'Capture the payment details and upload proof if you have it.',
                target: '#payment',
                actionLabel: jobRequest.payment ? 'Update payment' : 'Record payment',
            };
        }

        if (isCustomer && permissions.canClose) {
            return {
                label: 'Close request',
                body: 'Close this request once the work is complete and the payment is settled.',
                target: '#request-actions',
                actionLabel: 'Go to actions',
            };
        }

        if (isCustomer && permissions.canReview) {
            return {
                label: 'Leave a review',
                body: 'Share concise feedback so future customers know what to expect.',
                target: '#review',
                actionLabel: 'Leave review',
            };
        }

        if (jobRequest.status === 'closed') {
            return {
                label: 'Request closed',
                body: 'This request has no pending customer action.',
            };
        }

        return {
            label: 'Waiting for update',
            body: 'The next customer action will appear here when the request changes.',
        };
    })();

    useEffect(() => {
        let intervalId;

        const reloadThread = () => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            if (
                quoteProcessing ||
                scheduleProcessing ||
                paymentProcessing ||
                paymentStatusProcessing ||
                refundProcessing ||
                disputeProcessing ||
                reviewProcessing ||
                proposalProcessing
            ) {
                return;
            }

            router.reload({
                only: ['jobRequest', 'permissions'],
                preserveState: true,
                preserveScroll: true,
            });
        };

        intervalId = window.setInterval(
            reloadThread,
            window.Echo ? 15000 : 4000,
        );

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                reloadThread();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, [
        paymentProcessing,
        paymentStatusProcessing,
        refundProcessing,
        disputeProcessing,
        quoteProcessing,
        reviewProcessing,
        scheduleProcessing,
        proposalProcessing,
    ]);

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
                            <div className="rounded-[2.2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
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
                                    {jobRequest.preferredDate ? (
                                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                            Preferred {jobRequest.preferredDate}
                                        </span>
                                    ) : null}
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

                            {isCustomer ? (
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                                Request progress
                                            </p>
                                            <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                {nextStep.label}
                                            </h2>
                                            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                {nextStep.body}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            {nextStep.target ? (
                                                <a
                                                    href={nextStep.target}
                                                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                >
                                                    {nextStep.actionLabel ?? nextStep.label}
                                                </a>
                                            ) : null}

                                            {jobRequest.provider &&
                                            jobRequest.messages.length ? (
                                                <Link
                                                    href={route(
                                                        'inbox.show',
                                                        jobRequest.id,
                                                    )}
                                                    className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                >
                                                    Open chat
                                                </Link>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                        {requestFlowSteps.map((step, index) => (
                                            <div
                                                key={step.label}
                                                className={`rounded-2xl border px-4 py-4 transition ${workflowTone(step)}`}
                                            >
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">
                                                    {String(index + 1).padStart(2, '0')}
                                                </p>
                                                <p className="mt-2 font-display text-xl font-semibold">
                                                    {step.label}
                                                </p>
                                                <p className="mt-1 text-sm opacity-75">
                                                    {step.detail}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {jobRequest.status === 'open' &&
                            (permissions.canPropose ||
                                isCustomer ||
                                isAdmin ||
                                jobRequest.proposals.length) ? (
                                <div id="proposals" className="scroll-mt-24 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Provider proposals
                                    </p>
                                    <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {permissions.canPropose
                                            ? 'Price this opportunity clearly'
                                            : 'Compare offers before selecting a provider'}
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        Accepting one proposal assigns that provider and moves the request directly into scheduling and payment.
                                    </p>

                                    {(isCustomer || isAdmin) &&
                                    jobRequest.proposals.length ? (
                                        <div className="mt-6 space-y-4">
                                            {jobRequest.proposals.map((proposal) => (
                                                <article
                                                    key={proposal.id}
                                                    className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                                                >
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Link
                                                                    href={route(
                                                                        'providers.show',
                                                                        proposal.providerId,
                                                                    )}
                                                                    className="font-display text-xl font-semibold text-zinc-950 hover:underline dark:text-white"
                                                                >
                                                                    {proposal.providerName}
                                                                </Link>
                                                                <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                                    {formatStatus(
                                                                        proposal.status,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                                {proposal.averageRating
                                                                    ? `${proposal.averageRating}/5 from ${proposal.reviewCount} reviews`
                                                                    : 'No reviews yet'}
                                                            </p>
                                                        </div>
                                                        <div className="text-left sm:text-right">
                                                            <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                                ${Number(
                                                                    proposal.amount,
                                                                ).toLocaleString()}
                                                            </p>
                                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                                {proposal.timelineDays}{' '}
                                                                day timeline
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="mt-4 text-sm font-semibold text-zinc-950 dark:text-white">
                                                        {proposal.summary}
                                                    </p>
                                                    {proposal.notes ? (
                                                        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                            {proposal.notes}
                                                        </p>
                                                    ) : null}
                                                    {isCustomer &&
                                                    proposal.status ===
                                                        'pending' ? (
                                                        <div className="mt-5 flex flex-wrap gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    respondToProposal(
                                                                        proposal.id,
                                                                        'accept',
                                                                    )
                                                                }
                                                                disabled={
                                                                    proposalAction !==
                                                                    null
                                                                }
                                                                className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                                                            >
                                                                {proposalAction ===
                                                                `${proposal.id}:accept`
                                                                    ? 'Accepting...'
                                                                    : 'Accept proposal'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    respondToProposal(
                                                                        proposal.id,
                                                                        'decline',
                                                                    )
                                                                }
                                                                disabled={
                                                                    proposalAction !==
                                                                    null
                                                                }
                                                                className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 disabled:opacity-60 dark:border-white/10 dark:text-zinc-300"
                                                            >
                                                                Decline
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </article>
                                            ))}
                                        </div>
                                    ) : isCustomer ? (
                                        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                                            No provider proposals have arrived yet. Matching verified providers have been notified.
                                        </div>
                                    ) : null}

                                    {permissions.canPropose ? (
                                        <form
                                            onSubmit={submitProposal}
                                            className="mt-6 space-y-4 border-t border-zinc-200 pt-6 dark:border-white/10"
                                        >
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Quote amount
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={proposalData.amount}
                                                        onChange={(event) =>
                                                            setProposalData(
                                                                'amount',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            proposalErrors.amount
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Timeline days
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="365"
                                                        value={
                                                            proposalData.timeline_days
                                                        }
                                                        onChange={(event) =>
                                                            setProposalData(
                                                                'timeline_days',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            proposalErrors.timeline_days
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Proposal summary
                                                </label>
                                                <input
                                                    value={proposalData.summary}
                                                    onChange={(event) =>
                                                        setProposalData(
                                                            'summary',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                                    placeholder="What the price includes"
                                                />
                                                <InputError
                                                    className="mt-2"
                                                    message={
                                                        proposalErrors.summary
                                                    }
                                                />
                                            </div>
                                            <textarea
                                                rows={4}
                                                value={proposalData.notes}
                                                onChange={(event) =>
                                                    setProposalData(
                                                        'notes',
                                                        event.target.value,
                                                    )
                                                }
                                                className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                                placeholder="Optional assumptions, materials, or visit details"
                                            />
                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    disabled={proposalProcessing}
                                                    className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                                                >
                                                    {proposalProcessing
                                                        ? 'Saving...'
                                                        : ownProposal
                                                          ? 'Update proposal'
                                                          : 'Send proposal'}
                                                </button>
                                                {ownProposal?.status ===
                                                'pending' ? (
                                                    <button
                                                        type="button"
                                                        onClick={withdrawProposal}
                                                        disabled={
                                                            proposalAction !== null
                                                        }
                                                        className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 dark:border-white/10 dark:text-zinc-300"
                                                    >
                                                        Withdraw
                                                    </button>
                                                ) : null}
                                            </div>
                                        </form>
                                    ) : null}
                                </div>
                            ) : null}

                            {showQuoteSection ? (
                                <div id="quote" className="scroll-mt-24 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Quote amount
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatAmount(
                                                            jobRequest.quote.amount,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
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
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Valid until
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {jobRequest.quote.validUntil ??
                                                            'Open'}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
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

                                            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
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
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            {permissions.canManageQuote
                                                ? 'No quote has been sent yet. Add amount, timing, and a short scope summary below.'
                                                : 'No quote has been published on this request yet.'}
                                        </div>
                                    )}

                                    {permissions.canRespondToQuote ? (
                                        <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
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
                                <div id="visit" className="scroll-mt-24 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Scheduled for
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatDateTime(jobRequest.schedule.scheduledFor)}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
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
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Status
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatStatus(
                                                            jobRequest.schedule.status,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Proposed by
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {jobRequest.schedule.proposedByName}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
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
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            {permissions.canManageSchedule
                                                ? 'No visit has been proposed yet. Add the first slot below.'
                                                : 'No visit has been proposed on this accepted request yet.'}
                                        </div>
                                    )}

                                    {permissions.canRespondToSchedule ? (
                                        <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
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
                                <div id="payment" className="scroll-mt-24 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Payment amount
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatAmount(
                                                            jobRequest.payment.amount,
                                                            jobRequest.payment.currency,
                                                            currencyOptions,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Boma fee
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatAmount(
                                                            jobRequest.payment.platformFeeAmount,
                                                            jobRequest.payment.currency,
                                                            currencyOptions,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Provider net
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatAmount(
                                                            jobRequest.payment.providerNetAmount,
                                                            jobRequest.payment.currency,
                                                            currencyOptions,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Channel
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatStatus(
                                                            jobRequest.payment.channel,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Method
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {formatStatus(
                                                            jobRequest.payment.method,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Paid at
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                                        {jobRequest.payment.paidAt}
                                                    </p>
                                                </div>
                                                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
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

                                            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    Payment details
                                                </p>
                                                <p className="mt-3 text-base font-medium text-zinc-950 dark:text-white">
                                                    {jobRequest.payment.reference
                                                        ? `Reference: ${jobRequest.payment.reference}`
                                                        : 'No payment reference was supplied.'}
                                                </p>
                                                {jobRequest.payment.gatewayTransactionId ? (
                                                    <div className="mt-4 grid gap-3 rounded-2xl border border-zinc-300 bg-white p-4 text-sm dark:border-white/10 dark:bg-zinc-950 sm:grid-cols-2">
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                Gateway
                                                            </p>
                                                            <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                                                                {jobRequest.payment.gatewayProvider}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                Transaction
                                                            </p>
                                                            <p className="mt-2 break-all font-semibold text-zinc-950 dark:text-white">
                                                                {
                                                                    jobRequest
                                                                        .payment
                                                                        .gatewayTransactionId
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                Gateway status
                                                            </p>
                                                            <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                                                                {formatStatus(
                                                                    jobRequest
                                                                        .payment
                                                                        .gatewayStatus,
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                Processed
                                                            </p>
                                                            <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
                                                                {formatDateTime(
                                                                    jobRequest
                                                                        .payment
                                                                        .processedAt,
                                                                )}
                                                            </p>
                                                        </div>
                                                        {jobRequest.payment.gatewayMerchantReference ? (
                                                            <div className="sm:col-span-2">
                                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                    Merchant reference
                                                                </p>
                                                                <p className="mt-2 break-all font-semibold text-zinc-950 dark:text-white">
                                                                    {
                                                                        jobRequest
                                                                            .payment
                                                                            .gatewayMerchantReference
                                                                    }
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                                {jobRequest.payment.status === 'pending_gateway' ? (
                                                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-300 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
                                                        {jobRequest.payment.gatewayRedirectUrl ? (
                                                            <a
                                                                href={
                                                                    jobRequest
                                                                        .payment
                                                                        .gatewayRedirectUrl
                                                                }
                                                                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                            >
                                                                Continue checkout
                                                            </a>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={syncGatewayPayment}
                                                            disabled={
                                                                paymentAction ===
                                                                'sync'
                                                            }
                                                            className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                        >
                                                            {paymentAction ===
                                                            'sync'
                                                                ? 'Checking...'
                                                                : 'Refresh status'}
                                                        </button>
                                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                            Pesepay will also notify Boma automatically after checkout.
                                                        </p>
                                                    </div>
                                                ) : null}
                                                {jobRequest.payment.receiptUrl ? (
                                                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-300 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                Receipt
                                                            </p>
                                                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                                Printable receipt with gateway, escrow, and release details.
                                                            </p>
                                                        </div>
                                                        <a
                                                            href={
                                                                jobRequest
                                                                    .payment
                                                                    .receiptUrl
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                        >
                                                            Open receipt
                                                        </a>
                                                    </div>
                                                ) : null}
                                                <div className="mt-4 rounded-2xl border border-zinc-300 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                Escrow
                                                            </p>
                                                            <p className="mt-2 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                                                {formatStatus(
                                                                    jobRequest
                                                                        .payment
                                                                        .escrowStatus ??
                                                                        'not_held',
                                                                )}
                                                            </p>
                                                        </div>
                                                        {permissions.canReleasePayment ? (
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    releaseEscrowPayment
                                                                }
                                                                disabled={
                                                                    paymentAction !==
                                                                    null
                                                                }
                                                                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                            >
                                                                {paymentAction ===
                                                                'release'
                                                                    ? 'Releasing...'
                                                                    : 'Release funds'}
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                        {escrowStatusBody(
                                                            jobRequest.payment,
                                                        )}
                                                    </p>
                                                    {permissions.canDisputePayment ? (
                                                        <form
                                                            onSubmit={
                                                                disputeEscrowPayment
                                                            }
                                                            className="mt-4 rounded-2xl border border-zinc-300 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
                                                        >
                                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                Dispute payment
                                                            </p>
                                                            <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                                Pause automatic release and ask an admin to review this held payment.
                                                            </p>
                                                            <textarea
                                                                rows={3}
                                                                value={
                                                                    disputeData.reason
                                                                }
                                                                onChange={(event) =>
                                                                    setDisputeData(
                                                                        'reason',
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="mt-4 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                                placeholder="Explain what needs admin review before money is released."
                                                            />
                                                            <InputError
                                                                className="mt-2"
                                                                message={
                                                                    disputeErrors.reason ??
                                                                    disputeErrors.dispute
                                                                }
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={
                                                                    paymentAction !==
                                                                        null ||
                                                                    disputeProcessing
                                                                }
                                                                className="mt-4 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                                            >
                                                                {paymentAction ===
                                                                'dispute'
                                                                    ? 'Opening...'
                                                                    : 'Open dispute'}
                                                            </button>
                                                        </form>
                                                    ) : null}
                                                    {permissions.canRefundPayment ? (
                                                        <form
                                                            onSubmit={
                                                                refundEscrowPayment
                                                            }
                                                            className="mt-4 rounded-2xl border border-zinc-300 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
                                                        >
                                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                Admin refund
                                                            </p>
                                                            <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                                Return the held funds to the customer wallet instead of releasing them to the provider. This cannot be undone.
                                                            </p>
                                                            <textarea
                                                                rows={3}
                                                                value={
                                                                    refundData.reason
                                                                }
                                                                onChange={(event) =>
                                                                    setRefundData(
                                                                        'reason',
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="mt-4 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                                placeholder="Explain why this escrow payment is being refunded."
                                                            />
                                                            <InputError
                                                                className="mt-2"
                                                                message={
                                                                    refundErrors.reason ??
                                                                    refundErrors.refund
                                                                }
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={
                                                                    paymentAction !==
                                                                        null ||
                                                                    refundProcessing
                                                                }
                                                                className="mt-4 rounded-full border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                            >
                                                                {paymentAction ===
                                                                'refund'
                                                                    ? 'Refunding...'
                                                                    : 'Refund to customer'}
                                                            </button>
                                                        </form>
                                                    ) : null}
                                                    {jobRequest.payment.releaseReason ? (
                                                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            Release reason:{' '}
                                                            {formatStatus(
                                                                jobRequest
                                                                    .payment
                                                                    .releaseReason,
                                                            )}
                                                            {jobRequest.payment
                                                                .releasedByName
                                                                ? ` by ${jobRequest.payment.releasedByName}`
                                                                : ''}
                                                        </p>
                                                    ) : null}
                                                    {jobRequest.payment.refundReason ? (
                                                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            Refund reason:{' '}
                                                            {
                                                                jobRequest
                                                                    .payment
                                                                    .refundReason
                                                            }
                                                            {jobRequest.payment
                                                                .refundedByName
                                                                ? ` by ${jobRequest.payment.refundedByName}`
                                                                : ''}
                                                        </p>
                                                    ) : null}
                                                    {jobRequest.payment.disputeReason ? (
                                                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            Dispute reason:{' '}
                                                            {
                                                                jobRequest
                                                                    .payment
                                                                    .disputeReason
                                                            }
                                                            {jobRequest.payment
                                                                .disputedByName
                                                                ? ` by ${jobRequest.payment.disputedByName}`
                                                                : ''}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                {jobRequest.payment.notes ? (
                                                    <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                        {jobRequest.payment.notes}
                                                    </p>
                                                ) : null}
                                                {jobRequest.payment.proofUrl ? (
                                                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-300 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                                Payment proof
                                                            </p>
                                                            <p className="mt-2 truncate text-sm font-medium text-zinc-950 dark:text-white">
                                                                {
                                                                    jobRequest
                                                                        .payment
                                                                        .proofOriginalName
                                                                }
                                                            </p>
                                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                                {formatFileSize(
                                                                    jobRequest
                                                                        .payment
                                                                        .proofSizeBytes,
                                                                )}
                                                            </p>
                                                        </div>
                                                        <a
                                                            href={
                                                                jobRequest
                                                                    .payment
                                                                    .proofUrl
                                                            }
                                                            className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                                        >
                                                            Download proof
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                                                        No receipt or payment proof was attached.
                                                    </p>
                                                )}
                                                {jobRequest.payment.reviewNotes ? (
                                                    <div className="mt-4 rounded-2xl border border-zinc-300 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                            Provider review note
                                                        </p>
                                                        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                            {
                                                                jobRequest
                                                                    .payment
                                                                    .reviewNotes
                                                            }
                                                        </p>
                                                    </div>
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
                                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                            {permissions.canManagePayment
                                                ? 'No payment has been recorded yet. Add the amount, method, time, and reference below.'
                                                : 'No payment has been recorded on this request yet.'}
                                        </div>
                                    )}

                                    {permissions.canRespondToPayment ? (
                                        <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                                Confirm the payment if it matches what you received. If something is off, send it back for revision and continue the explanation in the thread.
                                            </p>
                                            <textarea
                                                rows={3}
                                                value={
                                                    paymentStatusData.review_notes
                                                }
                                                onChange={(event) =>
                                                    setPaymentStatusData(
                                                        'review_notes',
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-4 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                                placeholder="Required when requesting revision. Optional when confirming."
                                            />
                                            <InputError
                                                className="mt-2"
                                                message={
                                                    paymentStatusErrors.review_notes
                                                }
                                            />
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
                                        <div className="mt-6 flex flex-wrap items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setIsPaymentModalOpen(true)
                                                }
                                                className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                            >
                                                {jobRequest.payment
                                                    ? 'Update payment'
                                                    : 'Make payment'}
                                            </button>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                Supports electronic payments and manual/offline records.
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                        </section>

                        <aside className="space-y-6">
                            {showCustomerTools ? (
                                <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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
                                <div id="request-actions" className="scroll-mt-24 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
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

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-8 text-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Participants
                                </p>
                                <div className="mt-6 space-y-4">
                                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.05]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Customer
                                        </p>
                                        <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                            {jobRequest.customer.name}
                                        </p>
                                    </div>

                                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.05]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Provider
                                        </p>
                                        <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                            {jobRequest.provider?.businessName ??
                                                'Not targeted yet'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Request details
                                </p>
                                <div className="mt-5 space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
                                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Location
                                        </p>
                                        <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                            {jobRequest.locationLabel || 'Not set'}
                                        </p>
                                    </div>

                                    {jobRequest.locationNotes ? (
                                        <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                Access notes
                                            </p>
                                            <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                                {jobRequest.locationNotes}
                                            </p>
                                        </div>
                                    ) : null}

                                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
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

                                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Activity
                                        </p>
                                        <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                            {jobRequest.messages.length} message
                                            {jobRequest.messages.length === 1 ? '' : 's'}
                                        </p>
                                    </div>

                                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Created
                                        </p>
                                        <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                            {formatDateTime(jobRequest.createdAt)}
                                        </p>
                                    </div>

                                    {jobRequest.sourceRequest ? (
                                        <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
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
                                                | {formatDateTime(jobRequest.sourceRequest.createdAt)}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {jobRequest.provider &&
                            (jobRequest.review || permissions.canReview) ? (
                                <div id="review" className="scroll-mt-24 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                        Completion review
                                    </p>
                                    <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                        {permissions.canReview
                                            ? 'Rate how this provider handled the work.'
                                            : jobRequest.review?.moderationStatus ===
                                                'published'
                                              ? 'Published customer review'
                                              : 'Customer review under moderation'}
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        {permissions.canReview
                                            ? 'A closed request with confirmed payment can become a public trust signal. Leave a clear rating and a short written review.'
                                            : jobRequest.review?.moderationStatus ===
                                                'published'
                                              ? 'This review contributes to the provider storefront and directory reputation.'
                                              : 'This review is hidden from the public rating while an administrator checks it.'}
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
                                        <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
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
                                                {jobRequest.review.moderationStatus ===
                                                'published'
                                                    ? 'Published'
                                                    : formatStatus(
                                                          jobRequest.review
                                                              .moderationStatus,
                                                      )}{' '}
                                                {formatDateTime(
                                                    jobRequest.review.createdAt,
                                                )}
                                            </p>

                                            {jobRequest.review.providerResponse ? (
                                                <div className="mt-5 rounded-2xl border border-zinc-300 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Provider response
                                                    </p>
                                                    <p className="mt-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                                                        {
                                                            jobRequest.review
                                                                .providerResponse
                                                        }
                                                    </p>
                                                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                                                        Responded{' '}
                                                        {formatDateTime(
                                                            jobRequest.review
                                                                .respondedAt,
                                                        )}
                                                    </p>
                                                </div>
                                            ) : null}

                                            {permissions.canRespondToReview ? (
                                                <form
                                                    onSubmit={submitReviewResponse}
                                                    className="mt-5 border-t border-zinc-200 pt-5 dark:border-white/10"
                                                >
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                        Your public response
                                                    </label>
                                                    <textarea
                                                        rows={4}
                                                        value={
                                                            reviewResponseData.response
                                                        }
                                                        onChange={(event) =>
                                                            setReviewResponseData(
                                                                'response',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                                        placeholder="Thank the customer or add concise context. You can respond only once."
                                                    />
                                                    <InputError
                                                        className="mt-2"
                                                        message={
                                                            reviewResponseErrors.response
                                                        }
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={
                                                            reviewResponseProcessing
                                                        }
                                                        className="mt-4 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                                                    >
                                                        {reviewResponseProcessing
                                                            ? 'Publishing...'
                                                            : 'Publish response'}
                                                    </button>
                                                </form>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </aside>
                    </main>
                </div>
            </div>

            <Modal
                show={isPaymentModalOpen}
                maxWidth="2xl"
                closeable={!paymentProcessing}
                onClose={() => setIsPaymentModalOpen(false)}
            >
                <form onSubmit={submitPayment} className="max-h-[90vh] overflow-y-auto">
                    <div className="border-b border-zinc-200 px-6 py-5 dark:border-white/10">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                                    Payment
                                </p>
                                <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                    {jobRequest.payment
                                        ? 'Update payment details'
                                        : 'Complete payment'}
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                                    Record an electronic transaction or capture a manual/offline payment for provider confirmation.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                disabled={paymentProcessing}
                                className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6 px-6 py-6">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {paymentChannelEntries.map(([value, label]) => {
                                const active = paymentData.channel === value;

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => {
                                            setPaymentData('channel', value);
                                            setPaymentData(
                                                'method',
                                                value === 'manual'
                                                    ? 'cash'
                                                    : 'wallet',
                                            );
                                        }}
                                        className={`rounded-[1.5rem] border p-4 text-left transition ${
                                            active
                                                ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                                : 'border-zinc-200 bg-zinc-50 text-zinc-950 hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20'
                                        }`}
                                    >
                                        <span className="text-sm font-semibold">
                                            {label}
                                        </span>
                                        <span
                                            className={`mt-2 block text-xs leading-5 ${
                                                active
                                                    ? 'text-white/75 dark:text-zinc-600'
                                                    : 'text-zinc-500 dark:text-zinc-400'
                                            }`}
                                        >
                                            {value === 'manual'
                                                ? 'Use for cash, hand-delivered receipts, or offline settlement.'
                                                : 'Use for mobile money, bank transfer, card, or gateway references.'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <InputError
                            className="-mt-4"
                            message={paymentErrors.channel}
                        />

                        <div className="grid gap-4 sm:grid-cols-3">
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
                                    message={paymentErrors.amount}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    Currency
                                </label>
                                <select
                                    value={paymentData.currency}
                                    onChange={(event) =>
                                        setPaymentData(
                                            'currency',
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                >
                                    {Object.entries(currencyOptions ?? {}).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <InputError
                                    className="mt-2"
                                    message={paymentErrors.currency}
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
                                    {activePaymentMethods.map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <InputError
                                    className="mt-2"
                                    message={paymentErrors.method}
                                />
                            </div>
                        </div>

                        {paymentData.channel === 'electronic' ? (
                            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Wallet balance
                                        </p>
                                        <p className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                                            {formatAmount(
                                                selectedWallet?.balance,
                                                paymentData.currency,
                                                currencyOptions,
                                            )}
                                        </p>
                                    </div>
                                    <Link
                                        href={route('profile.edit', { section: 'billing' })}
                                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                                    >
                                        Fund wallet
                                    </Link>
                                </div>
                                {paymentData.method === 'wallet' && Number(selectedWallet?.balance || 0) < Number(paymentData.amount || 0) ? (
                                    <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                                        Your {currencyLabel(paymentData.currency, currencyOptions)} wallet balance is below this payment amount. Fund your wallet or choose another method.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        {paymentData.channel === 'electronic' && paymentData.method === 'saved_card' ? (
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    Saved card
                                </label>
                                <select
                                    value={paymentData.user_payment_method_id}
                                    onChange={(event) =>
                                        setPaymentData(
                                            'user_payment_method_id',
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                >
                                    <option value="">Choose saved card</option>
                                    {(savedPaymentMethods ?? []).map((method) => (
                                        <option key={method.id} value={method.id}>
                                            {method.brand} ending {method.lastFour} {method.isDefault ? '(default)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <InputError
                                    className="mt-2"
                                    message={paymentErrors.user_payment_method_id}
                                />
                                {!savedPaymentMethods?.length ? (
                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                        Add a saved card from Account, Wallet & Cards first.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        {paymentData.channel === 'electronic' && !['wallet', 'saved_card'].includes(paymentData.method) ? (
                            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    Checkout details
                                </p>
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Payer name
                                        </label>
                                        <input
                                            type="text"
                                            value={paymentData.payer_name}
                                            onChange={(event) =>
                                                setPaymentData(
                                                    'payer_name',
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                            placeholder="Name on wallet or card"
                                        />
                                        <InputError
                                            className="mt-2"
                                            message={paymentErrors.payer_name}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Email receipt
                                        </label>
                                        <input
                                            type="email"
                                            value={paymentData.payer_email}
                                            onChange={(event) =>
                                                setPaymentData(
                                                    'payer_email',
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                            placeholder="receipt@example.com"
                                        />
                                        <InputError
                                            className="mt-2"
                                            message={paymentErrors.payer_email}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Phone or wallet
                                        </label>
                                        <input
                                            type="tel"
                                            value={paymentData.payer_phone}
                                            onChange={(event) =>
                                                setPaymentData(
                                                    'payer_phone',
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                            placeholder="+263..."
                                        />
                                        <InputError
                                            className="mt-2"
                                            message={paymentErrors.payer_phone}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                            Secure payment token
                                        </label>
                                        <input
                                            type="text"
                                            value={paymentData.checkout_token ?? ''}
                                            onChange={(event) =>
                                                setPaymentData(
                                                    'checkout_token',
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                            placeholder="Sandbox token, OTP, or card token"
                                        />
                                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            In production this field is replaced by the payment gateway checkout widget.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        Paid at
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={paymentData.paid_at}
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
                                        message={paymentErrors.paid_at}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        Reference
                                    </label>
                                    <input
                                        type="text"
                                        value={paymentData.reference}
                                        onChange={(event) =>
                                            setPaymentData(
                                                'reference',
                                                event.target.value,
                                            )
                                        }
                                        className="mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                        placeholder="Receipt number or short cash note."
                                    />
                                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        Optional for manual payments.
                                    </p>
                                    <InputError
                                        className="mt-2"
                                        message={paymentErrors.reference}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Payment notes
                            </label>
                            <textarea
                                rows={4}
                                value={paymentData.notes}
                                onChange={(event) =>
                                    setPaymentData('notes', event.target.value)
                                }
                                className="mt-2 block w-full rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
                                placeholder="Anything the provider should know when reconciling this payment."
                            />
                            <InputError
                                className="mt-2"
                                message={paymentErrors.notes}
                            />
                        </div>

                        {paymentData.channel === 'manual' ? (
                            <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Receipt or proof
                            </label>
                            <input
                                ref={paymentProofInputRef}
                                type="file"
                                accept=".pdf,image/jpeg,image/png"
                                onChange={(event) =>
                                    setPaymentData(
                                        'proof',
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                                className="mt-3 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:file:bg-white dark:file:text-zinc-950"
                            />
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Optional for cash and manual records, but useful when a receipt exists.
                            </p>
                            <InputError
                                className="mt-2"
                                message={paymentErrors.proof}
                            />
                            </div>
                        ) : (
                            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/90 p-5 text-sm leading-6 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                Boma will generate the receipt and transaction reference after the gateway confirms the charge.
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 px-6 py-5 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsPaymentModalOpen(false)}
                            disabled={paymentProcessing}
                            className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-60 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={paymentProcessing}
                            className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                        >
                            {paymentProcessing
                                ? 'Saving...'
                                : jobRequest.payment
                                  ? 'Update payment'
                                  : 'Submit payment'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
