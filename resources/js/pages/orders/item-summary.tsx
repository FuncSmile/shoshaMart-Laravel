import { Head, router, usePage } from '@inertiajs/react';
import {
    Boxes,
    Calculator,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Filter,
    Info,
    Package,
    Search,
    ShoppingCart,
    TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { itemSummary } from '@/routes/orders/index';

interface BranchBreakdown {
    buyer_id: string;
    branch: string;
    quantity: number;
    value: number;
    orders_count: number;
}

interface ProductSummary {
    product_id: string;
    name: string;
    sku: string | null;
    satuan_barang: string | null;
    total_quantity: number;
    total_value: number;
    orders_count: number;
    branches: BranchBreakdown[];
}

interface ItemSummaryPageProps {
    summary: ProductSummary[];
    stats: {
        products_count: number;
        total_quantity: number;
        total_value: number;
        orders_count: number;
    };
    tiers: { id: string; name: string }[];
    availableTypes: string[];
    filters: {
        start_date: string | null;
        end_date: string | null;
        jenis_pesanan: string;
        tier_id: string;
        print_status: string;
    };
}

export default function ItemSummary() {
    const { summary, stats, tiers, availableTypes, filters } = usePage().props as unknown as ItemSummaryPageProps;

    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [jenisPesanan, setJenisPesanan] = useState(filters.jenis_pesanan || 'ALL');
    const [tierId, setTierId] = useState(filters.tier_id || 'ALL');
    const [printStatus, setPrintStatus] = useState(filters.print_status || 'UNPRINTED');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const handleFilter = () => {
        router.get(itemSummary.url({
            query: {
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                jenis_pesanan: jenisPesanan !== 'ALL' ? jenisPesanan : undefined,
                tier_id: tierId !== 'ALL' ? tierId : undefined,
                print_status: printStatus !== 'UNPRINTED' ? printStatus : undefined,
            },
        }), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const toggleExpand = (productId: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);

            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }

            return next;
        });
    };

    const filteredSummary = useMemo(() => {
        if (!search.trim()) {
            return summary;
        }

        const term = search.toLowerCase();

        return summary.filter((row) =>
            row.name.toLowerCase().includes(term) || (row.sku ?? '').toLowerCase().includes(term),
        );
    }, [summary, search]);

    // Grand totals follow the visible (searched) rows so the footer never
    // contradicts what is displayed on screen.
    const visibleTotals = useMemo(() => ({
        quantity: filteredSummary.reduce((acc, row) => acc + row.total_quantity, 0),
        value: filteredSummary.reduce((acc, row) => acc + row.total_value, 0),
    }), [filteredSummary]);

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6">
            <Head title="Rekap Barang Pesanan" />

            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Calculator className="h-6 w-6 text-primary" />
                        Rekap Barang Pesanan
                    </h1>
                    <p className="text-muted-foreground">Total kuantitas per produk dari pesanan yang telah disetujui (default: belum dicetak).</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border shadow-sm">
                    <div className="grid gap-1.5">
                        <Label htmlFor="print_status" className="text-xs">Status Cetak</Label>
                        <Select value={printStatus} onValueChange={setPrintStatus}>
                            <SelectTrigger className="h-9 w-[150px]">
                                <SelectValue placeholder="Status Cetak" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="UNPRINTED">Belum Dicetak</SelectItem>
                                <SelectItem value="PRINTED">Sudah Dicetak</SelectItem>
                                <SelectItem value="ALL">Semua</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="jenis_pesanan" className="text-xs">Jenis Pesanan</Label>
                        <Select value={jenisPesanan} onValueChange={setJenisPesanan}>
                            <SelectTrigger className="h-9 w-[150px]">
                                <SelectValue placeholder="Jenis" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua Jenis</SelectItem>
                                {availableTypes.map((type) => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="tier_id" className="text-xs">Tier</Label>
                        <Select value={tierId} onValueChange={setTierId}>
                            <SelectTrigger className="h-9 w-[140px]">
                                <SelectValue placeholder="Pilih Tier" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua Tier</SelectItem>
                                {tiers.map((tier) => (
                                    <SelectItem key={tier.id} value={tier.id}>{tier.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="start_date" className="text-xs">Dari</Label>
                        <Input
                            id="start_date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-9 w-[140px]"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="end_date" className="text-xs">Sampai</Label>
                        <Input
                            id="end_date"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-9 w-[140px]"
                        />
                    </div>
                    <Button onClick={handleFilter} size="sm" className="mt-5 h-9">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                    </Button>
                </div>
            </div>

            {/* Info banner: make the counting rule explicit */}
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-4 text-sm text-blue-800 dark:text-blue-200">
                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                    <span className="font-semibold">Hanya pesanan yang sudah diterima admin yang dihitung</span>
                    {' '}— status <Badge variant="outline" className="mx-0.5 border-blue-300 text-blue-700 dark:text-blue-200">APPROVED</Badge>
                    <Badge variant="outline" className="mx-0.5 border-blue-300 text-blue-700 dark:text-blue-200">PAID</Badge>
                    <Badge variant="outline" className="mx-0.5 border-blue-300 text-blue-700 dark:text-blue-200">VERIFIED</Badge>.
                    Pesanan pending, ditolak, dibatalkan, atau dihapus tidak termasuk dalam total.
                    {printStatus === 'UNPRINTED' && (
                        <>
                            {' '}Saat ini hanya menampilkan pesanan yang <span className="font-semibold">belum dicetak</span>.
                        </>
                    )}
                    {printStatus === 'PRINTED' && (
                        <>
                            {' '}Saat ini hanya menampilkan pesanan yang <span className="font-semibold">sudah dicetak</span>.
                        </>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="overflow-hidden border-none bg-gradient-to-br from-violet-500/10 to-violet-600/5 shadow-sm border border-violet-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-violet-600 uppercase flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Jenis Produk
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-violet-700">{stats.products_count.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-violet-600/70 mt-1">Produk berbeda yang dipesan</p>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none bg-gradient-to-br from-blue-500/10 to-blue-600/5 shadow-sm border border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 uppercase flex items-center gap-2">
                            <Boxes className="h-4 w-4" />
                            Total Barang
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{stats.total_quantity.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-blue-600/70 mt-1">Akumulasi seluruh kuantitas</p>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none bg-gradient-to-br from-amber-500/10 to-amber-600/5 shadow-sm border border-amber-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600 uppercase flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Pesanan Dihitung
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700">{stats.orders_count.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-amber-600/70 mt-1">Pesanan diterima pada periode ini</p>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none bg-gradient-to-br from-green-500/10 to-green-600/5 shadow-sm border border-green-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 uppercase flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Total Nilai
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">Rp {stats.total_value.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-green-600/70 mt-1">Nilai seluruh barang diterima</p>
                    </CardContent>
                </Card>
            </div>

            {/* Product Summary Table */}
            <Card className="shadow-sm border-none bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Boxes className="h-5 w-5 text-primary" />
                            Total per Produk
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Klik baris produk untuk melihat rincian per cabang.</p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari produk / SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl border bg-background overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr className="text-left font-medium border-b">
                                    <th className="p-3 w-8"></th>
                                    <th className="p-3">Produk</th>
                                    <th className="p-3">Satuan</th>
                                    <th className="p-3 text-right">Pesanan</th>
                                    <th className="p-3 text-right">Total Kuantitas</th>
                                    <th className="p-3 text-right">Total Nilai</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredSummary.length > 0 ? filteredSummary.map((row) => (
                                    <>
                                        <tr
                                            key={row.product_id}
                                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                                            onClick={() => toggleExpand(row.product_id)}
                                        >
                                            <td className="p-3 text-muted-foreground">
                                                {expanded.has(row.product_id)
                                                    ? <ChevronDown className="h-4 w-4" />
                                                    : <ChevronRight className="h-4 w-4" />}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold uppercase tracking-tight">{row.name}</div>
                                                {row.sku && <div className="text-xs text-muted-foreground font-medium">{row.sku}</div>}
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="secondary" className="uppercase">{row.satuan_barang || '-'}</Badge>
                                            </td>
                                            <td className="p-3 text-right text-muted-foreground">{row.orders_count.toLocaleString('id-ID')}</td>
                                            <td className="p-3 text-right">
                                                <span className="text-lg font-black text-primary">{row.total_quantity.toLocaleString('id-ID')}</span>
                                                {row.satuan_barang && <span className="text-xs text-muted-foreground ml-1 uppercase">{row.satuan_barang}</span>}
                                            </td>
                                            <td className="p-3 text-right font-semibold">Rp {row.total_value.toLocaleString('id-ID')}</td>
                                        </tr>

                                        {expanded.has(row.product_id) && row.branches.map((branch) => (
                                            <tr key={`${row.product_id}-${branch.buyer_id}`} className="bg-muted/20 text-xs">
                                                <td className="p-2"></td>
                                                <td className="p-2 pl-8" colSpan={2}>
                                                    <span className="font-semibold uppercase text-muted-foreground">↳ {branch.branch}</span>
                                                </td>
                                                <td className="p-2 text-right text-muted-foreground">{branch.orders_count.toLocaleString('id-ID')}</td>
                                                <td className="p-2 text-right font-bold">{branch.quantity.toLocaleString('id-ID')}</td>
                                                <td className="p-2 text-right text-muted-foreground">Rp {branch.value.toLocaleString('id-ID')}</td>
                                            </tr>
                                        ))}
                                    </>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-muted-foreground">
                                            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                            {search ? 'Tidak ada produk yang cocok dengan pencarian.' : 'Belum ada barang dari pesanan yang diterima pada periode ini.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredSummary.length > 0 && (
                                <tfoot className="bg-muted/50 border-t-2">
                                    <tr className="font-bold">
                                        <td className="p-3" colSpan={4}>
                                            GRAND TOTAL{search ? ' (hasil pencarian)' : ''}
                                            <span className="font-normal text-xs text-muted-foreground ml-2">{filteredSummary.length} produk</span>
                                        </td>
                                        <td className="p-3 text-right text-lg font-black text-primary">{visibleTotals.quantity.toLocaleString('id-ID')}</td>
                                        <td className="p-3 text-right">Rp {visibleTotals.value.toLocaleString('id-ID')}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

ItemSummary.layout = {
    breadcrumbs: [
        {
            title: 'Rekap Barang',
            href: '/orders-summary',
        },
    ],
};
