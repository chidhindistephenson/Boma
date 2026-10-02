<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payout_requests', function (Blueprint $table) {
            $table->string('settlement_reference', 120)->nullable()->after('paid_at');
            $table->text('settlement_notes')->nullable()->after('settlement_reference');
        });
    }

    public function down(): void
    {
        Schema::table('payout_requests', function (Blueprint $table) {
            $table->dropColumn([
                'settlement_reference',
                'settlement_notes',
            ]);
        });
    }
};
