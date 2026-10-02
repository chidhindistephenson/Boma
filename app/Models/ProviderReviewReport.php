<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderReviewReport extends Model
{
    protected $fillable = [
        'provider_review_id',
        'reporter_id',
        'reason',
        'details',
    ];

    public function review(): BelongsTo
    {
        return $this->belongsTo(ProviderReview::class, 'provider_review_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }
}
