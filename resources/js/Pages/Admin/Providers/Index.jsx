import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import VerificationTimeline from '@/Components/VerificationTimeline';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

function formatStatus(value) {
    return value ? value.replace(/_/g, ' ') : 'not set';
}

function formatFileSize(sizeBytes) {
    if (sizeBytes >= 1024 * 1024) {
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function tradeStatusClasses(status) {
    if (status === 'verified') {
        return 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950';
    }

    if (status === 'rejected') {
        return 'border-zinc-400 bg-zinc-200 text-zinc-950 dark:border-white/20 dark:bg-white/10 dark:text-white';
    }

    return 'border-zinc-300 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300';
}

function documentStatusClasses(status) {
    if (status === 'approved') {
        return 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950';
    }

    if (status === 'rejected') {
        return 'border-zinc-400 bg-zinc-200 text-zinc-950 dark:border-white/20 dark:bg-white/10 dark:text-white';
    }

    if (status === 'superseded') {
        return 'border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400';
    }

    return 'border-zinc-300 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300';
}

function TradeCategoryReview({ category }) {
    const { data, setData, transform, patch, processing, errors } = useForm({
        action: 'approve',
        review_notes: category.reviewNotes ?? '',
    });

    const submit = (action) => {
        transform(() => ({
            action,
            review_notes: data.review_notes,
        }));

        patch(route('admin.provider-trade-categories.update', category.id), {
            preserveScroll: true,
        });
    };

    return (
        <article className="rounded-[1.2rem] border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h4 className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
                        {category.tradeCategory}
                    </h4>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                        {category.submittedAt
                            ? `Submitted ${category.submittedAt}`
                            : 'Not submitted'}
                    </p>
                </div>
                <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tradeStatusClasses(category.verificationStatus)}`}
                >
                    {formatStatus(category.verificationStatus)}
                </span>
            </div>

            <textarea
                rows={2}
                value={data.review_notes}
                onChange={(event) => setData('review_notes', event.target.value)}
                className="mt-4 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                placeholder="Optional approval note. Required when rejecting."
            />
            <InputError className="mt-2" message={errors.review_notes} />

            <div className="mt-4 flex flex-wrap gap-2">
                {category.verificationStatus !== 'verified' ? (
                    <button
                        type="button"
                        onClick={() => submit('approve')}
                        disabled={processing}
                        className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                    >
                        Approve trade
                    </button>
                ) : null}
                {category.verificationStatus !== 'rejected' ? (
                    <button
                        type="button"
                        onClick={() => submit('reject')}
                        disabled={processing}
                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-950 disabled:opacity-60 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                    >
                        Reject trade
                    </button>
                ) : null}
            </div>
        </article>
    );
}

function VerificationDocumentReview({ document }) {
    const { data, setData, transform, patch, processing, errors } = useForm({
        action: 'approve',
        review_notes: document.reviewNotes ?? '',
    });
    const canReview = ['pending', 'pending_replacement'].includes(
        document.verificationStatus,
    );

    const submit = (action) => {
        transform(() => ({
            action,
            review_notes: data.review_notes,
        }));

        patch(route('admin.provider-verification-documents.update', document.id), {
            preserveScroll: true,
        });
    };

    return (
        <div className="rounded-[1.2rem] border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            {document.documentType}
                        </p>
                        <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${documentStatusClasses(document.verificationStatus)}`}
                        >
                            {formatStatus(document.verificationStatus)}
                        </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {document.label || document.originalName}
                    </p>
                    <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                        {document.originalName}
                    </p>
                    {document.replacesOriginalName ? (
                        <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Replaces {document.replacesOriginalName}
                        </p>
                    ) : null}
                    {document.reviewNotes ? (
                        <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                            Admin note: {document.reviewNotes}
                        </p>
                    ) : null}
                </div>

                <a
                    href={route(
                        'provider.verification.documents.show',
                        document.id,
                    )}
                    className="shrink-0 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                >
                    Download
                </a>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    {formatFileSize(document.sizeBytes)} - {document.uploadedAt}
                </span>
                {document.reviewedAt ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                        Reviewed {document.reviewedAt}
                    </span>
                ) : null}
            </div>

            {canReview ? (
                <>
                    <textarea
                        rows={2}
                        value={data.review_notes}
                        onChange={(event) =>
                            setData('review_notes', event.target.value)
                        }
                        className="mt-4 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        placeholder="Optional approval note. Required when rejecting."
                    />
                    <InputError className="mt-2" message={errors.review_notes} />

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => submit('approve')}
                            disabled={processing}
                            className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                        >
                            Approve document
                        </button>
                        <button
                            type="button"
                            onClick={() => submit('reject')}
                            disabled={processing}
                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-950 disabled:opacity-60 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                        >
                            Reject document
                        </button>
                    </div>
                </>
            ) : null}
        </div>
    );
}

function ProviderReviewCard({ provider }) {
    const [activeTab, setActiveTab] = useState('overview');
    const { data, setData, transform, patch, processing, errors, reset } =
        useForm({
            action: 'approve',
            review_notes: provider.verificationReviewNotes ?? '',
        });
    const tabs = [
        { key: 'overview', label: 'Overview' },
        {
            key: 'trades',
            label: `Trades (${(provider.tradeCategories ?? []).length})`,
        },
        {
            key: 'documents',
            label: `Documents (${provider.verificationDocuments.length})`,
        },
        { key: 'activity', label: 'Activity' },
        { key: 'decision', label: 'Decision' },
    ];

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
        <article className="boma-stat-card rounded-[2rem] p-6">
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
                </div>

                <span className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white">
                    {provider.status === 'active'
                        ? 'Directory eligible'
                        : formatStatus(provider.status)}
                </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="boma-stat-card rounded-[1.4rem] p-5">
                    <p className="boma-stat-card-title text-xs uppercase tracking-[0.18em]">
                        Contact
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {provider.email}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {provider.phone}
                    </p>
                </div>

                <div className="boma-stat-card rounded-[1.4rem] p-5">
                    <p className="boma-stat-card-title text-xs uppercase tracking-[0.18em]">
                        Location
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {provider.locationLabel || 'Not set'}
                    </p>
                </div>

                <div className="boma-stat-card rounded-[1.4rem] p-5">
                    <p className="boma-stat-card-title text-xs uppercase tracking-[0.18em]">
                        Submitted
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                        {provider.verificationSubmittedAt ?? 'Not submitted'}
                    </p>
                </div>

                <div className="boma-stat-card rounded-[1.4rem] p-5">
                    <p className="boma-stat-card-title text-xs uppercase tracking-[0.18em]">
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

            <div className="mt-6 border-b border-zinc-200 dark:border-white/10">
                <div className="flex gap-6 overflow-x-auto">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;

                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
                                    isActive
                                        ? 'border-zinc-950 text-zinc-950 dark:border-white dark:text-white'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-6">
                {activeTab === 'overview' ? (
                    <div className="boma-stat-card rounded-[1.4rem] p-5">
                        <p className="boma-stat-card-title text-xs uppercase tracking-[0.18em]">
                            Provider profile
                        </p>
                        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                            {provider.bio || 'No provider bio has been submitted.'}
                        </p>
                    </div>
                ) : null}

                {activeTab === 'trades' ? (
                    <div className="boma-stat-card rounded-[1.4rem] p-5">
                        <p className="boma-stat-card-title text-xs uppercase tracking-[0.18em]">
                            Trade categories
                        </p>

                        {(provider.tradeCategories ?? []).length ? (
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                {provider.tradeCategories.map((category) => (
                                    <TradeCategoryReview
                                        key={category.id}
                                        category={category}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                No trade categories have been submitted yet.
                            </p>
                        )}
                    </div>
                ) : null}

                {activeTab === 'documents' ? (
                    <div className="boma-stat-card rounded-[1.4rem] p-5">
                        <p className="boma-stat-card-title text-xs uppercase tracking-[0.18em]">
                            Verification documents
                        </p>

                        {provider.verificationDocuments.length ? (
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                {provider.verificationDocuments.map((document) => (
                                    <VerificationDocumentReview
                                        key={document.id}
                                        document={document}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                No verification documents uploaded yet.
                            </p>
                        )}
                    </div>
                ) : null}

                {activeTab === 'activity' ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="boma-stat-card rounded-[1.4rem] p-5">
                            <p className="boma-stat-card-title text-xs uppercase tracking-[0.18em]">
                                Provider verification note
                            </p>
                            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                {provider.verificationNotes ||
                                    'No private verification note was submitted.'}
                            </p>
                        </div>

                        <div className="boma-stat-card rounded-[1.4rem] p-5">
                            <p className="boma-stat-card-title text-xs uppercase tracking-[0.18em]">
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

                        <div className="lg:col-span-2">
                            <VerificationTimeline
                                entries={provider.verificationTimeline}
                                title="Review activity"
                                subtitle="This timeline keeps the provider package, submissions, and moderation outcomes in one place."
                                emptyMessage="No verification activity is recorded for this provider yet."
                                compact
                            />
                        </div>
                    </div>
                ) : null}

                {activeTab === 'decision' ? (
                    <>
                        <div className="boma-stat-card rounded-[1.4rem] p-5">
                            <label
                                htmlFor={`review_notes_${provider.id}`}
                                className="boma-stat-card-title text-xs uppercase tracking-[0.18em]"
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
                    </>
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
                                            : 'border-zinc-200/80 bg-white/90 text-zinc-950 hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-zinc-950/90 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900'
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

                    {providers.data.length ? (
                        <div className="space-y-6">
                            <div className="flex flex-col gap-3 rounded-[1.6rem] border border-zinc-200/80 bg-white/90 p-5 text-sm text-zinc-600 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
                                <span>
                                    Showing {providers.from ?? 0}-{providers.to ?? 0} of {providers.total} providers
                                </span>
                                <span className="font-semibold text-zinc-950 dark:text-white">
                                    Page {providers.current_page} of {providers.last_page}
                                </span>
                            </div>

                            {providers.data.map((provider) => (
                                <ProviderReviewCard
                                    key={provider.id}
                                    provider={provider}
                                />
                            ))}

                            <div className="flex flex-col gap-4 rounded-[1.6rem] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950/90 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Page {providers.current_page} of {providers.last_page}
                                </p>

                                <div className="flex gap-3">
                                    {providers.prev_page_url ? (
                                        <Link
                                            href={providers.prev_page_url}
                                            preserveScroll
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Previous
                                        </Link>
                                    ) : (
                                        <span className="rounded-full border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-600">
                                            Previous
                                        </span>
                                    )}

                                    {providers.next_page_url ? (
                                        <Link
                                            href={providers.next_page_url}
                                            preserveScroll
                                            className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                        >
                                            Next
                                        </Link>
                                    ) : (
                                        <span className="rounded-full border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-600">
                                            Next
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50/90 p-8 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                            No providers match this filter right now.
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
