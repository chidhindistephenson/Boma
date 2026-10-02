import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function TwoFactorChallenge() {
    const { data, setData, post, processing, errors } = useForm({
        code: '',
        recovery_code: '',
    });

    const submit = (event) => {
        event.preventDefault();
        post(route('two-factor.verify'));
    };

    return (
        <GuestLayout>
            <Head title="Two-factor challenge" />

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                        Secure sign in
                    </p>
                    <h1 className="mt-2 font-display text-3xl font-semibold text-zinc-950">
                        Enter your 2FA code
                    </h1>
                    <p className="mt-2 text-sm text-zinc-500">
                        Use your authenticator app code, or a recovery code if you cannot access the app.
                    </p>
                </div>

                <div>
                    <TextInput
                        value={data.code}
                        onChange={(event) => setData('code', event.target.value)}
                        className="block w-full"
                        placeholder="123456"
                    />
                    <InputError message={errors.code} className="mt-2" />
                </div>

                <div>
                    <TextInput
                        value={data.recovery_code}
                        onChange={(event) => setData('recovery_code', event.target.value)}
                        className="block w-full"
                        placeholder="Recovery code"
                    />
                    <InputError message={errors.recovery_code} className="mt-2" />
                </div>

                <PrimaryButton disabled={processing}>Verify</PrimaryButton>
            </form>
        </GuestLayout>
    );
}
