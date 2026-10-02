<?php

namespace App\Http\Controllers;

use App\Models\JobRequest;
use App\Models\JobRequestPayment;
use App\Models\ProviderReview;
use App\Models\ProviderSubscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminReportExportController extends Controller
{
    public function __invoke(Request $request, string $report): StreamedResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        abort_unless(in_array($report, ['subscriptions', 'provider-performance', 'user-growth'], true), 404);

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'currency' => ['nullable', 'string', Rule::in(['all', ...array_keys(config('localserve.payment.currencies'))])],
        ]);

        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;
        $currency = $request->string('currency')->toString() ?: 'all';
        $filename = 'boma-'.$report.'-'.now()->format('Ymd-His').'.csv';

        return match ($report) {
            'subscriptions' => $this->streamSubscriptions($filename, $from, $to, $currency),
            'provider-performance' => $this->streamProviderPerformance($filename, $from, $to),
            'user-growth' => $this->streamUserGrowth($filename, $from, $to),
        };
    }

    private function streamSubscriptions(string $filename, ?string $from, ?string $to, string $currency): StreamedResponse
    {
        $currencyFilter = $currency === 'all' ? null : $currency;

        return response()->streamDownload(function () use ($from, $to, $currencyFilter): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Date',
                'Provider',
                'Business',
                'Plan',
                'Status',
                'Amount',
                'Currency',
                'Period Ends',
                'Cancelled At',
            ]);

            ProviderSubscription::query()
                ->with(['providerProfile.user', 'plan'])
                ->when($currencyFilter, fn (Builder $query) => $query->where('currency', $currencyFilter))
                ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
                ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
                ->latest('id')
                ->chunk(100, function ($subscriptions) use ($handle): void {
                    foreach ($subscriptions as $subscription) {
                        fputcsv($handle, [
                            $subscription->created_at->toDateTimeString(),
                            $subscription->providerProfile?->user?->name,
                            $subscription->providerProfile?->business_name,
                            $subscription->plan?->name,
                            $subscription->status,
                            $subscription->amount,
                            $subscription->currency,
                            $subscription->current_period_ends_at?->toDateTimeString(),
                            $subscription->cancelled_at?->toDateTimeString(),
                        ]);
                    }
                });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function streamProviderPerformance(string $filename, ?string $from, ?string $to): StreamedResponse
    {
        return response()->streamDownload(function () use ($from, $to): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Provider',
                'Business',
                'Trade',
                'Verification',
                'Subscription Tier',
                'Requests',
                'Closed Requests',
                'Confirmed Revenue',
                'Average Rating',
                'Review Count',
            ]);

            User::query()
                ->where('role', 'provider')
                ->with('providerProfile')
                ->orderBy('name')
                ->chunk(100, function ($providers) use ($handle, $from, $to): void {
                    foreach ($providers as $provider) {
                        $requests = JobRequest::query()
                            ->where('provider_id', $provider->id)
                            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
                            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to));
                        $payments = JobRequestPayment::query()
                            ->where('provider_id', $provider->id)
                            ->where('status', 'confirmed')
                            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
                            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to));
                        $reviews = ProviderReview::query()
                            ->where('provider_id', $provider->id)
                            ->where('status', 'published')
                            ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
                            ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to));

                        fputcsv($handle, [
                            $provider->name,
                            $provider->providerProfile?->business_name,
                            $provider->providerProfile?->trade_category,
                            $provider->providerProfile?->verification_status,
                            $provider->providerProfile?->subscription_tier,
                            (clone $requests)->count(),
                            (clone $requests)->where('status', 'closed')->count(),
                            (clone $payments)->sum('amount'),
                            round((float) (clone $reviews)->avg('rating'), 2),
                            (clone $reviews)->count(),
                        ]);
                    }
                });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function streamUserGrowth(string $filename, ?string $from, ?string $to): StreamedResponse
    {
        return response()->streamDownload(function () use ($from, $to): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Date', 'Role', 'New Users']);

            User::query()
                ->select([
                    DB::raw('DATE(created_at) as joined_date'),
                    'role',
                    DB::raw('COUNT(*) as user_count'),
                ])
                ->when($from, fn (Builder $query) => $query->whereDate('created_at', '>=', $from))
                ->when($to, fn (Builder $query) => $query->whereDate('created_at', '<=', $to))
                ->groupBy(DB::raw('DATE(created_at)'), 'role')
                ->orderBy('joined_date')
                ->orderBy('role')
                ->chunk(100, function ($rows) use ($handle): void {
                    foreach ($rows as $row) {
                        fputcsv($handle, [
                            $row->joined_date,
                            $row->role,
                            $row->user_count,
                        ]);
                    }
                });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
