<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_portfolio_items', function (Blueprint $table) {
            $table->foreignId('provider_service_id')
                ->nullable()
                ->after('provider_profile_id')
                ->constrained()
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('provider_portfolio_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('provider_service_id');
        });
    }
};
