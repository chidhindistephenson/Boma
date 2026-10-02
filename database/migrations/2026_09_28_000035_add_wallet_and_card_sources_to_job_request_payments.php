<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->foreignId('user_payment_method_id')
                ->nullable()
                ->after('method')
                ->constrained('user_payment_methods')
                ->nullOnDelete();
            $table->foreignId('wallet_transaction_id')
                ->nullable()
                ->after('user_payment_method_id')
                ->constrained('wallet_transactions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('wallet_transaction_id');
            $table->dropConstrainedForeignId('user_payment_method_id');
        });
    }
};
