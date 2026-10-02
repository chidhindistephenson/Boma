<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_verification_documents', function (Blueprint $table) {
            $table->foreignId('replaces_document_id')
                ->nullable()
                ->after('uploaded_by_user_id')
                ->constrained('provider_verification_documents')
                ->nullOnDelete();
            $table->string('verification_status', 40)->default('pending')->after('size_bytes');
            $table->timestamp('approved_at')->nullable()->after('verification_status');
            $table->timestamp('reviewed_at')->nullable()->after('approved_at');
            $table->foreignId('reviewed_by_user_id')
                ->nullable()
                ->after('reviewed_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->text('review_notes')->nullable()->after('reviewed_by_user_id');

            $table->index(['provider_profile_id', 'verification_status']);
        });

        DB::table('provider_profiles')
            ->select('id', 'verified_at', 'reviewed_at', 'reviewed_by_user_id')
            ->where('verification_status', 'verified')
            ->orderBy('id')
            ->chunkById(100, function ($profiles): void {
                foreach ($profiles as $profile) {
                    DB::table('provider_verification_documents')
                        ->where('provider_profile_id', $profile->id)
                        ->update([
                            'verification_status' => 'approved',
                            'approved_at' => $profile->verified_at,
                            'reviewed_at' => $profile->reviewed_at,
                            'reviewed_by_user_id' => $profile->reviewed_by_user_id,
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('provider_verification_documents', function (Blueprint $table) {
            $table->dropIndex(['provider_profile_id', 'verification_status']);
            $table->dropConstrainedForeignId('reviewed_by_user_id');
            $table->dropForeign(['replaces_document_id']);
            $table->dropColumn([
                'replaces_document_id',
                'verification_status',
                'approved_at',
                'reviewed_at',
                'review_notes',
            ]);
        });
    }
};
