<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('deletion_requested_at')->nullable()->after('two_factor_confirmed_at');
            $table->timestamp('anonymized_at')->nullable()->after('deletion_requested_at');
            $table->timestamp('retention_until')->nullable()->after('anonymized_at');
            $table->string('deletion_reason', 80)->nullable()->after('retention_until');

            $table->index(['status', 'deletion_requested_at']);
            $table->index('retention_until');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['status', 'deletion_requested_at']);
            $table->dropIndex(['retention_until']);
            $table->dropColumn([
                'deletion_requested_at',
                'anonymized_at',
                'retention_until',
                'deletion_reason',
            ]);
        });
    }
};
