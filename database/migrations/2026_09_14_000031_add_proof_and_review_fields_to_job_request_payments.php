<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->string('proof_storage_path')->nullable()->after('paid_at');
            $table->string('proof_original_name')->nullable()->after('proof_storage_path');
            $table->string('proof_mime_type', 120)->nullable()->after('proof_original_name');
            $table->unsignedBigInteger('proof_size_bytes')->nullable()->after('proof_mime_type');
            $table->foreignId('reviewed_by_user_id')
                ->nullable()
                ->after('revision_requested_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->text('review_notes')->nullable()->after('reviewed_by_user_id');

            $table->index(['provider_id', 'status']);
            $table->index(['customer_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->dropIndex(['provider_id', 'status']);
            $table->dropIndex(['customer_id', 'status']);
            $table->dropConstrainedForeignId('reviewed_by_user_id');
            $table->dropColumn([
                'proof_storage_path',
                'proof_original_name',
                'proof_mime_type',
                'proof_size_bytes',
                'review_notes',
            ]);
        });
    }
};
