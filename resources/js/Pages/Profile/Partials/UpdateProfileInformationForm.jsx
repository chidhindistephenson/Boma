import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function UpdateProfileInformation({
    formId,
    mustVerifyEmail,
    status,
    tradeCategories,
    requestUrgencyOptions,
    availabilityOptions,
    responseTimeOptions,
    section = 'profile',
    className = '',
}) {
    const user = usePage().props.auth.user;
    const isCustomer = user.role === 'customer';
    const isProvider = user.role === 'provider';
    const isVerifiedProvider =
        user.providerProfile?.verificationStatus === 'verified';
    const [locationStatus, setLocationStatus] = useState('');

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            section,
            name: user.name,
            email: user.email,
            phone: user.phone ?? '',
            city: user.city ?? '',
            area: user.area ?? '',
            latitude: user.latitude ?? '',
            longitude: user.longitude ?? '',
            preferred_radius_km:
                user.customerProfile?.preferredRadiusKm ??
                25,
            default_trade_category:
                user.customerProfile?.defaultTradeCategory ?? '',
            default_urgency: user.customerProfile?.defaultUrgency ?? 'flexible',
            default_budget_min: user.customerProfile?.defaultBudgetMin ?? '',
            default_budget_max: user.customerProfile?.defaultBudgetMax ?? '',
            location_notes: user.customerProfile?.locationNotes ?? '',
            business_name: user.providerProfile?.businessName ?? '',
            headline: user.providerProfile?.headline ?? '',
            trade_category: user.providerProfile?.tradeCategory ?? '',
            bio: user.providerProfile?.bio ?? '',
            availability_status:
                user.providerProfile?.availabilityStatus ?? 'available',
            years_experience: user.providerProfile?.yearsExperience ?? '',
            base_price_from: user.providerProfile?.basePriceFrom ?? '',
            response_time_label: user.providerProfile?.responseTimeLabel ?? '',
            service_radius_km: user.providerProfile?.serviceRadiusKm ?? '',
            verification_notes: user.providerProfile?.verificationNotes ?? '',
        });

    const captureCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('Location access is not supported by this browser.');
            return;
        }

        setLocationStatus('Finding your location...');

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setData((current) => ({
                    ...current,
                    latitude: coords.latitude.toFixed(7),
                    longitude: coords.longitude.toFixed(7),
                }));
                setLocationStatus('Location captured. Save changes to keep it.');
            },
            () => {
                setLocationStatus(
                    'Location could not be captured. Allow location access or enter the coordinates manually.',
                );
            },
            {
                enableHighAccuracy: true,
                maximumAge: 60000,
                timeout: 12000,
            },
        );
    };

    const submit = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    const isPersonalSection = section === 'profile';
    const isRoleSection = section === 'preferences';
    const heading = isPersonalSection
        ? 'Personal information'
        : isProvider
          ? 'Business profile'
          : 'Service preferences';
    const description = isPersonalSection
        ? 'Keep your contact details and location accurate.'
        : isProvider
          ? 'Control the information customers see on your public storefront.'
          : 'Set defaults that make finding and requesting help faster.';

    return (
        <section className={className}>
            <header className="border-b border-zinc-200 pb-5 dark:border-white/10">
                <h2 className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                    {heading}
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {description}
                </p>
            </header>

            <form id={formId} onSubmit={submit} className="mt-6 space-y-7">
                {isPersonalSection ? (
                    <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="name" value="Full name" />

                        <TextInput
                            id="name"
                            className="mt-1 block w-full"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            isFocused
                            autoComplete="name"
                        />

                        <InputError className="mt-2" message={errors.name} />
                    </div>

                    <div>
                        <InputLabel htmlFor="email" value="Email address" />

                        <TextInput
                            id="email"
                            type="email"
                            className="mt-1 block w-full"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            autoComplete="username"
                        />

                        <InputError className="mt-2" message={errors.email} />
                    </div>

                    <div>
                        <InputLabel htmlFor="phone" value="Phone number" />

                        <TextInput
                            id="phone"
                            className="mt-1 block w-full"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            required
                            autoComplete="tel"
                        />

                        <InputError className="mt-2" message={errors.phone} />
                    </div>

                    <div>
                        <InputLabel htmlFor="city" value="City" />

                        <TextInput
                            id="city"
                            className="mt-1 block w-full"
                            value={data.city}
                            onChange={(e) => setData('city', e.target.value)}
                            required
                        />

                        <InputError className="mt-2" message={errors.city} />
                    </div>

                    <div className="md:col-span-2">
                        <InputLabel htmlFor="area" value="Area or suburb" />

                        <TextInput
                            id="area"
                            className="mt-1 block w-full"
                            value={data.area}
                            onChange={(e) => setData('area', e.target.value)}
                        />

                        <InputError className="mt-2" message={errors.area} />
                    </div>

                    <div className="border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.035] md:col-span-2">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                                    Map location
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={captureCurrentLocation}
                                className="shrink-0 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                            >
                                Use my location
                            </button>
                        </div>

                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="latitude" value="Latitude" />
                                <TextInput
                                    id="latitude"
                                    type="number"
                                    step="any"
                                    min="-90"
                                    max="90"
                                    className="mt-1 block w-full"
                                    value={data.latitude}
                                    onChange={(e) =>
                                        setData('latitude', e.target.value)
                                    }
                                    placeholder="-17.824858"
                                />
                                <InputError
                                    className="mt-2"
                                    message={errors.latitude}
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="longitude" value="Longitude" />
                                <TextInput
                                    id="longitude"
                                    type="number"
                                    step="any"
                                    min="-180"
                                    max="180"
                                    className="mt-1 block w-full"
                                    value={data.longitude}
                                    onChange={(e) =>
                                        setData('longitude', e.target.value)
                                    }
                                    placeholder="31.053028"
                                />
                                <InputError
                                    className="mt-2"
                                    message={errors.longitude}
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
                            <p>{locationStatus || 'You may also enter GPS coordinates manually.'}</p>
                            {data.latitude || data.longitude ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setData((current) => ({
                                            ...current,
                                            latitude: '',
                                            longitude: '',
                                        }));
                                        setLocationStatus('Map location cleared.');
                                    }}
                                    className="self-start font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200 dark:decoration-zinc-600"
                                >
                                    Clear coordinates
                                </button>
                            ) : null}
                        </div>
                    </div>
                    </div>
                ) : null}

                {isRoleSection && isCustomer && (
                    <div className="border border-zinc-200 bg-zinc-50 p-6 dark:border-white/10 dark:bg-white/[0.035]">
                        <div className="mb-5">
                            <h3 className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
                                Customer preferences
                            </h3>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <InputLabel
                                    htmlFor="preferred_radius_km"
                                    value="Preferred search radius (km)"
                                />

                                <TextInput
                                    id="preferred_radius_km"
                                    type="number"
                                    min="1"
                                    className="mt-1 block w-full"
                                    value={data.preferred_radius_km}
                                    onChange={(e) =>
                                        setData(
                                            'preferred_radius_km',
                                            e.target.value,
                                        )
                                    }
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.preferred_radius_km}
                                />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="default_trade_category"
                                    value="Default trade category"
                                />

                                <select
                                    id="default_trade_category"
                                    value={data.default_trade_category}
                                    onChange={(e) =>
                                        setData(
                                            'default_trade_category',
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                >
                                    <option value="">Choose when needed</option>
                                    {tradeCategories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>

                                <InputError
                                    className="mt-2"
                                    message={errors.default_trade_category}
                                />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="default_urgency"
                                    value="Default urgency"
                                />

                                <select
                                    id="default_urgency"
                                    value={data.default_urgency}
                                    onChange={(e) =>
                                        setData('default_urgency', e.target.value)
                                    }
                                    className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                >
                                    {Object.entries(requestUrgencyOptions).map(
                                        ([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>

                                <InputError
                                    className="mt-2"
                                    message={errors.default_urgency}
                                />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <InputLabel
                                        htmlFor="default_budget_min"
                                        value="Budget floor"
                                    />

                                    <TextInput
                                        id="default_budget_min"
                                        type="number"
                                        min="0"
                                        className="mt-1 block w-full"
                                        value={data.default_budget_min}
                                        onChange={(e) =>
                                            setData(
                                                'default_budget_min',
                                                e.target.value,
                                            )
                                        }
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.default_budget_min}
                                    />
                                </div>

                                <div>
                                    <InputLabel
                                        htmlFor="default_budget_max"
                                        value="Budget ceiling"
                                    />

                                    <TextInput
                                        id="default_budget_max"
                                        type="number"
                                        min="0"
                                        className="mt-1 block w-full"
                                        value={data.default_budget_max}
                                        onChange={(e) =>
                                            setData(
                                                'default_budget_max',
                                                e.target.value,
                                            )
                                        }
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.default_budget_max}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <InputLabel
                                    htmlFor="location_notes"
                                    value="Access and arrival notes"
                                />

                                <textarea
                                    id="location_notes"
                                    rows={4}
                                    value={data.location_notes}
                                    onChange={(e) =>
                                        setData('location_notes', e.target.value)
                                    }
                                    className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                    placeholder="Gate code, landmark, parking notes, best call-ahead timing, or anything providers should know before arriving."
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.location_notes}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {isRoleSection && isProvider && (
                    <div className="border border-zinc-200 bg-zinc-50 p-6 dark:border-white/10 dark:bg-white/[0.035]">
                        <div className="mb-5">
                            <h3 className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
                                Provider listing
                            </h3>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <InputLabel
                                    htmlFor="business_name"
                                    value="Business name"
                                />

                                <TextInput
                                    id="business_name"
                                    className="mt-1 block w-full"
                                    value={data.business_name}
                                    onChange={(e) =>
                                        setData('business_name', e.target.value)
                                    }
                                    required
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.business_name}
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="headline" value="Storefront headline" />

                                <TextInput
                                    id="headline"
                                    className="mt-1 block w-full"
                                    value={data.headline}
                                    onChange={(e) =>
                                        setData('headline', e.target.value)
                                    }
                                    placeholder="Fast, tidy electrical fixes for homes and shops."
                                />

                                <InputError className="mt-2" message={errors.headline} />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="trade_category"
                                    value="Trade category"
                                />

                                <select
                                    id="trade_category"
                                    value={data.trade_category}
                                    onChange={(e) =>
                                        setData('trade_category', e.target.value)
                                    }
                                    className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                    required
                                >
                                    <option value="">Select a trade</option>
                                    {tradeCategories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>

                                <InputError
                                    className="mt-2"
                                    message={errors.trade_category}
                                />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="availability_status"
                                    value="Availability"
                                />

                                <select
                                    id="availability_status"
                                    value={data.availability_status}
                                    onChange={(e) =>
                                        setData(
                                            'availability_status',
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                    required
                                >
                                    {availabilityOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option.replace(/_/g, ' ')}
                                        </option>
                                    ))}
                                </select>

                                <InputError
                                    className="mt-2"
                                    message={errors.availability_status}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <InputLabel htmlFor="bio" value="Short bio" />

                                <textarea
                                    id="bio"
                                    rows={4}
                                    value={data.bio}
                                    onChange={(e) => setData('bio', e.target.value)}
                                    className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                    required
                                />

                                <InputError className="mt-2" message={errors.bio} />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="years_experience"
                                    value="Years of experience"
                                />

                                <TextInput
                                    id="years_experience"
                                    type="number"
                                    min="0"
                                    className="mt-1 block w-full"
                                    value={data.years_experience}
                                    onChange={(e) =>
                                        setData(
                                            'years_experience',
                                            e.target.value,
                                        )
                                    }
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.years_experience}
                                />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="service_radius_km"
                                    value="Service radius (km)"
                                />

                                <TextInput
                                    id="service_radius_km"
                                    type="number"
                                    min="1"
                                    className="mt-1 block w-full"
                                    value={data.service_radius_km}
                                    onChange={(e) =>
                                        setData(
                                            'service_radius_km',
                                            e.target.value,
                                        )
                                    }
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.service_radius_km}
                                />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="base_price_from"
                                    value="Starting price"
                                />

                                <TextInput
                                    id="base_price_from"
                                    type="number"
                                    min="0"
                                    className="mt-1 block w-full"
                                    value={data.base_price_from}
                                    onChange={(e) =>
                                        setData(
                                            'base_price_from',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="75"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.base_price_from}
                                />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="response_time_label"
                                    value="Response time"
                                />

                                <select
                                    id="response_time_label"
                                    value={data.response_time_label}
                                    onChange={(e) =>
                                        setData(
                                            'response_time_label',
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                >
                                    <option value="">No response promise yet</option>
                                    {responseTimeOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>

                                <InputError
                                    className="mt-2"
                                    message={errors.response_time_label}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <InputLabel
                                    htmlFor="verification_notes"
                                    value="Verification note for admin review"
                                />

                                <textarea
                                    id="verification_notes"
                                    rows={4}
                                    value={data.verification_notes}
                                    disabled={isVerifiedProvider}
                                    onChange={(e) =>
                                        setData(
                                            'verification_notes',
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 block w-full border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                    placeholder="Add the business registration, years of experience, licenses, or any trust signals the admin should review."
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.verification_notes}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {isPersonalSection && mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-zinc-950 dark:text-white">
                            Your email address is unverified.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="ms-1 rounded-md text-sm text-zinc-700 underline hover:text-zinc-950 focus:outline-none dark:text-zinc-300 dark:hover:text-white"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                A new verification link has been sent to your
                                email address.
                            </div>
                        )}
                    </div>
                )}

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
        </section>
    );
}
