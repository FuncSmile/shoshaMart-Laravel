<?php

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->superadmin = User::factory()->create(['role' => 'SUPERADMIN']);
    $this->buyer = User::factory()->create(['role' => 'BUYER']);
});

test('superadmin cannot cancel an approved order', function () {
    $order = Order::factory()->create([
        'buyer_id' => $this->buyer->id,
        'status' => 'APPROVED',
        'total_amount' => 1000
    ]);

    $response = $this->actingAs($this->superadmin)->patch(route('orders.cancel', $order->id));

    $response->assertStatus(403);
    expect($order->fresh()->status)->toBe('APPROVED');
});

test('superadmin can cancel a pending order', function () {
    $order = Order::factory()->create([
        'buyer_id' => $this->buyer->id,
        'status' => 'PENDING',
        'total_amount' => 1000
    ]);

    $response = $this->actingAs($this->superadmin)->patch(route('orders.cancel', $order->id));

    $response->assertRedirect();
    expect($order->fresh()->status)->toBe('CANCELLED');
});
