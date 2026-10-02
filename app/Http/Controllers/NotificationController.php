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
        $preferences = $user->notificationPreference()->firstOrCreate();

        return Inertia::render('Notifications/Index', [
            'activeTab' => $activeTab,
            'notifications' => $notifications,
            'summary' => [
                'total' => $user->inAppNotifications()->count(),
                'unread' => $user->inAppNotifications()->whereNull('read_at')->count(),
            ],
            'preferences' => collect(config('localserve.notifications.email_categories'))
                ->map(fn (string $label, string $category): array => [
                    'key' => $category,
                    'label' => $label,
                    'enabled' => (bool) $preferences->{'email_'.$category},
                ])
                ->values()
                ->all(),
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

    public function updatePreferences(Request $request): RedirectResponse
    {
        $categories = array_keys(config('localserve.notifications.email_categories'));
        $rules = collect($categories)
            ->mapWithKeys(fn (string $category): array => [$category => ['required', 'boolean']])
            ->all();
        $validated = $request->validate($rules);

        $request->user()->notificationPreference()->updateOrCreate(
            ['user_id' => $request->user()->id],
            collect($categories)
                ->mapWithKeys(fn (string $category): array => [
                    'email_'.$category => $validated[$category],
                ])
                ->all(),
        );

        return Redirect::back()->with('success', 'Notification preferences updated.');
    }

    public static function notificationPayload(InAppNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'category' => $notification->category(),
            'title' => $notification->title,
            'body' => $notification->body,
            'actionLabel' => $notification->action_label,
            'actionUrl' => $notification->action_url,
            'isRead' => $notification->read_at !== null,
            'readAt' => $notification->read_at?->toDateTimeString(),
            'createdAt' => $notification->created_at->toDateTimeString(),
            'createdLabel' => $notification->created_at->diffForHumans(),
        ];
    }
}
