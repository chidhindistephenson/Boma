<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->string('gateway_provider', 80)->nullable()->after('channel');
            $table->string('gateway_status', 40)->nullable()->after('gateway_provider');
            $table->string('gateway_transaction_id', 120)->nullable()->after('gateway_status')->index();
            $table->string('gateway_authorization_code', 120)->nullable()->after('gateway_transaction_id');
            $table->string('payer_name')->nullable()->after('reference');
            $table->string('payer_email')->nullable()->after('payer_name');
            $table->string('payer_phone', 40)->nullable()->after('payer_email');
            $table->timestamp('processed_at')->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->dropIndex(['gateway_transaction_id']);
            $table->dropColumn([
                'gateway_provider',
                'gateway_status',
                'gateway_transaction_id',
                'gateway_authorization_code',
                'payer_name',
                'payer_email',
                'payer_phone',
                'processed_at',
            ]);
        });
    }
};
