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
        'method',
        'reference',
        'notes',
        'status',
        'paid_at',
        'confirmed_at',
        'revision_requested_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'paid_at' => 'datetime',
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
}
