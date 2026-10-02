<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->foreignId('customer_wallet_transaction_id')
                ->nullable()
                ->after('provider_wallet_transaction_id')
                ->constrained('wallet_transactions')
                ->nullOnDelete();
            $table->timestamp('refunded_at')->nullable()->after('release_reason');
            $table->foreignId('refunded_by_user_id')
                ->nullable()
                ->after('refunded_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->text('refund_reason')->nullable()->after('refunded_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('customer_wallet_transaction_id');
            $table->dropConstrainedForeignId('refunded_by_user_id');
            $table->dropColumn([
                'refunded_at',
                'refund_reason',
            ]);
        });
    }
};
