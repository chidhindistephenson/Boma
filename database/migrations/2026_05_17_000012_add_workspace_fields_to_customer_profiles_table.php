<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_profiles', function (Blueprint $table) {
            $table->string('default_trade_category')->nullable()->after('preferred_radius_km');
            $table->string('default_urgency', 40)->default('flexible')->after('default_trade_category');
            $table->unsignedInteger('default_budget_min')->nullable()->after('default_urgency');
            $table->unsignedInteger('default_budget_max')->nullable()->after('default_budget_min');
            $table->text('location_notes')->nullable()->after('default_budget_max');
        });
    }

    public function down(): void
    {
        Schema::table('customer_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'default_trade_category',
                'default_urgency',
                'default_budget_min',
                'default_budget_max',
                'location_notes',
            ]);
        });
    }
};
