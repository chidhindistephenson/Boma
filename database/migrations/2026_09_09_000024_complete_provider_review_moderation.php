<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_reviews', function (Blueprint $table): void {
            $table->text('provider_response')->nullable()->after('body');
            $table->timestamp('responded_at')->nullable()->after('provider_response');
            $table->string('moderation_status', 30)->default('published')->index()->after('responded_at');
            $table->string('flag_reason')->nullable()->after('moderation_status');
            $table->text('moderation_notes')->nullable()->after('flag_reason');
            $table->timestamp('moderated_at')->nullable()->after('moderation_notes');
            $table->foreignId('moderated_by_user_id')
                ->nullable()
                ->after('moderated_at')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::create('provider_review_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_review_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 40);
            $table->text('details')->nullable();
            $table->timestamps();

            $table->unique(['provider_review_id', 'reporter_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_review_reports');

        Schema::table('provider_reviews', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('moderated_by_user_id');
            $table->dropIndex(['moderation_status']);
            $table->dropColumn([
                'provider_response',
                'responded_at',
                'moderation_status',
                'flag_reason',
                'moderation_notes',
                'moderated_at',
            ]);
        });
    }
};
