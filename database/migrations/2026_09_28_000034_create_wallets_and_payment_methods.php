<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('balance')->default(0);
            $table->string('currency', 8)->default('USD');
            $table->timestamps();
        });

        Schema::create('user_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 40)->default('card');
            $table->string('brand', 40);
            $table->string('label')->nullable();
            $table->string('last_four', 4);
            $table->unsignedTinyInteger('exp_month');
            $table->unsignedSmallInteger('exp_year');
            $table->string('gateway_token', 160)->unique();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_default']);
        });

        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained('user_wallets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('job_request_payment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 40);
            $table->string('direction', 20);
            $table->unsignedInteger('amount');
            $table->unsignedInteger('balance_after');
            $table->string('status', 40)->default('completed');
            $table->string('reference', 120)->unique();
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['wallet_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('user_payment_methods');
        Schema::dropIfExists('user_wallets');
    }
};
