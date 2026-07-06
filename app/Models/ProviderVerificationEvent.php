<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderVerificationEvent extends Model
{
    protected $fillable = [
        'provider_profile_id',
        'actor_user_id',
        'event_type',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public static function record(
        ProviderProfile $providerProfile,
        string $eventType,
        ?User $actor = null,
        array $payload = [],
    ): self {
        return $providerProfile->verificationEvents()->create([
            'actor_user_id' => $actor?->id,
            'event_type' => $eventType,
            'payload' => $payload,
        ]);
    }

    public function providerProfile(): BelongsTo
    {
        return $this->belongsTo(ProviderProfile::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    public function timelineTone(): string
    {
        return match ($this->event_type) {
            'approved' => 'success',
            'rejected' => 'danger',
            'submitted', 'resubmitted' => 'accent',
            default => 'neutral',
        };
    }

    public function timelineTitle(): string
    {
        return match ($this->event_type) {
            'document_uploaded' => 'Document uploaded',
            'document_removed' => 'Document removed',
            'submitted' => 'Submitted for review',
            'resubmitted' => 'Resubmitted for review',
            'approved' => 'Provider approved',
            'rejected' => 'Provider rejected',
            default => 'Verification activity',
        };
    }

    public function timelineSummary(): string
    {
        $documentLabel = $this->payload['label']
            ?? $this->payload['original_name']
            ?? $this->payload['document_type']
            ?? null;

        return match ($this->event_type) {
            'document_uploaded' => trim(implode(' ', array_filter([
                $this->payload['document_type'] ?? 'Verification document',
                $documentLabel && $documentLabel !== ($this->payload['document_type'] ?? null)
                    ? '('.$documentLabel.')'
                    : null,
                'was added to the private review package.',
            ]))),
            'document_removed' => trim(implode(' ', array_filter([
                $this->payload['document_type'] ?? 'Verification document',
                $documentLabel && $documentLabel !== ($this->payload['document_type'] ?? null)
                    ? '('.$documentLabel.')'
                    : null,
                'was removed from the private review package.',
            ]))),
            'submitted' => 'The provider sent the current profile and documents to the admin review queue.',
            'resubmitted' => 'The provider updated the verification package and sent it back for another review.',
            'approved' => $this->payload['review_notes']
                ?? 'The admin approved this provider for the verified directory state.',
            'rejected' => $this->payload['review_notes']
                ?? 'The admin rejected this provider and requested stronger verification evidence.',
            default => 'Verification activity was recorded.',
        };
    }

    public function toTimelineEntry(): array
    {
        return [
            'id' => $this->id,
            'eventType' => $this->event_type,
            'tone' => $this->timelineTone(),
            'title' => $this->timelineTitle(),
            'summary' => $this->timelineSummary(),
            'actorName' => $this->actor?->name,
            'createdAt' => $this->created_at?->toDateTimeString(),
        ];
    }
}
