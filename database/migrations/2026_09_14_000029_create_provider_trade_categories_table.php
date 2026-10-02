<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_trade_categories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->string('trade_category');
            $table->string('verification_status')->default('pending');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->unique(['provider_profile_id', 'trade_category']);
            $table->index(['trade_category', 'verification_status']);
        });

        DB::table('provider_profiles')
            ->whereNotNull('trade_category')
            ->orderBy('id')
            ->get()
            ->each(function ($profile): void {
                DB::table('provider_trade_categories')->insert([
                    'provider_profile_id' => $profile->id,
                    'trade_category' => $profile->trade_category,
                    'verification_status' => $profile->verification_status ?? 'pending',
                    'submitted_at' => $profile->verification_submitted_at,
                    'verified_at' => $profile->verified_at,
                    'reviewed_at' => $profile->reviewed_at,
                    'reviewed_by_user_id' => $profile->reviewed_by_user_id,
                    'review_notes' => $profile->verification_review_notes,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_trade_categories');
    }
};
