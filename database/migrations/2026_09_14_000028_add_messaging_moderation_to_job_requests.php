<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_requests', function (Blueprint $table) {
            $table->timestamp('chat_muted_at')->nullable()->after('provider_last_read_at');
            $table->foreignId('chat_muted_by_user_id')
                ->nullable()
                ->after('chat_muted_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('chat_removed_at')->nullable()->after('chat_muted_by_user_id');
            $table->foreignId('chat_removed_by_user_id')
                ->nullable()
                ->after('chat_removed_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->text('chat_moderation_notes')->nullable()->after('chat_removed_by_user_id');
        });

        Schema::create('job_request_conversation_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 40);
            $table->text('details')->nullable();
            $table->string('status', 20)->default('pending');
            $table->timestamps();

            $table->unique(['job_request_id', 'reporter_id']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_request_conversation_reports');

        Schema::table('job_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('chat_muted_by_user_id');
            $table->dropConstrainedForeignId('chat_removed_by_user_id');
            $table->dropColumn([
                'chat_muted_at',
                'chat_removed_at',
                'chat_moderation_notes',
            ]);
        });
    }
};
