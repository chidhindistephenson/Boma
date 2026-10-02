import InputError from '@/Components/InputError';
import UserAvatar from '@/Components/UserAvatar';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function CameraIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3l-1.5-2Z" />
            <path d="M12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        </svg>
    );
}

export default function ProfilePhotoPanel({ user, compact = false }) {
    const input = useRef(null);
    const [preview, setPreview] = useState(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        photo: null,
    });

    useEffect(() => {
        if (!data.photo) {
            setPreview(null);
            return undefined;
        }

        const url = URL.createObjectURL(data.photo);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [data.photo]);

    const upload = (event) => {
        event.preventDefault();
        post(route('profile.photo.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                if (input.current) input.current.value = '';
            },
        });
    };

    const remove = () => {
        router.delete(route('profile.photo.destroy'), {
            preserveScroll: true,
        });
    };

    if (compact) {
        return (
            <section>
                <form onSubmit={upload} className="flex flex-col items-center">
                    <div className="relative">
                        <UserAvatar
                            name={user.name}
                            src={preview || user.profilePhotoUrl}
                            className="mx-auto h-24 w-24"
                            textClassName="text-2xl"
                        />
                        <input
                            ref={input}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(event) =>
                                setData('photo', event.target.files?.[0] ?? null)
                            }
                        />
                        <button
                            type="button"
                            onClick={() => input.current?.click()}
                            className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-zinc-950 text-white shadow-lg transition hover:bg-zinc-800 dark:border-zinc-950 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                            aria-label="Choose profile photo"
                            title="Choose profile photo"
                        >
                            <CameraIcon />
                        </button>
                    </div>

                    {data.photo ? (
                        <button
                            type="submit"
                            disabled={processing}
                            className="mt-3 border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:border-zinc-950 disabled:opacity-50 dark:border-white/15 dark:text-white dark:hover:border-white"
                        >
                            {processing ? 'Uploading...' : 'Save photo'}
                        </button>
                    ) : user.profilePhotoUrl ? (
                        <button
                            type="button"
                            onClick={remove}
                            className="mt-3 text-xs font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 dark:text-zinc-400 dark:decoration-zinc-700 dark:hover:text-white"
                        >
                            Remove photo
                        </button>
                    ) : (
                        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                            JPG, PNG or WebP
                        </p>
                    )}

                    <InputError className="mt-2" message={errors.photo} />
                </form>
            </section>
        );
    }

    return (
        <section className="border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.035] sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <UserAvatar
                    name={user.name}
                    src={preview || user.profilePhotoUrl}
                    className="h-24 w-24"
                    textClassName="text-2xl"
                />

                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                        Profile photo
                    </p>
                    <h3 className="mt-2 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                        Make your account recognisable
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        JPG, PNG or WebP. Maximum file size 5 MB.
                    </p>

                    <form onSubmit={upload} className="mt-4 flex flex-wrap gap-2">
                        <input
                            ref={input}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(event) =>
                                setData('photo', event.target.files?.[0] ?? null)
                            }
                        />
                        <button
                            type="button"
                            onClick={() => input.current?.click()}
                            className="bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                        >
                            Choose photo
                        </button>
                        {data.photo ? (
                            <button
                                type="submit"
                                disabled={processing}
                                className="border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-950 transition hover:bg-white disabled:opacity-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
                            >
                                {processing ? 'Uploading...' : 'Save photo'}
                            </button>
                        ) : null}
                        {user.profilePhotoUrl ? (
                            <button
                                type="button"
                                onClick={remove}
                                className="px-3 py-2 text-xs font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 dark:text-zinc-400 dark:decoration-zinc-700 dark:hover:text-white"
                            >
                                Remove
                            </button>
                        ) : null}
                    </form>
                    {data.photo ? (
                        <p className="mt-3 truncate text-xs text-zinc-500 dark:text-zinc-400">
                            Selected: {data.photo.name}
                        </p>
                    ) : null}
                    <InputError className="mt-2" message={errors.photo} />
                </div>
            </div>
        </section>
    );
}
