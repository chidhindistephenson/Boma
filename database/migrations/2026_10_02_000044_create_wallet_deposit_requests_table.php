<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_deposit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('wallet_transaction_id')
                ->nullable()
                ->constrained('wallet_transactions')
                ->nullOnDelete();
            $table->unsignedInteger('amount');
            $table->string('currency', 8)->default('USD');
            $table->string('source', 40);
            $table->string('reference', 120)->nullable();
            $table->string('status', 40)->default('pending');
            $table->foreignId('reviewed_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_deposit_requests');
    }
};
