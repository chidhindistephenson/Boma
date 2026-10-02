import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

const roles = [
    {
        value: 'customer',
        label: 'Customer',
        description: 'Find nearby service providers, compare profiles, and pay securely.',
    },
    {
        value: 'provider',
        label: 'Service Provider',
        description: 'Get discovered by local customers and manage your work from one dashboard.',
    },
];

export default function Register({ defaultRole, tradeCategories }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        role: defaultRole,
        name: '',
        email: '',
        phone: '',
        city: '',
        area: '',
        business_name: '',
        trade_category: '',
        bio: '',
        password: '',
        password_confirmation: '',
    });

    const isProvider = data.role === 'provider';

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Create account" />

            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
                        Phase 1 onboarding
                    </p>
                    <h1 className="font-display text-3xl font-semibold text-zinc-950 dark:text-white">
                        Create your Boma account
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        Start as a customer or a service provider. Provider accounts
                        begin in pending verification so KYC review can happen before
                        public listing.
                    </p>
                </div>

                <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                        Quick customer signup
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <a
                            href={route('oauth.redirect', 'google')}
                            className="rounded-full border border-zinc-200 bg-white px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-zinc-900 transition hover:border-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/30"
                        >
                            Continue with Google
                        </a>
                        <a
                            href={route('oauth.redirect', 'facebook')}
                            className="rounded-full border border-zinc-200 bg-white px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-zinc-900 transition hover:border-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:border-white/30"
                        >
                            Continue with Facebook
                        </a>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-8">
                    <div>
                        <InputLabel value="I am joining as" />
                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                            {roles.map((role) => (
                                <label
                                    key={role.value}
                                    className={`cursor-pointer rounded-3xl border p-5 transition ${
                                        data.role === role.value
                                            ? 'border-zinc-950 bg-zinc-950 text-white shadow-[0_20px_40px_rgba(0,0,0,0.12)] dark:border-white dark:bg-white dark:text-zinc-950'
                                            : 'border-zinc-200 bg-zinc-50/80 text-zinc-950 hover:border-zinc-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-white/20'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value={role.value}
                                        checked={data.role === role.value}
                                        onChange={(e) => setData('role', e.target.value)}
                                        className="sr-only"
                                    />
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="font-display text-xl font-semibold text-inherit">
                                                {role.label}
                                            </p>
                                            <p className="mt-2 text-sm text-inherit opacity-70">
                                                {role.description}
                                            </p>
                                        </div>
                                        <div
                                            className={`mt-1 h-4 w-4 rounded-full border ${
                                                data.role === role.value
                                                    ? 'border-current bg-current'
                                                    : 'border-zinc-400 dark:border-zinc-600'
                                            }`}
                                        />
                                    </div>
                                </label>
                            ))}
                        </div>
                        <InputError message={errors.role} className="mt-2" />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="name" value="Full name" />
                            <TextInput
                                id="name"
                                name="name"
                                value={data.name}
                                className="mt-1 block w-full"
                                autoComplete="name"
                                isFocused
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="email" value="Email address" />
                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="mt-1 block w-full"
                                autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />
                            <InputError message={errors.email} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="phone" value="Phone number" />
                            <TextInput
                                id="phone"
                                name="phone"
                                value={data.phone}
                                className="mt-1 block w-full"
                                autoComplete="tel"
                                onChange={(e) => setData('phone', e.target.value)}
                                required
                            />
                            <InputError message={errors.phone} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="city" value="City" />
                            <TextInput
                                id="city"
                                name="city"
                                value={data.city}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('city', e.target.value)}
                                required
                            />
                            <InputError message={errors.city} className="mt-2" />
                        </div>

                        <div className="md:col-span-2">
                            <InputLabel htmlFor="area" value="Area or suburb" />
                            <TextInput
                                id="area"
                                name="area"
                                value={data.area}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('area', e.target.value)}
                            />
                            <InputError message={errors.area} className="mt-2" />
                        </div>
                    </div>

                    {isProvider && (
                        <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/80 p-6 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="mb-5">
                                <h2 className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
                                    Provider profile setup
                                </h2>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    These details shape your public listing once your
                                    account is approved.
                                </p>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <InputLabel
                                        htmlFor="business_name"
                                        value="Business name"
                                    />
                                    <TextInput
                                        id="business_name"
                                        name="business_name"
                                        value={data.business_name}
                                        className="mt-1 block w-full"
                                        onChange={(e) =>
                                            setData('business_name', e.target.value)
                                        }
                                        required={isProvider}
                                    />
                                    <InputError
                                        message={errors.business_name}
                                        className="mt-2"
                                    />
                                </div>

                                <div>
                                    <InputLabel
                                        htmlFor="trade_category"
                                        value="Trade category"
                                    />
                                    <select
                                        id="trade_category"
                                        name="trade_category"
                                        value={data.trade_category}
                                        onChange={(e) =>
                                            setData('trade_category', e.target.value)
                                        }
                                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                        required={isProvider}
                                    >
                                        <option value="">Select a trade</option>
                                        {tradeCategories.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError
                                        message={errors.trade_category}
                                        className="mt-2"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <InputLabel htmlFor="bio" value="Short bio" />
                                    <textarea
                                        id="bio"
                                        name="bio"
                                        value={data.bio}
                                        onChange={(e) => setData('bio', e.target.value)}
                                        rows={4}
                                        className="mt-1 block w-full rounded-xl border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                        placeholder="Tell customers what you do, the areas you cover, and what makes your work reliable."
                                        required={isProvider}
                                    />
                                    <InputError message={errors.bio} className="mt-2" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="password" value="Password" />
                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                onChange={(e) => setData('password', e.target.value)}
                                required
                            />
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Minimum 8 characters with uppercase, lowercase, number,
                                and symbol.
                            </p>
                            <InputError message={errors.password} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel
                                htmlFor="password_confirmation"
                                value="Confirm password"
                            />
                            <TextInput
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                onChange={(e) =>
                                    setData('password_confirmation', e.target.value)
                                }
                                required
                            />
                            <InputError
                                message={errors.password_confirmation}
                                className="mt-2"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-zinc-200 pt-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                            href={route('login')}
                            className="text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-950 hover:underline dark:text-zinc-400 dark:hover:text-white"
                        >
                            Already registered? Sign in
                        </Link>

                        <PrimaryButton
                            className="justify-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em]"
                            disabled={processing}
                        >
                            Create account
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </GuestLayout>
    );
}
