<?php

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->buyer = User::factory()->create(['role' => 'BUYER']);
    $this->otherBuyer = User::factory()->create(['role' => 'BUYER']);

    $this->order = Order::factory()->create([
        'buyer_id' => $this->otherBuyer->id,
        'status' => 'PENDING',
        'total_amount' => 1000,
    ]);
});

test('buyer cannot view another buyers order', function () {
    $this->actingAs($this->buyer)
        ->get(route('orders.show', $this->order->id))
        ->assertForbidden();
});

test('buyer can view their own order', function () {
    $this->actingAs($this->otherBuyer)
        ->get(route('orders.show', $this->order->id))
        ->assertOk();
});

test('buyer cannot mark an order as printed', function () {
    $this->actingAs($this->buyer)
        ->post(route('orders.mark-as-printed', $this->order->id))
        ->assertForbidden();

    expect($this->order->fresh()->is_printed)->toBeFalsy();
});

test('buyer cannot export the orders report', function () {
    $this->actingAs($this->buyer)
        ->get(route('orders.report', ['format' => 'pdf']))
        ->assertForbidden();
});
