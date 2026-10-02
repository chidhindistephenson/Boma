import VerificationTimeline from '@/Components/VerificationTimeline';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import BillingPanel from './Partials/BillingPanel';
import DeleteUserForm from './Partials/DeleteUserForm';
import ProfilePhotoPanel from './Partials/ProfilePhotoPanel';
import ProviderVerificationDocumentsPanel from './Partials/ProviderVerificationDocumentsPanel';
import ProviderVerificationPanel from './Partials/ProviderVerificationPanel';
import ProviderTradeCategoriesPanel from './Partials/ProviderTradeCategoriesPanel';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

const icons = {
    profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0',
    preferences: 'M4 7h10M18 7h2M4 17h2m4 0h10M14 4v6M8 14v6',
    verification: 'm12 3 7 3v5c0 4.5-2.7 8-7 10-4.3-2-7-5.5-7-10V6l7-3Zm-3 9 2 2 4-4',
    security: 'M6 10V8a6 6 0 0 1 12 0v2M5 10h14v11H5V10Zm7 4v3',
    danger: 'M12 3 2 21h20L12 3Zm0 6v5m0 3v.01',
    link: 'M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10.5 5M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.9-.9',
    update: 'M20 6 9 17l-5-5',
};

function Icon({ name }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
        >
            <path d={icons[name]} />
        </svg>
    );
}

function Surface({ children, className = '' }) {
    return (
        <div
            className={`border border-zinc-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_60px_rgba(0,0,0,0.24)] ${className}`}
        >
            {children}
        </div>
    );
}

function AccountTabs({ activeSection, isProvider, isCustomer }) {
    const items = [
        { id: 'profile', label: 'Account Settings' },
        ...(isCustomer
            ? [{ id: 'preferences', label: 'Preferences' }]
            : []),
        ...(isProvider
            ? [
                  { id: 'preferences', label: 'Company Settings' },
                  { id: 'verification', label: 'Documents' },
              ]
            : []),
        { id: 'billing', label: 'Wallet & Cards' },
        { id: 'security', label: 'Security' },
        { id: 'danger', label: 'Danger' },
    ];

    return (
        <nav
            aria-label="Account settings"
            className="flex gap-7 overflow-x-auto border-b border-zinc-200 px-6 dark:border-white/10 sm:px-8"
        >
            {items.map((item) => {
                const active = activeSection === item.id;
                const href = route('profile.edit', { section: item.id });

                return (
                    <Link
                        key={item.id}
                        href={href}
                        className={`relative shrink-0 py-5 text-sm font-semibold transition ${
                            active
                                ? 'text-zinc-950 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-zinc-950 dark:text-white dark:after:bg-white'
                                : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                    >
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

function completionFor(user) {
    const fields = [user.name, user.email, user.phone, user.city, user.area];

    if (user.role === 'provider') {
        fields.push(
            user.providerProfile?.businessName,
            user.providerProfile?.tradeCategory,
            user.providerProfile?.bio,
            user.providerProfile?.serviceRadiusKm,
        );
    }

    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function StatRow({ label, value }) {
    return (
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 text-sm last:border-b-0 dark:border-white/10">
            <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
            <span className="font-semibold text-zinc-950 dark:text-white">{value}</span>
        </div>
    );
}

function HeaderUpdateButton({ formId }) {
    return (
        <button
            type="submit"
            form={formId}
            disabled={!formId}
            className="inline-flex items-center gap-2 rounded-none border border-zinc-950 bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/25 dark:bg-white/10 dark:hover:bg-white"
        >
            <Icon name="update" />
            Update
        </button>
    );
}

export default function Edit({
    activeSection,
    mustVerifyEmail,
    status,
    tradeCategories,
    requestUrgencyOptions,
    availabilityOptions,
    responseTimeOptions,
    verificationDocumentTypes,
    providerTradeCategories,
    providerVerificationDocuments,
    providerVerificationTimeline,
    wallet,
    wallets,
    currencyOptions,
    paymentMethods,
    twoFactor,
    payoutRequests,
    walletDepositRequests,
    payoutDestinationOptions,
    subscriptionPlans,
    providerSubscription,
}) {
    const {
        auth: { user },
    } = usePage().props;
    const isProvider = user.role === 'provider';
    const isCustomer = user.role === 'customer';
    const roleLabel = isProvider ? 'Service provider' : isCustomer ? 'Customer' : 'Platform admin';
    const profileLabel = isProvider
        ? user.providerProfile?.businessName || user.name
        : user.name;
    const memberSince = user.createdAt
        ? new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(
              new Date(user.createdAt),
        )
        : 'Recently';
    const location = [user.area, user.city].filter(Boolean).join(', ') || 'Not set';
    const publicProfileUrl = isProvider
        ? `${window.location.origin}${route('providers.show', user.id)}`
        : null;
    const headerFormId =
        activeSection === 'profile' || activeSection === 'preferences'
            ? 'account-profile-form'
            : activeSection === 'security'
              ? 'account-password-form'
              : null;

    return (
        <AuthenticatedLayout>
            <Head title="Account" />

            <div className="pb-16">
                <section className="relative min-h-[13rem] overflow-hidden border-b border-zinc-200/80 bg-zinc-100 text-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white">
                    <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(135deg,rgba(24,24,27,.08)_0_16%,transparent_16%_31%,rgba(24,24,27,.05)_31%_44%,transparent_44%_100%),radial-gradient(circle_at_8%_15%,rgba(24,24,27,.12),transparent_18%),radial-gradient(circle_at_78%_0%,rgba(24,24,27,.08),transparent_24%)] dark:opacity-55 dark:[background-image:linear-gradient(135deg,rgba(255,255,255,.13)_0_16%,transparent_16%_31%,rgba(255,255,255,.08)_31%_44%,transparent_44%_100%),radial-gradient(circle_at_8%_15%,rgba(255,255,255,.22),transparent_18%),radial-gradient(circle_at_78%_0%,rgba(255,255,255,.16),transparent_24%)]" />
                    <div className="relative mx-auto flex max-w-7xl items-start justify-between px-4 py-7 sm:px-6 lg:px-8">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-300">
                                Account
                            </p>
                            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                                Settings
                            </h1>
                        </div>
                        <HeaderUpdateButton formId={headerFormId} />
                    </div>
                </section>

                <div className="mx-auto -mt-20 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:px-8">
                    <aside className="relative z-10">
                        <Surface className="overflow-hidden">
                            <div className="px-5 py-7 text-center">
                                <ProfilePhotoPanel user={user} compact />
                                <h2 className="mt-4 truncate font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                    {profileLabel}
                                </h2>
                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                    {roleLabel}
                                </p>
                            </div>

                            <StatRow label="Profile completion" value={`${completionFor(user)}%`} />
                            <StatRow label="Account status" value={user.email_verified_at ? 'Verified' : 'Pending'} />
                            <StatRow label="Member since" value={memberSince} />
                            <StatRow label="Location" value={location} />

                            {isProvider ? (
                                <div className="space-y-3 px-5 py-5">
                                    <Link
                                        href={route('providers.show', user.id)}
                                        className="block border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white dark:hover:text-white"
                                    >
                                        View Public Profile
                                    </Link>
                                    <div className="flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-3 text-xs text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
                                        <span className="min-w-0 flex-1 truncate">{publicProfileUrl}</span>
                                        <Icon name="link" />
                                    </div>
                                </div>
                            ) : null}
                        </Surface>
                    </aside>

                    <main className="relative z-10 min-w-0">
                        <Surface className="overflow-hidden">
                            <AccountTabs
                                activeSection={activeSection}
                                isProvider={isProvider}
                                isCustomer={isCustomer}
                            />

                            <div className="p-6 sm:p-8">
                                {activeSection === 'profile' ? (
                                    <UpdateProfileInformationForm
                                        formId="account-profile-form"
                                        section="profile"
                                        mustVerifyEmail={mustVerifyEmail}
                                        status={status}
                                        tradeCategories={tradeCategories}
                                        requestUrgencyOptions={requestUrgencyOptions}
                                        availabilityOptions={availabilityOptions}
                                        responseTimeOptions={responseTimeOptions}
                                    />
                                ) : null}

                                {activeSection === 'preferences' ? (
                                    <UpdateProfileInformationForm
                                        formId="account-profile-form"
                                        section="preferences"
                                        mustVerifyEmail={mustVerifyEmail}
                                        status={status}
                                        tradeCategories={tradeCategories}
                                        requestUrgencyOptions={requestUrgencyOptions}
                                        availabilityOptions={availabilityOptions}
                                        responseTimeOptions={responseTimeOptions}
                                    />
                                ) : null}

                                {activeSection === 'verification' && isProvider ? (
                                    <div className="space-y-6">
                                        <ProviderVerificationPanel />
                                        <ProviderTradeCategoriesPanel
                                            tradeCategories={providerTradeCategories}
                                            availableCategories={tradeCategories}
                                        />
                                        <ProviderVerificationDocumentsPanel
                                            verificationDocumentTypes={verificationDocumentTypes}
                                            documents={providerVerificationDocuments}
                                        />
                                        <VerificationTimeline
                                            entries={providerVerificationTimeline}
                                            title="Activity and review trail"
                                            subtitle="Uploads, submissions, and admin decisions remain attached to your account."
                                            emptyMessage="No verification activity yet. Upload a document to begin."
                                        />
                                    </div>
                                ) : null}

                                {activeSection === 'security' ? (
                                    <div>
                                        <UpdatePasswordForm
                                            className="max-w-2xl"
                                            formId="account-password-form"
                                            twoFactor={twoFactor}
                                        />
                                    </div>
                                ) : null}

                                {activeSection === 'billing' ? (
                                    <BillingPanel
                                        wallet={wallet}
                                        wallets={wallets}
                                        currencyOptions={currencyOptions}
                                        paymentMethods={paymentMethods}
                                        payoutRequests={payoutRequests}
                                        walletDepositRequests={walletDepositRequests}
                                        payoutDestinationOptions={
                                            payoutDestinationOptions
                                        }
                                        canRequestPayout={isProvider}
                                        subscriptionPlans={subscriptionPlans}
                                        providerSubscription={providerSubscription}
                                    />
                                ) : null}

                                {activeSection === 'danger' ? (
                                    <DeleteUserForm className="max-w-2xl" />
                                ) : null}
                            </div>
                        </Surface>
                    </main>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
