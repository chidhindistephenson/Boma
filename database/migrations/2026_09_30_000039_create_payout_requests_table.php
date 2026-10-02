<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->foreignId('provider_wallet_transaction_id')
                ->nullable()
                ->after('wallet_transaction_id')
                ->constrained('wallet_transactions')
                ->nullOnDelete();
        });

        Schema::create('payout_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('wallet_id')->constrained('user_wallets')->cascadeOnDelete();
            $table->foreignId('wallet_transaction_id')
                ->nullable()
                ->constrained('wallet_transactions')
                ->nullOnDelete();
            $table->foreignId('refund_wallet_transaction_id')
                ->nullable()
                ->constrained('wallet_transactions')
                ->nullOnDelete();
            $table->unsignedInteger('amount');
            $table->string('currency', 8)->default('USD');
            $table->string('destination_type', 40);
            $table->string('destination_label', 120);
            $table->string('account_reference', 120);
            $table->text('notes')->nullable();
            $table->string('status', 40)->default('pending');
            $table->foreignId('reviewed_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index(['provider_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_requests');

        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('provider_wallet_transaction_id');
        });
    }
};
