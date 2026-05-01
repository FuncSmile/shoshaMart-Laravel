import { router } from '@inertiajs/react';
import {
    CheckCircle, Clock, XCircle, Package, User, MapPin, Hash,
    Calendar, Phone, ReceiptText, Tags, ShoppingCart,
    Edit, Save, Plus, Minus, Trash2, Search, Loader2, ChevronRight,
    User2, Printer
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { show as ordersShow, approve as ordersApprove, cancel as ordersCancel, update as ordersUpdate, invoice as ordersInvoice, restore as ordersRestore, restoreCancelled as ordersRestoreCancelled } from '@/routes/orders/index';

interface OrderItem {
    id: string;
    product_id: string;
    quantity: number;
    price: number;
    subtotal: number;
    product: {
        id?: string;
        name: string;
        sku: string;
    };
}

interface Order {
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
    rejection_reason?: string;
    nama_pemesan: string;
    jenis_pesanan: string;
    created_at: string;
    buyer: {
        id: string;
        username: string;
        branch_name: string;
        phone: string;
    };
    tier: {
        id: string;
        name: string;
    };
    items: OrderItem[];
    history_logs?: {
        id: string;
        message: string;
        created_at: string;
        user: {
            username: string;
        };
    }[];
    permissions: {
        can_edit: boolean;
        can_cancel: boolean;
        can_approve: boolean;
        can_reject: boolean;
        can_generate_invoice: boolean;
    };
    is_trashed?: boolean;
}

interface AvailableProduct {
    id: string;
    name: string;
    sku: string;
    base_price: number;
}

export function OrderDetailModal({ open, onOpenChange, orderId, onReject }: {
    open: boolean,
    onOpenChange: (val: boolean) => void,
    orderId: string | null,
    onReject?: (order: any) => void
}) {
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
    const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [editedNamaPemesan, setEditedNamaPemesan] = useState('');
    const [editedJenisPesanan, setEditedJenisPesanan] = useState('');
    const [editedDate, setEditedDate] = useState('');

    useEffect(() => {
        if (open && orderId) {
            // Use a slight delay to avoid synchronous state updates in effect
            const timer = setTimeout(() => {
                setOrder(null);
                setIsEditing(false);
                setLoading(true);
            }, 0);

            fetch(ordersShow.url(orderId))
                .then(res => res.json())
                .then(data => {
                    const fetchedOrder = data.data ?? data;
                    setOrder(fetchedOrder);
                    setEditedItems(fetchedOrder.items || []);
                    setEditedNamaPemesan(fetchedOrder.nama_pemesan || '');
                    setEditedJenisPesanan(fetchedOrder.jenis_pesanan || '');

                    // Format date to YYYY-MM-DD for input type="date"
                    if (fetchedOrder.created_at) {
                        const dateObj = new Date(fetchedOrder.created_at);
                        setEditedDate(dateObj.toISOString().split('T')[0]);
                    }

                    setLoading(false);
                })
                .catch(() => setLoading(false));

            return () => clearTimeout(timer);
        }
    }, [open, orderId]);

    const fetchAvailableProducts = async () => {
        if (availableProducts.length > 0) {
            return;
        }

        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            setAvailableProducts(data);
        } catch (err) {
            console.error('Failed to fetch products', err);
        }
    };

    const toggleEdit = () => {
        if (!isEditing && order) {
            fetchAvailableProducts();
            setEditedItems(order.items || []);
            setEditedNamaPemesan(order.nama_pemesan || '');
            setEditedJenisPesanan(order.jenis_pesanan || '');
            const dateObj = new Date(order.created_at);
            setEditedDate(dateObj.toISOString().split('T')[0]);
        }

        setIsEditing(!isEditing);
    };

    const handleQuantityChange = (productId: string, newQty: number) => {
        setEditedItems(prev => prev.map(item =>
            item.product_id === productId ? { ...item, quantity: Math.max(1, newQty), subtotal: item.price * Math.max(1, newQty) } : item
        ));
    };

    const handleRemoveItem = (productId: string) => {
        setEditedItems(prev => prev.filter(item => item.product_id !== productId));
    };

    const handleAddItem = (product: AvailableProduct) => {
        if (editedItems.find(item => item.product_id === product.id)) {
            return;
        }

        const newItem: OrderItem = {
            id: `new-${crypto.randomUUID()}`,
            product_id: product.id,
            quantity: 1,
            price: product.base_price,
            subtotal: product.base_price,
            product: {
                name: product.name,
                sku: product.sku
            }
        };

        setEditedItems(prev => [...prev, newItem]);
        setSearchQuery('');
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery) {
            return [];
        }

        return availableProducts
            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter(p => !editedItems.find(item => item.product_id === p.id))
            .slice(0, 5);
    }, [searchQuery, availableProducts, editedItems]);

    const previewTotal = useMemo(() => {
        return editedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [editedItems]);

    const handleSaveRevision = () => {
        if (!order || isSaving) {
            return;
        }

        setIsSaving(true);

        router.patch(ordersUpdate.url(order.id), {
            nama_pemesan: editedNamaPemesan,
            jenis_pesanan: editedJenisPesanan,
            created_at: editedDate,
            items: editedItems.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity
            }))
        }, {
            onSuccess: () => {
                setIsSaving(false);
                setIsEditing(false);
                onOpenChange(false);
            },
            onError: () => setIsSaving(false)
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    const handleApprove = () => {
        if (!order || !confirm('Setujui pesanan ini?')) {
            return;
        }

        router.post(ordersApprove.url(order.id), {}, {
            onSuccess: () => onOpenChange(false),
        });
    };

    const handleCancel = () => {
        if (!order || !confirm('Batalkan pesanan ini? Tindakan ini tidak dapat dibatalkan.')) {
            return;
        }

        router.patch(ordersCancel.url(order.id), {}, {
            onSuccess: () => onOpenChange(false),
        });
    };

    const handlePrintInvoice = () => {
        if (!order) {
            return;
        }

        // Mark as printed in background
        fetch(`/orders/${order.id}/mark-as-printed`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        }).then(() => {
            // Update local state if needed or just refresh via Inertia
            router.reload({ only: ['orders'] });
        });

        window.open(ordersInvoice.url(order.id), '_blank');
    };

    const handleRestore = () => {
        if (!order) return;
        if (confirm('Pulihkan pesanan ini dari tempat sampah?')) {
            router.post(ordersRestore.url(order.id), {}, {
                onSuccess: () => onOpenChange(false)
            });
        }
    };

    const handleRestoreCancelled = () => {
        if (!order) return;
        if (confirm('Aktifkan kembali pesanan yang dibatalkan ini? Status akan kembali menjadi PENDING.')) {
            router.post(ordersRestoreCancelled.url(order.id), {}, {
                onSuccess: () => onOpenChange(false)
            });
        }
    };

    const getStatusConfig = (status: string) => {
        if (!status) {
            return { color: 'muted', icon: Package, label: 'Tidak Diketahui' };
        }

        switch (status.toLowerCase()) {
            case 'approved': return { color: 'emerald', icon: CheckCircle, label: 'Disetujui' };
            case 'pending': return { color: 'amber', icon: Clock, label: 'Menunggu' };
            case 'rejected': return { color: 'destructive', icon: XCircle, label: 'Ditolak' };
            case 'cancelled': return { color: 'muted', icon: XCircle, label: 'Dibatalkan' };
            default: return { color: 'muted', icon: Package, label: status };
        }
    };

    const statusConfig = order ? getStatusConfig(order.status) : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full sm:w-[95dvw] md:max-w-4xl p-0 overflow-hidden border-none shadow-[0_0_80px_-15px_rgba(0,0,0,0.6)] rounded-none sm:rounded-[2.5rem] md:rounded-[3rem] h-[95dvh] sm:h-[90vh] flex flex-col focus:outline-none">
                <DialogHeader className="sr-only">
                    <DialogTitle>Detail Pesanan {orderId ? `#${orderId.slice(0, 8)}` : ''}</DialogTitle>
                    <DialogDescription>Menampilkan rincian lengkap pesanan b2b anda.</DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="p-0 flex-1 flex flex-col">
                        <div className="h-[180px] bg-muted/20 animate-pulse flex flex-col justify-end p-8 md:p-12 space-y-4 border-b border-sidebar-border/50">
                            <Skeleton className="h-4 w-32 bg-primary/20" />
                            <Skeleton className="h-10 md:h-14 w-48 md:w-80 bg-primary/20" />
                        </div>
                        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 flex-1">
                            <Skeleton className="h-32 rounded-[2rem]" />
                            <Skeleton className="h-32 rounded-[2rem]" />
                            <Skeleton className="h-64 col-span-1 md:col-span-2 rounded-[2.5rem]" />
                        </div>
                    </div>
                ) : order ? (
                    <div className="flex flex-col h-full bg-background relative">
                        {/* Premium Dynamic Header */}
                        <div className={`relative overflow-hidden shrink-0 transition-all duration-700 ${isEditing ? 'bg-amber-500/5' : 'bg-primary/[0.02]'}`}>
                            <div className={`absolute top-0 left-0 w-full h-[3px] bg-${statusConfig?.color === 'emerald' ? 'emerald-500' : statusConfig?.color === 'amber' ? 'amber-500' : 'destructive'} z-20`} />

                            <div className="bg-gradient-to-br from-muted/60 via-background to-muted/20 p-8 md:p-12 relative">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8 relative z-10">
                                    <div className="space-y-3 md:space-y-4 w-full md:w-auto">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="bg-primary shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] px-3 py-1 rounded-full text-primary-foreground flex items-center gap-1.5 font-black text-[9px] md:text-[10px] tracking-[0.2em] uppercase">
                                                <Hash className="w-3 h-3" /> {order.order_number?.split('-').pop()}
                                            </div>
                                            <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-[10px] md:text-xs font-black border-2 border-${statusConfig?.color}-500/30 bg-${statusConfig?.color}-500/5 text-${statusConfig?.color === 'emerald' ? 'emerald-500' : statusConfig?.color === 'amber' ? 'amber-600' : 'destructive'} uppercase tracking-wider`}>
                                                {statusConfig?.icon && <statusConfig.icon className="w-3 h-3 mr-1.5" />}
                                                {statusConfig?.label}
                                            </Badge>
                                        </div>
                                        <h2 className="text-3xl md:text-6xl font-[1000] italic tracking-tighter text-foreground/90 uppercase leading-none">
                                            {order.jenis_pesanan === 'opening' ? 'Laporan' : 'Invoice'} <span className="text-primary italic">#{order.order_number?.split('-').pop()}</span>
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                                            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary/60" /> {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                            <div className="hidden md:block w-1 h-1 rounded-full bg-primary/20" />
                                            <div className="flex items-center gap-2"><ReceiptText className="w-4 h-4 text-primary/60" /> Transaksi B2B</div>
                                        </div>
                                    </div>

                                    <div className="text-left md:text-right w-full md:w-auto pt-6 md:pt-0 border-t md:border-none border-primary/10">
                                        <p className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-[0.3em] mb-1.5 md:mb-2 opacity-60">
                                            {isEditing ? 'REVISI TAGIHAN' : 'TOTAL TAGIHAN'}
                                        </p>
                                        <p className={`text-4xl md:text-7xl font-[1000] tracking-tighter leading-tight transition-all duration-500 ${isEditing ? 'text-amber-500 animate-pulse scale-105 origin-right' : 'text-primary'}`}>
                                            {formatCurrency(isEditing ? previewTotal : order.total_amount)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 space-y-8 md:space-y-16 min-h-0">
                                {/* Infographic Dashboard Style */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                                    {/* Buyer Info Card */}
                                    <div className="space-y-4 md:space-y-5 animate-in slide-in-from-left duration-500">
                                        <h4 className="text-[11px] uppercase font-[1000] tracking-[0.3em] text-primary/40 flex items-center gap-3">
                                            Profil Pembeli <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                                        </h4>
                                        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-muted/10 border-2 border-primary/5 hover:border-primary/10 transition-all duration-300 space-y-5 md:space-y-6 shadow-sm">
                                            <div className="flex items-center gap-4 md:gap-6">
                                                <div className="h-12 md:h-16 w-12 md:w-16 rounded-[1.2rem] md:rounded-[1.5rem] bg-background shadow-xl flex items-center justify-center text-primary group transition-all"><User className="w-6 md:w-8 h-6 md:h-8 group-hover:scale-110 transition-transform" /></div>
                                                <div>
                                                    <p className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5 opacity-60">Username Pembeli</p>
                                                    <p className="font-[1000] text-lg md:text-2xl tracking-tighter italic uppercase text-foreground leading-none">{order.buyer.username}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 md:gap-6 pt-5 border-t-2 border-primary/5">
                                                <div>
                                                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-primary" /> Cabang</p>
                                                    <p className="font-bold text-xs md:text-sm tracking-tight line-clamp-1">{order.buyer.branch_name || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1.5"><Phone className="w-3 h-3 text-primary" /> WA</p>
                                                    {order.buyer.phone ? (
                                                        <a 
                                                            href={`https://wa.me/${order.buyer.phone.replace(/\D/g, '').replace(/^0/, '62')}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="font-bold text-xs md:text-sm tracking-tight line-clamp-1 text-primary hover:underline flex items-center gap-1"
                                                            title="Chat via WhatsApp"
                                                        >
                                                            {order.buyer.phone}
                                                        </a>
                                                    ) : (
                                                        <p className="font-bold text-xs md:text-sm tracking-tight line-clamp-1">-</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="pt-5 border-t-2 border-primary/5">
                                                <p className="text-[10px] md:text-xs font-black text-primary uppercase mb-1.5 tracking-widest flex items-center gap-2">
                                                    <Hash className="w-3 h-3" /> Nama Pemesan
                                                </p>
                                                {isEditing ? (
                                                    <Input
                                                        value={editedNamaPemesan}
                                                        onChange={e => setEditedNamaPemesan(e.target.value)}
                                                        className="font-bold border-primary/20 focus:border-primary/50"
                                                    />
                                                ) : (
                                                    <p className="font-[1000] text-base md:text-xl tracking-tighter italic text-foreground uppercase leading-none">{order.nama_pemesan}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Distribution / Status Detail Card */}
                                    <div className="space-y-4 md:space-y-5 animate-in slide-in-from-right duration-500">
                                        <h4 className="text-[11px] uppercase font-[1000] tracking-[0.3em] text-primary/40 flex items-center gap-3">
                                            Distribusi <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                                        </h4>
                                        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-muted/10 border-2 border-primary/5 hover:border-primary/10 transition-all duration-300 space-y-5 md:space-y-6 shadow-sm">
                                            <div className="flex items-center gap-4 md:gap-6">
                                                <div className="h-12 md:h-16 w-12 md:w-16 rounded-[1.2rem] md:rounded-[1.5rem] bg-background shadow-xl flex items-center justify-center text-primary group transition-all"><Tags className="w-6 md:w-8 h-6 md:h-8 group-hover:scale-110 transition-transform" /></div>
                                                <div>
                                                    <p className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5 opacity-60">Lapisan Harga</p>
                                                    <p className="font-[1000] text-lg md:text-2xl tracking-tighter italic text-primary uppercase leading-none">TIER {order.tier.name}</p>
                                                </div>
                                            </div>

                                            <div className="pt-5 border-t-2 border-primary/5">
                                                <p className="text-[10px] md:text-xs font-black text-amber-600 uppercase mb-2 tracking-widest flex items-center gap-2">
                                                    <Clock className="w-3 h-3" /> {isEditing ? 'Revisi Jenis & Tanggal' : 'Jenis & Tanggal'}
                                                </p>
                                                <div className="space-y-3">
                                                    {isEditing ? (
                                                        <>
                                                            <Select value={editedJenisPesanan} onValueChange={setEditedJenisPesanan}>
                                                                <SelectTrigger className="h-10 rounded-xl border-2 border-amber-500/20 font-bold">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="awal bulan" className="font-bold text-[10px] uppercase tracking-widest">AKHIR BULAN</SelectItem>
                                                                    <SelectItem value="pertengahan bulan" className="font-bold text-[10px] uppercase tracking-widest">PERTENGAHAN BULAN</SelectItem>
                                                                    <SelectItem value="Lembur" className="font-bold text-[10px] uppercase tracking-widest">LEMBUR</SelectItem>
                                                                    <SelectItem value="tambahan bulan ini" className="font-bold text-[10px] uppercase tracking-widest">TAMBAHAN BULAN INI</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Input
                                                                type="date"
                                                                value={editedDate}
                                                                onChange={e => setEditedDate(e.target.value)}
                                                                className="h-10 rounded-xl border-2 border-primary/20 font-bold"
                                                            />
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            <div className="px-5 py-1.5 rounded-full bg-amber-500/10 border-2 border-amber-500/20 w-fit">
                                                                <p className="font-black text-[10px] md:text-xs tracking-[0.2em] italic text-amber-700 uppercase leading-none">{order.jenis_pesanan}</p>
                                                            </div>
                                                            <div className="px-5 py-1.5 rounded-full bg-primary/10 border-2 border-primary/20 w-fit">
                                                                <p className="font-black text-[10px] md:text-xs tracking-[0.2em] italic text-primary uppercase leading-none">
                                                                    {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-5 border-t-2 border-primary/5">
                                                {order.rejection_reason && !isEditing ? (
                                                    <div className="p-4 md:p-5 rounded-[1.5rem] bg-destructive/5 border-2 border-destructive/10 text-destructive relative group overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-destructive shadow-[0_0_40px_rgba(0,0,0,0.1)] rounded-full -translate-y-1/2 translate-x-1/2 opacity-5" />
                                                        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest leading-none mb-2 md:mb-3 flex items-center gap-2">
                                                            <XCircle className="w-4 h-4" /> Catatan Penolakan
                                                        </p>
                                                        <p className="text-xs md:text-sm font-bold italic text-destructive/80 leading-relaxed pr-8">{order.rejection_reason}</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 text-muted-foreground opacity-60">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <p className="font-bold text-[11px] md:text-xs italic">Menunggu validasi administratif operasional.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Refined Product Grid / Table */}
                                <div className="space-y-6 md:space-y-8 pb-10">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <h4 className="text-[11px] uppercase font-[1000] tracking-[0.3em] text-primary/40 flex items-center gap-3 w-full sm:w-auto">
                                            Item Pesanan <div className="h-px flex-1 sm:w-24 bg-gradient-to-r from-primary/20 to-transparent" />
                                        </h4>

                                        {isEditing && (
                                            <div className="relative w-full sm:max-w-md group animate-in zoom-in-95 duration-300">
                                                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                                    <Search className="w-4 h-4 text-primary group-focus-within:animate-pulse" />
                                                </div>
                                                <Input
                                                    placeholder="Cari & tambah produk..."
                                                    className="h-12 md:h-14 pl-14 pr-6 rounded-full border-2 border-primary/20 focus-visible:ring-primary/20 focus-visible:border-primary/40 bg-primary/5 font-black italic text-xs md:text-sm tracking-tight placeholder:text-primary/30"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />

                                                {filteredProducts.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-3 bg-background/95 backdrop-blur-xl border-2 border-primary/20 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] z-[100] overflow-hidden divide-y divide-primary/5 ring-4 ring-primary/5">
                                                        {filteredProducts.map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                className="w-full text-left p-5 md:p-6 hover:bg-primary/10 flex items-center justify-between group/item transition-all cursor-pointer"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleAddItem(p);
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="h-12 w-12 rounded-2xl bg-primary shadow-lg flex items-center justify-center text-primary-foreground font-[1000] italic text-xs">
                                                                        SH
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-[1000] text-sm md:text-base text-foreground tracking-tighter line-clamp-1">{p.name}</p>
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">SKU: {p.sku}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-primary/20 p-2 rounded-full group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-all">
                                                                    <Plus className="w-5 h-5" />
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile Item List - Now with Edit Mode! */}
                                    <div className="block lg:hidden space-y-4">
                                        {(isEditing ? editedItems : order.items)?.map((item) => (
                                            <div key={item.id} className="relative p-6 rounded-[2rem] bg-muted/5 border-2 border-primary/5 space-y-5 animate-in fade-in slide-in-from-bottom-4">
                                                {isEditing && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute top-4 right-4 h-10 w-10 rounded-2xl text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all border border-transparent hover:border-destructive/20"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleRemoveItem(item.product_id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                )}

                                                <div className="flex items-center gap-5 pr-10">
                                                    <div className="h-14 w-14 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl flex-shrink-0">
                                                        <Package className="w-7 h-7" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-[1000] text-base md:text-lg tracking-tighter text-foreground line-clamp-2 uppercase italic leading-none mb-2">{item.product.name}</p>
                                                        <Badge variant="secondary" className="text-[10px] uppercase font-black tracking-widest bg-primary/10 text-primary">SKU: {item.product.sku}</Badge>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t-2 border-primary/5">
                                                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">Kuantitas & Harga</p>
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-3">
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-10 w-10 rounded-full border-2 border-primary/20 text-primary"
                                                                    onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                                                                >
                                                                    <Minus className="w-4 h-4" />
                                                                </Button>
                                                                <Input
                                                                    type="number"
                                                                    className="w-16 h-10 rounded-xl text-center font-black text-base border-2 border-primary/20"
                                                                    value={item.quantity}
                                                                    onChange={(e) => handleQuantityChange(item.product_id, parseInt(e.target.value) || 1)}
                                                                />
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-10 w-10 rounded-full border-2 border-primary/20 text-primary"
                                                                    onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <p className="font-black text-sm tracking-tight"><span className="text-primary text-xl font-[1000] italic mr-2">{item.quantity}</span> @ {formatCurrency(item.price)}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 leading-none mb-1">Subtotal</p>
                                                        <p className="font-[1000] text-xl md:text-2xl text-primary tracking-tighter italic leading-none">{formatCurrency(item.price * item.quantity)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {(isEditing ? editedItems : order.items)?.length === 0 && (
                                            <div className="p-20 text-center space-y-4">
                                                <div className="h-24 w-24 rounded-full bg-muted/30 flex items-center justify-center mx-auto text-muted-foreground/30"><ShoppingCart className="w-10 h-10" /></div>
                                                <p className="italic font-bold text-muted-foreground opacity-40 uppercase tracking-widest text-xs">Keranjang Belanja Kosong</p>
                                            </div>
                                        )}

                                        <div className={`p-8 rounded-[2rem] ${isEditing ? 'bg-amber-500/10 border-2 border-amber-500/30' : 'bg-primary/5'} text-center space-y-2`}>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">
                                                {isEditing ? 'REVISI TOTAL AKHIR' : 'TOTAL PEMBAYARAN'}
                                            </p>
                                            <p className="text-4xl font-[1000] tracking-tighter italic text-primary leading-none">
                                                {formatCurrency(isEditing ? previewTotal : order.total_amount)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Desktop Table View */}
                                    <div className="hidden lg:block overflow-x-auto custom-scrollbar-x rounded-[2.5rem] border-2 border-primary/10 bg-muted/[0.03] p-1.5 shadow-sm">
                                        <div className="bg-background rounded-[2.2rem] min-w-[850px]">
                                            <table className="w-full table-auto text-sm">
                                                <thead>
                                                    <tr className="bg-muted/30 text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 border-b border-primary/5">
                                                        <th className="px-6 py-7 text-left">Produk</th>
                                                        <th className="px-4 py-7 text-center">Kuantitas</th>
                                                        <th className="px-4 py-7 text-right">Satuan</th>
                                                        <th className="px-6 py-7 text-right">Grand Total</th>
                                                        {isEditing && <th className="px-4 py-7 text-center">Opsi</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-primary/[0.03]">
                                                    {(isEditing ? editedItems : order.items)?.map((item) => (
                                                        <tr key={item.id} className="group hover:bg-primary/[0.02] transition-colors">
                                                            <td className="px-6 py-7">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all flex-shrink-0 shadow-lg group-hover:scale-105">
                                                                        <Package className="w-7 h-7" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-[1000] text-lg text-foreground tracking-tighter leading-none mb-1.5 group-hover:text-primary transition-colors uppercase italic">{item.product.name}</p>
                                                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary/60 group-hover:border-primary/40">SKU: {item.product.sku}</Badge>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-7">
                                                                {isEditing ? (
                                                                    <div className="flex items-center justify-center gap-3">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 rounded-full border border-primary/20 text-primary"
                                                                            onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                                                                        >
                                                                            <Minus className="w-3 h-3" />
                                                                        </Button>
                                                                        <Input
                                                                            type="number"
                                                                            className="w-16 h-10 rounded-xl text-center font-black text-base border-2 border-primary/20"
                                                                            value={item.quantity}
                                                                            onChange={(e) => handleQuantityChange(item.product_id, parseInt(e.target.value) || 1)}
                                                                        />
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 rounded-full border border-primary/20 text-primary"
                                                                            onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                                                                        >
                                                                            <Plus className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-center font-black text-xl text-foreground/80 tracking-tighter">
                                                                        <span className="text-primary font-[1000] italic mr-1">×</span> {item.quantity}
                                                                    </p>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-7 text-right font-black text-muted-foreground italic uppercase text-xs tracking-tighter opacity-60">
                                                                {formatCurrency(item.price)}
                                                            </td>
                                                            <td className="px-6 py-7 text-right font-[1000] text-xl text-foreground tracking-tighter italic group-hover:scale-105 transition-transform origin-right">
                                                                {formatCurrency(item.price * item.quantity)}
                                                            </td>
                                                            {isEditing && (
                                                                <td className="px-4 py-7 text-center">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-12 w-12 rounded-2xl text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all border border-transparent hover:border-destructive/20"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            handleRemoveItem(item.product_id);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </Button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-primary/[0.03] border-t-2 border-primary/5">
                                                    <tr>
                                                        <td colSpan={3} className="px-6 py-8 text-right font-[1000] uppercase tracking-[0.4em] text-[10px] text-primary/40">Total Tagihan Final</td>
                                                        <td className={`px-6 py-8 text-right font-[1000] text-3xl md:text-4xl tracking-tighter italic whitespace-nowrap ${isEditing ? 'text-amber-500' : 'text-primary'}`}>
                                                            {formatCurrency(isEditing ? previewTotal : order.total_amount)}
                                                        </td>
                                                        {isEditing && <td></td>}
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Order History Timeline Section */}
                                    {order.history_logs && order.history_logs.length > 0 && !isEditing && (
                                        <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-8 duration-700 delay-200 mt-12 pt-12 border-t-2 border-primary/5">
                                            <h4 className="text-[11px] uppercase font-[1000] tracking-[0.3em] text-primary/40 flex items-center gap-3">
                                                Riwayat Pesanan <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                                            </h4>

                                            <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-bottom before:from-primary/20 before:via-primary/5 before:to-transparent">
                                                {order.history_logs.map((log, idx) => {
                                                    const lowerMsg = log.message.toLowerCase();
                                                    let colorClass = 'bg-primary/10 text-primary border-primary/5';
                                                    let dotClass = 'bg-primary';

                                                    if (lowerMsg.includes('menyetujui')) {
                                                        colorClass = 'bg-emerald-500/10 text-emerald-700 border-emerald-500/10';
                                                        dotClass = 'bg-emerald-500';
                                                    } else if (lowerMsg.includes('menolak')) {
                                                        colorClass = 'bg-destructive/10 text-destructive border-destructive/10';
                                                        dotClass = 'bg-destructive';
                                                    } else if (lowerMsg.includes('membatalkan')) {
                                                        colorClass = 'bg-rose-500/10 text-rose-700 border-rose-500/10';
                                                        dotClass = 'bg-rose-500';
                                                    } else if (lowerMsg.includes('merevisi')) {
                                                        colorClass = 'bg-amber-500/10 text-amber-700 border-amber-500/10';
                                                        dotClass = 'bg-amber-500';
                                                    }

                                                    return (
                                                        <div key={log.id} className="relative group animate-in fade-in slide-in-from-left duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                                            {/* Timeline Node */}
                                                            <div className={`absolute -left-8 top-1 h-6 w-6 rounded-full bg-background border-4 border-muted shadow-sm z-10 group-hover:border-primary/40 transition-colors flex items-center justify-center`}>
                                                                <div className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                                                            </div>

                                                            <div className={`${colorClass} p-5 md:p-6 rounded-[2rem] border-2 transition-all duration-300`}>
                                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                                    <div className="flex items-start gap-4">
                                                                        <div className={`h-10 w-10 rounded-xl bg-background/60 shadow-sm flex items-center justify-center shrink-0`}>
                                                                            <User2 className="w-5 h-5" />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="font-bold text-sm leading-tight tracking-tight">
                                                                                {log.message}
                                                                            </p>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`h-1 w-1 rounded-full opacity-40 ${dotClass}`} />
                                                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Oleh: {log.user.username}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/60 shadow-sm border border-black/5 self-end md:self-center">
                                                                        <Clock className="w-3 h-3 opacity-40" />
                                                                        <p className="text-[10px] font-black tracking-tight text-muted-foreground opacity-60">
                                                                            {log.created_at}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer with Glassmorphism */}
                        <DialogFooter className="p-6 md:p-10 bg-background/95 backdrop-blur-3xl border-t-2 border-primary/5 flex flex-col md:flex-row gap-4 shrink-0 z-50">
                            {isEditing ? (
                                <div className="w-full flex flex-col sm:flex-row items-center justify-end gap-3 md:gap-4">
                                    <Button
                                        className="w-full sm:w-auto rounded-full px-10 md:px-14 bg-amber-500 hover:bg-amber-600 font-[1000] italic h-14 md:h-16 shadow-[0_15px_30px_-5px_rgba(245,158,11,0.3)] text-sm md:text-lg uppercase tracking-widest transition-all hover:-translate-y-1 active:translate-y-0"
                                        onClick={handleSaveRevision}
                                        disabled={isSaving || editedItems.length === 0}
                                    >
                                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Save className="w-6 h-6 mr-3" />}
                                        SIMPAN REVISI
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full sm:w-auto rounded-full px-10 h-14 md:h-16 font-black italic border-2 border-muted-foreground/20 hover:bg-muted text-sm uppercase tracking-widest transition-all"
                                        onClick={() => setIsEditing(false)}
                                        disabled={isSaving}
                                    >
                                        BATALKAN
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-full flex flex-col md:flex-row items-stretch md:items-center gap-3">
                                    <div className="flex-1 flex flex-col sm:flex-row items-stretch md:items-center gap-3 md:gap-4">
                                        {order.permissions.can_approve && (
                                            <Button
                                                className="rounded-full px-8 md:px-10 bg-emerald-500 hover:bg-emerald-600 font-[1000] italic h-12 md:h-14 shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)] text-[11px] md:text-sm uppercase tracking-widest transition-all hover:-translate-y-1"
                                                onClick={handleApprove}
                                            >
                                                <CheckCircle className="w-5 h-5 mr-2.5" /> SETUJUI
                                            </Button>
                                        )}

                                        {order.permissions.can_edit && (
                                            <Button
                                                variant="secondary"
                                                className="rounded-full px-8 md:px-10 font-[1000] italic h-12 md:h-14 shadow-lg bg-blue-500 hover:bg-blue-600 text-white text-[11px] md:text-sm uppercase tracking-widest transition-all hover:-translate-y-1"
                                                onClick={toggleEdit}
                                            >
                                                <Edit className="w-5 h-5 mr-2.5" /> EDIT ORDER
                                            </Button>
                                        )}

                                        {order.permissions.can_reject && (
                                            <Button
                                                variant="destructive"
                                                className="rounded-full px-8 md:px-10 font-[1000] italic h-12 md:h-14 shadow-[0_10px_20px_-5px_rgba(239,68,68,0.3)] border-2 border-destructive/20 text-[11px] md:text-sm uppercase tracking-widest transition-all hover:-translate-y-1"
                                                onClick={() => onReject?.(order)}
                                            >
                                                <XCircle className="w-5 h-5 mr-2.5" /> TOLAK
                                            </Button>
                                        )}

                                        {order.permissions.can_cancel && (
                                            <Button
                                                variant="outline"
                                                className="rounded-full px-8 md:px-10 font-black italic h-12 md:h-14 border-2 border-destructive/30 text-destructive hover:bg-destructive/5 text-[11px] md:text-sm uppercase tracking-widest transition-all"
                                                onClick={handleCancel}
                                            >
                                                <XCircle className="w-5 h-5 mr-2.5" /> BATALKAN
                                            </Button>
                                        )}

                                        {order.permissions.can_generate_invoice && (
                                            <Button
                                                className="rounded-full px-8 md:px-10 bg-indigo-600 hover:bg-indigo-700 font-[1000] italic h-12 md:h-14 shadow-[0_10px_20px_-5px_rgba(79,70,229,0.3)] text-[11px] md:text-sm uppercase tracking-widest transition-all hover:-translate-y-1"
                                                onClick={handlePrintInvoice}
                                            >
                                                <Printer className="w-5 h-5 mr-2.5" /> {order.jenis_pesanan === 'opening' ? 'CETAK LAPORAN' : 'CETAK INVOICE'}
                                            </Button>
                                        )}

                                        {order.is_trashed && (
                                            <Button
                                                className="rounded-full px-8 md:px-10 bg-emerald-600 hover:bg-emerald-700 font-[1000] italic h-12 md:h-14 shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)] text-[11px] md:text-sm uppercase tracking-widest transition-all hover:-translate-y-1"
                                                onClick={handleRestore}
                                            >
                                                <CheckCircle className="w-5 h-5 mr-2.5" /> PULIHKAN DARI TRASH
                                            </Button>
                                        )}

                                        {order.status === 'CANCELLED' && !order.is_trashed && (
                                            <Button
                                                className="rounded-full px-8 md:px-10 bg-emerald-600 hover:bg-emerald-700 font-[1000] italic h-12 md:h-14 shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)] text-[11px] md:text-sm uppercase tracking-widest transition-all hover:-translate-y-1"
                                                onClick={handleRestoreCancelled}
                                            >
                                                <CheckCircle className="w-5 h-5 mr-2.5" /> AKTIFKAN KEMBALI
                                            </Button>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className="rounded-full px-12 font-black text-xs uppercase tracking-[0.3em] h-12 md:h-14 hover:bg-foreground hover:text-background transition-all group"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        TUTUP <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            )}
                        </DialogFooter>
                    </div>
                ) : (
                    <div className="p-20 flex flex-col items-center justify-center gap-6 text-muted-foreground italic font-[1000] text-center h-[60vh]">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                        </div>
                        <p className="text-base md:text-xl tracking-tighter">Sinkronisasi data pesanan...</p>
                        <Button variant="outline" className="rounded-full px-8" onClick={() => onOpenChange(false)}>Kembali Ke Beranda</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
