<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class FonnteService
{
    /**
     * Send WhatsApp message via Fonnte API.
     *
     * @throws RuntimeException when the token is missing or Fonnte rejects the message.
     */
    public function sendMessage(string $target, string $message): array
    {
        $token = config('services.fonnte.token');

        if (blank($token)) {
            throw new RuntimeException('FONNTE_TOKEN is not configured, WhatsApp message was not sent.');
        }

        if (blank($target)) {
            throw new RuntimeException('Fonnte target is empty, WhatsApp message was not sent.');
        }

        $response = Http::timeout(15)->withHeaders([
            'Authorization' => $token,
        ])->asForm()->post('https://api.fonnte.com/send', [
            'target' => $this->normalizeTarget($target),
            'message' => $message,
            'countryCode' => '62',
        ]);

        $body = $response->json() ?? [];

        // Fonnte answers 200 OK even when it refuses the message, so the
        // payload's own status flag is the only reliable success signal.
        if ($response->failed() || ($body['status'] ?? false) !== true) {
            $reason = $body['reason'] ?? $body['detail'] ?? $response->body();

            Log::error('Fonnte send failed', [
                'target' => $target,
                'http_status' => $response->status(),
                'reason' => $reason,
            ]);

            throw new RuntimeException("Fonnte rejected message to {$target}: {$reason}");
        }

        Log::info('Fonnte message sent', ['target' => $target, 'detail' => $body['detail'] ?? null]);

        return $body;
    }

    /**
     * Fonnte expects a bare number; group ids are passed through untouched.
     */
    protected function normalizeTarget(string $target): string
    {
        // Group ids are long numeric strings (>15 digits) or contain a dash/@.
        if (str_contains($target, '-') || str_contains($target, '@')) {
            return $target;
        }

        $digits = preg_replace('/\D/', '', $target);

        if (str_starts_with($digits, '0')) {
            return '62'.substr($digits, 1);
        }

        return $digits;
    }
}
