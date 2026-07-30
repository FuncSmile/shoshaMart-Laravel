<?php

use App\Models\Order;
use App\Models\Product;
use App\Models\Tier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->tier = Tier::create(['name' => 'Test Tier']);
    $this->admin = User::factory()->create(['role' => 'SUPERADMIN']);
    $this->buyer = User::factory()->create(['role' => 'BUYER', 'tier_id' => $this->tier->id]);

    $this->product = Product::factory()->create([
        'name' => 'Test Product',
        'stock' => 100,
    ]);

    $this->order = Order::create([
        'buyer_id' => $this->buyer->id,
        'tier_id' => $this->tier->id,
        'order_number' => 'ORD-123',
        'status' => 'PENDING',
        'total_amount' => 1000,
        'nama_pemesan' => 'Test Buyer',
        'jenis_pesanan' => 'REGULER',
    ]);

    $this->order->items()->create([
        'id' => (string) Str::uuid(),
        'product_id' => $this->product->id,
        'quantity' => 10,
        'price' => 100,
        'subtotal' => 1000,
    ]);
});

test('approving an order deducts stock and creates audit log', function () {
    $this->actingAs($this->admin)
        ->post(route('orders.approve', $this->order->id))
        ->assertRedirect();

    expect($this->product->fresh()->stock)->toBe(90);

    $this->assertDatabaseHas('stock_logs', [
        'product_id' => $this->product->id,
        'amount' => -10,
        'type' => 'sub',
        'reason' => 'Persetujuan Pesanan #ORD-123',
    ]);
});

test('cancelling an approved order is forbidden', function () {
    $this->order->update(['status' => 'APPROVED']);

    $this->actingAs($this->admin)
        ->patch(route('orders.cancel', $this->order->id))
        ->assertForbidden();

    expect($this->order->fresh()->status)->toBe('APPROVED');
});

test('deleting an approved order restores stock and creates audit log', function () {
    // Manually set to approved and deduct to simulate state
    $this->order->update(['status' => 'APPROVED']);
    $this->product->decrement('stock', 10);

    $this->actingAs($this->admin)
        ->delete(route('orders.destroy', $this->order->id))
        ->assertRedirect();

    expect($this->product->fresh()->stock)->toBe(100);

    $this->assertDatabaseHas('stock_logs', [
        'product_id' => $this->product->id,
        'amount' => 10,
        'type' => 'add',
        'reason' => 'Penghapusan Pesanan Disetujui #ORD-123',
    ]);
});

test('approving an order with insufficient stock is rejected', function () {
    $this->product->update(['stock' => 5]);

    $this->actingAs($this->admin)
        ->post(route('orders.approve', $this->order->id))
        ->assertSessionHasErrors('stock');

    expect($this->order->fresh()->status)->toBe('PENDING');
    expect($this->product->fresh()->stock)->toBe(5);
});
