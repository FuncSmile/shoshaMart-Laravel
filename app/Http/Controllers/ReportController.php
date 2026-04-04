<?php

namespace App\Http\Controllers;

use App\Exports\OrdersExport;
use App\Models\Order;
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

        $query = Order::with(['buyer:id,username,branch_name', 'items.product:id,name,sku,satuan_barang'])
            ->withCount('items')
            ->where('status', 'APPROVED')
            ->latest();

        if ($jenisPesanan && $jenisPesanan !== 'ALL') {
            $query->where('jenis_pesanan', $jenisPesanan);
        }

        if ($tierId && $tierId !== 'ALL') {
            $query->where('tier_id', $tierId);
        }

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
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
            $groupedOrders = $orders->groupBy('buyer_id');
            $pdf = Pdf::loadView('reports.orders', compact('groupedOrders', 'jenisPesanan'));
            $pdf->setPaper('a4', 'portrait');

            return $pdf->stream("{$filename}.pdf");
        }

        return Excel::download(new OrdersExport($orders), "{$filename}.xlsx");
    }
}
