import { Head, usePage, router } from '@inertiajs/react';
import { Archive, History, Package, UserCircle, Calendar, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, SearchInput } from '@/components/ui/pagination';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { index as stockLogsIndex } from '@/routes/stock-logs/index';
import { index as productsIndex } from '@/routes/products/index';

interface StockLog {
    id: string;
    product: {
        id: string;
        name: string;
        sku: string;
        satuan_barang: string;
    };
    user: {
        id: string;
        username: string;
    };
    amount: number;
    type: 'add' | 'sub';
    reason: string;
    created_at: string;
    created_at_human: string;
}

export default function StockLogsIndex() {
    const { logs, todayStats, filters } = usePage().props as any;
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || 'ALL');
    const [dateFilter, setDateFilter] = useState(filters.date || '');

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== (filters.search || '') || typeFilter !== (filters.type || 'ALL') || dateFilter !== (filters.date || '')) {
                router.get(stockLogsIndex.url(), { 
                    search: searchQuery, 
                    type: typeFilter,
                    date: dateFilter
                }, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true
                });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, typeFilter, dateFilter]);

    return (
        <div className="flex flex-1 flex-col gap-8 p-6 md:p-8 lg:p-10 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Head title="Riwayat Stok" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent italic flex items-center gap-3">
                        <History className="h-10 w-10 text-primary" />
                        Riwayat Audit Stok
                    </h1>
                    <p className="text-muted-foreground text-lg font-medium">
                        Pantau seluruh aktivitas penambahan dan pengurangan stok barang.
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <ArrowUpCircle className="w-16 h-16 text-emerald-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-600/70">Baru Masuk Hari Ini</p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-700">+{todayStats.total_items_in} <span className="text-sm font-bold opacity-70">Items</span></div>
                    </CardContent>
                </Card>

                <Card className="bg-rose-500/5 border-rose-500/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <ArrowDownCircle className="w-16 h-16 text-rose-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <p className="text-xs font-black uppercase tracking-widest text-rose-600/70">Baru Keluar Hari Ini</p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-rose-700">-{todayStats.total_items_out} <span className="text-sm font-bold opacity-70">Items</span></div>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Archive className="w-16 h-16 text-primary" />
                    </div>
                    <CardHeader className="pb-2">
                        <p className="text-xs font-black uppercase tracking-widest text-primary/70">Total Transaksi Hari Ini</p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-primary">{todayStats.total_transactions} <span className="text-sm font-bold opacity-70">Log</span></div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Section */}
            <Card className="border-sidebar-border/50 shadow-2xl shadow-foreground/5 overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-sidebar-border/50 py-6 px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="md:col-span-2">
                            <SearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Cari nama produk atau SKU..."
                                className="w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="rounded-xl h-10 border-2 border-primary/20 font-bold text-xs">
                                    <SelectValue placeholder="Pilih Jenis" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                    <SelectItem value="ALL">Semua Jenis</SelectItem>
                                    <SelectItem value="add">Stok Masuk</SelectItem>
                                    <SelectItem value="sub">Stok Keluar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="date"
                                value={dateFilter}
                                onChange={e => setDateFilter(e.target.value)}
                                className="pl-10 rounded-xl h-10 border-2 border-primary/20 font-bold text-xs"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/20 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                                <tr>
                                    <th className="px-8 py-4">Waktu</th>
                                    <th className="px-6 py-4">Produk</th>
                                    <th className="px-6 py-4">Jumlah & Jenis</th>
                                    <th className="px-6 py-4">Oleh</th>
                                    <th className="px-8 py-4">Alasan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {logs.data.length > 0 ? (
                                    logs.data.map((log: StockLog) => (
                                        <tr key={log.id} className="hover:bg-muted/10 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="font-bold text-foreground truncate">{format(new Date(log.created_at), 'HH:mm dd MMM yyyy', { locale: localeId })}</div>
                                                <div className="text-[10px] text-muted-foreground italic">{log.created_at_human}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center font-bold text-muted-foreground shrink-0 overflow-hidden border border-border/50 group-hover:scale-110 transition-transform">
                                                        <Package className="w-5 h-5 opacity-50" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-foreground truncate max-w-[200px]">{log.product.name}</div>
                                                        <code className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono text-muted-foreground">{log.product.sku}</code>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className={`text-lg font-black ${log.type === 'add' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {log.type === 'add' ? '+' : ''}{log.amount}
                                                    <span className="ml-1 text-[10px] opacity-70 font-bold uppercase">{log.product.satuan_barang}</span>
                                                </div>
                                                <Badge className={`h-4 px-1.5 text-[8px] uppercase tracking-tighter ${
                                                    log.type === 'add' 
                                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                                    : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                }`}>
                                                    {log.type === 'add' ? 'Stok Masuk' : 'Stok Keluar'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                        <UserCircle className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-foreground">{log.user.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="text-xs font-medium text-muted-foreground leading-relaxed italic bg-muted/30 p-2 rounded-lg border border-sidebar-border/50">
                                                    "{log.reason}"
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <History className="h-12 w-12 text-muted-foreground/30 animate-pulse" />
                                                <p className="text-muted-foreground font-bold italic">Belum ada aktivitas stok yang tercatat.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination links={logs.meta.links} className="px-8 py-4 border-t bg-muted/5" />
                </CardContent>
            </Card>
        </div>
    );
}

StockLogsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Katalog Produk',
            href: productsIndex.url(),
        },
        {
            title: 'Riwayat Audit Stok',
            href: stockLogsIndex.url(),
        },
    ],
};
