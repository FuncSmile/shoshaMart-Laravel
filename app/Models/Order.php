<?php

namespace App\Models;

use App\Traits\HasUuid;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

#[Fillable(['buyer_id', 'order_number', 'nama_pemesan', 'jenis_pesanan', 'tier_id', 'total_amount', 'status', 'rejection_reason', 'admin_notes', 'created_by', 'buyer_note', 'is_printed', 'printed_at', 'settlement_id', 'created_at'])]
class Order extends Model
{
    const TYPES = [
        'awal bulan',
        'pertengahan bulan',
        'Lembur',
        'tambahan bulan ini',
    ];

    const STATUS_DEBT = 'APPROVED';

    const STATUS_PAID = 'paid';

    const STATUS_VERIFIED = 'verified';

    /** @use HasFactory<OrderFactory> */
    use HasFactory, HasUuid;

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function ($order) {
            if (empty($order->order_number)) {
                $order->order_number = 'ORD-'.date('Ymd').'-'.strtoupper(Str::random(6));
            }
        });
    }

    public function buyer()
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function tier()
    {
        return $this->belongsTo(Tier::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function histories()
    {
        return $this->hasMany(OrderHistory::class);
    }

    public function settlement()
    {
        return $this->belongsTo(Settlement::class);
    }
}
