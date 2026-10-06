<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#050505">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-title" content="{{ config('app.name', 'Boma') }}">
        <link rel="manifest" href="/manifest.webmanifest">
        <link rel="icon" href="/icons/boma-icon.svg" type="image/svg+xml">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <script>
            (() => {
                const storageKey = 'boma-theme';
                const root = document.documentElement;

                try {
                    const storedTheme = window.localStorage.getItem(storageKey);
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    const theme = storedTheme === 'dark' || storedTheme === 'light'
                        ? storedTheme
                        : (prefersDark ? 'dark' : 'light');

                    root.classList.toggle('dark', theme === 'dark');
                    root.style.colorScheme = theme;
                } catch (error) {
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                }
            })();
        </script>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
