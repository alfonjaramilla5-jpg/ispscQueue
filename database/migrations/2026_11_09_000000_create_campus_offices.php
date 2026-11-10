<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the configurable campus office layer around the existing queue.
     */
    public function up(): void
    {
        Schema::create('offices', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $registrarId = DB::table('offices')->insertGetId([
            'code' => 'registrar',
            'name' => "Registrar's Office",
            'description' => 'Academic records, certificates, transcripts, and enrollment transactions.',
            'is_active' => true,
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('office_id')
                ->nullable()
                ->after('role')
                ->constrained('offices')
                ->nullOnDelete();
        });

        Schema::table('queue_services', function (Blueprint $table) {
            $table->foreignId('office_id')
                ->nullable()
                ->after('id')
                ->constrained('offices')
                ->nullOnDelete();
            $table->index(['office_id', 'is_active']);
        });

        Schema::table('service_windows', function (Blueprint $table) {
            $table->foreignId('office_id')
                ->nullable()
                ->after('id')
                ->constrained('offices')
                ->nullOnDelete();
            $table->index(['office_id', 'is_active']);
        });

        DB::table('queue_services')->whereNull('office_id')->update([
            'office_id' => $registrarId,
        ]);

        DB::table('service_windows')->whereNull('office_id')->update([
            'office_id' => $registrarId,
        ]);
    }

    /**
     * Reverse the campus office layer.
     */
    public function down(): void
    {
        Schema::table('service_windows', function (Blueprint $table) {
            $table->dropConstrainedForeignId('office_id');
        });

        Schema::table('queue_services', function (Blueprint $table) {
            $table->dropConstrainedForeignId('office_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('office_id');
        });

        Schema::dropIfExists('offices');
    }
};
