<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var User $user */
        $user = auth()->user();

        return auth()->check() && ($user->isSuperAdmin() || $user->isWarehouse());
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'sku' => 'required|string|max:100|unique:products,sku,'.$this->product->id,
            'image_url' => 'nullable|url|max:2048',
            'satuan_barang' => 'required|string|max:20',
            'category' => 'nullable|string|max:100',
            'base_price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'tier_prices' => 'nullable|array',
            'tier_prices.*.tier_id' => 'required|exists:tiers,id',
            'tier_prices.*.price' => 'required|numeric|min:0',
            'update_past_orders' => 'nullable|boolean',
        ];
    }
}
