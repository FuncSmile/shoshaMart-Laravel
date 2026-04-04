<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderService
{
    public function __construct(
        protected PricingService $pricingService,
        protected FonnteService $fonnteService
    ) {}

    public function updateOrderStatus(Order $order, string $status, User $actor, ?string $reason = null): Order
    {
        return DB::transaction(function () use ($order, $status, $actor, $reason) {
            $oldStatus = $order->status;

            $order->update([
                'status' => $status,
                'rejection_reason' => $reason,
            ]);

            // Deduct stock on approval
            if ($status === 'APPROVED' && $oldStatus !== 'APPROVED') {
                $order->loadMissing('items.product');
                foreach ($order->items as $item) {
                    /** @var Product $product */
                    $product = $item->product;

                    if ($product) {
                        $product->decrement('stock', $item->quantity);
                        $product->stockLogs()->create([
                            'user_id' => $actor->id,
                            'amount' => -$item->quantity,
                            'type' => 'sub',
                            'reason' => "Persetujuan Pesanan #{$order->order_number}",
                        ]);
                    }
                }
            }

            // Restore stock if cancelled after approval
            if ($status === 'CANCELLED' && $oldStatus === 'APPROVED') {
                $order->loadMissing('items.product');
                foreach ($order->items as $item) {
                    /** @var Product $product */
                    $product = $item->product;

                    if ($product) {
                        $product->increment('stock', $item->quantity);
                        $product->stockLogs()->create([
                            'user_id' => $actor->id,
                            'amount' => $item->quantity,
                            'type' => 'add',
                            'reason' => "Pembatalan Pesanan Disetujui #{$order->order_number}",
                        ]);
                    }
                }
            }

            $action = match ($status) {
                'APPROVED' => 'menyetujui',
                'REJECTED' => 'menolak',
                'CANCELLED' => 'membatalkan',
                default => 'merevisi status',
            };

            $message = "{$actor->username} telah {$action} pesanan {$order->order_number}";
            if ($reason) {
                $message .= " dengan alasan: {$reason}";
            }

            $order->histories()->create([
                'user_id' => $actor->id,
                'message' => $message,
            ]);

            return $order;
        });
    }

    public function createOrder(
        array $items,
        User $user,
        string $namaPemesan,
        string $jenisPesanan,
        ?User $buyer = null,
        ?string $createdAt = null
    ): Order {
        // Use provided buyer (for Superadmin God Mode) or the authenticated user
        $targetUser = $buyer ?? $user;
        $isLocal = app()->isLocal();

        // Eager load everything at once to prevent N+1 queries
        $productIds = collect($items)->pluck('product_id')->unique()->toArray();
        $products = Product::with(['tierPrices' => function ($query) use ($targetUser) {
            if ($targetUser->tier_id) {
                $query->where('tier_id', $targetUser->tier_id);
            }
        }])->whereIn('id', $productIds)->get()->keyBy('id');

        return DB::transaction(function () use ($user, $targetUser, $items, $products, $namaPemesan, $jenisPesanan, $createdAt) {
            $totalAmount = 0;
            $orderItemsData = [];
            foreach ($items as $item) {
                $product = $products->get($item['product_id']);
                if ($product) {
                    $manualPrice = $item['price'] ?? null;
                    $price = ($user->isSuperAdmin() && ! is_null($manualPrice))
                        ? (float) $manualPrice
                        : $this->pricingService->getPriceForTier($product, $targetUser->tier_id);

                    $quantity = $item['quantity'] ?? 1;
                    $subtotal = $price * $quantity;
                    $totalAmount += $subtotal;

                    $orderItemsData[] = [
                        'id' => (string) Str::uuid(),
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'price' => $price,
                        'subtotal' => $subtotal,
                    ];
                }
            }

            $orderData = [
                'buyer_id' => $targetUser->id,
                'nama_pemesan' => $namaPemesan,
                'jenis_pesanan' => $jenisPesanan,
                'tier_id' => $targetUser->tier_id,
                'total_amount' => $totalAmount,
                'status' => 'PENDING',
            ];

            if ($createdAt) {
                $orderData['created_at'] = $createdAt;
            }

            $order = new Order($orderData);
            if ($createdAt) {
                $order->created_at = Carbon::parse($createdAt);
            }
            $order->save();

            foreach ($orderItemsData as $itemData) {
                $order->items()->create($itemData);
            }

            $this->notifyAdminTier($order, $targetUser);
            $this->notifyAdminGroup($order, $targetUser);

            return $order;
        });
    }

    public function updateOrder(Order $order, array $items, User $actor, string $namaPemesan, string $jenisPesanan, ?string $createdAt = null): Order
    {
        return DB::transaction(function () use ($order, $items, $actor, $namaPemesan, $jenisPesanan, $createdAt) {
            // Load products with the order's ORIGINAL buyer's tier pricing
            $buyer = $order->buyer;
            $productIds = collect($items)->pluck('product_id')->unique()->toArray();
            $products = Product::with(['tierPrices' => function ($query) use ($buyer) {
                if ($buyer->tier_id) {
                    $query->where('tier_id', $buyer->tier_id);
                }
            }])->whereIn('id', $productIds)->get()->keyBy('id');

            $totalAmount = 0;
            $syncedItems = [];
            foreach ($items as $item) {
                $product = $products->get($item['product_id']);
                if ($product) {
                    $manualPrice = $item['price'] ?? null;
                    $price = ($actor->isSuperAdmin() && ! is_null($manualPrice))
                        ? (float) $manualPrice
                        : $this->pricingService->getPriceForTier($product, $buyer->tier_id);

                    $quantity = $item['quantity'] ?? 1;
                    $subtotal = $price * $quantity;
                    $totalAmount += $subtotal;

                    $syncedItems[] = [
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'price' => $price,
                        'subtotal' => $subtotal,
                    ];
                }
            }

            // Sync items: delete all current items and recreate (simplest way to sync UUID-based items with multiple modifications)
            $order->items()->delete();
            foreach ($syncedItems as $itemData) {
                $order->items()->create(array_merge($itemData, [
                    'id' => (string) Str::uuid(),
                ]));
            }

            $updateData = [
                'total_amount' => $totalAmount,
                'nama_pemesan' => $namaPemesan,
                'jenis_pesanan' => $jenisPesanan,
            ];

            if ($createdAt) {
                $updateData['created_at'] = $createdAt;
            }

            $order->update($updateData);

            if ($createdAt) {
                $order->created_at = Carbon::parse($createdAt);
                $order->save();
            }

            $order->histories()->create([
                'user_id' => $actor->id,
                'message' => "{$actor->username} telah merevisi detail pesanan {$order->order_number}",
            ]);

            return $order->refresh();
        });
    }

    protected function notifyAdminTier(Order $order, User $user): void
    {
        $adminTier = User::where('role', 'ADMIN_TIER')
            ->where('tier_id', $user->tier_id)
            ->first();

        if ($adminTier) {
            $msg = "Pesanan Baru: {$order->id}\n"
                ."Pemesan: {$order->nama_pemesan} ({$order->jenis_pesanan})\n"
                .'Total: Rp '.number_format($order->total_amount, 0, ',', '.')."\n"
                ."Dari: {$user->username} ({$user->branch_name})";
            $this->fonnteService->sendMessage($adminTier->phone, $msg);
        }
    }

    protected function notifyAdminGroup(Order $order, User $user): void
    {
        $groupId = env('FONNTE_GROUP_ID');
        if (! $groupId) {
            return;
        }

        $dashboardUrl = config('app.url').'/orders';

        $msg = "*PESANAN BARU - SHOSHA MART* 🛒\n\n"
            ."Halo Admin, ada pesanan baru yang masuk.\n\n"
            ."*Detail Pesanan:*\n"
            ."• No. Pesanan: #{$order->order_number}\n"
            ."• Nama Pemesan: {$order->nama_pemesan}\n"
            ."• Jenis: {$order->jenis_pesanan}\n"
            .'• Cabang: '.($user->branch_name ?? 'Utama')."\n"
            .'• Total: Rp '.number_format($order->total_amount, 0, ',', '.')."\n\n"
            ."*Aksi:*\n"
            ."Mohon admin segera cek pesanan pada dashboard:\n"
            ."{$dashboardUrl}\n\n"
            .'Terima kasih.';

        $this->fonnteService->sendMessage($groupId, $msg);
    }
}
