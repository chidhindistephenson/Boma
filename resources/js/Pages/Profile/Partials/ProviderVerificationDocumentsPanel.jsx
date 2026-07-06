import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function formatFileSize(sizeBytes) {
    if (sizeBytes >= 1024 * 1024) {
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

export default function ProviderVerificationDocumentsPanel({
    documents = [],
    verificationDocumentTypes = [],
}) {
    const { auth } = usePage().props;
    const isProvider = auth.user.role === 'provider';
    const verificationStatus = auth.user.providerProfile?.verificationStatus;
    const isLocked = verificationStatus === 'verified';
    const [fileInputKey, setFileInputKey] = useState(0);
    const { data, setData, post, processing, errors, reset } = useForm({
        document_type: '',
        label: '',
        file: null,
    });

    if (!isProvider) {
        return null;
    }

    const submit = (event) => {
        event.preventDefault();

        post(route('provider.verification.documents.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset('document_type', 'label', 'file');
                setFileInputKey((current) => current + 1);
            },
        });
    };

    return (
        <section className="rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                        KYC documents
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        Private verification uploads
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        Upload PDFs or images the admin can review privately.
                        Verified providers are locked to preserve the audit trail.
                    </p>
                </div>
                <span className="rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
                    {documents.length} document{documents.length === 1 ? '' : 's'}
                </span>
            </div>

            {documents.length ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {documents.map((document) => (
                        <div
                            key={document.id}
                            className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                        {document.documentType}
                                    </p>
                                    <p className="mt-2 text-base font-medium text-zinc-950 dark:text-white">
                                        {document.label || document.originalName}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        {document.originalName}
                                    </p>
                                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                        {formatFileSize(document.sizeBytes)} - uploaded{' '}
                                        {document.uploadedAt}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <a
                                        href={route(
                                            'provider.verification.documents.show',
                                            document.id,
                                        )}
                                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                    >
                                        Download
                                    </a>
                                    {!isLocked ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.delete(
                                                    route(
                                                        'provider.verification.documents.destroy',
                                                        document.id,
                                                    ),
                                                    {
                                                        preserveScroll: true,
                                                    },
                                                )
                                            }
                                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Remove
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                    No verification documents uploaded yet.
                </div>
            )}

            <InputError className="mt-4" message={errors.verification_documents} />

            {!isLocked ? (
                <form onSubmit={submit} className="mt-6 grid gap-5 lg:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="document_type" value="Document type" />
                        <select
                            id="document_type"
                            value={data.document_type}
                            onChange={(event) =>
                                setData('document_type', event.target.value)
                            }
                            className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                            required
                        >
                            <option value="">Select a document type</option>
                            {verificationDocumentTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                        <InputError className="mt-2" message={errors.document_type} />
                    </div>

                    <div>
                        <InputLabel htmlFor="label" value="Internal label" />
                        <input
                            id="label"
                            type="text"
                            value={data.label}
                            onChange={(event) =>
                                setData('label', event.target.value)
                            }
                            className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                            placeholder="Example: Registrar certificate 2026"
                        />
                        <InputError className="mt-2" message={errors.label} />
                    </div>

                    <div className="lg:col-span-2">
                        <InputLabel htmlFor="file" value="PDF, JPG, or PNG" />
                        <input
                            key={fileInputKey}
                            id="file"
                            type="file"
                            accept=".pdf,image/jpeg,image/png"
                            onChange={(event) =>
                                setData('file', event.target.files?.[0] ?? null)
                            }
                            className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm file:mr-4 file:rounded-full file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:file:bg-white dark:file:text-zinc-950 dark:hover:file:bg-zinc-200"
                            required
                        />
                        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                            Keep documents clear and current. Uploads are stored
                            privately and are only visible to you and platform
                            admins.
                        </p>
                        <InputError className="mt-2" message={errors.file} />
                    </div>

                    <div className="lg:col-span-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                        >
                            {processing ? 'Uploading...' : 'Upload document'}
                        </button>
                    </div>
                </form>
            ) : null}
        </section>
    );
}
