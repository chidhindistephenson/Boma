<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_request_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_request_id')->constrained()->cascadeOnDelete()->unique();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('amount');
            $table->string('method', 40);
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 40)->default('submitted');
            $table->timestamp('paid_at');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('revision_requested_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_request_payments');
    }
};
