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
            $table->index('branch_name');
            $table->index('username');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->index('order_number');
            $table->index('nama_pemesan');
            $table->index('buyer_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['branch_name']);
            $table->dropIndex(['username']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['order_number']);
            $table->dropIndex(['nama_pemesan']);
            $table->dropIndex(['buyer_id']);
        });
    }
};
