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

function formatStatus(status) {
    return status ? status.replace(/_/g, ' ') : 'pending';
}

function statusClasses(status) {
    if (status === 'approved') {
        return 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950';
    }

    if (status === 'pending_replacement' || status === 'pending') {
        return 'border-zinc-300 bg-zinc-100 text-zinc-950 dark:border-white/15 dark:bg-white/10 dark:text-white';
    }

    return 'border-zinc-300 bg-white text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300';
}

function DocumentIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
        >
            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" />
            <path d="M14 2v5h5M9 13h6M9 17h4" />
        </svg>
    );
}

function UploadIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-hidden="true"
        >
            <path d="M12 16V4M7 9l5-5 5 5M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" />
        </svg>
    );
}

function recommendedEvidence(documents) {
    const usableDocuments = documents.filter((document) =>
        ['approved', 'pending', 'pending_replacement'].includes(
            document.verificationStatus,
        ),
    );
    const uploaded = new Set(
        usableDocuments.map((document) => document.documentType),
    );

    return [
        {
            title: 'Identity',
            types: ['National ID', 'Passport'],
            uploaded: uploaded.has('National ID') || uploaded.has('Passport'),
        },
        {
            title: 'Business',
            types: ['Business registration', 'Tax certificate'],
            uploaded:
                uploaded.has('Business registration') ||
                uploaded.has('Tax certificate'),
        },
        {
            title: 'Location',
            types: ['Proof of address'],
            uploaded: uploaded.has('Proof of address'),
        },
        {
            title: 'Trade proof',
            types: [
                'Professional license',
                'Insurance certificate',
                'Portfolio sample',
            ],
            uploaded:
                uploaded.has('Professional license') ||
                uploaded.has('Insurance certificate') ||
                uploaded.has('Portfolio sample'),
        },
    ];
}

function DocumentDropZone({
    id,
    file,
    error,
    isDragging,
    setIsDragging,
    setFile,
    fileInputKey,
}) {
    return (
        <div>
            <InputLabel htmlFor={id} value="Upload file" />
            <label
                htmlFor={id}
                onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    setFile(event.dataTransfer.files?.[0] ?? null);
                }}
                className={`mt-1 flex cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-8 text-center transition ${
                    isDragging
                        ? 'border-zinc-950 bg-zinc-100 dark:border-white dark:bg-white/[0.08]'
                        : 'border-zinc-300 bg-zinc-50 hover:border-zinc-950 dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-white'
                }`}
            >
                <span className="grid h-12 w-12 place-items-center bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                    <UploadIcon />
                </span>
                <span className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
                    {file ? file.name : 'Choose or drop a document'}
                </span>
                <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    PDF, JPG or PNG up to 12 MB
                </span>
            </label>
            <input
                key={fileInputKey}
                id={id}
                type="file"
                accept=".pdf,image/jpeg,image/png"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="sr-only"
            />
            <InputError className="mt-2" message={error} />
        </div>
    );
}

function ReplacementForm({ document, onCancel }) {
    const [fileInputKey, setFileInputKey] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        label: document.label || '',
        file: null,
    });

    const submit = (event) => {
        event.preventDefault();

        post(route('provider.verification.documents.replace', document.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset('label', 'file');
                setFileInputKey((current) => current + 1);
                onCancel();
            },
        });
    };

    return (
        <form
            onSubmit={submit}
            className="mt-4 border-t border-zinc-200 pt-4 dark:border-white/10"
        >
            <div className="grid gap-4 lg:grid-cols-2">
                <div>
                    <InputLabel
                        htmlFor={`replacement_label_${document.id}`}
                        value="Replacement label"
                    />
                    <input
                        id={`replacement_label_${document.id}`}
                        type="text"
                        value={data.label}
                        onChange={(event) => setData('label', event.target.value)}
                        className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        placeholder="Example: Renewed tax certificate"
                    />
                    <InputError className="mt-2" message={errors.label} />
                </div>

                <DocumentDropZone
                    id={`replacement_file_${document.id}`}
                    file={data.file}
                    error={errors.file}
                    isDragging={isDragging}
                    setIsDragging={setIsDragging}
                    setFile={(file) => setData('file', file)}
                    fileInputKey={fileInputKey}
                />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    type="submit"
                    disabled={processing}
                    className="bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                >
                    {processing ? 'Submitting...' : 'Submit replacement'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default function ProviderVerificationDocumentsPanel({
    documents = [],
    verificationDocumentTypes = [],
}) {
    const { auth } = usePage().props;
    const isProvider = auth.user.role === 'provider';
    const [fileInputKey, setFileInputKey] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [replacementFor, setReplacementFor] = useState(null);
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
    const evidence = recommendedEvidence(documents);
    const readyCount = evidence.filter((item) => item.uploaded).length;

    return (
        <section className="border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_50px_rgba(0,0,0,0.26)] sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                        Verification package
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        Documents admins can trust
                    </h3>
                </div>
                <span className="border border-zinc-300 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
                    {documents.length} document{documents.length === 1 ? '' : 's'}
                </span>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
                {evidence.map((item) => (
                    <div
                        key={item.title}
                        className={`border p-4 ${
                            item.uploaded
                                ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                : 'border-zinc-200 bg-zinc-50 text-zinc-950 dark:border-white/10 dark:bg-white/[0.035] dark:text-white'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold">{item.title}</p>
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                                {item.uploaded ? 'Added' : 'Needed'}
                            </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 opacity-75">
                            {item.types.join(' / ')}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-4 h-2 overflow-hidden bg-zinc-100 dark:bg-white/[0.06]">
                <div
                    className="h-full bg-zinc-950 transition-all dark:bg-white"
                    style={{ width: `${(readyCount / evidence.length) * 100}%` }}
                />
            </div>

            {documents.length ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {documents.map((document) => {
                        const canRemove = [
                            'pending',
                            'pending_replacement',
                            'rejected',
                        ].includes(document.verificationStatus);
                        const canReplace =
                            document.verificationStatus === 'approved';

                        return (
                            <div
                                key={document.id}
                                className="border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.035]"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex min-w-0 gap-3">
                                        <span className="grid h-10 w-10 shrink-0 place-items-center bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                                            <DocumentIcon />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                                    {document.documentType}
                                                </p>
                                                <span
                                                    className={`border px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${statusClasses(document.verificationStatus)}`}
                                                >
                                                    {formatStatus(
                                                        document.verificationStatus,
                                                    )}
                                                </span>
                                            </div>
                                            <p className="mt-2 truncate text-base font-medium text-zinc-950 dark:text-white">
                                                {document.label ||
                                                    document.originalName}
                                            </p>
                                            <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                                                {document.originalName}
                                            </p>
                                            {document.replacesOriginalName ? (
                                                <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                                    Replaces{' '}
                                                    {document.replacesOriginalName}
                                                </p>
                                            ) : null}
                                            {document.reviewNotes ? (
                                                <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                                                    Admin note:{' '}
                                                    {document.reviewNotes}
                                                </p>
                                            ) : null}
                                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                                {formatFileSize(
                                                    document.sizeBytes,
                                                )}{' '}
                                                - uploaded {document.uploadedAt}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <a
                                            href={route(
                                                'provider.verification.documents.show',
                                                document.id,
                                            )}
                                            className="border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                        >
                                            Download
                                        </a>
                                        {canReplace ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setReplacementFor(
                                                        replacementFor ===
                                                            document.id
                                                            ? null
                                                            : document.id,
                                                    )
                                                }
                                                className="border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                            >
                                                Replace
                                            </button>
                                        ) : null}
                                        {canRemove ? (
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
                                                className="border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/20 dark:hover:bg-zinc-900"
                                            >
                                                Remove
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                {replacementFor === document.id ? (
                                    <ReplacementForm
                                        document={document}
                                        onCancel={() => setReplacementFor(null)}
                                    />
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-6 border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.035] dark:text-zinc-400">
                    No verification documents uploaded yet.
                </div>
            )}

            <InputError className="mt-4" message={errors.verification_documents} />

            <form
                onSubmit={submit}
                className="mt-6 grid gap-5 border-t border-zinc-200 pt-6 dark:border-white/10 lg:grid-cols-2"
            >
                <div>
                    <InputLabel htmlFor="document_type" value="Document type" />
                    <select
                        id="document_type"
                        value={data.document_type}
                        onChange={(event) =>
                            setData('document_type', event.target.value)
                        }
                        className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
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
                        onChange={(event) => setData('label', event.target.value)}
                        className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        placeholder="Example: Registrar certificate 2026"
                    />
                    <InputError className="mt-2" message={errors.label} />
                </div>

                <div className="lg:col-span-2">
                    <DocumentDropZone
                        id="file"
                        file={data.file}
                        error={errors.file}
                        isDragging={isDragging}
                        setIsDragging={setIsDragging}
                        setFile={(file) => setData('file', file)}
                        fileInputKey={fileInputKey}
                    />
                </div>

                <div className="lg:col-span-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                        {processing ? 'Uploading...' : 'Upload document'}
                    </button>
                    <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                        Approved files stay locked. Use Replace to submit a newer
                        version for admin approval.
                    </p>
                </div>
            </form>
        </section>
    );
}
