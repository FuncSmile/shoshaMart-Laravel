<?php

use App\Models\Order;
use App\Models\Product;
use App\Models\Tier;
use App\Models\User;

beforeEach(function () {
    $this->tier = Tier::factory()->create(['name' => 'L24J']);
    $this->superadmin = User::factory()->create(['role' => 'SUPERADMIN']);
    $this->buyer = User::factory()->create([
        'role' => 'BUYER',
        'tier_id' => $this->tier->id,
    ]);
    $this->product = Product::factory()->create(['base_price' => 10000]);
});

test('superadmin can create order with type opening', function () {
    $response = $this->actingAs($this->superadmin)->post(route('orders.store'), [
        'nama_pemesan' => 'Super Admin',
        'jenis_pesanan' => 'opening',
        'buyer_id' => $this->buyer->id,
        'items' => [
            ['product_id' => $this->product->id, 'quantity' => 10, 'price' => 10000],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('orders', [
        'jenis_pesanan' => 'opening',
        'nama_pemesan' => 'Super Admin',
    ]);
});

test('superadmin can create order with type teknisi', function () {
    $response = $this->actingAs($this->superadmin)->post(route('orders.store'), [
        'nama_pemesan' => 'Super Admin',
        'jenis_pesanan' => 'teknisi',
        'buyer_id' => $this->buyer->id,
        'items' => [
            ['product_id' => $this->product->id, 'quantity' => 5, 'price' => 10000],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('orders', [
        'jenis_pesanan' => 'teknisi',
        'nama_pemesan' => 'Super Admin',
    ]);
});

test('superadmin can generate opening report with categorization', function () {
    $p1 = Product::factory()->create(['name' => 'Sapu', 'category' => 'Cleaning']);
    $p2 = Product::factory()->create(['name' => 'Buku', 'category' => 'ATK']);

    $order = Order::factory()->create([
        'nama_pemesan' => 'Super Admin',
        'jenis_pesanan' => 'opening',
        'buyer_id' => $this->buyer->id,
        'tier_id' => $this->tier->id,
    ]);

    $order->items()->create(['product_id' => $p1->id, 'quantity' => 1, 'price' => 1000, 'subtotal' => 1000]);
    $order->items()->create(['product_id' => $p2->id, 'quantity' => 1, 'price' => 1000, 'subtotal' => 1000]);

    $response = $this->actingAs($this->superadmin)->get(route('orders.invoice', $order->id));

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/pdf');

    $branchName = strtoupper(str_replace(' ', '_', $order->buyer->branch_name ?? $order->buyer->username));
    $date = $order->created_at->format('Y-m-d');
    $expectedFilename = "LAPORAN-OPENING-{$branchName}-{$order->order_number}-{$date}.pdf";

    $response->assertHeader('Content-Disposition', 'inline; filename='.$expectedFilename);
});

test('superadmin can generate standard invoice for normal orders', function () {
    $order = Order::factory()->create([
        'nama_pemesan' => 'Super Admin',
        'jenis_pesanan' => 'awal bulan',
        'buyer_id' => $this->buyer->id,
        'tier_id' => $this->tier->id,
    ]);

    $response = $this->actingAs($this->superadmin)->get(route('orders.invoice', $order->id));

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/pdf');

    $branchName = strtoupper(str_replace(' ', '_', $order->buyer->branch_name ?? $order->buyer->username));
    $date = $order->created_at->format('Y-m-d');
    $expectedFilename = "INVOICE-{$branchName}-{$order->order_number}-{$date}.pdf";

    $response->assertHeader('Content-Disposition', 'inline; filename='.$expectedFilename);
});
