# Boma Operations Runbook

## Health Monitoring

- Public probe: `GET /health`
- Expected status: `200` with `"status": "ok"`
- Suggested uptime monitor interval: 60 seconds
- Alert when `/health` returns `503`, times out, or fails 3 consecutive checks

The health response checks database connectivity, cache read/write, queue driver configuration, and storage disk configuration. It does not expose secrets.

## Application Monitoring / APM

Recommended production setup:

- Route application errors to a central log collector using `LOG_CHANNEL=stack` and a production log driver.
- Add an APM agent at the PHP-FPM/container layer, such as Sentry, New Relic, Datadog, or OpenTelemetry.
- Alert on 5xx rate, queue backlog, failed jobs, payment gateway errors, and slow database queries.
- Keep `APP_DEBUG=false` in production.

## Backups

Minimum backup policy:

- PostgreSQL: daily full backup, point-in-time recovery if WAL archiving is available.
- File storage: daily backup of `storage/app/private` and any configured object-storage bucket.
- Retention: keep 7 daily, 4 weekly, and 12 monthly backups unless local law or business policy requires longer.
- Test restore at least monthly into a non-production environment.

Suggested PostgreSQL command:

```bash
pg_dump --format=custom --no-owner --no-acl --file=boma-$(date +%F).dump "$DATABASE_URL"
```

Application backup helper:

```bash
php artisan ops:backup-database
```

Set `PG_DUMP_BINARY` if `pg_dump` is not on the server `PATH`.

Suggested restore test:

```bash
createdb boma_restore_test
pg_restore --clean --if-exists --dbname=boma_restore_test boma-YYYY-MM-DD.dump
php artisan migrate --pretend
```

## Scaling

The app is safe to scale horizontally when these services are shared:

- Database: one managed PostgreSQL cluster.
- Cache/session: central Redis or database-backed sessions.
- Queue: central queue backend with one or more workers.
- Files: object storage or a shared persistent disk.

Recommended process split:

- Web: PHP-FPM/HTTP containers, stateless.
- Workers: `php artisan queue:work`.
- Scheduler: one instance running `php artisan schedule:work`.

Autoscaling signals:

- Web CPU above 70% for 5 minutes.
- P95 request latency above target for 5 minutes.
- Queue depth or oldest job age exceeds operational thresholds.

## Scheduled Jobs

- `payments:release-due`: hourly escrow auto-release.
- `subscriptions:process-renewals`: daily subscription renewal/reminder processing.
- `accounts:enforce-retention`: daily account deletion anonymisation enforcement.
