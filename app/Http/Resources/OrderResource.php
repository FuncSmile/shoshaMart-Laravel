<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public static $wrap = null;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status,
            'total_amount' => (float) $this->total_amount, // For existing frontend compatibility
            'total_price' => (float) $this->total_amount,  // Mapping as requested earlier
            'rejection_reason' => $this->rejection_reason,
            'nama_pemesan' => $this->nama_pemesan,
            'jenis_pesanan' => $this->jenis_pesanan,
            'is_printed' => (bool) $this->is_printed,
            'printed_at' => $this->printed_at,
            'tier_id' => $this->tier_id,
            'created_at' => $this->created_at->toISOString(),
            'buyer' => [
                'id' => $this->buyer->id,
                'username' => $this->buyer->username,
                'branch_name' => $this->buyer->branch_name,
                'phone' => $this->buyer->phone,
            ],
            'tier' => [
                'id' => $this->tier->id,
                'name' => $this->tier->name,
            ],
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'history_logs' => OrderHistoryResource::collection($this->whenLoaded('histories')),
            'permissions' => [
                'can_edit' => $request->user()?->can('update', $this->resource),
                'can_cancel' => $request->user()?->can('cancel', $this->resource),
                'can_approve' => $request->user()?->can('approve', $this->resource),
                'can_reject' => $request->user()?->can('reject', $this->resource),
                'can_generate_invoice' => $request->user()?->can('generateInvoice', $this->resource),
            ],
        ];
    }
}
