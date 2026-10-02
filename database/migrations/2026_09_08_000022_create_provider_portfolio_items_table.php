<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_portfolio_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->string('title', 140);
            $table->text('description');
            $table->string('media_type', 20);
            $table->string('original_name');
            $table->string('storage_path');
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('size_bytes');
            $table->smallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['provider_profile_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_portfolio_items');
    }
};
