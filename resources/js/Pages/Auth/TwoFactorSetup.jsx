import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function TwoFactorSetup({ secret, otpauthUrl, mandatory, enabled }) {
    const { data, setData, post, processing, errors } = useForm({ code: '' });

    const submit = (event) => {
        event.preventDefault();
        post(route('two-factor.enable'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Account security
                    </p>
                    <h2 className="font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                        Two-factor authentication
                    </h2>
                </div>
            }
        >
            <Head title="Set up 2FA" />

            <div className="py-12">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                            {mandatory ? 'Required for admins' : 'Optional protection'}
                        </p>
                        <h3 className="mt-3 font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                            {enabled ? '2FA is enabled' : 'Connect an authenticator app'}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                            Add this secret to Google Authenticator, 1Password, Microsoft Authenticator, or another TOTP app.
                        </p>

                        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                Manual secret
                            </p>
                            <p className="mt-2 break-all font-mono text-sm text-zinc-950 dark:text-white">
                                {secret}
                            </p>
                            <p className="mt-2 break-all text-xs text-zinc-500 dark:text-zinc-400">
                                {otpauthUrl}
                            </p>
                        </div>

                        {!enabled ? (
                            <form onSubmit={submit} className="mt-6 space-y-4">
                                <TextInput
                                    value={data.code}
                                    onChange={(event) => setData('code', event.target.value)}
                                    className="block w-full"
                                    placeholder="Enter the 6-digit code"
                                />
                                <InputError message={errors.code} />
                                <PrimaryButton disabled={processing}>Enable 2FA</PrimaryButton>
                            </form>
                        ) : null}
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
