<?php

namespace App\Http\Controllers;

use App\Http\Requests\RejectOrderRequest;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderType;
use App\Models\Tier;
use App\Models\User;
use App\Services\DebtService;
use App\Services\OrderService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function __construct(
        protected OrderService $orderService,
        protected DebtService $debtService
    ) {}

    public function index(Request $request)
    {
        /** @var User $user */
        $user = $request->user();
        $search = $request->input('search');
        $status = $request->input('status');

        // Default status filtering logic
        $status = $status ?? 'ALL';
        $jenis_pesanan = $request->input('jenis_pesanan', 'ALL');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $query = Order::query()
            ->select(['id', 'order_number', 'status', 'total_amount', 'tier_id', 'buyer_id', 'nama_pemesan', 'jenis_pesanan', 'is_printed', 'created_at'])
            ->with([
                'buyer:id,username,branch_name,phone',
                'tier:id,name',
                'histories.user:id,username',
            ]);

        if ($user->role === 'SUPERADMIN' || $user->role === 'ADMIN_TIER') {
            $query->orderBy('is_printed', 'asc')->oldest();
        } else {
            $query->latest();
        }

        if ($user->role === 'ADMIN_TIER') {
            if (empty($user->tier_id)) {
                $query->whereRaw('1 = 0'); // Block if no tier is assigned
            } else {
                $query->where('tier_id', $user->tier_id);
            }
        } elseif ($user->role === 'BUYER') {
            $query->where('buyer_id', $user->id);
        }

        if ($status === 'TRASHED') {
            $query->onlyTrashed();
        }

        if ($status && $status !== 'ALL' && $status !== 'TRASHED') {
            $query->where('status', $status);
        }

        if ($jenis_pesanan && $jenis_pesanan !== 'ALL') {
            $query->where('jenis_pesanan', $jenis_pesanan);
        }

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('nama_pemesan', 'like', "%{$search}%")
                    ->orWhereHas('buyer', function ($sq) use ($search) {
                        $sq->where('username', 'like', "%{$search}%");
                    });
            });
        }

        $orders = $query->paginate(10)->withQueryString();

        return Inertia::render('orders/index', [
            'orders' => OrderResource::collection($orders),
            'auth_role' => $user->role,
            'filters' => array_merge(
                $request->only(['search', 'status', 'jenis_pesanan', 'start_date', 'end_date']),
                ['status' => $status]
            ),
            'buyers' => $user->isSuperAdmin() ? User::where('role', 'BUYER')->select(['id', 'username', 'branch_name', 'tier_id'])->get() : [],
            'tiers' => Tier::select(['id', 'name'])->get(),
            'availableTypes' => OrderType::orderBy('name')->pluck('name'),
            'orderTypes' => OrderType::orderBy('name')->get(),
        ]);
    }

    public function restore(Request $request, string $id)
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403);
        }

        $order = Order::withTrashed()->findOrFail($id);
        $order->restore();

        $order->histories()->create([
            'user_id' => $request->user()->id,
            'message' => "{$request->user()->username} telah memulihkan pesanan yang dihapus.",
        ]);

        return redirect()->back()->with('message', 'Pesanan berhasil dipulihkan dari tempat sampah.');
    }

    public function restoreCancelled(Request $request, Order $order)
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403);
        }

        if ($order->status !== 'CANCELLED') {
            return redirect()->back()->with('error', 'Pesanan tidak dalam status dibatalkan.');
        }

        $this->orderService->updateOrderStatus($order, 'PENDING', $request->user());

        return redirect()->back()->with('message', 'Pesanan berhasil diaktifkan kembali (Status: PENDING).');
    }

    public function printIndex(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        // Cetak Pesanan is only accessible by SUPERADMIN and ADMIN_TIER
        if (! $user->isSuperAdmin() && ! $user->isAdminTier()) {
            abort(403);
        }

        $search = $request->input('search');
        $jenis_pesanan = $request->input('jenis_pesanan', 'ALL');

        $status = $request->input('status', 'APPROVED');

        // We only consider specific orders for the Cetak Pesanan page.
        $query = Order::query()
            ->select(['id', 'order_number', 'status', 'total_amount', 'tier_id', 'buyer_id', 'nama_pemesan', 'jenis_pesanan', 'is_printed', 'printed_at', 'created_at'])
            ->with([
                'buyer:id,username,branch_name,phone',
                'tier:id,name',
                'histories.user:id,username',
            ]);

        if ($status === 'TRASHED') {
            $query->onlyTrashed();
        } elseif ($status && $status !== 'ALL') {
            $query->where('status', $status);
        } else {
            // Default to showing common active statuses for printing if ALL is selected
            $query->whereIn('status', ['APPROVED', 'paid', 'verified']);
        }

        if ($user->isAdminTier()) {
            if (empty($user->tier_id)) {
                $query->whereRaw('1 = 0');
            } else {
                // ADMIN_TIER only sees printed orders for their tier
                $query->where('tier_id', $user->tier_id)
                    ->where('is_printed', true);
            }
        }

        if ($jenis_pesanan && $jenis_pesanan !== 'ALL') {
            $query->where('jenis_pesanan', $jenis_pesanan);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('nama_pemesan', 'like', "%{$search}%")
                    ->orWhereHas('buyer', function ($sq) use ($search) {
                        $sq->where('username', 'like', "%{$search}%")
                            ->orWhere('branch_name', 'like', "%{$search}%");
                    });
            });
        }

        $orders = $query->orderBy('is_printed', 'asc')->latest()->paginate(10)->withQueryString();

        return Inertia::render('orders/print-index', [
            'orders' => OrderResource::collection($orders),
            'auth_role' => $user->role,
            'filters' => array_merge(
                $request->only(['search', 'jenis_pesanan', 'status']),
                ['status' => $status]
            ),
            'buyers' => $user->isSuperAdmin() ? User::where('role', 'BUYER')->select(['id', 'username', 'branch_name', 'tier_id'])->get() : [],
            'tiers' => Tier::select(['id', 'name'])->get(),
            'availableTypes' => OrderType::orderBy('name')->pluck('name'),
            'orderTypes' => OrderType::orderBy('name')->get(),
        ]);
    }

    public function show(string $id)
    {
        $order = Order::withTrashed()
            ->with(['buyer:id,username,branch_name,phone', 'items.product:id,name,sku', 'tier:id,name', 'histories.user:id,username'])
            ->findOrFail($id);

        return new OrderResource($order);
    }

    public function store(StoreOrderRequest $request)
    {
        $buyer = null;
        if ($request->user()->isSuperAdmin() && $request->has('buyer_id')) {
            $buyer = User::findOrFail($request->validated('buyer_id'));
        }

        $this->orderService->createOrder(
            $request->validated('items'),
            $request->user(),
            $request->validated('nama_pemesan'),
            $request->validated('jenis_pesanan'),
            $buyer,
            $request->validated('created_at')
        );

        return redirect()->back()->with('message', 'Order placed successfully.');
    }

    public function approve(Request $request, Order $order)
    {
        Gate::authorize('approve', $order);

        $this->orderService->updateOrderStatus($order, 'APPROVED', $request->user());

        return redirect()->back()->with('message', 'Order approved.');
    }

    public function reject(RejectOrderRequest $request, Order $order)
    {
        Gate::authorize('reject', $order);

        $this->orderService->updateOrderStatus($order, 'REJECTED', $request->user(), $request->validated('reason'));

        return redirect()->back()->with('message', 'Order rejected.');
    }

    public function cancel(Request $request, Order $order)
    {
        Gate::authorize('cancel', $order);

        $this->orderService->updateOrderStatus($order, 'CANCELLED', $request->user());

        return redirect()->back()->with('message', 'Order cancelled successfully.');
    }

    public function update(UpdateOrderRequest $request, Order $order)
    {
        Gate::authorize('update', $order);

        $this->orderService->updateOrder(
            $order->load(['buyer', 'tier']),
            $request->validated('items'),
            $request->user(),
            $request->validated('nama_pemesan'),
            $request->validated('jenis_pesanan'),
            $request->validated('created_at')
        );

        return redirect()->back()->with('message', 'Pesanan berhasil direvisi.');
    }

    public function invoice(Order $order)
    {
        Gate::authorize('generateInvoice', $order);

        $order->load(['buyer:id,username,branch_name,phone', 'items.product:id,name,sku,category', 'tier:id,name']);

        $view = $order->jenis_pesanan === 'opening' ? 'invoices.opening_report' : 'invoices.dotmatrix';
        $pdf = Pdf::loadView($view, compact('order'));

        if ($order->jenis_pesanan === 'opening') {
            $pdf->setPaper('a4', 'portrait');
        } else {
            // Custom paper size: 8.5 x 5.5 inch (Continuous Form Half Page)
            $pdf->setPaper([0, 0, 612, 396], 'portrait');
        }

        $prefix = $order->jenis_pesanan === 'opening' ? 'LAPORAN-OPENING' : 'INVOICE';
        $branchName = strtoupper(str_replace(' ', '_', $order->buyer->branch_name ?? $order->buyer->username));
        $date = $order->created_at->format('Y-m-d');
        $filename = "{$prefix}-{$branchName}-{$order->order_number}-{$date}.pdf";

        $order->update(['is_printed' => true, 'printed_at' => now()]);
        $order->histories()->create([
            'user_id' => auth()->id(),
            'message' => 'Invoice dicetak oleh '.auth()->user()->username,
        ]);

        return $pdf->stream($filename);
    }

    public function bulkInvoice(Request $request)
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403);
        }

        $buyerId = $request->input('buyer_id');
        $jenisPesanan = $request->input('jenis_pesanan');

        $query = Order::where('status', 'APPROVED')
            ->with(['buyer:id,username,branch_name,phone', 'items.product:id,name,sku', 'tier:id,name'])
            ->latest();

        if ($buyerId && $buyerId !== 'ALL') {
            $query->where('buyer_id', $buyerId);
        }

        if ($jenisPesanan && $jenisPesanan !== 'ALL') {
            $query->where('jenis_pesanan', $jenisPesanan);
        }

        $orders = $query->get();

        if ($orders->isEmpty()) {
            return back()->with('error', 'Tidak ada pesanan disetujui yang ditemukan untuk filter tersebut.');
        }

        $pdf = Pdf::loadView('invoices.bulk-dotmatrix', compact('orders'));

        // Custom paper size: 8.5 x 5.5 inch (Continuous Form Half Page)
        $pdf->setPaper([0, 0, 612, 396], 'portrait');

        $date = now()->format('Y-m-d');

        // Mark all these orders as printed
        foreach ($orders as $order) {
            $order->update(['is_printed' => true, 'printed_at' => now()]);
            $order->histories()->create([
                'user_id' => auth()->id(),
                'message' => 'Invoice dicetak secara massal oleh '.auth()->user()->username,
            ]);
        }

        return $pdf->stream("BULK-INVOICE-{$date}.pdf");
    }

    public function destroy(Request $request, Order $order)
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403);
        }

        if ($order->status === 'APPROVED') {
            $this->orderService->restoreStock($order, $request->user(), "Penghapusan Pesanan Disetujui #{$order->order_number}");
        }

        $order->histories()->create([
            'user_id' => $request->user()->id,
            'message' => "{$request->user()->username} telah menghapus pesanan #{$order->order_number} ke Trash.",
        ]);

        $order->delete();

        return back()->with('status', 'Pesanan berhasil dihapus.');
    }

    public function forceDestroy(Request $request, string $id)
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403);
        }

        $order = Order::withTrashed()->findOrFail($id);

        if ($order->status === 'APPROVED' && $order->trashed()) {
            // If it was already soft-deleted, stock should have been restored then.
            // But if for some reason it wasn't (e.g. legacy data), we don't double restore unless we check logs.
            // For safety, we just allow permanent deletion here.
        }

        $order->forceDelete();

        return back()->with('status', 'Pesanan berhasil dihapus secara permanen.');
    }

    public function markAsPrinted(Order $order)
    {
        $order->update([
            'is_printed' => true,
            'printed_at' => now(),
        ]);

        $order->histories()->create([
            'user_id' => auth()->id(),
            'message' => 'Invoice dicetak oleh '.auth()->user()->username,
        ]);

        return response()->json(['message' => 'Status cetak diperbarui']);
    }

    public function markAsPaid(Request $request, Order $order)
    {
        if (! $request->user()->isSuperAdmin()) {
            abort(403);
        }

        if ($order->status !== Order::STATUS_DEBT) {
            return back()->withErrors(['error' => 'Hanya pesanan berstatus Disetujui (Approved) yang dapat dibayar lunas.']);
        }

        try {
            $this->debtService->createManualSettlement($request->user(), $order);

            return back()->with('message', 'Pesanan telah ditandai lunas dan catatan pelunasan telah dibuat.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
