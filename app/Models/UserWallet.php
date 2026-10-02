<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserWallet extends Model
{
    protected $fillable = [
        'user_id',
        'balance',
        'currency',
    ];

    protected function casts(): array
    {
        return [
            'balance' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class, 'wallet_id');
    }

    public function payoutRequests(): HasMany
    {
        return $this->hasMany(PayoutRequest::class, 'wallet_id');
    }
}
