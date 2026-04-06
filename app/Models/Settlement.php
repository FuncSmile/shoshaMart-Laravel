<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['id', 'buyer_id', 'admin_id', 'total_amount', 'start_date', 'end_date', 'proof_of_payment', 'storage_provider', 'status', 'verified_by', 'verified_at'])]
class Settlement extends Model
{
    use HasFactory, HasUuid;

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'verified_at' => 'datetime',
    ];

    public function buyer()
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
