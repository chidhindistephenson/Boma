<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_wallets', function (Blueprint $table) {
            $table->dropUnique(['user_id']);
            $table->unique(['user_id', 'currency']);
        });

        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->string('currency', 8)->default('USD')->after('amount');
        });

        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->string('currency', 8)->default('USD')->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->dropColumn('currency');
        });

        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->dropColumn('currency');
        });

        Schema::table('user_wallets', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'currency']);
            $table->unique('user_id');
        });
    }
};
