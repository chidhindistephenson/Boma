<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->unsignedInteger('platform_fee_amount')->default(0)->after('amount');
            $table->unsignedInteger('provider_net_amount')->nullable()->after('platform_fee_amount');
        });
    }

    public function down(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->dropColumn([
                'platform_fee_amount',
                'provider_net_amount',
            ]);
        });
    }
};
