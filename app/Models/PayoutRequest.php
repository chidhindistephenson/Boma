<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayoutRequest extends Model
{
    protected $fillable = [
        'provider_id',
        'wallet_id',
        'wallet_transaction_id',
        'refund_wallet_transaction_id',
        'amount',
        'currency',
        'destination_type',
        'destination_label',
        'account_reference',
        'notes',
        'status',
        'reviewed_by_user_id',
        'reviewed_at',
        'paid_at',
        'settlement_reference',
        'settlement_notes',
        'review_notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'reviewed_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(UserWallet::class, 'wallet_id');
    }

    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class, 'wallet_transaction_id');
    }

    public function refundWalletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class, 'refund_wallet_transaction_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }
}
