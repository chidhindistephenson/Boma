<?php

use Illuminate\Support\Facades\File;

test('html shell includes core accessibility and pwa metadata', function () {
    $html = File::get(resource_path('views/app.blade.php'));

    expect($html)->toContain('<html lang=')
        ->and($html)->toContain('name="viewport"')
        ->and($html)->toContain('name="theme-color"')
        ->and($html)->toContain('rel="manifest"');
});

test('offline fallback has a title language and status copy', function () {
    $html = File::get(public_path('offline.html'));

    expect($html)->toContain('<html lang="en">')
        ->and($html)->toContain('<title>Boma offline</title>')
        ->and($html)->toContain('You are offline.');
});

test('jsx images include alt attributes', function () {
    $files = collect(File::allFiles(resource_path('js')))
        ->filter(fn (SplFileInfo $file): bool => str_ends_with($file->getFilename(), '.jsx'));

    $violations = [];

    foreach ($files as $file) {
        $contents = File::get($file->getPathname());

        if (preg_match_all('/<img\b(?![^>]*\balt=)[^>]*>/i', $contents, $matches)) {
            foreach ($matches[0] as $match) {
                $violations[] = $file->getRelativePathname().': '.$match;
            }
        }
    }

    expect($violations)->toBe([]);
});
