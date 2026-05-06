<?php

namespace App\Http\Controllers;

use App\Exports\OrdersExport;
use App\Models\Order;
use App\Models\Tier;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    public function exportOrders(Request $request)
    {
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
            $query->where('created_at', '>=', \Illuminate\Support\Carbon::createFromFormat('Y-m-d', $startDate, 'Asia/Jakarta')->startOfDay()->utc());
        }

        if ($endDate) {
            $query->where('created_at', '<=', \Illuminate\Support\Carbon::createFromFormat('Y-m-d', $endDate, 'Asia/Jakarta')->endOfDay()->utc());
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
