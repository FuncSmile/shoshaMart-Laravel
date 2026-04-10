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
        $orphanedOrders = Order::where('status', 'paid')
            ->whereNull('settlement_id')
            ->get();

        if ($orphanedOrders->isEmpty()) {
            return;
        }

        // We get the first superadmin to attribute the manual bypass to
        $superadmin = User::where('role', 'SUPERADMIN')->first();

        foreach ($orphanedOrders as $order) {
            DB::transaction(function () use ($order, $superadmin) {
                // Create a settlement for this order
                $settlement = Settlement::create([
                    'id' => (string) Str::uuid(),
                    'buyer_id' => $order->buyer_id,
                    'admin_id' => $superadmin ? $superadmin->id : $order->buyer_id, // Fallback if no superadmin found
                    'total_amount' => $order->total_amount,
                    'start_date' => $order->created_at->toDateString(),
                    'end_date' => $order->created_at->toDateString(),
                    'proof_of_payment' => 'MANUAL_BYPASS_PATCH',
                    'storage_provider' => 'manual',
                    'status' => 'paid',
                ]);

                $order->update(['settlement_id' => $settlement->id]);

                $order->histories()->create([
                    'user_id' => $superadmin ? $superadmin->id : null,
                    'message' => "Pesanan disinkronkan ke Catatan Pelunasan via Data Patch (Settlement: {$settlement->id})",
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
        $settlements = Settlement::where('proof_of_payment', 'MANUAL_BYPASS_PATCH')->get();

        foreach ($settlements as $settlement) {
            DB::transaction(function () use ($settlement) {
                Order::where('settlement_id', $settlement->id)->update(['settlement_id' => null]);
                $settlement->delete();
            });
        }
    }
};
