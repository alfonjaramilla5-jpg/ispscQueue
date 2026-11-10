<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('staff')->after('email');
        });

        Schema::table('service_windows', function (Blueprint $table) {
            $table->foreignId('assigned_user_id')
                ->nullable()
                ->after('is_active')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('queue_tickets', function (Blueprint $table) {
            $table->string('student_number', 40)->nullable()->after('served_by');
            $table->index(['student_number', 'queue_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('queue_tickets', function (Blueprint $table) {
            $table->dropIndex(['student_number', 'queue_date', 'status']);
            $table->dropColumn('student_number');
        });

        Schema::table('service_windows', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_user_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
