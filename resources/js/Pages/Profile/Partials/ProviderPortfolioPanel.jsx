import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';

function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaPreview({ item }) {
    if (item.mediaType === 'image') {
        return (
            <img
                src={item.mediaUrl}
                alt={item.title}
                className="h-48 w-full object-cover"
                loading="lazy"
            />
        );
    }

    if (item.mediaType === 'video') {
        return (
            <video
                src={item.mediaUrl}
                className="h-48 w-full bg-zinc-950 object-cover"
                controls
                preload="metadata"
            >
                <track kind="captions" />
            </video>
        );
    }

    return (
        <a
            href={item.mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-48 flex-col items-center justify-center bg-zinc-100 px-6 text-center dark:bg-zinc-900"
        >
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                PDF document
            </span>
            <span className="mt-3 text-sm font-semibold text-zinc-950 underline underline-offset-4 dark:text-white">
                Open {item.originalName}
            </span>
        </a>
    );
}

function PortfolioItemEditor({ item, services }) {
    const { data, setData, patch, delete: destroy, processing, errors, recentlySuccessful } =
        useForm({
            title: item.title,
            description: item.description,
            provider_service_id: item.serviceId ?? '',
            sort_order: item.sortOrder,
        });

    const updateItem = (event) => {
        event.preventDefault();
        patch(route('provider.portfolio.update', item.id), {
            preserveScroll: true,
        });
    };

    const removeItem = () => {
        if (!window.confirm('Remove this portfolio item and its media file?')) {
            return;
        }

        destroy(route('provider.portfolio.destroy', item.id), {
            preserveScroll: true,
        });
    };

    return (
        <article className="overflow-hidden rounded-[1.7rem] border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950">
            <MediaPreview item={item} />

            <form onSubmit={updateItem} className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    <span>{item.mediaType}</span>
                    <span>{formatFileSize(item.sizeBytes)}</span>
                </div>

                <div>
                    <InputLabel
                        htmlFor={`portfolio-service-${item.id}`}
                        value="Linked service package"
                    />
                    <select
                        id={`portfolio-service-${item.id}`}
                        value={data.provider_service_id}
                        onChange={(event) =>
                            setData('provider_service_id', event.target.value)
                        }
                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                    >
                        <option value="">General portfolio</option>
                        {services.map((service) => (
                            <option key={service.id} value={service.id}>
                                {service.title}
                            </option>
                        ))}
                    </select>
                    <InputError
                        className="mt-2"
                        message={errors.provider_service_id}
                    />
                </div>

                <div>
                    <InputLabel htmlFor={`portfolio-title-${item.id}`} value="Title" />
                    <TextInput
                        id={`portfolio-title-${item.id}`}
                        className="mt-1 block w-full"
                        value={data.title}
                        onChange={(event) => setData('title', event.target.value)}
                        required
                    />
                    <InputError className="mt-2" message={errors.title} />
                </div>

                <div>
                    <InputLabel
                        htmlFor={`portfolio-description-${item.id}`}
                        value="Description"
                    />
                    <textarea
                        id={`portfolio-description-${item.id}`}
                        rows={4}
                        value={data.description}
                        onChange={(event) =>
                            setData('description', event.target.value)
                        }
                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        required
                    />
                    <InputError className="mt-2" message={errors.description} />
                </div>

                <div>
                    <InputLabel
                        htmlFor={`portfolio-order-${item.id}`}
                        value="Display order"
                    />
                    <TextInput
                        id={`portfolio-order-${item.id}`}
                        type="number"
                        min="0"
                        max="999"
                        className="mt-1 block w-full"
                        value={data.sort_order}
                        onChange={(event) =>
                            setData('sort_order', event.target.value)
                        }
                    />
                    <InputError className="mt-2" message={errors.sort_order} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={removeItem}
                        disabled={processing}
                        className="text-sm font-semibold text-red-700 underline decoration-red-300 underline-offset-4 disabled:opacity-50 dark:text-red-300 dark:decoration-red-900"
                    >
                        Remove item
                    </button>
                    <div className="flex items-center gap-3">
                        {recentlySuccessful ? (
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                Saved
                            </span>
                        ) : null}
                        <PrimaryButton disabled={processing}>Update</PrimaryButton>
                    </div>
                </div>
            </form>
        </article>
    );
}

export default function ProviderPortfolioPanel({ items, services }) {
    const fileInputRef = useRef(null);
    const { data, setData, post, processing, progress, errors, reset } = useForm({
        title: '',
        description: '',
        media: null,
        provider_service_id: '',
        sort_order: items.length,
    });

    const uploadItem = (event) => {
        event.preventDefault();

        post(route('provider.portfolio.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    return (
        <section className="border border-zinc-200/80 bg-white/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/90 sm:rounded-[2rem] sm:p-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Work showcase
                    </p>
                    <h2 className="mt-2 font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                        Portfolio gallery
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        Add finished work, short demonstrations, or supporting PDF
                        documents. Each file may be up to 100 MB; total portfolio storage
                        is limited to 500 MB.
                    </p>
                </div>
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    {items.length} item{items.length === 1 ? '' : 's'}
                </p>
            </div>

            <form
                onSubmit={uploadItem}
                className="mt-8 rounded-[1.7rem] border border-zinc-200 bg-zinc-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]"
            >
                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="portfolio_title" value="Project title" />
                        <TextInput
                            id="portfolio_title"
                            className="mt-1 block w-full"
                            value={data.title}
                            onChange={(event) => setData('title', event.target.value)}
                            placeholder="Kitchen cabinet restoration"
                            required
                        />
                        <InputError className="mt-2" message={errors.title} />
                    </div>

                    <div>
                        <InputLabel htmlFor="portfolio_media" value="Image, video, or PDF" />
                        <input
                            ref={fileInputRef}
                            id="portfolio_media"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf"
                            onChange={(event) =>
                                setData('media', event.target.files?.[0] ?? null)
                            }
                            className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-700 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:file:bg-white dark:file:text-zinc-950"
                            required
                        />
                        <InputError className="mt-2" message={errors.media} />
                    </div>

                    <div>
                        <InputLabel
                            htmlFor="portfolio_service"
                            value="Link to service package (optional)"
                        />
                        <select
                            id="portfolio_service"
                            value={data.provider_service_id}
                            onChange={(event) =>
                                setData('provider_service_id', event.target.value)
                            }
                            className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        >
                            <option value="">General portfolio</option>
                            {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                    {service.title}
                                </option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                            Each service package can carry up to five images.
                        </p>
                        <InputError
                            className="mt-2"
                            message={errors.provider_service_id}
                        />
                    </div>

                    <div>
                        <InputLabel htmlFor="portfolio_description" value="Description" />
                        <textarea
                            id="portfolio_description"
                            rows={4}
                            value={data.description}
                            onChange={(event) =>
                                setData('description', event.target.value)
                            }
                            className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                            placeholder="Explain the work completed, materials used, and the result customers can expect."
                            required
                        />
                        <InputError className="mt-2" message={errors.description} />
                    </div>
                </div>

                {progress ? (
                    <div className="mt-5">
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                            <div
                                className="h-full rounded-full bg-zinc-950 transition-all dark:bg-white"
                                style={{ width: `${progress.percentage}%` }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            Uploading {progress.percentage}%
                        </p>
                    </div>
                ) : null}

                <div className="mt-5 flex justify-end">
                    <PrimaryButton disabled={processing || !data.media}>
                        Add to portfolio
                    </PrimaryButton>
                </div>
            </form>

            {items.length ? (
                <div className="mt-8 grid gap-5 lg:grid-cols-2">
                    {items.map((item) => (
                        <PortfolioItemEditor
                            key={item.id}
                            item={item}
                            services={services}
                        />
                    ))}
                </div>
            ) : (
                <div className="mt-8 rounded-[1.7rem] border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-white/15">
                    <p className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                        No portfolio work published yet.
                    </p>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        Upload your strongest completed project first. Clear visual proof
                        helps customers decide faster than a long description alone.
                    </p>
                </div>
            )}
        </section>
    );
}
