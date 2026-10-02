<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_requests', function (Blueprint $table): void {
            $table->date('preferred_date')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('job_requests', function (Blueprint $table): void {
            $table->dropIndex(['preferred_date']);
            $table->dropColumn('preferred_date');
        });
    }
};
