import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { 
    CreditCard, 
    Calendar, 
    Search, 
    Filter, 
    CheckCircle, 
    Clock, 
    FileText, 
    ExternalLink,
    AlertCircle,
    ArrowRight,
    TrendingUp
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SettlementModal } from './components/settlement-modal';
import { index as settlementsIndex, verify as settlementsVerify } from '@/routes/settlements/index';
import { Pagination } from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SettlementPageProps {
    auth: {
        user: any;
    };
    debtSummary: any[];
    settlements: {
        data: any[];
        links: any[];
        meta: any;
    };
    tiers: any[];
    filters: {
        start_date: string;
        end_date: string;
        tier_id?: string;
    };
}

export default function SettlementIndex() {
    const { debtSummary, settlements, tiers, filters, auth } = usePage().props as unknown as SettlementPageProps;
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [tierId, setTierId] = useState(filters.tier_id || 'ALL');
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    const [selectedRange, setSelectedRange] = useState({ start: '', end: '' });

    // Auto-filter when tier changes
    useEffect(() => {
        if (tierId !== (filters.tier_id || 'ALL')) {
            handleFilter();
        }
    }, [tierId]);

    const handleFilter = () => {
        router.get(settlementsIndex.url({
            query: {
                start_date: startDate,
                end_date: endDate,
                tier_id: tierId !== 'ALL' ? tierId : undefined,
            }
        }), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const openSettlementModal = (row: any) => {
        setSelectedBranch(row.buyer);
        setSelectedRange({ start: row.month_start, end: row.month_end });
        setIsSettlementModalOpen(true);
    };

    const handleVerify = (id: string) => {
        if (confirm('Verifikasi pelunasan ini?')) {
            router.post(settlementsVerify.url({ settlement: id }));
        }
    };

    const isSuperAdmin = auth.user.role === 'SUPERADMIN';

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6">
            <Head title="Manajemen Hutang & Pelunasan" />

            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Debt & Settlements</h1>
                    <p className="text-muted-foreground">Monitor hutang cabang dan kelola pelunasan.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border shadow-sm">
                    {isSuperAdmin && (
                        <div className="grid gap-1.5">
                            <Label htmlFor="tier_id" className="text-xs">Tier</Label>
                            <Select value={tierId} onValueChange={setTierId}>
                                <SelectTrigger className="h-9 w-[140px]">
                                    <SelectValue placeholder="Pilih Tier" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Tier</SelectItem>
                                    {tiers.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="overflow-hidden border-none bg-gradient-to-br from-red-500/10 to-red-600/5 shadow-sm border border-red-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 uppercase flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Total Hutang Berjalan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">
                            Rp {debtSummary.reduce((acc, curr) => acc + Number(curr.orders_sum_total_amount || 0), 0).toLocaleString('id-ID')}
                        </div>
                        <p className="text-xs text-red-600/70 mt-1">Estimasi dari {debtSummary.length} cabang</p>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none bg-gradient-to-br from-blue-500/10 to-blue-600/5 shadow-sm border border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 uppercase flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Menunggu Verifikasi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">
                            {settlements.data.filter(s => s.status === 'paid').length} Pengajuan
                        </div>
                        <p className="text-xs text-blue-600/70 mt-1">Perlu pengecekan bukti bayar</p>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none bg-gradient-to-br from-green-500/10 to-green-600/5 shadow-sm border border-green-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 uppercase flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Total Terverifikasi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                            Rp {settlements.data.filter(s => s.status === 'verified').reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0).toLocaleString('id-ID')}
                        </div>
                        <p className="text-xs text-green-600/70 mt-1">Total pelunasan sah</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Unpaid Debt Summary */}
                <Card className="shadow-sm border-none bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            Ringkasan Hutang Cabang
                        </CardTitle>
                        <CardDescription>Daftar cabang dengan pesanan berstatus DEBT pada periode ini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border bg-background overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="text-left font-medium border-b">
                                        <th className="p-3">Cabang/Buyer</th>
                                        <th className="p-3">Bulan</th>
                                        <th className="p-3 text-right">Total Hutang</th>
                                        <th className="p-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {debtSummary.length > 0 ? debtSummary.map((row, idx) => (
                                        <tr key={`${row.buyer_id}-${idx}`} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-3">
                                                <div className="font-medium">{row.buyer.username}</div>
                                                <div className="text-xs text-muted-foreground">{row.buyer.branch_name || 'No Branch'}</div>
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="secondary" className="font-bold">
                                                    <Calendar className="mr-1 h-3 w-3" />
                                                    {row.month_name}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-right font-semibold text-red-600">
                                                Rp {Number(row.orders_sum_total_amount).toLocaleString('id-ID')}
                                                <div className="text-[10px] text-muted-foreground font-normal">{row.orders_count} pesanan</div>
                                            </td>
                                            <td className="p-3 text-right">
                                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openSettlementModal(row)}>
                                                    Bayar
                                                    <ArrowRight className="ml-1 h-3 w-3" />
                                                </Button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                Tidak ada data hutang ditemukan pada periode ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Settlement History */}
                <Card className="shadow-sm border-none bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            Riwayat Pelunasan
                        </CardTitle>
                        <CardDescription>Catatan pengajuan pelunasan yang dilakukan Admin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border bg-background overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="text-left font-medium border-b">
                                        <th className="p-3">Detail Pelunasan</th>
                                        <th className="p-3">Nominal</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {settlements.data.length > 0 ? settlements.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-3">
                                                <div className="font-medium">{item.buyer.username}</div>
                                                <div className="text-xs text-muted-foreground">{new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}</div>
                                                <div className="text-[10px] uppercase text-muted-foreground mt-1">Processed BY: {item.admin.username}</div>
                                            </td>
                                            <td className="p-3 font-semibold">
                                                Rp {parseFloat(item.total_amount).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-3">
                                                {item.status === 'verified' ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                                        <CheckCircle className="h-3 w-3" /> Verified
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
                                                        <Clock className="h-3 w-3" /> Pending
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <a 
                                                        href={item.proof_of_payment} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 hover:bg-muted rounded-md transition-colors"
                                                        title="Lihat Bukti Bayar"
                                                    >
                                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                    </a>
                                                    {isSuperAdmin && item.status === 'paid' && (
                                                        <Button size="icon" variant="outline" className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleVerify(item.id)}>
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                Belum ada riwayat pelunasan.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4">
                            <Pagination links={settlements.links} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <SettlementModal 
                isOpen={isSettlementModalOpen} 
                onClose={() => setIsSettlementModalOpen(false)} 
                branch={selectedBranch}
                startDate={selectedRange.start}
                endDate={selectedRange.end}
            />
        </div>
    );
}

SettlementIndex.layout = {
    breadcrumbs: [
        {
            title: 'Hutang & Pelunasan',
            href: '/settlements',
        },
    ],
};
