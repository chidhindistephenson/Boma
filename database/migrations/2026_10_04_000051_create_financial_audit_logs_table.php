<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_type', 80);
            $table->nullableMorphs('auditable');
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->unsignedBigInteger('job_request_id')->nullable()->index();
            $table->unsignedBigInteger('job_request_payment_id')->nullable()->index();
            $table->unsignedBigInteger('wallet_transaction_id')->nullable()->index();
            $table->unsignedBigInteger('provider_subscription_id')->nullable()->index();
            $table->unsignedBigInteger('payout_request_id')->nullable()->index();
            $table->unsignedInteger('amount')->default(0);
            $table->string('currency', 8)->default('USD');
            $table->string('direction', 20)->nullable();
            $table->string('reference', 160)->nullable();
            $table->string('status', 60)->nullable();
            $table->json('metadata')->nullable();
            $table->string('checksum', 128);
            $table->timestamp('recorded_at')->useCurrent();
            $table->timestamps();

            $table->index(['event_type', 'recorded_at']);
            $table->index(['job_request_payment_id', 'event_type']);
            $table->index(['wallet_transaction_id', 'event_type']);
            $table->index(['provider_subscription_id', 'event_type']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::unprepared(<<<'SQL'
                CREATE OR REPLACE FUNCTION prevent_financial_audit_log_mutation()
                RETURNS trigger AS $$
                BEGIN
                    RAISE EXCEPTION 'financial_audit_logs is append-only';
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER financial_audit_logs_append_only
                BEFORE UPDATE OR DELETE ON financial_audit_logs
                FOR EACH ROW EXECUTE FUNCTION prevent_financial_audit_log_mutation();
            SQL);
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql' && Schema::hasTable('financial_audit_logs')) {
            DB::unprepared(<<<'SQL'
                DROP TRIGGER IF EXISTS financial_audit_logs_append_only ON financial_audit_logs;
                DROP FUNCTION IF EXISTS prevent_financial_audit_log_mutation();
            SQL);
        }

        Schema::dropIfExists('financial_audit_logs');
    }
};
