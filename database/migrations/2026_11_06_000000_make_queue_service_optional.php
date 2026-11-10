<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Queue tickets are now assigned directly to a service window.
     * The old service relation remains nullable for existing records.
     */
    public function up(): void
    {
        Schema::table('queue_tickets', function (Blueprint $table) {
            $table->foreignId('queue_service_id')->nullable()->change();
        });
    }

    /**
     * Restore the original required service relation.
     */
    public function down(): void
    {
        Schema::table('queue_tickets', function (Blueprint $table) {
            $table->foreignId('queue_service_id')->nullable(false)->change();
        });
    }
};
