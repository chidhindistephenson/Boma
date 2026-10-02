<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_requests', function (Blueprint $table): void {
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->index(['latitude', 'longitude']);
        });

        Schema::create('job_request_proposals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('job_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('amount');
            $table->unsignedSmallInteger('timeline_days');
            $table->string('summary', 255);
            $table->text('notes')->nullable();
            $table->date('valid_until')->nullable();
            $table->string('status', 30)->default('pending');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->unique(['job_request_id', 'provider_id']);
            $table->index(['job_request_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_request_proposals');

        Schema::table('job_requests', function (Blueprint $table): void {
            $table->dropIndex(['latitude', 'longitude']);
            $table->dropColumn(['latitude', 'longitude']);
        });
    }
};
