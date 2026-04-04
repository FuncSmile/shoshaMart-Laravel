<?php

namespace App\Http\Controllers;

use App\Http\Resources\StockLogResource;
use App\Models\StockLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockLogController extends Controller
{
    public function index(Request $request)
    {
        /** @var User $user */
        $user = auth()->user();
        if (! $user->isSuperAdmin() && ! $user->isWarehouse()) {
            abort(403);
        }

        $query = StockLog::with(['product', 'user']);

        // Filtering
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($request->filled('type') && $request->type !== 'ALL') {
            $query->where('type', $request->type);
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        $logs = $query->latest()->paginate(20)->withQueryString();

        // Statistics for today
        $todayStats = [
            'total_items_in' => StockLog::where('type', 'add')->whereDate('created_at', today())->sum('amount'),
            'total_items_out' => abs(StockLog::where('type', 'sub')->whereDate('created_at', today())->sum('amount')),
            'total_transactions' => StockLog::whereDate('created_at', today())->count(),
        ];

        return Inertia::render('products/stock-logs', [
            'logs' => StockLogResource::collection($logs),
            'todayStats' => $todayStats,
            'filters' => $request->only(['search', 'type', 'date']),
        ]);
    }
}
