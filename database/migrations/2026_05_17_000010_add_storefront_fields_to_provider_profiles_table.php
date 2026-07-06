<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->string('headline', 160)->nullable()->after('business_name');
            $table->smallInteger('years_experience')->nullable()->after('bio');
            $table->integer('base_price_from')->nullable()->after('years_experience');
            $table->string('response_time_label', 80)->nullable()->after('base_price_from');
            $table->smallInteger('service_radius_km')->nullable()->after('response_time_label');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'headline',
                'years_experience',
                'base_price_from',
                'response_time_label',
                'service_radius_km',
            ]);
        });
    }
};
