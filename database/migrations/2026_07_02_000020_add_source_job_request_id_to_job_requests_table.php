<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_requests', function (Blueprint $table) {
            $table->foreignId('source_job_request_id')
                ->nullable()
                ->after('provider_id')
                ->constrained('job_requests')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('job_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_job_request_id');
        });
    }
};
