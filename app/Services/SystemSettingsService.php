<?php

namespace App\Services;

use App\Models\SystemSetting;
use App\Models\User;

class SystemSettingsService
{
    public function get(string $key, mixed $default = null): mixed
    {
        $setting = SystemSetting::query()->find($key);

        return $setting ? $setting->value : $default;
    }

    public function set(string $key, mixed $value, ?User $updatedBy = null): SystemSetting
    {
        return SystemSetting::query()->updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'updated_by_user_id' => $updatedBy?->id,
            ],
        );
    }

    public function defaultSearchRadiusKm(): int
    {
        return (int) $this->get(
            'search.default_radius_km',
            config('localserve.search.default_radius_km'),
        );
    }

    public function featuredSlots(): int
    {
        return (int) $this->get('subscriptions.featured_slots', 12);
    }
}
