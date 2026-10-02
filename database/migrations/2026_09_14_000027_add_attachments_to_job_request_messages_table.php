<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_request_messages', function (Blueprint $table) {
            $table->text('body')->nullable()->change();
            $table->string('attachment_path')->nullable();
            $table->string('attachment_original_name')->nullable();
            $table->string('attachment_mime_type')->nullable();
            $table->unsignedBigInteger('attachment_size_bytes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('job_request_messages', function (Blueprint $table) {
            $table->dropColumn([
                'attachment_path',
                'attachment_original_name',
                'attachment_mime_type',
                'attachment_size_bytes',
            ]);
        });

        DB::table('job_request_messages')->whereNull('body')->update(['body' => '']);

        Schema::table('job_request_messages', function (Blueprint $table) {
            $table->text('body')->nullable(false)->change();
        });
    }
};
