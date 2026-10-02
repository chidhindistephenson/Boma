<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->string('escrow_status', 40)->default('not_held')->after('status');
            $table->timestamp('escrow_held_at')->nullable()->after('escrow_status');
            $table->timestamp('release_due_at')->nullable()->after('escrow_held_at');
            $table->timestamp('released_at')->nullable()->after('release_due_at');
            $table->foreignId('released_by_user_id')
                ->nullable()
                ->after('released_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->string('release_reason', 80)->nullable()->after('released_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('released_by_user_id');
            $table->dropColumn([
                'escrow_status',
                'escrow_held_at',
                'release_due_at',
                'released_at',
                'release_reason',
            ]);
        });
    }
};
