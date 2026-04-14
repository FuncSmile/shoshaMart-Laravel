<?php

namespace App\Http\Controllers;

use App\Models\OrderType;
use Illuminate\Http\Request;

class OrderTypeController extends Controller
{
    public function store(Request $request)
    {
        if ($request->user()->role !== 'SUPERADMIN') {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:order_types,name',
        ]);

        OrderType::create($validated);

        return back()->with('message', 'Jenis pesanan berhasil ditambahkan.');
    }

    public function update(Request $request, OrderType $orderType)
    {
        if ($request->user()->role !== 'SUPERADMIN') {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:order_types,name,'.$orderType->id,
        ]);

        $orderType->update($validated);

        return back()->with('message', 'Jenis pesanan berhasil diperbarui.');
    }

    public function destroy(Request $request, OrderType $orderType)
    {
        if ($request->user()->role !== 'SUPERADMIN') {
            abort(403);
        }

        $orderType->delete();

        return back()->with('message', 'Jenis pesanan berhasil dihapus.');
    }
}
