<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Laporan Pemesanan</title>
    <style>
        body {
            font-family: 'Courier', sans-serif;
            font-size: 10pt;
            margin: 0;
            padding: 0;
        }
        .page {
            page-break-after: always;
            padding: 20px;
        }
        .page:last-child {
            page-break-after: never;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 16pt;
            text-transform: uppercase;
        }
        .branch-info {
            margin-bottom: 15px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            text-transform: uppercase;
            font-size: 9pt;
        }
        .text-right {
            text-align: right;
        }
        .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 9pt;
        }
        .summary {
            font-weight: bold;
            background-color: #eee;
        }
    </style>
</head>
<body>
    @foreach($groupedOrders as $buyerId => $orders)
        @php
            $firstOrder = $orders->first();
            $branchName = $firstOrder->buyer->branch_name ?? $firstOrder->buyer->username;
        @endphp
        <div class="page">
            <div class="header">
                <h1>Laporan Pemesanan Shosha Mart</h1>
                <div>Filter Jenis: {{ $jenisPesanan ?? 'SEMUA' }}</div>
            </div>

            <div class="branch-info">
                <strong>CABANG:</strong> {{ strtoupper($branchName) }}<br>
                <strong>TANGGAL CETAK:</strong> {{ now()->format('d/m/Y H:i') }}
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="3%">No</th>
                        <th width="15%">No. Pesanan / Item</th>
                        <th width="12%">Tanggal</th>
                        <th width="20%">Pemesan (User)</th>
                        <th width="15%">Jenis</th>
                        <th width="10%">Qty</th>
                        <th width="10%">Satuan</th>
                        <th width="12%">Subtotal (IDR)</th>
                        <th width="10%">Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    @php $grandTotal = 0; $totalItemsCount = 0; @endphp
                    @foreach($orders as $index => $order)
                        @php 
                            $grandTotal += $order->total_amount;
                            $totalItemsCount += $order->items_count;
                        @endphp
                        {{-- Order Header --}}
                        <tr class="summary" style="background-color: #f9f9f9;">
                            <td style="text-align: center; vertical-align: top;">{{ $index + 1 }}</td>
                            <td colspan="4">
                                <strong>{{ $order->order_number }}</strong> - 
                                {{ $order->nama_pemesan }} ({{ strtoupper($order->jenis_pesanan) }})
                            </td>
                            <td colspan="2" class="text-right" style="font-size: 8pt; color: #666;">
                                {{ $order->created_at->format('d/m/Y') }}
                            </td>
                            <td class="text-right"><strong>{{ number_format($order->total_amount, 0, ',', '.') }}</strong></td>
                            <td class="text-right" style="font-weight: bold; font-size: 8pt;">
                                {{ in_array(strtolower($order->status), ['paid', 'verified']) ? 'LUNAS' : '-' }}
                            </td>
                        </tr>
                        
                        {{-- Order Items --}}
                        @foreach($order->items as $itemIndex => $item)
                            <tr style="font-size: 8.5pt;">
                                <td></td>
                                <td colspan="4" style="padding-left: 20px; color: #444;">
                                    <span style="font-family: monospace; color: #777;">[{{ $item->product->sku ?? 'N/A' }}]</span> 
                                    {{ $item->product->name ?? 'Unknown item' }}
                                </td>
                                <td class="text-right">{{ $item->quantity }}</td>
                                <td>{{ $item->product->satuan_barang ?? 'PCS' }}</td>
                                <td class="text-right" style="color: #666;">
                                    {{ number_format($item->subtotal, 0, ',', '.') }}
                                </td>
                                <td></td>
                            </tr>
                        @endforeach
                        
                        {{-- Spacer --}}
                        <tr>
                            <td colspan="9" style="border: none; padding: 2px;"></td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr class="summary">
                        <td colspan="5" class="text-right">TOTAL PENGADAAN CABANG</td>
                        <td class="text-right" colspan="2">{{ $totalItemsCount }} ITEM UNIK</td>
                        <td class="text-right">{{ number_format($grandTotal, 0, ',', '.') }}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>

            <div class="footer">
                Dicetak secara sistem oleh Shosha Mart Management System.
            </div>
        </div>
    @endforeach
</body>
</html>
