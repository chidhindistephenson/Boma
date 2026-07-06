import InputError from '@/Components/InputError';
import { useForm, usePage } from '@inertiajs/react';

function formatStatus(value) {
    return value ? value.replace(/_/g, ' ') : 'not started';
}

export default function ProviderVerificationPanel() {
    const { auth, errors } = usePage().props;
    const profile = auth.user.providerProfile;
    const documentCount = usePage().props.providerVerificationDocuments?.length ?? 0;
    const { post, processing } = useForm({});

    if (auth.user.role !== 'provider' || !profile) {
        return null;
    }

    const isVerified = profile.verificationStatus === 'verified';
    const isRejected = profile.verificationStatus === 'rejected';
    const hasSubmitted = Boolean(profile.verificationSubmittedAt);
    const buttonLabel = isRejected
        ? 'Resubmit for review'
        : hasSubmitted
          ? 'Update and resubmit'
          : 'Submit for review';

    const statusMessage = isVerified
        ? 'Your listing passed review and can appear in the public directory whenever your account remains active.'
        : isRejected
          ? 'Your last review was rejected. Tighten your profile details, improve the private verification note, and resubmit.'
          : hasSubmitted
            ? 'Your listing is currently waiting for admin review. Keep your profile accurate while the queue moves.'
            : 'Your provider profile is still missing a review submission. Save your private verification note, then submit.';
    const readinessItems = [
        {
            label: 'Email verified',
            done: Boolean(auth.user.email_verified_at),
            detail: auth.user.email_verified_at
                ? 'Your login email is verified.'
                : 'Verify your email so the approved profile can go public.',
        },
        {
            label: 'Private note saved',
            done: Boolean(profile.verificationNotes),
            detail: profile.verificationNotes
                ? 'Your admin-facing verification note is in place.'
                : 'Add business and trust context before submitting.',
        },
        {
            label: 'Document package uploaded',
            done: documentCount > 0,
            detail:
                documentCount > 0
                    ? `${documentCount} private document${documentCount === 1 ? '' : 's'} uploaded.`
                    : 'Upload at least one KYC or registration document.',
        },
        {
            label: 'Submitted to admin queue',
            done: hasSubmitted,
            detail: hasSubmitted
                ? 'The current package is in the review history.'
                : 'Submit the verification package when the checklist is ready.',
        },
    ];

    return (
        <section className="rounded-[2rem] border border-zinc-200/80 bg-zinc-950 p-8 text-white shadow-[0_30px_80px_rgba(0,0,0,0.22)] dark:border-white/10 dark:bg-white dark:text-zinc-950">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-600">
                        Verification review
                    </p>
                    <h3 className="mt-3 font-display text-3xl font-semibold">
                        {formatStatus(profile.verificationStatus)}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-white/85 dark:text-zinc-700">
                        {statusMessage}
                    </p>
                </div>

                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-950">
                    {documentCount} doc{documentCount === 1 ? '' : 's'}
                </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 dark:border-zinc-200 dark:bg-zinc-100">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                        Submitted
                    </p>
                    <p className="mt-2 text-sm font-medium text-white dark:text-zinc-950">
                        {profile.verificationSubmittedAt ?? 'Not yet'}
                    </p>
                </div>

                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 dark:border-zinc-200 dark:bg-zinc-100">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                        Reviewed
                    </p>
                    <p className="mt-2 text-sm font-medium text-white dark:text-zinc-950">
                        {profile.reviewedAt ?? 'Pending'}
                    </p>
                </div>

                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 dark:border-zinc-200 dark:bg-zinc-100">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                        Verified
                    </p>
                    <p className="mt-2 text-sm font-medium text-white dark:text-zinc-950">
                        {profile.verifiedAt ?? 'Not yet'}
                    </p>
                </div>

                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 dark:border-zinc-200 dark:bg-zinc-100">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                        Reviewed by
                    </p>
                    <p className="mt-2 text-sm font-medium text-white dark:text-zinc-950">
                        {profile.reviewedByName ?? 'Pending'}
                    </p>
                </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 dark:border-zinc-200 dark:bg-zinc-100">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                        Your private review note
                    </p>
                    <p className="mt-3 text-sm leading-7 text-white/85 dark:text-zinc-700">
                        {profile.verificationNotes ||
                            'No verification note saved yet. Add one in the profile form below before submitting.'}
                    </p>
                </div>

                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 dark:border-zinc-200 dark:bg-zinc-100">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                        Admin review note
                    </p>
                    <p className="mt-3 text-sm leading-7 text-white/85 dark:text-zinc-700">
                        {profile.verificationReviewNotes ||
                            'No review note yet. If the admin rejects the listing, the reason will appear here.'}
                    </p>
                </div>
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/5 p-5 dark:border-zinc-200 dark:bg-zinc-100">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                            Submission checklist
                        </p>
                        <p className="mt-2 text-sm leading-7 text-white/85 dark:text-zinc-700">
                            Approval quality depends on the private package being complete before it reaches the queue.
                        </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:border-zinc-200 dark:bg-white dark:text-zinc-950">
                        {readinessItems.filter((item) => item.done).length}/{readinessItems.length} ready
                    </span>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {readinessItems.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4 dark:border-zinc-200 dark:bg-white"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-white dark:text-zinc-950">
                                    {item.label}
                                </p>
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                                    {item.done ? 'Ready' : 'Missing'}
                                </span>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-white/80 dark:text-zinc-700">
                                {item.detail}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {!isVerified ? (
                <div className="mt-6">
                    <button
                        type="button"
                        onClick={() => post(route('provider.verification.store'))}
                        disabled={processing}
                        className="rounded-full border border-white/15 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
                    >
                        {processing ? 'Submitting...' : buttonLabel}
                    </button>

                    <InputError
                        className="mt-3"
                        message={errors.verification_notes}
                    />
                    <InputError
                        className="mt-3"
                        message={errors.verification_documents}
                    />
                </div>
            ) : null}
        </section>
    );
}
