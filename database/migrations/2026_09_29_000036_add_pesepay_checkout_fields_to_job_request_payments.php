<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->string('gateway_merchant_reference', 120)->nullable()->after('gateway_authorization_code')->index();
            $table->text('gateway_poll_url')->nullable()->after('gateway_merchant_reference');
            $table->text('gateway_redirect_url')->nullable()->after('gateway_poll_url');
            $table->json('gateway_payload')->nullable()->after('gateway_redirect_url');
            $table->timestamp('gateway_result_received_at')->nullable()->after('processed_at');
        });
    }

    public function down(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->dropIndex(['gateway_merchant_reference']);
            $table->dropColumn([
                'gateway_merchant_reference',
                'gateway_poll_url',
                'gateway_redirect_url',
                'gateway_payload',
                'gateway_result_received_at',
            ]);
        });
    }
};
