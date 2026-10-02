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
          ? 'Your last review was rejected. Improve the evidence package and resubmit.'
          : hasSubmitted
            ? 'Your listing is waiting for admin review.'
            : 'Upload strong evidence, then submit the package for admin review.';

    return (
        <section className="border border-zinc-200 bg-white p-6 text-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:shadow-[0_18px_50px_rgba(0,0,0,0.26)] sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                        Verification review
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-semibold">
                        {formatStatus(profile.verificationStatus)}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-white/80">
                        {statusMessage}
                    </p>
                </div>

                <span className="inline-flex border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
                    {documentCount} doc{documentCount === 1 ? '' : 's'}
                </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.05]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Submitted
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {profile.verificationSubmittedAt ?? 'Not yet'}
                    </p>
                </div>

                <div className="border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.05]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Reviewed
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {profile.reviewedAt ?? 'Pending'}
                    </p>
                </div>

                <div className="border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.05]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Verified
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {profile.verifiedAt ?? 'Not yet'}
                    </p>
                </div>

                <div className="border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.05]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Reviewed by
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {profile.reviewedByName ?? 'Pending'}
                    </p>
                </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.05]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Your private review note
                    </p>
                    <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-white/80">
                        {profile.verificationNotes ||
                            'No verification note saved yet.'}
                    </p>
                </div>

                <div className="border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.05]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Admin review note
                    </p>
                    <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-white/80">
                        {profile.verificationReviewNotes ||
                            'No review note yet.'}
                    </p>
                </div>
            </div>

            {!isVerified ? (
                <div className="mt-6">
                    <button
                        type="button"
                        onClick={() => post(route('provider.verification.store'))}
                        disabled={processing}
                        className="border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
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
