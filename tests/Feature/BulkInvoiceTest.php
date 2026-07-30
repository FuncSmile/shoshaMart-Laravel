<?php

use App\Models\Order;
use App\Models\Product;
use App\Models\Tier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function makePrintableOrder(User $buyer, Tier $tier, Product $product, string $status = 'APPROVED'): Order
{
    $order = Order::factory()->create([
        'buyer_id' => $buyer->id,
        'tier_id' => $tier->id,
        'status' => $status,
        'total_amount' => $product->base_price,
        'is_printed' => false,
    ]);

    $order->items()->create([
        'id' => (string) Str::uuid(),
        'product_id' => $product->id,
        'quantity' => 1,
        'price' => $product->base_price,
        'subtotal' => $product->base_price,
    ]);

    return $order;
}

beforeEach(function () {
    $this->superadmin = User::factory()->create(['role' => 'SUPERADMIN']);
    $this->tier = Tier::create(['name' => 'Test Tier']);
    $this->buyer = User::factory()->create(['role' => 'BUYER', 'tier_id' => $this->tier->id, 'branch_name' => 'Cabang 1']);
    $this->product = Product::factory()->create(['name' => 'Sabun', 'base_price' => 1000]);
});

test('prints only the selected orders and leaves the rest untouched', function () {
    $selectedA = makePrintableOrder($this->buyer, $this->tier, $this->product);
    $selectedB = makePrintableOrder($this->buyer, $this->tier, $this->product);
    $untouched = makePrintableOrder($this->buyer, $this->tier, $this->product);

    $response = $this->actingAs($this->superadmin)
        ->post(route('orders.bulk-invoice'), ['ids' => [$selectedA->id, $selectedB->id]]);

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('application/pdf');

    expect($selectedA->fresh()->is_printed)->toBeTrue();
    expect($selectedB->fresh()->is_printed)->toBeTrue();

    // The order that was never ticked must not be affected in any way.
    expect($untouched->fresh()->is_printed)->toBeFalse();
    expect($untouched->fresh()->printed_at)->toBeNull();

    $this->assertDatabaseHas('order_histories', ['order_id' => $selectedA->id]);
    $this->assertDatabaseMissing('order_histories', ['order_id' => $untouched->id]);
});

test('the invoice renders exactly the selected orders, in the selected sequence', function () {
    $first = makePrintableOrder($this->buyer, $this->tier, $this->product);
    $second = makePrintableOrder($this->buyer, $this->tier, $this->product);
    $excluded = makePrintableOrder($this->buyer, $this->tier, $this->product);

    // Capture what actually reaches the invoice template — this is the real
    // guarantee that no other order can slip into the printed batch.
    $rendered = null;
    View::composer('invoices.bulk-dotmatrix', function ($view) use (&$rendered) {
        $rendered = collect($view->getData()['orders'])->pluck('id')->all();
    });

    // Deliberately pick them in reverse creation order.
    $this->actingAs($this->superadmin)
        ->post(route('orders.bulk-invoice'), ['ids' => [$second->id, $first->id]])
        ->assertOk();

    expect($rendered)->toBe([$second->id, $first->id]);
    expect($rendered)->not->toContain($excluded->id);
});

test('rejects the whole batch when an order is not approved', function () {
    $approved = makePrintableOrder($this->buyer, $this->tier, $this->product);
    $pending = makePrintableOrder($this->buyer, $this->tier, $this->product, 'PENDING');

    $this->actingAs($this->superadmin)
        ->from(route('orders.print-index'))
        ->post(route('orders.bulk-invoice'), ['ids' => [$approved->id, $pending->id]])
        ->assertRedirect(route('orders.print-index'))
        ->assertSessionHasErrors('ids');

    // Nothing may be marked as printed when the batch is refused.
    expect($approved->fresh()->is_printed)->toBeFalse();
    expect($pending->fresh()->is_printed)->toBeFalse();
});

test('rejects the whole batch when an order no longer exists', function () {
    $approved = makePrintableOrder($this->buyer, $this->tier, $this->product);
    $deleted = makePrintableOrder($this->buyer, $this->tier, $this->product);
    $deleted->delete();

    $this->actingAs($this->superadmin)
        ->from(route('orders.print-index'))
        ->post(route('orders.bulk-invoice'), ['ids' => [$approved->id, $deleted->id]])
        ->assertRedirect(route('orders.print-index'))
        ->assertSessionHasErrors('ids');

    expect($approved->fresh()->is_printed)->toBeFalse();
});

test('accepts paid and verified orders', function () {
    $paid = makePrintableOrder($this->buyer, $this->tier, $this->product, 'paid');
    $verified = makePrintableOrder($this->buyer, $this->tier, $this->product, 'verified');

    $this->actingAs($this->superadmin)
        ->post(route('orders.bulk-invoice'), ['ids' => [$paid->id, $verified->id]])
        ->assertOk();

    expect($paid->fresh()->is_printed)->toBeTrue();
    expect($verified->fresh()->is_printed)->toBeTrue();
});

test('rejects duplicate, empty and oversized selections', function () {
    $order = makePrintableOrder($this->buyer, $this->tier, $this->product);

    $this->actingAs($this->superadmin)
        ->from(route('orders.print-index'))
        ->post(route('orders.bulk-invoice'), ['ids' => [$order->id, $order->id]])
        ->assertSessionHasErrors('ids.0');

    $this->actingAs($this->superadmin)
        ->from(route('orders.print-index'))
        ->post(route('orders.bulk-invoice'), ['ids' => []])
        ->assertSessionHasErrors('ids');

    $this->actingAs($this->superadmin)
        ->from(route('orders.print-index'))
        ->post(route('orders.bulk-invoice'), [
            'ids' => array_map(fn () => (string) Str::uuid(), range(1, 101)),
        ])
        ->assertSessionHasErrors('ids');

    expect($order->fresh()->is_printed)->toBeFalse();
});

test('the print page renders and exposes a csrf token for the bulk print form', function () {
    makePrintableOrder($this->buyer, $this->tier, $this->product);

    $this->actingAs($this->superadmin)
        ->get(route('orders.print-index'))
        ->assertOk()
        ->assertSee('name="csrf-token"', false);
});

test('bulk invoice is forbidden for non superadmin roles', function () {
    $order = makePrintableOrder($this->buyer, $this->tier, $this->product);
    $adminTier = User::factory()->create(['role' => 'ADMIN_TIER', 'tier_id' => $this->tier->id]);

    $this->actingAs($adminTier)
        ->post(route('orders.bulk-invoice'), ['ids' => [$order->id]])
        ->assertForbidden();

    $this->actingAs($this->buyer)
        ->post(route('orders.bulk-invoice'), ['ids' => [$order->id]])
        ->assertForbidden();

    expect($order->fresh()->is_printed)->toBeFalse();
});
