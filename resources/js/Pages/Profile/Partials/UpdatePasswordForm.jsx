import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, router, useForm } from '@inertiajs/react';
import { useRef } from 'react';

export default function UpdatePasswordForm({ className = '', formId, twoFactor }) {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    return (
        <section className={`${className} space-y-6`}>
            <header>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                    Security
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                    Change password
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    Use a long, unique password that you do not use elsewhere.
                </p>
            </header>

            <form id={formId} onSubmit={updatePassword} className="mt-6 space-y-6">
                <div>
                    <InputLabel
                        htmlFor="current_password"
                        value="Current Password"
                    />

                    <TextInput
                        id="current_password"
                        ref={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) =>
                            setData('current_password', e.target.value)
                        }
                        type="password"
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                    />

                    <InputError
                        message={errors.current_password}
                        className="mt-2"
                    />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="New Password" />

                    <TextInput
                        id="password"
                        ref={passwordInput}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        type="password"
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm Password"
                    />

                    <TextInput
                        id="password_confirmation"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        type="password"
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                    />

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <div className="min-h-6">
                    <Transition
                        show={recentlySuccessful || processing}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {processing ? 'Updating...' : 'Updated.'}
                        </p>
                    </Transition>
                </div>
            </form>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                    Two-factor authentication
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                    {twoFactor?.enabled ? '2FA is enabled' : 'Protect this account with 2FA'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {twoFactor?.mandatory
                        ? 'Admins must keep two-factor authentication enabled.'
                        : 'Use an authenticator app and recovery codes for stronger sign-in protection.'}
                </p>

                {twoFactor?.recoveryCodes?.length ? (
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
                        <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                            Save these recovery codes now:
                        </p>
                        <div className="mt-3 grid gap-2 font-mono text-sm text-zinc-600 dark:text-zinc-300 sm:grid-cols-2">
                            {twoFactor.recoveryCodes.map((code) => (
                                <span key={code}>{code}</span>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                        href={route('two-factor.setup')}
                        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white dark:bg-white dark:text-zinc-950"
                    >
                        {twoFactor?.enabled ? 'View setup' : 'Set up 2FA'}
                    </Link>
                    {twoFactor?.enabled && !twoFactor?.mandatory ? (
                        <button
                            type="button"
                            onClick={() => router.delete(route('two-factor.disable'), { preserveScroll: true })}
                            className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:border-white/10 dark:text-zinc-300"
                        >
                            Disable 2FA
                        </button>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
