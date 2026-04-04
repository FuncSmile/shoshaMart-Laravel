<table>
    <thead>
        <tr>
            <th colspan="7" style="font-weight: bold; font-size: 14pt; text-align: center;">LAPORAN PEMESANAN SHOSHA MART</th>
        </tr>
        <tr>
            <th colspan="7" style="font-weight: bold; text-align: center;">CABANG: {{ strtoupper($branchName) }}</th>
        </tr>
        <tr></tr>
        <tr style="background-color: #f2f2f2;">
            <th style="font-weight: bold; width: 5px; border: thin solid #000;">No</th>
            <th style="font-weight: bold; width: 25px; border: thin solid #000;">No. Pesanan / Item</th>
            <th style="font-weight: bold; width: 15px; border: thin solid #000;">Tanggal</th>
            <th style="font-weight: bold; width: 20px; border: thin solid #000;">Pemesan (User)</th>
            <th style="font-weight: bold; width: 15px; border: thin solid #000;">Jenis</th>
            <th style="font-weight: bold; width: 10px; border: thin solid #000;">Qty</th>
            <th style="font-weight: bold; width: 10px; border: thin solid #000;">Satuan</th>
            <th style="font-weight: bold; width: 15px; border: thin solid #000;">Subtotal (IDR)</th>
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
            <tr style="background-color: #eeeeee;">
                <td style="text-align: center; border: thin solid #000;">{{ $index + 1 }}</td>
                <td colspan="4" style="font-weight: bold; border: thin solid #000;">
                    {{ $order->order_number }} - {{ $order->nama_pemesan }}
                </td>
                <td colspan="2" style="text-align: right; border: thin solid #000;">
                    {{ $order->created_at->format('d/m/Y') }}
                </td>
                <td style="font-weight: bold; text-align: right; border: thin solid #000;">
                    {{ $order->total_amount }}
                </td>
            </tr>
            
            {{-- Order Items --}}
            @foreach($order->items as $itemIndex => $item)
                <tr>
                    <td style="border: thin solid #000;"></td>
                    <td colspan="4" style="border: thin solid #000;">
                        [{{ $item->product->sku ?? 'N/A' }}] {{ $item->product->name ?? 'Unknown item' }}
                    </td>
                    <td style="text-align: right; border: thin solid #000;">{{ $item->quantity }}</td>
                    <td style="border: thin solid #000;">{{ $item->product->satuan_barang ?? 'PCS' }}</td>
                    <td style="text-align: right; border: thin solid #000;">
                        {{ $item->subtotal }}
                    </td>
                </tr>
            @endforeach
            
            {{-- Spacer Row --}}
            <tr>
                <td colspan="8"></td>
            </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr>
            <td colspan="5" style="font-weight: bold; text-align: right; border: thin solid #000;">TOTAL PENGADAAN CABANG</td>
            <td colspan="2" style="font-weight: bold; text-align: right; border: thin solid #000;">{{ $totalItemsCount }} ITEM</td>
            <td style="font-weight: bold; text-align: right; border: thin solid #000;">{{ $grandTotal }}</td>
        </tr>
    </tfoot>
</table>
