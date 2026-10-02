<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallet_deposit_requests', function (Blueprint $table) {
            $table->string('gateway_provider', 80)->nullable()->after('status');
            $table->string('gateway_status', 40)->nullable()->after('gateway_provider');
            $table->string('gateway_transaction_id', 120)->nullable()->after('gateway_status');
            $table->string('gateway_authorization_code', 120)->nullable()->after('gateway_transaction_id');
            $table->string('gateway_merchant_reference', 160)->nullable()->after('gateway_authorization_code');
            $table->text('gateway_poll_url')->nullable()->after('gateway_merchant_reference');
            $table->text('gateway_redirect_url')->nullable()->after('gateway_poll_url');
            $table->json('gateway_payload')->nullable()->after('gateway_redirect_url');
            $table->timestamp('gateway_result_received_at')->nullable()->after('gateway_payload');

            $table->index(['gateway_provider', 'gateway_status']);
        });
    }

    public function down(): void
    {
        Schema::table('wallet_deposit_requests', function (Blueprint $table) {
            $table->dropIndex(['gateway_provider', 'gateway_status']);
            $table->dropColumn([
                'gateway_provider',
                'gateway_status',
                'gateway_transaction_id',
                'gateway_authorization_code',
                'gateway_merchant_reference',
                'gateway_poll_url',
                'gateway_redirect_url',
                'gateway_payload',
                'gateway_result_received_at',
            ]);
        });
    }
};
