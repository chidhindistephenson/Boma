<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobRequestPayment extends Model
{
    protected $fillable = [
        'job_request_id',
        'customer_id',
        'provider_id',
        'amount',
        'platform_fee_amount',
        'provider_net_amount',
        'currency',
        'method',
        'user_payment_method_id',
        'wallet_transaction_id',
        'provider_wallet_transaction_id',
        'customer_wallet_transaction_id',
        'channel',
        'gateway_provider',
        'gateway_status',
        'gateway_transaction_id',
        'gateway_authorization_code',
        'gateway_merchant_reference',
        'gateway_poll_url',
        'gateway_redirect_url',
        'gateway_payload',
        'gateway_result_received_at',
        'reference',
        'payer_name',
        'payer_email',
        'payer_phone',
        'notes',
        'status',
        'escrow_status',
        'escrow_held_at',
        'release_due_at',
        'released_at',
        'released_by_user_id',
        'release_reason',
        'refunded_at',
        'refunded_by_user_id',
        'refund_reason',
        'disputed_at',
        'disputed_by_user_id',
        'dispute_reason',
        'paid_at',
        'processed_at',
        'proof_storage_path',
        'proof_original_name',
        'proof_mime_type',
        'proof_size_bytes',
        'confirmed_at',
        'revision_requested_at',
        'reviewed_by_user_id',
        'review_notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'platform_fee_amount' => 'integer',
            'provider_net_amount' => 'integer',
            'proof_size_bytes' => 'integer',
            'gateway_payload' => 'array',
            'escrow_held_at' => 'datetime',
            'release_due_at' => 'datetime',
            'released_at' => 'datetime',
            'refunded_at' => 'datetime',
            'disputed_at' => 'datetime',
            'paid_at' => 'datetime',
            'processed_at' => 'datetime',
            'gateway_result_received_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'revision_requested_at' => 'datetime',
        ];
    }

    public function jobRequest(): BelongsTo
    {
        return $this->belongsTo(JobRequest::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    public function releasedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by_user_id');
    }

    public function refundedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'refunded_by_user_id');
    }

    public function disputedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disputed_by_user_id');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(UserPaymentMethod::class, 'user_payment_method_id');
    }

    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class, 'wallet_transaction_id');
    }

    public function providerWalletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class, 'provider_wallet_transaction_id');
    }

    public function customerWalletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class, 'customer_wallet_transaction_id');
    }

    public function hasProof(): bool
    {
        return filled($this->proof_storage_path);
    }
}
