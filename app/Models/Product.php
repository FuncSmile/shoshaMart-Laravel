<?php

namespace App\Models;

use App\Traits\HasUuid;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['id', 'name', 'sku', 'image_url', 'unit', 'satuan_barang', 'base_price', 'stock', 'position', 'created_at', 'updated_at', 'deleted_at'])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, HasUuid, SoftDeletes;

    public function tiers()
    {
        return $this->belongsToMany(Tier::class, 'tier_prices')
            ->withPivot('price')
            ->withTimestamps();
    }

    public function tierPrices()
    {
        return $this->hasMany(TierPrice::class);
    }

    public function stockLogs()
    {
        return $this->hasMany(StockLog::class);
    }
}
