<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $activeTab = $request->string('tab')->toString();

        if (! in_array($activeTab, ['all', 'unread'], true)) {
            $activeTab = 'all';
        }

        $notifications = $user->inAppNotifications()
            ->when($activeTab === 'unread', fn ($query) => $query->whereNull('read_at'))
            ->paginate(12)
            ->withQueryString()
            ->through(fn (InAppNotification $notification): array => $this->notificationPayload($notification));

        return Inertia::render('Notifications/Index', [
            'activeTab' => $activeTab,
            'notifications' => $notifications,
            'summary' => [
                'total' => $user->inAppNotifications()->count(),
                'unread' => $user->inAppNotifications()->whereNull('read_at')->count(),
            ],
        ]);
    }

    public function visit(Request $request, InAppNotification $notification): RedirectResponse
    {
        $user = $request->user();

        abort_unless($notification->user_id === $user->id, 403);

        $notification->markAsRead();

        return Redirect::to($notification->action_url ?: route('dashboard'));
    }

    public function markAll(Request $request): RedirectResponse
    {
        $user = $request->user();

        $user->inAppNotifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return Redirect::back();
    }

    public static function notificationPayload(InAppNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'body' => $notification->body,
            'actionLabel' => $notification->action_label,
            'isRead' => $notification->read_at !== null,
            'readAt' => $notification->read_at?->toDateTimeString(),
            'createdAt' => $notification->created_at->toDateTimeString(),
            'createdLabel' => $notification->created_at->diffForHumans(),
        ];
    }
}
