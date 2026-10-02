import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/ThemeToggle';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
            <div className="hero-grid absolute inset-0 opacity-60 dark:opacity-100" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.08),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(0,0,0,0.06),_transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.06),_transparent_24%)]" />

            <div className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/90 shadow-[0_28px_80px_rgba(0,0,0,0.10)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between border-b border-zinc-200/80 bg-white/80 px-6 py-5 dark:border-white/10 dark:bg-zinc-950/60 sm:px-8">
                    <Link href="/" className="inline-flex items-center gap-3">
                        <ApplicationLogo className="h-11 w-11 text-zinc-950 dark:text-white" />
                        <div>
                            <div className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
                                Boma
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Trusted services, close to home
                            </p>
                        </div>
                    </Link>

                    <ThemeToggle />
                </div>

                <div className="px-6 py-6 sm:px-8 sm:py-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
