<?php

use App\Models\Order;
use App\Models\Product;
use App\Models\Tier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function makeOrderWithItem(User $buyer, Tier $tier, Product $product, int $quantity, string $status, bool $isPrinted = false): Order
{
    $order = Order::factory()->create([
        'buyer_id' => $buyer->id,
        'tier_id' => $tier->id,
        'status' => $status,
        'total_amount' => $product->base_price * $quantity,
        'is_printed' => $isPrinted,
    ]);

    $order->items()->create([
        'id' => (string) Str::uuid(),
        'product_id' => $product->id,
        'quantity' => $quantity,
        'price' => $product->base_price,
        'subtotal' => $product->base_price * $quantity,
    ]);

    return $order;
}

beforeEach(function () {
    $this->superadmin = User::factory()->create(['role' => 'SUPERADMIN']);
    $this->tier = Tier::create(['name' => 'Test Tier']);

    $this->buyer1 = User::factory()->create(['role' => 'BUYER', 'tier_id' => $this->tier->id, 'branch_name' => 'Cabang 1']);
    $this->buyer2 = User::factory()->create(['role' => 'BUYER', 'tier_id' => $this->tier->id, 'branch_name' => 'Cabang 2']);

    $this->sabun = Product::factory()->create(['name' => 'Sabun', 'base_price' => 1000]);
    $this->softener = Product::factory()->create(['name' => 'Softener', 'base_price' => 2000]);
});

test('item summary aggregates quantities per product across accepted orders only', function () {
    // Accepted orders: sabun 10 (buyer 1) + sabun 20 (buyer 2) = 30, softener 3 (buyer 2)
    makeOrderWithItem($this->buyer1, $this->tier, $this->sabun, 10, 'APPROVED');
    makeOrderWithItem($this->buyer2, $this->tier, $this->sabun, 20, 'paid');
    makeOrderWithItem($this->buyer2, $this->tier, $this->softener, 3, 'verified');

    // These must NOT be counted
    makeOrderWithItem($this->buyer1, $this->tier, $this->sabun, 99, 'PENDING');
    makeOrderWithItem($this->buyer1, $this->tier, $this->sabun, 99, 'REJECTED');
    makeOrderWithItem($this->buyer1, $this->tier, $this->sabun, 99, 'CANCELLED');
    makeOrderWithItem($this->buyer1, $this->tier, $this->sabun, 99, 'APPROVED')->delete(); // soft-deleted
    makeOrderWithItem($this->buyer1, $this->tier, $this->sabun, 99, 'APPROVED', isPrinted: true); // already printed

    $this->actingAs($this->superadmin)
        ->get(route('orders.item-summary'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('orders/item-summary')
            ->has('summary', 2)
            ->where('summary.0.name', 'Sabun')
            ->where('summary.0.total_quantity', 30)
            ->where('summary.0.orders_count', 2)
            ->where('summary.0.total_value', 30000)
            ->where('summary.1.name', 'Softener')
            ->where('summary.1.total_quantity', 3)
            ->where('summary.1.total_value', 6000)
            ->where('stats.total_quantity', 33)
            ->where('stats.products_count', 2)
            ->where('stats.orders_count', 3)
        );
});

test('item summary breakdown per branch adds up to the product total', function () {
    makeOrderWithItem($this->buyer1, $this->tier, $this->sabun, 10, 'APPROVED');
    makeOrderWithItem($this->buyer2, $this->tier, $this->sabun, 20, 'APPROVED');

    $this->actingAs($this->superadmin)
        ->get(route('orders.item-summary'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('summary.0.branches', 2)
            ->where('summary.0.branches.0.branch', 'Cabang 2')
            ->where('summary.0.branches.0.quantity', 20)
            ->where('summary.0.branches.1.branch', 'Cabang 1')
            ->where('summary.0.branches.1.quantity', 10)
        );
});

test('item summary can be filtered by date range', function () {
    $old = makeOrderWithItem($this->buyer1, $this->tier, $this->sabun, 10, 'APPROVED');
    $old->created_at = now()->subMonths(2);
    $old->save();

    makeOrderWithItem($this->buyer2, $this->tier, $this->sabun, 20, 'APPROVED');

    $this->actingAs($this->superadmin)
        ->get(route('orders.item-summary', [
            'start_date' => now()->subDay()->format('Y-m-d'),
            'end_date' => now()->addDay()->format('Y-m-d'),
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('summary', 1)
            ->where('summary.0.total_quantity', 20)
        );
});

test('item summary excludes printed orders by default', function () {
    makeOrderWithItem($this->buyer1, $this->tier, $this->sabun, 10, 'APPROVED', isPrinted: false);
    makeOrderWithItem($this->buyer2, $this->tier, $this->sabun, 20, 'APPROVED', isPrinted: true);

    $this->actingAs($this->superadmin)
        ->get(route('orders.item-summary'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.print_status', 'UNPRINTED')
            ->has('summary', 1)
            ->where('summary.0.total_quantity', 10)
            ->has('summary.0.branches', 1)
            ->where('summary.0.branches.0.branch', 'Cabang 1')
            ->where('stats.orders_count', 1)
        );
});

test('item summary can show only printed orders', function () {
    makeOrderWithItem($this->buyer1, $this->tier, $this->sabun, 10, 'APPROVED', isPrinted: false);
    makeOrderWithItem($this->buyer2, $this->tier, $this->sabun, 20, 'APPROVED', isPrinted: true);

    $this->actingAs($this->superadmin)
        ->get(route('orders.item-summary', ['print_status' => 'PRINTED']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('summary', 1)
            ->where('summary.0.total_quantity', 20)
            ->where('summary.0.branches.0.branch', 'Cabang 2')
        );
});

test('item summary can show every order regardless of print status', function () {
    makeOrderWithItem($this->buyer1, $this->tier, $this->sabun, 10, 'APPROVED', isPrinted: false);
    makeOrderWithItem($this->buyer2, $this->tier, $this->sabun, 20, 'APPROVED', isPrinted: true);

    $this->actingAs($this->superadmin)
        ->get(route('orders.item-summary', ['print_status' => 'ALL']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('summary', 1)
            ->where('summary.0.total_quantity', 30)
            ->has('summary.0.branches', 2)
            ->where('stats.orders_count', 2)
        );
});

test('item summary rejects an unknown print status', function () {
    $this->actingAs($this->superadmin)
        ->get(route('orders.item-summary', ['print_status' => 'BOGUS']))
        ->assertSessionHasErrors('print_status');
});

test('item summary is forbidden for non superadmin roles', function () {
    $adminTier = User::factory()->create(['role' => 'ADMIN_TIER', 'tier_id' => $this->tier->id]);

    $this->actingAs($this->buyer1)
        ->get(route('orders.item-summary'))
        ->assertForbidden();

    $this->actingAs($adminTier)
        ->get(route('orders.item-summary'))
        ->assertForbidden();
});
