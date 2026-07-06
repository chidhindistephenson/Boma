import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import VerificationTimeline from '@/Components/VerificationTimeline';
import { Head, usePage } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import ProviderVerificationDocumentsPanel from './Partials/ProviderVerificationDocumentsPanel';
import ProviderVerificationPanel from './Partials/ProviderVerificationPanel';
import ProviderServicesPanel from './Partials/ProviderServicesPanel';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
    tradeCategories,
    requestUrgencyOptions,
    availabilityOptions,
    responseTimeOptions,
    verificationDocumentTypes,
    providerVerificationDocuments,
    providerVerificationTimeline,
    providerServices,
}) {
    const {
        auth: { user },
    } = usePage().props;
    const isProvider = user.role === 'provider';

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                        Account settings
                    </p>
                    <h2 className="font-display text-3xl font-semibold leading-tight text-zinc-950 dark:text-white">
                        Profile management
                    </h2>
                </div>
            }
        >
            <Head title="Profile" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {isProvider ? (
                        <>
                            <ProviderVerificationPanel />

                            <ProviderVerificationDocumentsPanel
                                verificationDocumentTypes={verificationDocumentTypes}
                                documents={providerVerificationDocuments}
                            />

                            <VerificationTimeline
                                entries={providerVerificationTimeline}
                                title="Activity and review trail"
                                subtitle="Every upload, submission, and admin decision stays attached to this provider profile."
                                emptyMessage="No verification activity yet. Upload a document or submit the profile to begin the review trail."
                            />
                        </>
                    ) : null}

                    <div className="border border-zinc-200/80 bg-white/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 sm:rounded-[2rem] sm:p-8">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            tradeCategories={tradeCategories}
                            requestUrgencyOptions={requestUrgencyOptions}
                            availabilityOptions={availabilityOptions}
                            responseTimeOptions={responseTimeOptions}
                            className="max-w-4xl"
                        />
                    </div>

                    {isProvider ? <ProviderServicesPanel services={providerServices} /> : null}

                    <div className="border border-zinc-200/80 bg-white/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 sm:rounded-[2rem] sm:p-8">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="border border-zinc-200/80 bg-white/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 sm:rounded-[2rem] sm:p-8">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
