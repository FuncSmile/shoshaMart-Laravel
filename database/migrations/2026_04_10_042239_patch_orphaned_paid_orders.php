<?php

use App\Models\Order;
use App\Models\Settlement;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $orphanedOrders = DB::table('orders')
            ->where('status', 'paid')
            ->whereNull('settlement_id')
            ->get();

        if ($orphanedOrders->isEmpty()) {
            return;
        }

        // We get the first superadmin to attribute the manual bypass to
        $superadmin = DB::table('users')->where('role', 'SUPERADMIN')->first();

        foreach ($orphanedOrders as $order) {
            DB::transaction(function () use ($order, $superadmin) {
                $orderId = $order->id;
                $createdAt = \Illuminate\Support\Carbon::parse($order->created_at);

                // Create a settlement for this order
                $settlementId = (string) Str::uuid();
                DB::table('settlements')->insert([
                    'id' => $settlementId,
                    'buyer_id' => $order->buyer_id,
                    'admin_id' => $superadmin ? $superadmin->id : $order->buyer_id,
                    'total_amount' => $order->total_amount,
                    'start_date' => $createdAt->toDateString(),
                    'end_date' => $createdAt->toDateString(),
                    'proof_of_payment' => 'MANUAL_BYPASS_PATCH',
                    'storage_provider' => 'manual',
                    'status' => 'paid',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('orders')->where('id', $orderId)->update(['settlement_id' => $settlementId]);

                DB::table('order_histories')->insert([
                    'id' => (string) Str::uuid(),
                    'order_id' => $orderId,
                    'user_id' => $superadmin ? $superadmin->id : null,
                    'message' => "Pesanan disinkronkan ke Catatan Pelunasan via Data Patch (Settlement: {$settlementId})",
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Delete settlements created by the patch
        $settlements = DB::table('settlements')->where('proof_of_payment', 'MANUAL_BYPASS_PATCH')->get();

        foreach ($settlements as $settlement) {
            DB::transaction(function () use ($settlement) {
                DB::table('orders')->where('settlement_id', $settlement->id)->update(['settlement_id' => null]);
                DB::table('settlements')->where('id', $settlement->id)->delete();
            });
        }
    }
};
