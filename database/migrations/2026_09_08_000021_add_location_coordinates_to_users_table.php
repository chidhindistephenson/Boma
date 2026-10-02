<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->double('latitude')->nullable()->after('area');
            $table->double('longitude')->nullable()->after('latitude');
        });

        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS cube');
        DB::statement('CREATE EXTENSION IF NOT EXISTS earthdistance');
        DB::statement(<<<'SQL'
            CREATE INDEX users_location_earth_index
            ON users USING gist (ll_to_earth(latitude, longitude))
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS users_location_earth_index');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude']);
        });
    }
};
