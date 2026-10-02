<?php

namespace App\Broadcasting;

use App\Models\JobRequest;
use App\Models\User;

class JobRequestChannel
{
    public function join(User $user, int $jobRequestId): bool
    {
        $jobRequest = JobRequest::query()->find($jobRequestId);

        return $jobRequest?->isVisibleTo($user) ?? false;
    }
}
