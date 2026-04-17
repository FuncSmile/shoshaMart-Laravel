<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderTypeController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettlementController;
use App\Http\Controllers\StockLogController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::resource('users', UserController::class);

    // Products
    Route::resource('products', ProductController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/products-template', [ProductController::class, 'downloadTemplate'])->name('products.download-template');
    Route::get('/products-export', [ProductController::class, 'export'])->name('products.export');
    Route::post('/products-import', [ProductController::class, 'import'])->name('products.import');
    Route::post('/products/reorder', [ProductController::class, 'reorder'])->name('products.reorder');
    Route::post('/products/{product}/stock', [ProductController::class, 'updateStock'])->name('products.update-stock');
    Route::get('/stock-logs', [StockLogController::class, 'index'])->name('stock-logs.index');
    Route::get('/api/products/{product}/stock-history', [ProductController::class, 'stockHistory'])->name('api.products.stock-history');

    // Orders
    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::post('/orders', [OrderController::class, 'store'])->name('orders.store');
    Route::post('/orders/{order}/approve', [OrderController::class, 'approve'])->name('orders.approve');
    Route::post('/orders/{order}/reject', [OrderController::class, 'reject'])->name('orders.reject');
    Route::patch('/orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
    Route::patch('/orders/{order}', [OrderController::class, 'update'])->name('orders.update');
    Route::post('/orders/{order}/mark-as-printed', [OrderController::class, 'markAsPrinted'])->name('orders.mark-as-printed');
    Route::post('/orders/{order}/mark-as-paid', [OrderController::class, 'markAsPaid'])->name('orders.mark-as-paid');
    Route::get('/orders/{order}/invoice', [OrderController::class, 'invoice'])->name('orders.invoice');
    Route::delete('/orders/{order}', [OrderController::class, 'destroy'])->name('orders.destroy');
    Route::get('/orders-bulk/invoice', [OrderController::class, 'bulkInvoice'])->name('orders.bulk-invoice');
    Route::get('/orders-print', [OrderController::class, 'printIndex'])->name('orders.print-index');
    Route::get('/orders-report', [ReportController::class, 'exportOrders'])->name('orders.report');
    Route::resource('order-types', OrderTypeController::class)->only(['store', 'update', 'destroy']);

    // Products API
    Route::get('/api/products', [ProductController::class, 'apiIndex'])->name('api.products');

    // Profile Update
    Route::post('/profile/update-phone', [ProfileController::class, 'updatePhone'])->name('profile.update-phone');
    // Settlements
    Route::get('/settlements', [SettlementController::class, 'index'])->name('settlements.index');
    Route::post('/settlements', [SettlementController::class, 'store'])->name('settlements.store');
    Route::post('/settlements/{settlement}/verify', [SettlementController::class, 'verify'])->name('settlements.verify');
    Route::post('/settlements/{settlement}/cancel', [SettlementController::class, 'cancel'])->name('settlements.cancel');
});

require __DIR__.'/settings.php';
