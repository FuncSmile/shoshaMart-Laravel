<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Http\Resources\StockLogResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Tier;
use App\Models\User;
use App\Services\PricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function __construct(protected PricingService $pricingService) {}

    public function index(Request $request)
    {
        /** @var User $user */
        $user = auth()->user();
        $isSuperAdmin = $user?->isSuperAdmin();
        $isWarehouse = $user?->isWarehouse();
        $canManage = $isSuperAdmin || $isWarehouse;
        $search = $request->input('search');

        $query = Product::query()
            ->select(['id', 'name', 'sku', 'image_url', 'satuan_barang', 'stock', 'base_price'])
            ->with(['tierPrices' => function ($query) use ($user, $canManage) {
                if ($canManage) {
                    return; // SuperAdmin & Warehouse sees all
                }

                if ($user?->tier_id) {
                    $query->where('tier_id', $user->tier_id);
                } else {
                    $query->whereRaw('1 = 0');
                }
            }]);
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        $products = $query->orderBy('position', 'asc')->orderBy('name', 'asc')->paginate(12)->withQueryString();

        $products->getCollection()->each(function (Product $product) use ($user) {
            $product->display_price = $this->pricingService->getPriceForTier($product, $user?->tier_id);
        });

        return Inertia::render('products/index', [
            'products' => ProductResource::collection($products),
            'tiers' => $canManage ? Tier::select(['id', 'name'])->get() : [],
            'auth_role' => $user?->role,
            'filters' => $request->only(['search']),
        ]);
    }

    public function apiIndex()
    {
        $products = Product::select(['id', 'name', 'sku', 'base_price', 'satuan_barang', 'image_url'])
            ->orderBy('position', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json($products);
    }

    public function reorder(Request $request)
    {
        /** @var User $user */
        $user = auth()->user();
        if (! $user?->isSuperAdmin() && ! $user?->isWarehouse()) {
            abort(403);
        }

        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|exists:products,id',
        ]);

        $ids = $request->input('ids');

        DB::transaction(function () use ($ids) {
            foreach ($ids as $index => $id) {
                Product::where('id', $id)->update(['position' => $index]);
            }
        });

        return back()->with('status', 'Catalog reordered successfully.');
    }

    public function store(StoreProductRequest $request)
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated) {
            $product = Product::create([
                'name' => $validated['name'],
                'sku' => $validated['sku'],
                'image_url' => $validated['image_url'],
                'satuan_barang' => $validated['satuan_barang'],
                'base_price' => $validated['base_price'],
                'stock' => $validated['stock'],
            ]);

            if (! empty($validated['tier_prices'])) {
                foreach ($validated['tier_prices'] as $tp) {
                    $product->tierPrices()->create([
                        'tier_id' => $tp['tier_id'],
                        'price' => $tp['price'],
                    ]);
                }
            }
        });

        return back()->with('status', 'Product created successfully.');
    }

    public function update(UpdateProductRequest $request, Product $product)
    {
        $validated = $request->validated();
        $updatePastOrders = $request->boolean('update_past_orders', false);

        DB::transaction(function () use ($product, $validated, $updatePastOrders) {
            $product->update([
                'name' => $validated['name'],
                'sku' => $validated['sku'],
                'image_url' => $validated['image_url'],
                'satuan_barang' => $validated['satuan_barang'],
                'base_price' => $validated['base_price'],
                'stock' => $validated['stock'],
            ]);

            // Sync tier prices: delete existing and recreate
            $product->tierPrices()->delete();

            $newPrices = [];
            if (! empty($validated['tier_prices'])) {
                foreach ($validated['tier_prices'] as $tp) {
                    $product->tierPrices()->create([
                        'tier_id' => $tp['tier_id'],
                        'price' => $tp['price'],
                    ]);
                    $newPrices[$tp['tier_id']] = (float) $tp['price'];
                }
            }

            if ($updatePastOrders) {
                // Find all order items for this product
                $orderItems = OrderItem::where('product_id', $product->id)
                    ->with('order')
                    ->get();

                $affectedOrderIds = [];

                foreach ($orderItems as $item) {
                    $order = $item->order;
                    if (! $order) {
                        continue;
                    }

                    // Determine the price based on the order's tier_id
                    // Fallback to base_price if tier_id is not in newPrices
                    $price = $newPrices[$order->tier_id] ?? (float) $validated['base_price'];

                    $item->update([
                        'price' => $price,
                        'price_at_purchase' => $price,
                        'subtotal' => $item->quantity * $price,
                    ]);

                    $affectedOrderIds[] = $order->id;
                }

                // Recalculate totals for all affected orders
                if (! empty($affectedOrderIds)) {
                    $uniqueOrderIds = array_unique($affectedOrderIds);
                    foreach ($uniqueOrderIds as $orderId) {
                        $order = Order::find($orderId);
                        if ($order) {
                            $order->update([
                                'total_amount' => $order->items()->sum('subtotal'),
                            ]);
                        }
                    }
                }
            }
        });

        return back()->with('status', 'Product updated successfully.');
    }

    public function destroy(Product $product)
    {
        /** @var User $user */
        $user = auth()->user();
        if (! $user?->isSuperAdmin() && ! $user?->isWarehouse()) {
            abort(403);
        }

        $product->delete();

        return back()->with('status', 'Product deleted successfully.');
    }

    public function downloadTemplate()
    {
        /** @var User $user */
        $user = auth()->user();
        if (! $user?->isSuperAdmin() && ! $user?->isWarehouse()) {
            abort(403);
        }

        $tiers = Tier::all();
        $headers = ['name', 'sku', 'base_price', 'stock', 'satuan_barang', 'image_url'];

        foreach ($tiers as $tier) {
            $headers[] = 'price_'.strtoupper(str_replace(' ', '_', $tier->name));
        }

        $callback = function () use ($headers) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);

            // Sample Row
            $sample = ['Sample Product', 'SKU-001', '10000', '50', 'PCS', 'https://example.com/image.jpg'];
            foreach (array_slice($headers, 6) as $h) {
                $sample[] = '9000';
            }
            fputcsv($file, $sample);

            fclose($file);
        };

        return Response::stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="product_template.csv"',
        ]);
    }

    public function import(Request $request)
    {
        /** @var User $user */
        $user = auth()->user();
        if (! $user?->isSuperAdmin() && ! $user?->isWarehouse()) {
            abort(403);
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ]);

        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');
        $headerRow = fgetcsv($handle);

        if (! $headerRow) {
            return back()->withErrors(['file' => 'CSV is empty or invalid.']);
        }

        $tiers = Tier::all()->keyBy(fn ($t) => 'price_'.strtoupper(str_replace(' ', '_', $t->name)));

        DB::transaction(function () use ($handle, $headerRow, $tiers) {
            while (($row = fgetcsv($handle)) !== false) {
                if (count($headerRow) !== count($row)) {
                    continue;
                }
                $data = array_combine($headerRow, $row);

                $product = Product::updateOrCreate(
                    ['sku' => $data['sku']],
                    [
                        'name' => $data['name'],
                        'base_price' => $data['base_price'],
                        'stock' => $data['stock'],
                        'satuan_barang' => $data['satuan_barang'],
                        'image_url' => $data['image_url'] ?? null,
                    ]
                );

                foreach ($tiers as $colName => $tier) {
                    if (isset($data[$colName])) {
                        $product->tierPrices()->updateOrCreate(
                            ['tier_id' => $tier->id],
                            ['price' => $data[$colName]]
                        );
                    }
                }
            }
        });

        fclose($handle);

        return back()->with('status', 'Products imported successfully.');
    }

    public function updateStock(Request $request, Product $product)
    {
        /** @var User $user */
        $user = auth()->user();
        if (! $user?->isSuperAdmin() && ! $user?->isWarehouse()) {
            abort(403);
        }

        $validated = $request->validate([
            'amount' => 'required|integer|min:1',
            'type' => 'required|in:add,sub',
            'reason' => 'required|string|max:255',
        ]);

        $amount = (int) $validated['amount'];
        $type = $validated['type'];

        DB::transaction(function () use ($product, $user, $amount, $type, $validated) {
            $newStock = $type === 'add' ? $product->stock + $amount : $product->stock - $amount;

            if ($newStock < 0) {
                // Return explicitly to show error in inertia if needed, or just throw
                abort(422, 'Stock tidak boleh kurang dari nol.');
            }

            $product->update(['stock' => $newStock]);

            $product->stockLogs()->create([
                'user_id' => $user->id,
                'amount' => $type === 'add' ? $amount : -$amount,
                'type' => $type,
                'reason' => $validated['reason'],
            ]);
        });

        return back()->with('status', 'Stock berhasil diperbarui.');
    }

    public function stockHistory(Product $product)
    {
        /** @var User $user */
        $user = auth()->user();
        if (! $user?->isSuperAdmin() && ! $user?->isWarehouse()) {
            abort(403);
        }

        $logs = $product->stockLogs()
            ->with('user')
            ->latest()
            ->take(20)
            ->get();

        return response()->json(StockLogResource::collection($logs));
    }
}
