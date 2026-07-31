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

test('approving an order with insufficient stock succeeds and drives stock negative', function () {
    $this->product->update(['stock' => 5]);

    $this->actingAs($this->admin)
        ->post(route('orders.approve', $this->order->id))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($this->order->fresh()->status)->toBe('APPROVED');
    expect($this->product->fresh()->stock)->toBe(-5);
});

test('approving with insufficient stock records the shortfall in the order history', function () {
    $this->product->update(['stock' => 5]);

    $this->actingAs($this->admin)
        ->post(route('orders.approve', $this->order->id));

    expect($this->order->histories()->latest()->first()->message)
        ->toContain('stok minus: Test Product (stok 5, dibutuhkan 10)');
});

test('the orders page exposes stock warnings so the UI can confirm before approving', function () {
    $this->product->update(['stock' => 5]);

    $this->actingAs($this->admin)
        ->get(route('orders.index'))
        ->assertInertia(fn ($page) => $page
            ->where('orders.data.0.stock_warnings.0.product_name', 'Test Product')
            ->where('orders.data.0.stock_warnings.0.stock', 5)
            ->where('orders.data.0.stock_warnings.0.quantity', 10)
        );
});

test('an order with enough stock reports no stock warnings', function () {
    $this->actingAs($this->admin)
        ->get(route('orders.index'))
        ->assertInertia(fn ($page) => $page->where('orders.data.0.stock_warnings', []));
});
