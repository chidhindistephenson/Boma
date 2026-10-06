<?php

use App\Models\JobRequestPayment;
use App\Services\AccountDeletionService;
use App\Services\PaymentEscrowService;
use App\Services\SubscriptionService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schedule;
use Symfony\Component\Process\Process;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('payments:release-due', function () {
    $escrow = app(PaymentEscrowService::class);
    $released = 0;

    JobRequestPayment::query()
        ->with(['jobRequest.customer', 'jobRequest.provider.providerProfile'])
        ->where('status', 'confirmed')
        ->where('escrow_status', 'held')
        ->whereNotNull('release_due_at')
        ->where('release_due_at', '<=', now())
        ->chunkById(100, function ($payments) use ($escrow, &$released) {
            foreach ($payments as $payment) {
                $escrow->release($payment, null, 'auto_48h');
                $released++;
            }
        });

    $this->info("Released {$released} escrow payment(s).");
})->purpose('Release confirmed escrow payments once their 48-hour hold has expired');

Schedule::command('payments:release-due')->hourly();

Artisan::command('subscriptions:process-renewals', function () {
    $summary = app(SubscriptionService::class)->processRenewals();

    $this->info(
        "Subscription renewals processed. Reminded: {$summary['reminded']}; Renewed: {$summary['renewed']}; Past due: {$summary['past_due']}; Cancelled: {$summary['cancelled']}."
    );
})->purpose('Send subscription reminders, renew due subscriptions, and downgrade expired grace periods');

Schedule::command('subscriptions:process-renewals')->dailyAt('02:00');

Artisan::command('accounts:enforce-retention', function () {
    $summary = app(AccountDeletionService::class)->enforceRetention();

    $this->info("Account retention processed. Anonymized: {$summary['anonymized']}.");
})->purpose('Anonymize accounts whose retention deletion request is due');

Schedule::command('accounts:enforce-retention')->dailyAt('03:00');

Artisan::command('ops:backup-database {--path=}', function () {
    $driver = config('database.default');
    $connection = config("database.connections.{$driver}");
    $directory = $this->option('path') ?: storage_path('app/backups');

    File::ensureDirectoryExists($directory);

    $timestamp = now()->format('Ymd_His');

    if (($connection['driver'] ?? null) === 'sqlite') {
        $source = $connection['database'] ?? null;
        $target = $directory.DIRECTORY_SEPARATOR."boma_sqlite_{$timestamp}.sqlite";

        if (! $source || ! File::exists($source)) {
            $this->error('SQLite database file could not be found.');

            return 1;
        }

        File::copy($source, $target);
        $this->info("Database backup written to {$target}.");

        return 0;
    }

    if (($connection['driver'] ?? null) !== 'pgsql') {
        $this->error("Database backup command supports pgsql and sqlite. Current driver: {$connection['driver']}.");

        return 1;
    }

    $target = $directory.DIRECTORY_SEPARATOR."boma_pgsql_{$timestamp}.dump";
    $binary = env('PG_DUMP_BINARY', 'pg_dump');
    $process = new Process(array_values(array_filter([
        $binary,
        '--format=custom',
        '--no-owner',
        '--no-acl',
        '--file='.$target,
        filled($connection['host'] ?? null) ? '--host='.$connection['host'] : null,
        filled($connection['port'] ?? null) ? '--port='.$connection['port'] : null,
        filled($connection['username'] ?? null) ? '--username='.$connection['username'] : null,
        $connection['database'],
    ])));

    $process->setTimeout(600);
    $process->setEnv([
        'PGPASSWORD' => $connection['password'] ?? '',
    ]);
    $process->run();

    if (! $process->isSuccessful()) {
        $this->error(trim($process->getErrorOutput()) ?: 'pg_dump failed.');

        return 1;
    }

    $this->info("Database backup written to {$target}.");

    return 0;
})->purpose('Create a PostgreSQL custom-format or SQLite database backup');
