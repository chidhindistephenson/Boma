<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletDepositRequest extends Model
{
    protected $fillable = [
        'user_id',
        'wallet_transaction_id',
        'user_payment_method_id',
        'amount',
        'currency',
        'source',
        'reference',
        'status',
        'gateway_provider',
        'gateway_status',
        'gateway_transaction_id',
        'gateway_authorization_code',
        'gateway_merchant_reference',
        'gateway_poll_url',
        'gateway_redirect_url',
        'gateway_payload',
        'gateway_result_received_at',
        'reviewed_by_user_id',
        'reviewed_at',
        'review_notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'gateway_payload' => 'array',
            'gateway_result_received_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class);
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(UserPaymentMethod::class, 'user_payment_method_id');
    }
}
