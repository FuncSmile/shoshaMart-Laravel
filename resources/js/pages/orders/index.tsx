import { Head, usePage, router, useForm } from '@inertiajs/react';
import { ShoppingCart, Eye, CheckCircle, XCircle, Filter, Loader2, ArrowRight, Package, User, Clock, AlertCircle, Trash2, Search, Minus, Plus, Tag, Calendar, CreditCard } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { OrderDetailModal } from '@/components/order-detail-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, SearchInput } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { index as ordersIndex, approve as ordersApprove, reject as ordersReject, cancel as ordersCancel, destroy as ordersDestroy } from '@/routes/orders/index';

interface Order {
    id: string;
    status: string;
    total_amount: number;
    nama_pemesan: string;
    jenis_pesanan: string;
    created_at: string;
    buyer: {
        username: string;
        branch_name: string;
    };
    tier: {
        name: string;
    };
    permissions: {
        can_edit: boolean;
        can_cancel: boolean;
        can_approve: boolean;
        can_reject: boolean;
    };
    is_printed: boolean;
}

export default function OrderIndex() {
    const { orders, auth_role, filters, buyers, tiers, availableTypes } = usePage().props as any;
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'ALL');
    const [jenisPesananFilter, setJenisPesananFilter] = useState(filters.jenis_pesanan || 'ALL');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
    const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
    const [isQuickPrintOpen, setIsQuickPrintOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);

    const [quickPrintData, setQuickPrintData] = useState({
        buyer_id: 'ALL',
        jenis_pesanan: 'ALL'
    });

    const [reportData, setReportData] = useState({
        jenis_pesanan: 'ALL',
        tier_id: 'ALL',
        format: 'pdf',
        start_date: '',
        end_date: ''
    });

    const { data, setData, post, processing, reset } = useForm({
        reason: '',
    });

    const createOrderForm = useForm({
        buyer_id: '',
        nama_pemesan: '',
        jenis_pesanan: 'awal bulan',
        created_at: new Date().toISOString().split('T')[0],
        items: [] as { product_id: string, quantity: number, name?: string, sku?: string, price?: number }[]
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            const currentFilters = {
                search: searchQuery,
                status: statusFilter,
                jenis_pesanan: jenisPesananFilter,
                start_date: startDate,
                end_date: endDate
            };

            const filtersChanged = 
                searchQuery !== (filters.search || '') || 
                statusFilter !== (filters.status || 'ALL') || 
                jenisPesananFilter !== (filters.jenis_pesanan || 'ALL') ||
                startDate !== (filters.start_date || '') ||
                endDate !== (filters.end_date || '');

            if (filtersChanged) {
                router.get(ordersIndex.url(), currentFilters, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true
                });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, statusFilter, jenisPesananFilter, startDate, endDate, filters]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Disetujui</Badge>;
            case 'pending': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Menunggu</Badge>;
            case 'rejected': return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="w-3 h-3 mr-1" /> Ditolak</Badge>;
            case 'cancelled': return <Badge variant="outline" className="opacity-50 italic">Dibatalkan</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleApprove = (id: string) => {
        if (confirm('Setujui pesanan ini?')) {
            router.post(ordersApprove.url(id));
        }
    };

    const handleCancel = (id: string) => {
        if (confirm('Batalkan pesanan ini? Tindakan ini tidak dapat dibatalkan.')) {
            router.patch(ordersCancel.url(id));
        }
    };

    const handleDelete = (id: string) => {
        router.delete(ordersDestroy.url(id), {
            onSuccess: () => setDeletingOrder(null),
        });
    };

    const handleReject = (e: React.FormEvent) => {
        e.preventDefault();

        if (rejectingOrder) {
            post(ordersReject.url(rejectingOrder.id), {
                onSuccess: () => {
                    setRejectingOrder(null);
                    reset();
                },
            });
        }
    };

    const handleMarkAsPaid = (id: string) => {
        if (confirm('Tandai pesanan ini sebagai LUNAS secara manual?')) {
            router.post(`/orders/${id}/mark-as-paid`);
        }
    };

    const previewTotal = useMemo(() => {
        return createOrderForm.data.items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
    }, [createOrderForm.data.items]);

    const [productSearchQuery, setProductSearchQuery] = useState('');
    const filteredSearchProducts = useMemo(() => {
        if (!productSearchQuery) {
            return [];
        }

        return availableProducts.filter(p =>
            p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(productSearchQuery.toLowerCase())
        ).slice(0, 5);
    }, [productSearchQuery, availableProducts]);

    const getProductTierPrice = (product: any, tierId: string | null) => {
        if (!tierId) return product.base_price;
        const tierPrice = product.tier_prices?.find((tp: any) => tp.tier_id === tierId);
        return tierPrice ? tierPrice.price : product.base_price;
    };

    // Update prices when buyer changes
    useEffect(() => {
        if (createOrderForm.data.buyer_id) {
            const buyer = buyers.find((b: any) => b.id === createOrderForm.data.buyer_id);
            if (buyer && createOrderForm.data.items.length > 0) {
                const updatedItems = createOrderForm.data.items.map(item => {
                    const product = availableProducts.find(p => p.id === item.product_id);
                    if (product) {
                        return { ...item, price: getProductTierPrice(product, buyer.tier_id) };
                    }
                    return item;
                });
                createOrderForm.setData('items', updatedItems);
            }
        }
    }, [createOrderForm.data.buyer_id, availableProducts]);

    return (
        <div className="flex flex-1 flex-col gap-8 p-6 md:p-8 lg:p-10 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Head title="Manajemen Pesanan" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent italic flex items-center gap-3">
                        <ShoppingCart className="h-10 w-10 text-primary" />
                        Manajemen Pesanan
                    </h1>
                    <p className="text-muted-foreground text-lg font-medium">
                        Pantau dan proses pesanan dari seluruh jaringan Shosha Mart.
                    </p>
                </div>

                {auth_role === 'SUPERADMIN' && (
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => {
                                setIsCreateModalOpen(true);

                                if (availableProducts.length === 0) {
                                    fetch('/api/products').then(res => res.json()).then(setAvailableProducts);
                                }
                            }}
                            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black italic uppercase tracking-widest px-8 h-14 shadow-2xl shadow-emerald-200 flex items-center gap-2 group"
                        >
                            <ShoppingCart className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            TAMBAH PESANAN
                        </Button>
                        <Button
                            onClick={() => setIsReportModalOpen(true)}
                            variant="outline"
                            className="rounded-full border-2 border-primary/20 hover:bg-primary/5 text-primary font-black italic uppercase tracking-widest px-8 h-14 flex items-center gap-2 group"
                        >
                            <Filter className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                            EXPORT LAPORAN
                        </Button>
                        <Button
                            onClick={() => setIsQuickPrintOpen(true)}
                            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black italic uppercase tracking-widest px-8 h-14 shadow-2xl shadow-primary/20 flex items-center gap-2 group"
                        >
                            <Package className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            CETAK CEPAT
                        </Button>
                    </div>
                )}
            </div>

            {/* Main Table Card */}
            <Card className="border-sidebar-border/50 shadow-2xl shadow-foreground/5 overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-sidebar-border/50 py-6 px-8">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Cari ID Pesanan atau Buyer..."
                            className="md:w-96"
                        />
                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                            {/* Filter Status */}
                            <div className="flex items-center gap-2 flex-1 min-w-[200px] md:flex-none">
                                <div className="flex items-center gap-2 bg-background border-2 border-primary/10 rounded-full pl-3 pr-1 h-12 shadow-sm w-full">
                                    <Filter className="h-4 w-4 text-primary shrink-0" />
                                    <span className="text-[10px] uppercase tracking-wider font-black text-muted-foreground whitespace-nowrap">Status</span>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="border-none bg-transparent h-9 focus:ring-0 font-bold text-xs shadow-none px-2 shadow-none focus-visible:ring-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            <SelectItem value="ALL">Semua Status</SelectItem>
                                            <SelectItem value="PENDING">Menunggu</SelectItem>
                                            <SelectItem value="APPROVED">Disetujui</SelectItem>
                                            <SelectItem value="REJECTED">Ditolak</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Filter Jenis */}
                            <div className="flex items-center gap-2 flex-1 min-w-[200px] md:flex-none">
                                <div className="flex items-center gap-2 bg-background border-2 border-primary/10 rounded-full pl-3 pr-1 h-12 shadow-sm w-full">
                                    <Tag className="h-4 w-4 text-primary shrink-0" />
                                    <span className="text-[10px] uppercase tracking-wider font-black text-muted-foreground whitespace-nowrap">Jenis</span>
                                    <Select value={jenisPesananFilter} onValueChange={setJenisPesananFilter}>
                                        <SelectTrigger className="border-none bg-transparent h-9 focus:ring-0 font-bold text-xs shadow-none px-2 shadow-none focus-visible:ring-0 capitalize">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            <SelectItem value="ALL">Semua Jenis</SelectItem>
                                            {(availableTypes as string[]).map(type => (
                                                <SelectItem key={type} value={type} className="capitalize font-bold">{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Filter Periode */}
                            <div className="flex items-center gap-2 w-full lg:w-auto">
                                <div className="flex items-center gap-3 bg-background border-2 border-primary/10 rounded-full px-4 h-12 shadow-sm w-full overflow-hidden">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] uppercase tracking-wider font-black text-muted-foreground whitespace-nowrap">Periode</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 flex-1">
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="border-none bg-transparent h-9 p-0 focus-visible:ring-0 text-xs font-bold text-center w-full min-w-[110px]"
                                        />
                                        <span className="text-primary/30 font-black text-xs">TO</span>
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="border-none bg-transparent h-9 p-0 focus-visible:ring-0 text-xs font-bold text-center w-full min-w-[110px]"
                                        />
                                    </div>

                                    {(startDate || endDate) && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-full hover:bg-destructive/10 text-destructive shrink-0"
                                            onClick={() => {
                                                setStartDate('');
                                                setEndDate('');
                                            }}
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/20 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                                <tr>
                                    <th className="px-8 py-4">ID & Jenis Pesanan</th>
                                    <th className="px-6 py-4">Cabang</th>
                                    <th className="px-6 py-4">Buyer & Tier</th>
                                    <th className="px-6 py-4">Total Tagihan</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-8 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {orders.data.map((order: Order) => (
                                    <tr key={order.id} className="hover:bg-muted/10 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                                    <Package className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <div className="font-black text-foreground text-sm flex items-center gap-1 uppercase tracking-tight">
                                                        #{order.id.slice(0, 8)}
                                                        {order.is_printed && (
                                                            <span title="Ter-cetak">
                                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/10" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 font-black italic uppercase tracking-wider py-0.5 px-2 rounded-[0.4rem]">
                                                        {order.jenis_pesanan}
                                                    </Badge>
                                                    <div className="text-[9px] text-muted-foreground font-medium italic mt-1">
                                                        {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-sm tracking-tighter uppercase italic text-foreground">{order.buyer.branch_name || 'Bukan Cabang'}</span>
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">LOKASI PENGIRIMAN</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-2 mb-1">
                                                <User className="w-3 h-3 text-muted-foreground" />
                                                <span className="font-bold text-sm tracking-tight">{order.buyer.username}</span>
                                            </div>
                                            <Badge variant="secondary" className="text-[9px] font-black tracking-widest uppercase py-0 px-2 rounded-sm opacity-70">
                                                {order.tier.name}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="font-black text-base text-primary tracking-tighter">{formatCurrency(order.total_amount)}</div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            {getStatusBadge(order.status)}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedOrderId(order.id); setIsDetailOpen(true);
                                                    }}
                                                    className="rounded-full font-bold hover:bg-primary/10 hover:text-primary gap-1"
                                                >
                                                    <Eye className="h-4 w-4" /> Detail
                                                </Button>

                                                <div className="flex items-center gap-2 ml-2 border-l pl-2">
                                                    {(order.permissions.can_approve || order.permissions.can_reject) && (
                                                        <>
                                                            {order.permissions.can_approve && (
                                                                <Button
                                                                    variant="default"
                                                                    size="icon"
                                                                    onClick={() => handleApprove(order.id)}
                                                                    className="rounded-full bg-emerald-500 hover:bg-emerald-600 h-8 w-8 shadow-lg shadow-emerald-500/20"
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {order.permissions.can_reject && (
                                                                <Button
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    onClick={() => setRejectingOrder(order)}
                                                                    className="rounded-full h-8 w-8 shadow-lg shadow-destructive/20"
                                                                >
                                                                    <XCircle className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}

                                                    {order.permissions.can_cancel && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleCancel(order.id)}
                                                            className="rounded-full h-8 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10"
                                                        >
                                                            Batal
                                                        </Button>
                                                    )}

                                                    {order.status === 'APPROVED' && (auth_role === 'SUPERADMIN' || auth_role === 'ADMIN_TIER') && (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => handleMarkAsPaid(order.id)}
                                                            className="rounded-full h-8 text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                                                        >
                                                            <CreditCard className="h-3 w-3 mr-1" />
                                                            Bayar Lunas
                                                        </Button>
                                                    )}

                                                    {auth_role === 'SUPERADMIN' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setDeletingOrder(order)}
                                                            className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination links={orders.meta.links} className="px-8 py-4 border-t bg-muted/5" />
                </CardContent>
            </Card>

            {/* Detail Modal */}
            <OrderDetailModal
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                orderId={selectedOrderId}
                onReject={(order) => {
                    setIsDetailOpen(false); setRejectingOrder(order);
                }}
            />

            {/* Rejection Dialog */}
            <Dialog open={!!rejectingOrder} onOpenChange={(val) => !val && setRejectingOrder(null)}>
                <DialogContent className="rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic text-destructive">Tolak Pesanan</DialogTitle>
                        <DialogDescription>
                            Berikan alasan penolakan untuk pesanan #{rejectingOrder?.id.slice(0, 8)}. Alasan ini akan tampak oleh Buyer.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleReject} className="space-y-6 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason" className="font-bold text-xs uppercase tracking-widest">Alasan Penolakan</Label>
                            <Input
                                id="reason"
                                value={data.reason}
                                onChange={e => setData('reason', e.target.value)}
                                className="rounded-xl h-12 bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-destructive"
                                placeholder="..."
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={processing}
                                variant="destructive"
                                className="w-full h-12 rounded-full font-black text-lg shadow-xl shadow-destructive/20"
                            >
                                {processing ? <Loader2 className="animate-spin mr-2" /> : 'Konfirmasi Penolakan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Deletion Dialog */}
            <Dialog open={!!deletingOrder} onOpenChange={(val) => !val && setDeletingOrder(null)}>
                <DialogContent className="rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden sm:max-w-md">
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-2xl font-black italic flex items-center gap-2 tracking-tight uppercase text-destructive">
                            <Trash2 className="h-6 w-6" />
                            Hapus Pesanan?
                        </DialogTitle>
                        <DialogDescription className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest">
                            Tindakan ini permanen dan tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="bg-destructive/5 p-6 rounded-2xl border-2 border-destructive/10 space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                                <span>ID PESANAN</span>
                                <span className="text-foreground">#{deletingOrder?.id.slice(0, 8)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                                <span>TOTAL TAGIHAN</span>
                                <span className="text-destructive">{deletingOrder ? formatCurrency(deletingOrder.total_amount) : ''}</span>
                            </div>
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-3">
                            <Button
                                variant="ghost"
                                className="rounded-full font-black italic uppercase text-xs tracking-widest"
                                onClick={() => setDeletingOrder(null)}
                            >
                                Batal
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 rounded-full h-12 font-black italic uppercase text-xs tracking-widest shadow-lg shadow-destructive/20"
                                onClick={() => deletingOrder && handleDelete(deletingOrder.id)}
                            >
                                YA, HAPUS PERMANEN
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Quick Print Modal */}
            <Dialog open={isQuickPrintOpen} onOpenChange={setIsQuickPrintOpen}>
                <DialogContent className="rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden sm:max-w-md">
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-2xl font-black italic flex items-center gap-2 tracking-tight uppercase">
                            <Package className="h-6 w-6 text-primary" />
                            Cetak Cepat (Approved)
                        </DialogTitle>
                        <DialogDescription className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest">
                            Pilih filter untuk mencetak banyak invoice sekaligus.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kategori Cabang</Label>
                                <Select
                                    value={quickPrintData.buyer_id}
                                    onValueChange={(val) => setQuickPrintData(prev => ({ ...prev, buyer_id: val }))}
                                >
                                    <SelectTrigger className="h-12 rounded-2xl border-2 font-bold focus:ring-primary/20 bg-muted/30">
                                        <SelectValue placeholder="Pilih Cabang" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        <SelectItem value="ALL" className="font-bold">SEMUA CABANG</SelectItem>
                                        {buyers?.map((buyer: any) => (
                                            <SelectItem key={buyer.id} value={buyer.id} className="font-bold">
                                                {buyer.branch_name || buyer.username}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Jenis Pesanan</Label>
                                <Select
                                    value={quickPrintData.jenis_pesanan}
                                    onValueChange={(val) => setQuickPrintData(prev => ({ ...prev, jenis_pesanan: val }))}
                                >
                                    <SelectTrigger className="h-12 rounded-2xl border-2 font-bold focus:ring-primary/20 bg-muted/30">
                                        <SelectValue placeholder="Pilih Jenis" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        <SelectItem value="ALL" className="font-bold">SEMUA JENIS</SelectItem>
                                        <SelectItem value="awal bulan" className="font-bold">AWAL BULAN</SelectItem>
                                        <SelectItem value="pertengahan bulan" className="font-bold">PERTENGAHAN BULAN</SelectItem>
                                        <SelectItem value="Lembur" className="font-bold">LEMBUR</SelectItem>
                                        <SelectItem value="tambahan bulan ini" className="font-bold">TAMBAHAN BULAN INI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="bg-primary/5 p-4 rounded-2xl border-2 border-primary/10">
                            <p className="text-[10px] font-bold text-primary italic leading-relaxed text-center">
                                Sistem hanya akan mencetak pesanan dengan status <span className="underline">APPROVED</span> yang sesuai dengan filter di atas.
                            </p>
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-3">
                            <Button
                                variant="ghost"
                                className="rounded-full font-black italic uppercase text-xs tracking-widest"
                                onClick={() => setIsQuickPrintOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                className="flex-1 rounded-full h-12 font-black italic uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                                onClick={() => {
                                    const url = new URL(window.location.origin + '/orders-bulk/invoice');
                                    url.searchParams.append('buyer_id', quickPrintData.buyer_id);
                                    url.searchParams.append('jenis_pesanan', quickPrintData.jenis_pesanan);
                                    window.open(url.toString(), '_blank');
                                    setIsQuickPrintOpen(false);
                                }}
                            >
                                <ArrowRight className="h-4 w-4 mr-2" /> CETAK SEKARANG
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Export Report Modal */}
            <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                <DialogContent className="rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden sm:max-w-md">
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-2xl font-black italic flex items-center gap-2 tracking-tight uppercase text-primary">
                            <Filter className="h-6 w-6" />
                            Export Laporan Pesanan
                        </DialogTitle>
                        <DialogDescription className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest">
                            Generate laporan dalam format PDF atau Excel.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Jenis Pesanan</Label>
                                <Select
                                    value={reportData.jenis_pesanan}
                                    onValueChange={(val) => setReportData(prev => ({ ...prev, jenis_pesanan: val }))}
                                >
                                    <SelectTrigger className="h-12 rounded-2xl border-2 font-bold focus:ring-primary/20 bg-muted/30">
                                        <SelectValue placeholder="Pilih Jenis" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        <SelectItem value="ALL" className="font-bold">SEMUA JENIS</SelectItem>
                                        <SelectItem value="awal bulan" className="font-bold text-xs">AWAL BULAN</SelectItem>
                                        <SelectItem value="pertengahan bulan" className="font-bold text-xs">PERTENGAHAN BULAN</SelectItem>
                                        <SelectItem value="Lembur" className="font-bold text-xs">LEMBUR</SelectItem>
                                        <SelectItem value="tambahan bulan ini" className="font-bold text-xs">TAMBAHAN BULAN INI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filter Tier</Label>
                                <Select
                                    value={reportData.tier_id}
                                    onValueChange={(val) => setReportData(prev => ({ ...prev, tier_id: val }))}
                                >
                                    <SelectTrigger className="h-12 rounded-2xl border-2 font-bold focus:ring-primary/20 bg-muted/30">
                                        <SelectValue placeholder="Pilih Tier" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        <SelectItem value="ALL" className="font-bold text-xs uppercase tracking-widest">SEMUA TIER</SelectItem>
                                        {tiers?.map((tier: any) => (
                                            <SelectItem key={tier.id} value={tier.id} className="font-bold text-xs uppercase tracking-widest leading-relaxed">
                                                {tier.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-primary">Tanggal Mulai</Label>
                                    <Input
                                        type="date"
                                        value={reportData.start_date}
                                        onChange={(e) => setReportData(prev => ({ ...prev, start_date: e.target.value }))}
                                        className="h-12 rounded-2xl border-2 font-bold focus:ring-primary/20 bg-muted/30"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-primary">Tanggal Selesai</Label>
                                    <Input
                                        type="date"
                                        value={reportData.end_date}
                                        onChange={(e) => setReportData(prev => ({ ...prev, end_date: e.target.value }))}
                                        className="h-12 rounded-2xl border-2 font-bold focus:ring-primary/20 bg-muted/30"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Format Laporan</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        variant={reportData.format === 'pdf' ? 'default' : 'outline'}
                                        onClick={() => setReportData(prev => ({ ...prev, format: 'pdf' }))}
                                        className="h-12 rounded-2xl font-bold italic"
                                    >
                                        PDF (Format Tabel)
                                    </Button>
                                    <Button
                                        variant={reportData.format === 'excel' ? 'default' : 'outline'}
                                        onClick={() => setReportData(prev => ({ ...prev, format: 'excel' }))}
                                        className="h-12 rounded-2xl font-bold italic"
                                    >
                                        EXCEL (Multi-Sheet)
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-primary/5 p-4 rounded-2xl border-2 border-primary/10">
                            <p className="text-[10px] font-bold text-primary italic leading-relaxed">
                                • PDF: Tabel pesanan per halaman per cabang.<br />
                                • Excel: Data pesanan per sheet per cabang.
                            </p>
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-3">
                            <Button
                                variant="ghost"
                                className="rounded-full font-black italic uppercase text-xs tracking-widest"
                                onClick={() => setIsReportModalOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                className="flex-1 rounded-full h-12 font-black italic uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                                onClick={() => {
                                    const url = new URL(window.location.origin + '/orders-report');
                                    url.searchParams.append('format', reportData.format);
                                    url.searchParams.append('jenis_pesanan', reportData.jenis_pesanan);
                                    url.searchParams.append('tier_id', reportData.tier_id);

                                    if (reportData.start_date) {
url.searchParams.append('start_date', reportData.start_date);
}

                                    if (reportData.end_date) {
url.searchParams.append('end_date', reportData.end_date);
}

                                    window.open(url.toString(), '_blank');
                                    setIsReportModalOpen(false);
                                }}
                            >
                                <ArrowRight className="h-4 w-4 mr-2" /> BUAT LAPORAN
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Order Modal - Enhanced UI */}
            <Dialog open={isCreateModalOpen} onOpenChange={(val) => {
                setIsCreateModalOpen(val);

                if (!val) {
                    createOrderForm.reset();
                    setProductSearchQuery('');
                }
            }}>
                <DialogContent className="w-full sm:w-[95dvw] md:max-w-5xl p-0 overflow-hidden border-none shadow-[0_0_80px_-15px_rgba(0,0,0,0.6)] rounded-none sm:rounded-[2.5rem] md:rounded-[3rem] h-[95dvh] sm:h-[90vh] flex flex-col focus:outline-none">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Buat Pesanan Baru</DialogTitle>
                        <DialogDescription>Menu pembuatan pesanan manual oleh Superadmin.</DialogDescription>
                    </DialogHeader>

                    {/* Premium Header - Matches OrderDetailModal */}
                    <div className="relative overflow-hidden shrink-0 bg-emerald-500/[0.03] border-b border-sidebar-border/50">
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500 z-20" />
                        <div className="bg-gradient-to-br from-muted/60 via-background to-muted/20 p-8 md:p-10 relative">
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-600 shadow-lg px-3 py-1 rounded-full text-white flex items-center gap-1.5 font-black text-[9px] md:text-[10px] tracking-[0.2em] uppercase">
                                            <ShoppingCart className="w-3 h-3" /> NEW ORDER
                                        </div>
                                        <Badge variant="outline" className="rounded-full px-3 py-0.5 text-[10px] font-black border-2 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 uppercase tracking-wider">
                                            SUPERADMIN MODE
                                        </Badge>
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-[1000] italic tracking-tighter text-foreground/90 uppercase leading-none">
                                        Tambah <span className="text-emerald-600 italic">Pesanan</span>
                                    </h2>
                                    <div className="flex items-center gap-3 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                        <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-emerald-600/60" /> Manual Processing</div>
                                        <div className="w-1 h-1 rounded-full bg-emerald-600/20" />
                                        <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-emerald-600/60" /> {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    </div>
                                </div>

                                <div className="text-left md:text-right w-full md:w-auto pt-6 md:pt-0 border-t md:border-none border-emerald-500/10">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1.5 opacity-60">ESTIMASI TOTAL</p>
                                    <p className="text-4xl md:text-6xl font-[1000] tracking-tighter leading-tight text-emerald-600 transition-all duration-500">
                                        {formatCurrency(previewTotal)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0 bg-background">
                        {/* Information Panel (Left) */}
                        <div className="w-full md:w-[350px] lg:w-[400px] border-r border-sidebar-border/30 overflow-y-auto p-6 md:p-8 space-y-8 bg-muted/[0.02]">
                            <div className="space-y-6">
                                <h4 className="text-[11px] uppercase font-[1000] tracking-[0.3em] text-primary/40 flex items-center gap-3">
                                    Detail Transaksi <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                                </h4>

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 px-1">Cabang Tujuan</Label>
                                        <Select value={createOrderForm.data.buyer_id} onValueChange={(val) => createOrderForm.setData('buyer_id', val)}>
                                            <SelectTrigger className="h-14 rounded-2xl border-2 border-primary/5 bg-background shadow-sm font-bold focus:ring-emerald-500/20 focus:border-emerald-500/30">
                                                <SelectValue placeholder="Pilih Cabang..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-none shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] p-2">
                                                {buyers?.map((b: any) => (
                                                    <SelectItem key={b.id} value={b.id} className="rounded-xl p-3 focus:bg-emerald-50 transition-colors">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-sm text-foreground">{b.branch_name || b.username}</span>
                                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{b.username}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 px-1">Nama Pemesan</Label>
                                        <Input
                                            value={createOrderForm.data.nama_pemesan}
                                            onChange={e => createOrderForm.setData('nama_pemesan', e.target.value)}
                                            placeholder="Contoh: Bpk. Slamet / Admin Cabang"
                                            className="h-14 rounded-2xl border-2 border-primary/5 bg-background shadow-sm font-bold focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/30 px-6 italic"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 px-1">Jenis Pesanan</Label>
                                            <Select value={createOrderForm.data.jenis_pesanan} onValueChange={(val) => createOrderForm.setData('jenis_pesanan', val)}>
                                                <SelectTrigger className="h-14 rounded-2xl border-2 border-primary/5 bg-background shadow-sm font-bold">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                                    <SelectItem value="awal bulan">AKHIR BULAN</SelectItem>
                                                    <SelectItem value="pertengahan bulan">PERTENGAHAN</SelectItem>
                                                    <SelectItem value="Lembur">LEMBUR</SelectItem>
                                                    <SelectItem value="tambahan bulan ini">TAMBAHAN</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 px-1">Tanggal</Label>
                                            <Input
                                                type="date"
                                                value={createOrderForm.data.created_at}
                                                onChange={e => createOrderForm.setData('created_at', e.target.value)}
                                                className="h-14 rounded-2xl border-2 border-primary/5 bg-background shadow-sm font-bold px-4"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-[2rem] bg-emerald-500/5 border-2 border-emerald-500/10 space-y-3">
                                <div className="flex items-center gap-3 text-emerald-600">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Panduan Superadmin</p>
                                </div>
                                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                                    Pesanan yang dibuat secara manual akan langsung masuk ke database sebagai status <strong>PENDING</strong> dan perlu disetujui untuk proses invoice.
                                </p>
                            </div>
                        </div>

                        {/* Inventory & Cart Panel (Right) */}
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Search Header */}
                            <div className="p-6 md:p-8 border-b border-sidebar-border/30 bg-muted/[0.01]">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                                        <Search className="w-5 h-5 text-emerald-600 group-focus-within:animate-pulse" />
                                    </div>
                                    <Input
                                        placeholder="Cari SKU atau Nama Produk untuk ditambahkan..."
                                        className="h-14 md:h-16 pl-14 pr-8 rounded-full border-2 border-emerald-500/10 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/40 bg-emerald-500/[0.03] font-black italic text-sm tracking-tight placeholder:text-emerald-600/30"
                                        value={productSearchQuery}
                                        onChange={(e) => setProductSearchQuery(e.target.value)}
                                        disabled={!createOrderForm.data.buyer_id}
                                    />
                                    {!createOrderForm.data.buyer_id && (
                                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded-full flex items-center justify-center">
                                            <p className="text-[10px] font-[1000] uppercase tracking-[0.3em] text-primary/40 italic">Pilih cabang terlebih dahulu</p>
                                        </div>
                                    )}

                                    {/* Search Results Dropdown */}
                                    {filteredSearchProducts.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-4 bg-background/95 backdrop-blur-xl border-2 border-emerald-500/20 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] z-[100] overflow-hidden divide-y divide-emerald-500/5 ring-8 ring-emerald-500/[0.03] animate-in zoom-in-95 fade-in duration-200">
                                            {filteredSearchProducts.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className="w-full text-left p-6 md:p-7 hover:bg-emerald-500/10 flex items-center justify-between group/item transition-all cursor-pointer"
                                                    onClick={() => {
                                                        const existing = createOrderForm.data.items.find(i => i.product_id === p.id);

                                                        const buyer = buyers.find((b: any) => b.id === createOrderForm.data.buyer_id);
                                                        const tierId = buyer ? buyer.tier_id : null;
                                                        const price = getProductTierPrice(p, tierId);

                                                        if (existing) {
                                                            createOrderForm.setData('items', createOrderForm.data.items.map(i =>
                                                                i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i
                                                            ));
                                                        } else {
                                                            createOrderForm.setData('items', [
                                                                ...createOrderForm.data.items,
                                                                { product_id: p.id, quantity: 1, name: p.name, sku: p.sku, price: price }
                                                            ]);
                                                        }

                                                        setProductSearchQuery('');
                                                    }}
                                                >
                                                    <div className="flex items-center gap-5">
                                                        <div className="h-14 w-14 rounded-2xl bg-emerald-600 shadow-lg flex items-center justify-center text-white font-[1000] italic text-sm group-hover/item:scale-110 transition-transform">
                                                            <Package className="w-7 h-7" />
                                                        </div>
                                                        <div>
                                                            <p className="font-[1000] text-base md:text-lg text-foreground tracking-tighter line-clamp-1 uppercase italic leading-none mb-1.5">{p.name}</p>
                                                            <div className="flex items-center gap-3">
                                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-600">SKU: {p.sku}</Badge>
                                                                <p className="text-[10px] font-black text-muted-foreground italic uppercase">
                                                                    {formatCurrency(getProductTierPrice(p, buyers.find((b: any) => b.id === createOrderForm.data.buyer_id)?.tier_id))}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-emerald-500/10 p-2.5 rounded-full text-emerald-600 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all">
                                                        <Plus className="w-5 h-5" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Item List / Cart View */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 custom-scrollbar bg-emerald-500/[0.01]">
                                <h4 className="text-[11px] uppercase font-[1000] tracking-[0.3em] text-emerald-600/40 flex items-center gap-3">
                                    Item Pesanan <span className="bg-emerald-600/10 text-emerald-600 px-2 py-0.5 rounded-md text-[9px]">{createOrderForm.data.items.length} ITEM</span> <div className="h-px flex-1 bg-gradient-to-r from-emerald-600/20 to-transparent" />
                                </h4>

                                <div className="space-y-4">
                                    {createOrderForm.data.items.length === 0 ? (
                                        <div className="h-64 flex flex-col items-center justify-center space-y-5 opacity-20 text-center px-10">
                                            <div className="h-24 w-24 rounded-full bg-emerald-600/10 flex items-center justify-center">
                                                <ShoppingCart className="w-10 h-10 text-emerald-600" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-[1000] uppercase tracking-[0.4em] text-emerald-600">Keranjang Kosong</p>
                                                <p className="text-[10px] font-bold italic text-muted-foreground">Cari produk di atas untuk mulai menambahkan item pesanan.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        createOrderForm.data.items.map((item, idx) => (
                                            <div key={item.product_id} className="relative group p-6 rounded-[2.5rem] bg-background border-2 border-primary/5 hover:border-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden">
                                                {/* Background Accent */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />

                                                <div className="flex items-center gap-5 w-full sm:w-auto">
                                                    <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-600 flex items-center justify-center text-white shadow-xl flex-shrink-0 group-hover:rotate-6 transition-transform">
                                                        <Package className="w-8 h-8" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-[1000] text-base md:text-lg tracking-tighter text-foreground line-clamp-1 truncate uppercase italic leading-none mb-2">{item.name}</p>
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-emerald-500/20 text-emerald-600 shrink-0">SKU: {item.sku}</Badge>
                                                            <div className="flex items-center gap-2 bg-emerald-500/5 rounded-lg px-2 py-1 border border-emerald-500/10">
                                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic shrink-0">Harga/Unit:</span>
                                                                <div className="relative">
                                                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600 opacity-40">Rp</span>
                                                                    <Input 
                                                                        type="number"
                                                                        className="h-7 w-28 pl-6 pr-2 text-[11px] font-[1000] rounded-md border-emerald-500/20 focus:border-emerald-500/40 bg-white shadow-sm"
                                                                        value={item.price || 0}
                                                                        onChange={(e) => {
                                                                            const val = parseFloat(e.target.value) || 0;
                                                                            createOrderForm.setData('items', createOrderForm.data.items.map((it, i) =>
                                                                                i === idx ? { ...it, price: val } : it
                                                                            ));
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-none pt-4 sm:pt-0">
                                                    <div className="flex flex-col items-start sm:items-center">
                                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1.5 px-1 opacity-50">Kuantitas</p>
                                                        <div className="flex items-center gap-2 bg-muted/30 rounded-2xl p-1.5 border border-primary/5">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                onClick={() => createOrderForm.setData('items', createOrderForm.data.items.map((it, i) =>
                                                                    i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it
                                                                ))}
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </Button>
                                                            <Input
                                                                type="number"
                                                                className="w-12 h-9 text-center p-0 border-none bg-transparent font-black text-sm tabular-nums focus-visible:ring-0"
                                                                value={item.quantity}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 1;
                                                                    createOrderForm.setData('items', createOrderForm.data.items.map((it, i) =>
                                                                        i === idx ? { ...it, quantity: Math.max(1, val) } : it
                                                                    ));
                                                                }}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                onClick={() => createOrderForm.setData('items', createOrderForm.data.items.map((it, i) =>
                                                                    i === idx ? { ...it, quantity: it.quantity + 1 } : it
                                                                ))}
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="text-right min-w-[120px]">
                                                        <p className="text-[9px] font-black uppercase text-emerald-600 mb-1 px-1 opacity-60">Subtotal</p>
                                                        <p className="font-[1000] text-xl md:text-2xl text-emerald-600 tracking-tighter italic leading-none">{formatCurrency((item.price || 0) * item.quantity)}</p>
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-12 w-12 rounded-2xl text-destructive/30 hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all ml-2"
                                                        onClick={() => createOrderForm.setData('items', createOrderForm.data.items.filter((_, i) => i !== idx))}
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Premium Sticky Footer */}
                    <DialogFooter className="p-8 md:p-10 bg-background/95 backdrop-blur-3xl border-t-2 border-primary/5 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0 z-50">
                        <div className="hidden md:flex flex-col">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1 opacity-50">INFORMASI FINAL</p>
                            <p className="text-sm font-bold italic text-foreground tracking-tight">
                                {createOrderForm.data.items.length} Item Produk terpilih. Total Estimasi: <span className="text-emerald-600 font-[1000]">{formatCurrency(previewTotal)}</span>
                            </p>
                        </div>

                        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4 items-center">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsCreateModalOpen(false);
                                    createOrderForm.reset();
                                    setProductSearchQuery('');
                                }}
                                className="w-full sm:w-auto rounded-full px-10 h-14 md:h-16 font-black italic border-2 border-muted-foreground/20 hover:bg-muted text-xs uppercase tracking-widest transition-all"
                            >
                                BATALKAN
                            </Button>
                            <Button
                                onClick={() => {
                                    createOrderForm.post('/orders', {
                                        onSuccess: () => {
                                            setIsCreateModalOpen(false);
                                            createOrderForm.reset();
                                            setProductSearchQuery('');
                                        }
                                    });
                                }}
                                disabled={createOrderForm.processing || createOrderForm.data.items.length === 0 || !createOrderForm.data.buyer_id}
                                className="w-full sm:w-auto rounded-full px-10 md:px-16 bg-emerald-600 hover:bg-emerald-700 text-white font-[1000] italic h-14 md:h-16 shadow-[0_15px_40px_-5px_rgba(16,185,129,0.3)] text-sm md:text-lg uppercase tracking-widest transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-30 disabled:grayscale disabled:translate-y-0"
                            >
                                {createOrderForm.processing ? (
                                    <Loader2 className="w-7 h-7 animate-spin mr-3" />
                                ) : (
                                    <CheckCircle className="w-7 h-7 mr-3" />
                                )}
                                SIMPAN PESANAN
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

OrderIndex.layout = {
    breadcrumbs: [
        {
            title: 'Manajemen Pesanan',
            href: ordersIndex.url(),
        },
    ],
};
