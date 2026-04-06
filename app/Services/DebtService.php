<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Settlement;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DebtService
{
    /**
     * Get aggregated debt per Branch/Buyer within a date range.
     */
    public function getDebtSummary(string $startDate, string $endDate, ?string $tierId = null)
    {
        $query = Order::query()
            ->where('status', Order::STATUS_DEBT)
            ->whereNull('settlement_id')
            ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
            ->selectRaw('
                buyer_id, 
                YEAR(created_at) as year, 
                MONTH(created_at) as month, 
                SUM(total_amount) as orders_sum_total_amount,
                COUNT(id) as orders_count
            ')
            ->groupBy('buyer_id', 'year', 'month')
            ->with('buyer:id,username,branch_name,tier_id');

        if ($tierId) {
            $query->whereHas('buyer', fn ($q) => $q->where('tier_id', $tierId));
        }

        return $query->get()->map(function ($row) {
            // Add formatted month for UI convenience
            $carbon = Carbon::createFromDate($row->year, $row->month, 1);
            $row->month_name = $carbon->translatedFormat('F Y');
            // Useful for the "Settle" (Bayar) date range
            $row->month_start = $carbon->startOfMonth()->toDateString();
            $row->month_end = $carbon->endOfMonth()->toDateString();
            
            return $row;
        });
    }

    /**
     * Process a new settlement.
     */
    public function createSettlement(User $admin, string $buyerId, string $startDate, string $endDate, UploadedFile $proof)
    {
        return DB::transaction(function () use ($admin, $buyerId, $startDate, $endDate, $proof) {
            // Re-calculate total to ensure accuracy
            $orders = Order::where('buyer_id', $buyerId)
                ->where('status', Order::STATUS_DEBT)
                ->whereNull('settlement_id')
                ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
                ->get();

            if ($orders->isEmpty()) {
                throw new \Exception('Tidak ada pesanan hutang ditemukan pada periode tersebut.');
            }

            $totalAmount = $orders->sum('total_amount');

            // Upload proof with fallback
            [$proofUrl, $provider] = $this->uploadProofWithFallback($proof);

            // Create settlement record
            $settlement = Settlement::create([
                'id' => (string) Str::uuid(),
                'buyer_id' => $buyerId,
                'admin_id' => $admin->id,
                'total_amount' => $totalAmount,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'proof_of_payment' => $proofUrl,
                'storage_provider' => $provider,
                'status' => 'paid',
            ]);

            // Update orders
            foreach ($orders as $order) {
                /** @var Order $order */
                $order->update([
                    'status' => Order::STATUS_PAID,
                    'settlement_id' => $settlement->id,
                ]);

                $order->histories()->create([
                    'user_id' => $admin->id,
                    'message' => "Pesanan telah dilunasi melalui settlement {$settlement->id}",
                ]);
            }

            return $settlement;
        });
    }

    /**
     * Storage Fallback Logic.
     */
    protected function uploadProofWithFallback(UploadedFile $file): array
    {
        try {
            return [$this->uploadToCloudinary($file), 'cloudinary'];
        } catch (\Exception $e) {
            Log::error('Cloudinary upload failed: '.$e->getMessage());
            try {
                return [$this->uploadToVercelBlob($file), 'vercel_blob'];
            } catch (\Exception $ex) {
                Log::error('Vercel Blob fallback failed: '.$ex->getMessage());
                throw new \Exception('Gagal upload bukti bayar ke semua penyimpanan.');
            }
        }
    }

    protected function uploadToCloudinary(UploadedFile $file): string
    {
        $cloudinaryUrl = env('CLOUDINARY_URL');
        if (! $cloudinaryUrl) {
            throw new \Exception('Cloudinary URL not configured');
        }

        // Extract cloud_name from URL or env
        // Sample: cloudinary://api_key:api_secret@cloud_name
        $parsed = parse_url($cloudinaryUrl);
        $cloudName = $parsed['host'];

        $response = Http::attach('file', $file->get(), $file->getClientOriginalName())
            ->post("https://api.cloudinary.com/v1_1/{$cloudName}/image/upload", [
                'upload_preset' => env('CLOUDINARY_UPLOAD_PRESET', 'ml_default'),
            ]);

        if ($response->failed()) {
            throw new \Exception('Cloudinary API Error: '.$response->body());
        }

        return $response->json('secure_url');
    }

    protected function uploadToVercelBlob(UploadedFile $file): string
    {
        $token = env('BLOB_READ_WRITE_TOKEN');
        if (! $token) {
            throw new \Exception('Vercel Blob token not configured');
        }

        $filename = 'settlements/'.Str::random(40).'.'.$file->getClientOriginalExtension();

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$token,
            'x-api-version' => '1',
        ])->withBody($file->get(), $file->getMimeType())
            ->put('https://blob.vercel-storage.com/'.$filename);

        if ($response->failed()) {
            throw new \Exception('Vercel Blob API Error: '.$response->body());
        }

        return $response->json('url');
    }
}
