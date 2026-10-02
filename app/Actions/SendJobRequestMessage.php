<?php

namespace App\Actions;

use App\Events\JobRequestMessageSent;
use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Models\JobRequestMessage;
use App\Models\User;
use App\Services\MalwareScanner;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class SendJobRequestMessage
{
    public function execute(
        JobRequest $jobRequest,
        User $sender,
        ?string $body,
        ?UploadedFile $attachment = null,
    ): JobRequestMessage {
        $jobRequest->loadMissing(['customer', 'provider']);
        $attachmentPath = null;

        try {
            if ($attachment) {
                app(MalwareScanner::class)->assertClean($attachment, 'media');

                $attachmentPath = $attachment->store(
                    'job-request-messages/'.$jobRequest->id,
                    'local',
                );

                if (! $attachmentPath) {
                    throw ValidationException::withMessages([
                        'media' => 'The attachment could not be stored. Please try again.',
                    ]);
                }
            }

            $message = $jobRequest->messages()->create([
                'sender_id' => $sender->id,
                'body' => $body,
                'attachment_path' => $attachmentPath,
                'attachment_original_name' => $attachment?->getClientOriginalName(),
                'attachment_mime_type' => $attachment?->getMimeType(),
                'attachment_size_bytes' => $attachment?->getSize(),
            ]);

            if ($jobRequest->status === 'targeted' && $sender->id === $jobRequest->provider_id) {
                $jobRequest->update(['status' => 'in_conversation']);
            }

            $jobRequest->markAsReadFor($sender);

            $recipient = $sender->id === $jobRequest->customer_id
                ? $jobRequest->provider
                : $jobRequest->customer;

            if ($recipient) {
                InAppNotification::notifyUser(
                    $recipient,
                    'request_message',
                    'New message on a request',
                    "{$sender->name} sent a new message on {$jobRequest->title}.",
                    route('inbox.show', $jobRequest),
                    'Open conversation',
                    [
                        'job_request_id' => $jobRequest->id,
                        'sender_id' => $sender->id,
                    ],
                );
            }

            broadcast(new JobRequestMessageSent($message))->toOthers();

            return $message;
        } catch (Throwable $exception) {
            if ($attachmentPath) {
                Storage::disk('local')->delete($attachmentPath);
            }

            throw $exception;
        }
    }
}
