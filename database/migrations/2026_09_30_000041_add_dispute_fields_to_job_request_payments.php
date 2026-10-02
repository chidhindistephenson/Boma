<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->timestamp('disputed_at')->nullable()->after('refund_reason');
            $table->foreignId('disputed_by_user_id')
                ->nullable()
                ->after('disputed_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->text('dispute_reason')->nullable()->after('disputed_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('job_request_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('disputed_by_user_id');
            $table->dropColumn([
                'disputed_at',
                'dispute_reason',
            ]);
        });
    }
};
