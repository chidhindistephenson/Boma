<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('job_request_quotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_request_id')->constrained()->cascadeOnDelete()->unique();
            $table->foreignId('provider_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('amount');
            $table->unsignedSmallInteger('timeline_days');
            $table->string('status', 32)->default('pending');
            $table->string('summary', 255);
            $table->text('notes')->nullable();
            $table->date('valid_until')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_request_quotes');
    }
};
