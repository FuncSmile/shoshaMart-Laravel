<!DOCTYPE html>
<html>

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Laporan Opening {{ $order->order_number }}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 10pt;
            margin: 1cm;
            color: #333;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }

        .info-table {
            width: 100%;
            margin-bottom: 20px;
        }

        .info-table td {
            vertical-align: top;
        }

        .category-header {
            background-color: #f2f2f2;
            padding: 8px;
            font-weight: bold;
            text-transform: uppercase;
            border: 1px solid #ccc;
            margin-top: 15px;
            margin-bottom: 5px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .items-table th {
            border: 1px solid #ccc;
            background-color: #f9f9f9;
            padding: 8px;
            text-align: center;
            font-size: 9pt;
            text-transform: uppercase;
        }

        .items-table td {
            border: 1px solid #ccc;
            padding: 6px 8px;
            font-size: 9pt;
        }

        .text-left {
            text-align: left;
        }

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        .total-row {
            font-weight: bold;
            background-color: #f9f9f9;
        }

        .footer {
            margin-top: 40px;
            font-size: 9pt;
        }

        .signatures {
            width: 100%;
            margin-top: 50px;
        }

        .signatures td {
            text-align: center;
            width: 33%;
        }

        .page-break {
            page-break-after: always;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1 style="margin: 0; letter-spacing: 1px;">LAPORAN PENGADAAN (OPENING)</h1>
        <div style="font-size: 10pt; margin-top: 5px;">SHOSHA MART - PROCUREMENT DIVISION</div>
    </div>

    <table class="info-table">
        <tr>
            <td width="50%">
                <strong>DATA CABANG:</strong><br>
                Cabang: {{ $order->buyer->branch_name ?? $order->buyer->username }}<br>
                Username: {{ $order->buyer->username }}<br>
                Pemesan: {{ $order->nama_pemesan }}<br>
                Telp: {{ $order->buyer->phone }}
            </td>
            <td width="50%" class="text-right">
                <strong>DETAIL LAPORAN:</strong><br>
                No. Pesanan: {{ $order->order_number }}<br>
                Tanggal: {{ $order->created_at->format('d F Y') }}<br>
                Tier: {{ $order->tier->name }}<br>
                Status: {{ $order->status }}
            </td>
        </tr>
    </table>

    @php
        $groupedItems = $order->items->groupBy(function($item) {
            return strtoupper($item->product->category ?? 'LAIN-LAIN');
        });
        $globalCounter = 1;
    @endphp

    @foreach($groupedItems as $category => $items)
        <div class="category-header">{{ $category }}</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th width="5%">No</th>
                    <th width="45%">Nama Barang</th>
                    <th width="15%">Harga</th>
                    <th width="10%">Qty</th>
                    <th width="25%">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $item)
                <tr>
                    <td class="text-center">{{ $globalCounter++ }}</td>
                    <td class="text-left">
                        {{ $item->product->name }}<br>
                        <small style="color: #666;">SKU: {{ $item->product->sku }}</small>
                    </td>
                    <td class="text-right">{{ number_format($item->price, 0, ',', '.') }}</td>
                    <td class="text-center">{{ $item->quantity }}</td>
                    <td class="text-right">{{ number_format($item->subtotal, 0, ',', '.') }}</td>
                </tr>
                @endforeach
            </tbody>
            <tr class="total-row">
                <td colspan="4" class="text-right">SUBTOTAL {{ $category }}</td>
                <td class="text-right">Rp {{ number_format($items->sum('subtotal'), 0, ',', '.') }}</td>
            </tr>
        </table>
    @endforeach

    <table class="items-table">
        <tr style="font-size: 12pt; font-weight: 1000; background-color: #eee;">
            <td colspan="4" class="text-right" style="padding: 15px;">TOTAL KESELURUHAN</td>
            <td class="text-right" style="padding: 15px; color: #d32f2f;">Rp {{ number_format($order->total_amount, 0, ',', '.') }}</td>
        </tr>
    </table>

    <div class="footer">
        <p><em>* Laporan ini dihasilkan secara otomatis oleh sistem Manajemen Shosha Mart pada {{ now()->format('d/m/Y H:i') }}</em></p>
    </div>

    <table class="signatures">
        <tr>
            <td>
                Dibuat Oleh,<br><br><br><br><br>
                ( {{ auth()->user()->username }} )<br>
                Admin Pusat
            </td>
            <td>
                Diperiksa Oleh,<br><br><br><br><br>
                ( ..................... )<br>
                Manager Operasional
            </td>
            <td>
                Diterima Oleh,<br><br><br><br><br>
                ( {{ $order->nama_pemesan }} )<br>
                Kepala Cabang
            </td>
        </tr>
    </table>
</body>

</html>
