<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User $user */
        $user = auth()->user();
        $canSeeDetailedPrices = $user?->isSuperAdmin() || $user?->isWarehouse();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'sku' => $this->sku,
            'image_url' => $this->image_url,
            'satuan_barang' => $this->satuan_barang,
            'category' => $this->category,
            'stock' => $this->stock,
            'base_price' => $this->when($canSeeDetailedPrices, $this->base_price),
            'display_price' => $this->display_price,
            'tier_prices' => $this->when($canSeeDetailedPrices, $this->tierPrices),
        ];
    }
}
