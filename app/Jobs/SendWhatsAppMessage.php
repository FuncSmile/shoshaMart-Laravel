<?php

namespace App\Jobs;

use App\Services\FonnteService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendWhatsAppMessage implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public string $target,
        public string $message
    ) {}

    public function handle(FonnteService $fonnteService): void
    {
        $fonnteService->sendMessage($this->target, $this->message);
    }

    public function failed(?\Throwable $exception): void
    {
        Log::warning("Fonnte notification to {$this->target} failed permanently: ".($exception?->getMessage() ?? 'unknown error'));
    }
}
