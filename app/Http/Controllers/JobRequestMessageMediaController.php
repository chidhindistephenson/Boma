<?php

namespace App\Http\Controllers;

use App\Models\JobRequest;
use App\Models\JobRequestMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JobRequestMessageMediaController extends Controller
{
    public function __invoke(
        Request $request,
        JobRequest $jobRequest,
        JobRequestMessage $message,
    ): StreamedResponse {
        abort_unless($message->job_request_id === $jobRequest->id, 404);
        abort_unless($jobRequest->isVisibleTo($request->user()), 403);
        abort_unless(
            $message->attachment_path
            && Storage::disk('local')->exists($message->attachment_path),
            404,
        );

        return Storage::disk('local')->response(
            $message->attachment_path,
            $message->attachment_original_name,
            [
                'Content-Type' => $message->attachment_mime_type,
                'X-Content-Type-Options' => 'nosniff',
            ],
            'inline',
        );
    }
}
