<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('price')->default(0);
            $table->string('currency', 8)->default('USD');
            $table->string('billing_interval', 20)->default('monthly');
            $table->unsignedSmallInteger('trial_days')->default(0);
            $table->unsignedSmallInteger('service_limit')->default(2);
            $table->unsignedSmallInteger('portfolio_limit')->default(6);
            $table->unsignedSmallInteger('featured_service_limit')->default(0);
            $table->unsignedSmallInteger('trade_category_limit')->default(1);
            $table->boolean('has_premium_analytics')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('provider_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_plan_id')->constrained()->restrictOnDelete();
            $table->foreignId('wallet_transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 30)->default('active');
            $table->unsignedInteger('amount')->default(0);
            $table->string('currency', 8)->default('USD');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_ends_at')->nullable();
            $table->timestamp('grace_ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->boolean('auto_renews')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['provider_profile_id', 'status']);
            $table->index(['current_period_ends_at', 'status']);
        });

        Schema::create('system_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value')->nullable();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        $now = now();

        DB::table('subscription_plans')->insert([
            [
                'code' => 'basic_trial',
                'name' => 'Basic Trial',
                'description' => 'Starter visibility for newly verified providers.',
                'price' => 0,
                'currency' => 'USD',
                'billing_interval' => 'monthly',
                'trial_days' => 30,
                'service_limit' => 2,
                'portfolio_limit' => 6,
                'featured_service_limit' => 0,
                'trade_category_limit' => 1,
                'has_premium_analytics' => false,
                'sort_order' => 10,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'standard',
                'name' => 'Standard',
                'description' => 'More storefront space for active providers.',
                'price' => 15,
                'currency' => 'USD',
                'billing_interval' => 'monthly',
                'trial_days' => 0,
                'service_limit' => 6,
                'portfolio_limit' => 24,
                'featured_service_limit' => 2,
                'trade_category_limit' => 2,
                'has_premium_analytics' => false,
                'sort_order' => 20,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'pro',
                'name' => 'Pro',
                'description' => 'Premium placement, analytics, and expanded trade coverage.',
                'price' => 35,
                'currency' => 'USD',
                'billing_interval' => 'monthly',
                'trial_days' => 0,
                'service_limit' => 15,
                'portfolio_limit' => 80,
                'featured_service_limit' => 5,
                'trade_category_limit' => 4,
                'has_premium_analytics' => true,
                'sort_order' => 30,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        DB::table('system_settings')->insert([
            [
                'key' => 'search.default_radius_km',
                'value' => json_encode(25),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'subscriptions.featured_slots',
                'value' => json_encode(12),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('provider_subscriptions');
        Schema::dropIfExists('subscription_plans');
    }
};
