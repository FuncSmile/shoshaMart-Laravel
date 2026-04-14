<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        DB::table('order_types')->insert([
            ['name' => 'awal bulan', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'pertengahan bulan', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Lembur', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'tambahan bulan ini', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'opening', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'teknisi', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_types');
    }
};
