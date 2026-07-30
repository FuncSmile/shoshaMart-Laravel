<?php

namespace App\Http\Controllers;

use App\Exports\OrdersExport;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderType;
use App\Models\Tier;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    /**
     * Rekap Barang: aggregated quantity per product across accepted orders,
     * with a per-branch breakdown so the totals can be verified.
     */
    public function itemSummary(Request $request)
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403);
        }

        $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d',
            'jenis_pesanan' => 'nullable|string',
            'tier_id' => 'nullable|string',
            'print_status' => 'nullable|in:UNPRINTED,PRINTED,ALL',
        ]);

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $jenisPesanan = $request->input('jenis_pesanan', 'ALL');
        $tierId = $request->input('tier_id', 'ALL');
        $printStatus = $request->input('print_status', 'UNPRINTED');

        $applyOrderFilters = function ($query, string $prefix = '') use ($jenisPesanan, $tierId, $startDate, $endDate, $printStatus) {
            return $query
                ->when($jenisPesanan && $jenisPesanan !== 'ALL', fn ($q) => $q->where("{$prefix}jenis_pesanan", $jenisPesanan))
                ->when($tierId && $tierId !== 'ALL', fn ($q) => $q->where("{$prefix}tier_id", $tierId))
                ->when($printStatus === 'UNPRINTED', fn ($q) => $q->where("{$prefix}is_printed", false))
                ->when($printStatus === 'PRINTED', fn ($q) => $q->where("{$prefix}is_printed", true))
                ->when($startDate, fn ($q) => $q->where("{$prefix}created_at", '>=', Carbon::createFromFormat('Y-m-d', $startDate, 'Asia/Jakarta')->startOfDay()->utc()))
                ->when($endDate, fn ($q) => $q->where("{$prefix}created_at", '<=', Carbon::createFromFormat('Y-m-d', $endDate, 'Asia/Jakarta')->endOfDay()->utc()));
        };

        // Single query grouped by (product, buyer). Product totals are derived
        // from these same rows, so the breakdown always adds up to the total.
        $rows = $applyOrderFilters(
            OrderItem::query()
                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->join('users', 'users.id', '=', 'orders.buyer_id')
                ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
                ->whereIn('orders.status', Order::ACCEPTED_STATUSES)
                ->whereNull('orders.deleted_at'),
            'orders.'
        )
            ->groupBy('order_items.product_id', 'orders.buyer_id')
            ->selectRaw('
                order_items.product_id,
                orders.buyer_id,
                MIN(products.name) as product_name,
                MIN(products.sku) as product_sku,
                MIN(products.satuan_barang) as satuan_barang,
                MIN(users.username) as buyer_username,
                MIN(users.branch_name) as branch_name,
                SUM(order_items.quantity) as total_quantity,
                SUM(order_items.subtotal) as total_value,
                COUNT(DISTINCT order_items.order_id) as orders_count
            ')
            ->get();

        $summary = $rows->groupBy('product_id')->map(function ($group) {
            $first = $group->first();

            return [
                'product_id' => $first->product_id,
                'name' => $first->product_name ?? 'Produk Terhapus',
                'sku' => $first->product_sku,
                'satuan_barang' => $first->satuan_barang,
                'total_quantity' => (int) $group->sum('total_quantity'),
                'total_value' => (float) $group->sum('total_value'),
                'orders_count' => (int) $group->sum('orders_count'),
                'branches' => $group->map(fn ($row) => [
                    'buyer_id' => $row->buyer_id,
                    'branch' => $row->branch_name ?: $row->buyer_username,
                    'quantity' => (int) $row->total_quantity,
                    'value' => (float) $row->total_value,
                    'orders_count' => (int) $row->orders_count,
                ])->sortByDesc('quantity')->values(),
            ];
        })->sortByDesc('total_quantity')->values();

        $acceptedOrdersCount = $applyOrderFilters(
            Order::query()->whereIn('status', Order::ACCEPTED_STATUSES)
        )->count();

        return Inertia::render('orders/item-summary', [
            'summary' => $summary,
            'stats' => [
                'products_count' => $summary->count(),
                'total_quantity' => (int) $summary->sum('total_quantity'),
                'total_value' => (float) $summary->sum('total_value'),
                'orders_count' => $acceptedOrdersCount,
            ],
            'tiers' => Tier::select(['id', 'name'])->get(),
            'availableTypes' => OrderType::orderBy('name')->pluck('name'),
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'jenis_pesanan' => $jenisPesanan,
                'tier_id' => $tierId,
                'print_status' => $printStatus,
            ],
        ]);
    }

    public function exportOrders(Request $request)
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403);
        }

        $request->validate([
            'format' => 'required|in:pdf,excel',
            'jenis_pesanan' => 'nullable|string',
            'tier_id' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $format = $request->input('format');
        $jenisPesanan = $request->input('jenis_pesanan');
        $tierId = $request->input('tier_id');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $tierName = 'SEMUA TIER';
        if ($tierId && $tierId !== 'ALL') {
            $tier = Tier::find($tierId);
            $tierName = $tier ? $tier->name : "TIER ID: {$tierId}";
        }

        $query = Order::with(['buyer:id,username,branch_name', 'items.product:id,name,sku,satuan_barang'])
            ->withCount('items')
            ->whereIn('status', ['APPROVED', 'paid', 'verified'])
            ->latest();

        if ($jenisPesanan && $jenisPesanan !== 'ALL') {
            $query->where('jenis_pesanan', $jenisPesanan);
        }

        if ($tierId && $tierId !== 'ALL') {
            $query->where('tier_id', $tierId);
        }

        if ($startDate) {
            $query->where('created_at', '>=', Carbon::createFromFormat('Y-m-d', $startDate, 'Asia/Jakarta')->startOfDay()->utc());
        }

        if ($endDate) {
            $query->where('created_at', '<=', Carbon::createFromFormat('Y-m-d', $endDate, 'Asia/Jakarta')->endOfDay()->utc());
        }

        $orders = $query->get();

        if ($orders->isEmpty()) {
            return back()->with('error', 'Tidak ada data pesanan yang ditemukan untuk laporan ini.');
        }

        $dateSuffix = now()->format('Y-m-d');
        if ($startDate && $endDate) {
            $dateSuffix = "{$startDate}_SD_{$endDate}";
        } elseif ($startDate) {
            $dateSuffix = "SEJAK_{$startDate}";
        } elseif ($endDate) {
            $dateSuffix = "SAMPAI_{$endDate}";
        }

        $filename = 'LAPORAN-PESANAN-'.($jenisPesanan !== 'ALL' ? strtoupper($jenisPesanan).'-' : '').$dateSuffix;

        if ($format === 'pdf') {
            $groupedOrders = $orders->groupBy('buyer_id')->sortBy(function ($branchOrders) {
                return strtolower($branchOrders->first()->buyer->branch_name ?? $branchOrders->first()->buyer->username);
            });
            $pdf = Pdf::loadView('reports.orders', compact('groupedOrders', 'jenisPesanan', 'tierName'));
            $pdf->setPaper('a4', 'portrait');

            return $pdf->stream("{$filename}.pdf");
        }

        return Excel::download(new OrdersExport($orders, $tierName), "{$filename}.xlsx");
    }
}
