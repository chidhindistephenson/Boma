import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import VerificationTimeline from '@/Components/VerificationTimeline';
import { Head, Link, useForm } from '@inertiajs/react';

function formatStatus(value) {
    return value ? value.replace(/_/g, ' ') : 'not set';
}

function formatFileSize(sizeBytes) {
    if (sizeBytes >= 1024 * 1024) {
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function ProviderReviewCard({ provider }) {
    const { data, setData, transform, patch, processing, errors, reset } =
        useForm({
            action: 'approve',
            review_notes: provider.verificationReviewNotes ?? '',
        });

    const submit = (action) => {
        transform(() => ({
            action,
            review_notes: data.review_notes,
        }));

        patch(route('admin.providers.update', provider.id), {
            preserveScroll: true,
            onSuccess: () => {
                if (action === 'approve') {
                    reset('review_notes');
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
                            {formatStatus(provider.verificationStatus)}
                        </span>
                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                            {provider.tradeCategory}
                        </span>
                        <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                            {provider.emailVerified ? 'email verified' : 'email pending'}
                        </span>
                    </div>

                    <h3 className="mt-4 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                        {provider.businessName}
                    </h3>
                    <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        {provider.providerName}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        {provider.bio}
                    </p>
                </div>

                <span className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white">
                    {provider.status === 'active'
                        ? 'Directory eligible'
                        : formatStatus(provider.status)}
                </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Contact
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {provider.email}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {provider.phone}
                    </p>
                </div>

                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Location
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {provider.locationLabel || 'Not set'}
                    </p>
                </div>

                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Submitted
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {provider.verificationSubmittedAt ?? 'Not submitted'}
                    </p>
                </div>

                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Trust signals
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {provider.shortlistedByCustomersCount} shortlist
                        {provider.shortlistedByCustomersCount === 1 ? '' : 's'}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Member since {provider.memberSince}
                    </p>
                </div>
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Verification documents
                        </p>
                        <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                            {provider.verificationDocuments.length} uploaded file
                            {provider.verificationDocuments.length === 1 ? '' : 's'}
                        </p>
                    </div>
                </div>

                {provider.verificationDocuments.length ? (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {provider.verificationDocuments.map((document) => (
                            <div
                                key={document.id}
                                className="rounded-[1.2rem] border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900"
                            >
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                    {document.documentType}
                                </p>
                                <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                                    {document.label || document.originalName}
                                </p>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    {document.originalName}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                        {formatFileSize(document.sizeBytes)} - {document.uploadedAt}
                                    </span>
                                    <a
                                        href={route(
                                            'provider.verification.documents.show',
                                            document.id,
                                        )}
                                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        Download
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        No verification documents uploaded yet.
                    </p>
                )}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Provider verification note
                    </p>
                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        {provider.verificationNotes ||
                            'No private verification note was submitted.'}
                    </p>
                </div>

                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Latest review outcome
                    </p>
                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        {provider.verificationReviewNotes ||
                            'No review note has been left yet.'}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        {provider.reviewedAt
                            ? `Reviewed ${provider.reviewedAt}${
                                  provider.reviewedByName
                                      ? ` by ${provider.reviewedByName}`
                                      : ''
                              }`
                            : 'Not reviewed yet'}
                    </p>
                </div>
            </div>

            <div className="mt-6">
                <VerificationTimeline
                    entries={provider.verificationTimeline}
                    title="Review activity"
                    subtitle="This timeline keeps the provider package, submissions, and moderation outcomes in one place."
                    emptyMessage="No verification activity is recorded for this provider yet."
                    compact
                />
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <label
                    htmlFor={`review_notes_${provider.id}`}
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400"
                >
                    Admin review note
                </label>
                <textarea
                    id={`review_notes_${provider.id}`}
                    rows={4}
                    value={data.review_notes}
                    onChange={(event) =>
                        setData('review_notes', event.target.value)
                    }
                    className="mt-3 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                    placeholder="Add context for the decision, especially when rejecting the provider."
                />
                <InputError className="mt-2" message={errors.review_notes} />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                {provider.canApprove ? (
                    <button
                        type="button"
                        onClick={() => submit('approve')}
                        disabled={processing}
                        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                        {processing ? 'Saving...' : 'Approve provider'}
                    </button>
                ) : null}

                {provider.canReject ? (
                    <button
                        type="button"
                        onClick={() => submit('reject')}
                        disabled={processing}
                        className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                    >
                        {processing ? 'Saving...' : 'Reject provider'}
                    </button>
                ) : null}
            </div>
        </article>
    );
}

export default function Index({ activeStatus, providers, summary }) {
    const filters = [
        { label: 'Pending', value: 'pending', count: summary.pending },
        { label: 'Verified', value: 'verified', count: summary.verified },
        { label: 'Rejected', value: 'rejected', count: summary.rejected },
        {
            label: 'All',
            value: 'all',
            count: summary.pending + summary.verified + summary.rejected,
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Admin moderation
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        Provider verification queue
                    </h2>
                </div>
            }
        >
            <Head title="Provider Queue" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {filters.map((filter) => {
                            const isActive = activeStatus === filter.value;

                            return (
                                <Link
                                    key={filter.value}
                                    href={route('admin.providers.index', {
                                        status: filter.value,
                                    })}
                                    className={`rounded-[1.6rem] border p-5 transition ${
                                        isActive
                                            ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                            : 'border-zinc-200/80 bg-white/88 text-zinc-950 hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-zinc-950/82 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900'
                                    }`}
                                >
                                    <p
                                        className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                                            isActive
                                                ? 'text-white/75 dark:text-zinc-600'
                                                : 'text-zinc-500 dark:text-zinc-400'
                                        }`}
                                    >
                                        {filter.label}
                                    </p>
                                    <p className="mt-3 font-display text-3xl font-semibold">
                                        {filter.count}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>

                    {providers.length ? (
                        <div className="space-y-6">
                            {providers.map((provider) => (
                                <ProviderReviewCard
                                    key={provider.id}
                                    provider={provider}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-8 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                            No providers match this filter right now.
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
