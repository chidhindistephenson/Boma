<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobRequestProposal extends Model
{
    protected $fillable = [
        'job_request_id',
        'provider_id',
        'amount',
        'timeline_days',
        'summary',
        'notes',
        'valid_until',
        'status',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'timeline_days' => 'integer',
            'valid_until' => 'date',
            'responded_at' => 'datetime',
        ];
    }

    public function jobRequest(): BelongsTo
    {
        return $this->belongsTo(JobRequest::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }
}
