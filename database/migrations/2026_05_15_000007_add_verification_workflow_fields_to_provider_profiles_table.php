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
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->timestamp('verification_submitted_at')->nullable()->after('verification_status');
            $table->text('verification_notes')->nullable()->after('verification_submitted_at');
            $table->text('verification_review_notes')->nullable()->after('verification_notes');
            $table->timestamp('reviewed_at')->nullable()->after('verification_review_notes');
            $table->foreignId('reviewed_by_user_id')
                ->nullable()
                ->after('reviewed_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by_user_id');
            $table->dropColumn([
                'verification_submitted_at',
                'verification_notes',
                'verification_review_notes',
                'reviewed_at',
            ]);
        });
    }
};
