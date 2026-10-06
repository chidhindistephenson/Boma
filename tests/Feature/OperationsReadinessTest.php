<?php

test('health endpoint reports operational checks', function () {
    $this->get(route('health'))
        ->assertOk()
        ->assertJsonPath('status', 'ok')
        ->assertJsonStructure([
            'checked_at',
            'environment',
            'checks' => [
                'database' => ['status', 'connection'],
                'cache' => ['status', 'store'],
                'queue' => ['status', 'driver'],
                'storage' => ['status', 'disk'],
            ],
        ]);
});

test('openapi document is published for api clients', function () {
    $this->get(route('openapi'))
        ->assertOk();

    expect(file_get_contents(public_path('openapi.yaml')))
        ->toContain('openapi: 3.0.3')
        ->toContain('/auth/login')
        ->toContain('bearerAuth');
});

test('operations and accessibility runbooks exist', function () {
    expect(file_exists(base_path('docs/operations-runbook.md')))->toBeTrue()
        ->and(file_exists(base_path('docs/accessibility-audit.md')))->toBeTrue();
});
