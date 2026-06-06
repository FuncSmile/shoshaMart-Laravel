<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class FonnteService
{
    /**
     * Send WhatsApp message via Fonnte API.
     */
    public function sendMessage(string $target, string $message): array
    {
        $token = config('services.fonnte.token');

        $response = Http::timeout(5)->withHeaders([
            'Authorization' => $token,
        ])->post('https://api.fonnte.com/send', [
            'target' => $target,
            'message' => $message,
        ]);

        return $response->json();
    }
}
