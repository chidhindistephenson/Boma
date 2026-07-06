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
        Schema::table('job_requests', function (Blueprint $table) {
            $table->timestamp('customer_last_read_at')->nullable()->after('status');
            $table->timestamp('provider_last_read_at')->nullable()->after('customer_last_read_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_requests', function (Blueprint $table) {
            $table->dropColumn(['customer_last_read_at', 'provider_last_read_at']);
        });
    }
};
