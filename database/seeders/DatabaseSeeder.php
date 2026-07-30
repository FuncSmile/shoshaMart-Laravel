<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Tier;
use App\Models\TierPrice;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $tierL24J = Tier::create(['name' => 'L24J']);
        $tierShosha = Tier::create(['name' => 'SHOSHA']);

        // SuperAdmin
        User::create([
            'username' => 'superadmin',
            'phone' => '08123456789',
            'password' => Hash::make('password'),
            'role' => 'SUPERADMIN',
        ]);

        // Admin Tier for L24J
        User::create([
            'username' => 'admintier',
            'phone' => '08123456780',
            'password' => Hash::make('password'),
            'role' => 'ADMIN_TIER',
            'tier_id' => $tierL24J->id,
        ]);

        // Buyer for L24J
        User::create([
            'username' => 'buyer',
            'phone' => '08123456781',
            'password' => Hash::make('password'),
            'role' => 'BUYER',
            'tier_id' => $tierL24J->id,
            'branch_name' => 'Branch A',
        ]);
        // Products
        $productA = Product::create([
            'name' => 'Beras Pandan Wangi 5kg',
            'sku' => 'BRS-PW-001',
            'base_price' => 65000,
            'stock' => 100,
            'satuan_barang' => 'karung',
        ]);

        $productB = Product::create([
            'name' => 'Gula Pasir 1kg',
            'sku' => 'GUL-PS-001',
            'base_price' => 14000,
            'stock' => 50,
            'satuan_barang' => 'pcs',
        ]);

        // Tier Prices for L24J
        TierPrice::create([
            'product_id' => $productA->id,
            'tier_id' => $tierL24J->id,
            'price' => 68000,
        ]);

        TierPrice::create([
            'product_id' => $productB->id,
            'tier_id' => $tierL24J->id,
            'price' => 15500,
        ]);

        // Tier Prices for SHOSHA
        TierPrice::create([
            'product_id' => $productA->id,
            'tier_id' => $tierShosha->id,
            'price' => 70000,
        ]);

        TierPrice::create([
            'product_id' => $productB->id,
            'tier_id' => $tierShosha->id,
            'price' => 16000,
        ]);
    }
}
