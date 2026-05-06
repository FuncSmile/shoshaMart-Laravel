<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index('status');
            $table->index('is_printed');
            $table->index('jenis_pesanan');
            $table->index('created_at');
            $table->index(['tier_id', 'status']);
            $table->index(['buyer_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['is_printed']);
            $table->dropIndex(['jenis_pesanan']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['tier_id', 'status']);
            $table->dropIndex(['buyer_id', 'status']);
        });
    }
};
