import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, router } from '@inertiajs/react';
import { Loader2, Upload, AlertCircle, FileCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { store as settlementsStore } from '@/routes/settlements/index';

interface SettlementModalProps {
    isOpen: boolean;
    onClose: () => void;
    branch: any;
    startDate: string;
    endDate: string;
}

export function SettlementModal({ isOpen, onClose, branch, startDate, endDate }: SettlementModalProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        buyer_id: '',
        start_date: '',
        end_date: '',
        proof: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!branch) return;

        // Use post specifically for file uploads
        router.post(settlementsStore.url(), {
            ...data,
            buyer_id: branch.buyer_id,
            start_date: startDate,
            end_date: endDate,
        }, {
            forceFormData: true,
            onSuccess: () => {
                onClose();
                reset();
            },
        });
    };

    if (!branch) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] overflow-hidden border-none shadow-2xl p-0 bg-background/95 backdrop-blur-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="p-6 pb-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FileCheck className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">Ajukan Pelunasan</DialogTitle>
                                <DialogDescription>Konfirmasi bukti pembayaran untuk cabang ini.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {/* Summary Info */}
                        <div className="bg-muted/30 p-4 rounded-xl border border-dashed border-muted-foreground/20 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Cabang:</span>
                                <span className="font-semibold uppercase tracking-tight text-blue-700">{branch.buyer?.branch_name || branch.buyer?.username}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Periode Hutang:</span>
                                <span className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
                                    {new Date(startDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="border-t pt-3 flex justify-between items-center">
                                <span className="text-muted-foreground font-medium">Nominal Pelunasan:</span>
                                <span className="text-lg font-bold text-red-600">
                                    Rp {Number(branch.orders_sum_total_amount).toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>

                        {/* File Upload */}
                        <div className="space-y-4">
                            <Label htmlFor="proof" className="text-sm font-semibold flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Bukti Pembayaran (Image/PDF)
                            </Label>
                            <div className="relative">
                                <Input 
                                    id="proof" 
                                    type="file" 
                                    accept="image/*,.pdf"
                                    onChange={(e) => setData('proof', e.target.files ? e.target.files[0] : null)}
                                    className="cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all border-2 border-dashed h-24 pt-8"
                                />
                                {!data.proof && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted-foreground/60 text-xs gap-1">
                                        <Upload className="h-6 w-6 mb-1 opacity-20" />
                                        Klik atau seret file ke sini
                                    </div>
                                )}
                            </div>
                            {errors.proof && <p className="text-xs text-red-600 font-medium">{errors.proof}</p>}
                            {(errors as any).error && (
                                <Alert variant="destructive" className="bg-red-50 py-2 border-red-100">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">{(errors as any).error}</AlertDescription>
                                </Alert>
                            )}
                        </div>

                        <Alert className="bg-blue-50 border-blue-100 py-3">
                            <AlertCircle className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-xs text-blue-700 leading-relaxed">
                                Pastikan nominal bukti bayar sesuai dengan total hutang. Bukti akan disimpan di <strong>Cloudinary</strong> (Backup: Vercel Blob).
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter className="p-6 bg-muted/20 border-t gap-2 sm:gap-0">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={processing}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-lg">
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                'Konfirmasi Pelunasan'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

