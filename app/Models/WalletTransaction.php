<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    protected $fillable = [
        'wallet_id',
        'user_id',
        'job_request_id',
        'job_request_payment_id',
        'type',
        'direction',
        'amount',
        'currency',
        'balance_after',
        'status',
        'reference',
        'description',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'balance_after' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(UserWallet::class, 'wallet_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function jobRequest(): BelongsTo
    {
        return $this->belongsTo(JobRequest::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(JobRequestPayment::class, 'job_request_payment_id');
    }
}
