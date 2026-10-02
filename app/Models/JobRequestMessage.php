<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobRequestMessage extends Model
{
    protected $fillable = [
        'job_request_id',
        'sender_id',
        'body',
        'attachment_path',
        'attachment_original_name',
        'attachment_mime_type',
        'attachment_size_bytes',
    ];

    protected function casts(): array
    {
        return [
            'attachment_size_bytes' => 'integer',
        ];
    }

    public function jobRequest(): BelongsTo
    {
        return $this->belongsTo(JobRequest::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
