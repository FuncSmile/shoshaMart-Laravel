<!DOCTYPE html>
<html>

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Invoice {{ $order->order_number }}</title>
    <style>
        @page {
            margin: 0;
        }

        body {
            font-family: 'Courier', monospace;
            font-size: 10pt;
            margin: 0.5cm;
            color: #000;
        }

        .header {
            text-align: center;
            margin-bottom: 0px;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
        }

        .info-table {
            width: 100%;
            margin-bottom: 15px;
            font-size: 11pt;
        }

        .info-table td {
            vertical-align: top;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 12pt;
        }

        .items-table th {
            border-bottom: 1px dashed #000;
            border-top: 1px dashed #000;
            padding: 8px 0;
        }

        .items-table td {
            padding: 6px 0;
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

        .footer {
            margin-top: 20px;
            font-size: 8pt;
        }

        .signatures {
            width: 100%;
            margin-top: 30px;
            font-size: 9pt;
        }

        .signatures td {
            text-align: center;
            width: 50%;
        }
    </style>
</head>

<body>
    @php
    $itemChunks = $order->items->chunk(8);
    $totalChunks = count($itemChunks);
    @endphp

    @foreach($itemChunks as $chunkIndex => $items)
    <div class="page-wrapper" style="page-break-after: {{ ($chunkIndex + 1) < $totalChunks ? 'always' : 'avoid' }};">
        <div class="header">
            <h2 style="margin: 0; letter-spacing: 2px;">SHOSHA MART</h2>
            @if($totalChunks > 1)
            <div style="font-size: 8pt; margin-top: 5px;">Halaman {{ $chunkIndex + 1 }} dari {{ $totalChunks }}</div>
            @endif
        </div>

        <table class="info-table">
            <tr>
                <td width="60%">
                    <strong>Kepada:</strong><br>
                    {{ $order->nama_pemesan }}<br>
                    {{ $order->buyer->branch_name ?? $order->buyer->username }}<br>
                    Telp: {{ $order->buyer->phone }}
                </td>
                <td width="40%" class="text-right">
                    <strong>No. Invoice:</strong> {{ $order->order_number }}<br>
                    <strong>Tanggal:</strong> {{ $order->created_at->format('d/m/Y') }}<br>
                    <strong>Jenis:</strong> {{ strtoupper($order->jenis_pesanan) }}<br>
                    <strong>Status:</strong> {{ $order->status }}
                </td>
            </tr>
        </table>

        <table class="items-table">
            <thead>
                <tr>
                    <th width="5%" class="text-left">No</th>
                    <th width="45%" class="text-left">Nama Barang</th>
                    <th width="15%" class="text-right">Harga</th>
                    <th width="10%" class="text-center">Qty</th>
                    <th width="25%" class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $item)
                <tr>
                    <td class="text-left">{{ ($loop->parent->index * 8) + $loop->iteration }}</td>
                    <td class="text-left">{{ $item->product->name }}</td>
                    <td class="text-right">{{ number_format($item->price, 0, ',', '.') }}</td>
                    <td class="text-center">{{ $item->quantity }}</td>
                    <td class="text-right">{{ number_format($item->subtotal, 0, ',', '.') }}</td>
                </tr>
                @endforeach
            </tbody>
            @if($loop->last)
            <tfoot>
                <tr>
                    <td colspan="4" class="text-right" style="border-top: 1px dashed #000; padding-top: 10px;"><strong>TOTAL AKHIR:</strong></td>
                    <td class="text-right" style="border-top: 1px dashed #000; padding-top: 10px;"><strong>Rp {{ number_format($order->total_amount, 0, ',', '.') }}</strong></td>
                </tr>
            </tfoot>
            @else
            <tfoot>
                <tr>
                    <td colspan="5" class="text-center" style="border-top: 1px dashed #000; padding-top: 10px; font-size: 8pt; italic">
                        Bersambung ke halaman berikutnya...
                    </td>
                </tr>
            </tfoot>
            @endif
        </table>

        @if($loop->last)
        <table class="signatures">
            <tr>
                <td>
                    Penerima,<br><br><br><br>
                    ( ..................... )
                </td>
                <td>
                    Hormat Kami,<br><br><br><br>
                    ( Admin Shosha Mart )
                </td>
            </tr>
        </table>
        @endif
    </div>
    @endforeach
</body>

</html>