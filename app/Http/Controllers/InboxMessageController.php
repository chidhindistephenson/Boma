<?php

namespace App\Http\Controllers;

use App\Actions\SendJobRequestMessage;
use App\Http\Requests\StoreJobRequestMessageRequest;
use App\Models\JobRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;

class InboxMessageController extends Controller
{
    public function __invoke(
        StoreJobRequestMessageRequest $request,
        JobRequest $jobRequest,
        SendJobRequestMessage $sendMessage,
    ): RedirectResponse {
        $viewer = $request->user();

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->canMessage($viewer), 403);

        $validated = $request->validated();
        $sendMessage->execute(
            $jobRequest,
            $viewer,
            $validated['body'] ?? null,
            $request->file('media'),
        );

        return Redirect::route('inbox.show', $jobRequest);
    }
}
