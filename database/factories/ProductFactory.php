<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'name' => fake()->unique()->words(2, true),
            'sku' => strtoupper(fake()->unique()->bothify('??###')),
            'base_price' => fake()->numberBetween(1000, 100000),
            'stock' => fake()->numberBetween(0, 100),
            'satuan_barang' => fake()->randomElement(['PCS', 'BOX', 'UNIT', 'LITER']),
        ];
    }
}
