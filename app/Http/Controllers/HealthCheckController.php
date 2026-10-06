<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthCheckController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->databaseCheck(),
            'cache' => $this->cacheCheck(),
            'queue' => [
                'status' => 'ok',
                'driver' => config('queue.default'),
            ],
            'storage' => [
                'status' => 'ok',
                'disk' => config('filesystems.default'),
            ],
        ];

        $healthy = collect($checks)->every(fn (array $check): bool => $check['status'] === 'ok');

        return response()->json([
            'status' => $healthy ? 'ok' : 'degraded',
            'checked_at' => now()->toIso8601String(),
            'environment' => app()->environment(),
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }

    private function databaseCheck(): array
    {
        try {
            DB::select('select 1');

            return [
                'status' => 'ok',
                'connection' => config('database.default'),
            ];
        } catch (Throwable $exception) {
            return [
                'status' => 'failed',
                'connection' => config('database.default'),
                'message' => $exception->getMessage(),
            ];
        }
    }

    private function cacheCheck(): array
    {
        try {
            $key = 'health:'.bin2hex(random_bytes(6));
            Cache::put($key, 'ok', 10);
            $ok = Cache::get($key) === 'ok';
            Cache::forget($key);

            return [
                'status' => $ok ? 'ok' : 'failed',
                'store' => config('cache.default'),
            ];
        } catch (Throwable $exception) {
            return [
                'status' => 'failed',
                'store' => config('cache.default'),
                'message' => $exception->getMessage(),
            ];
        }
    }
}
