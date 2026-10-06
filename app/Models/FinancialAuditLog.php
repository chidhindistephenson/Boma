<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use RuntimeException;

class FinancialAuditLog extends Model
{
    protected $fillable = [
        'event_type',
        'auditable_type',
        'auditable_id',
        'user_id',
        'job_request_id',
        'job_request_payment_id',
        'wallet_transaction_id',
        'provider_subscription_id',
        'payout_request_id',
        'amount',
        'currency',
        'direction',
        'reference',
        'status',
        'metadata',
        'checksum',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'metadata' => 'array',
            'recorded_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new RuntimeException('Financial audit logs are immutable.'));
        static::deleting(fn () => throw new RuntimeException('Financial audit logs are immutable.'));
    }

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(JobRequestPayment::class, 'job_request_payment_id');
    }

    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class);
    }
}
