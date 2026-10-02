<?php

namespace App\Http\Controllers;

use App\Events\JobRequestConversationRead;
use App\Models\JobRequest;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InboxReadController extends Controller
{
    public function __invoke(Request $request, JobRequest $jobRequest): Response
    {
        $viewer = $request->user();

        abort_unless(
            $jobRequest->chat_removed_at === null
            && ($viewer->id === $jobRequest->customer_id || $viewer->id === $jobRequest->provider_id),
            403,
        );

        $jobRequest->markAsReadFor($viewer);
        $readAt = $viewer->id === $jobRequest->customer_id
            ? $jobRequest->customer_last_read_at
            : $jobRequest->provider_last_read_at;

        broadcast(new JobRequestConversationRead(
            $jobRequest,
            $viewer,
            $readAt->toISOString(),
        ))->toOthers();

        return response()->noContent();
    }
}
