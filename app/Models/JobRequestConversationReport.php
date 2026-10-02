<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobRequestConversationReport extends Model
{
    protected $fillable = [
        'job_request_id',
        'reporter_id',
        'reason',
        'details',
        'status',
    ];

    public function jobRequest(): BelongsTo
    {
        return $this->belongsTo(JobRequest::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }
}
