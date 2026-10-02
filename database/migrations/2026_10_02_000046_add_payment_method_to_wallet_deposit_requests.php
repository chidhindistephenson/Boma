<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallet_deposit_requests', function (Blueprint $table) {
            $table->foreignId('user_payment_method_id')
                ->nullable()
                ->after('wallet_transaction_id')
                ->constrained('user_payment_methods')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('wallet_deposit_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_payment_method_id');
        });
    }
};
