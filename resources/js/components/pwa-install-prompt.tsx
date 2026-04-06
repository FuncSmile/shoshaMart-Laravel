import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

declare global {
    interface Window {
        deferredPWAEvent: BeforeInstallPromptEvent | null;
    }
}

export function PwaInstallPrompt() {
    console.log('[PWA] Render called!');
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        console.log('[PWA] Component mounted');
        // Cek jika user sudah klik dismiss sebelumnya atau aplikasi sudah di mode standalone
        const isDismissed = localStorage.getItem('pwaPromptDismissed') === 'true';
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        console.log('[PWA] Status:', { isDismissed, isStandalone, deferredPWAEvent: window.deferredPWAEvent });

        if (isDismissed || isStandalone || ('standalone' in navigator && (navigator as any).standalone)) {
            console.log('[PWA] Bypassed prompt due to conditions');
            return;
        }

        const handlePromptEvent = (e: Event) => {
            e.preventDefault();
            console.log('[PWA] handlePromptEvent triggered!');
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsVisible(true);
        };

        // Cek apakah event sudah ditangkap oleh script di app.blade.php
        if (window.deferredPWAEvent) {
            handlePromptEvent(window.deferredPWAEvent);
        }

        // Listener untuk event custom jika event ditangkap setelah komponen di-mount
        window.addEventListener('pwa-ready', () => {
            if (window.deferredPWAEvent) handlePromptEvent(window.deferredPWAEvent);
        });

        // Fallback listener standar
        window.addEventListener('beforeinstallprompt', handlePromptEvent);

        return () => {
            window.removeEventListener('beforeinstallprompt', handlePromptEvent);
            window.removeEventListener('pwa-ready', handlePromptEvent);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            localStorage.setItem('pwaPromptDismissed', 'true');
        }

        setDeferredPrompt(null);
        setIsVisible(false);
    };

    const handleDismiss = () => {
        localStorage.setItem('pwaPromptDismissed', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border-2 border-primary/20 shadow-2xl rounded-2xl p-4 z-50">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <Download className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm tracking-tight">Install Shosha Mart</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            Akses lebih cepat & mudah layaknya aplikasi asil di device kamu.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleDismiss}
                    className="shrink-0 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="mt-4 flex gap-2">
                <Button
                    onClick={handleInstallClick}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black italic uppercase tracking-widest text-[10px] h-9 shadow-lg shadow-primary/20"
                >
                    Install Aplikasi
                </Button>
            </div>
        </div>
    );
}
