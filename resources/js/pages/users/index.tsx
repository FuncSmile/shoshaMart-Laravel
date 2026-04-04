import { Head, usePage, useForm, router } from '@inertiajs/react';
import { Users, UserPlus, Pencil, Trash, Shield, ShoppingBag, Store, Filter, Loader2, Box } from 'lucide-react';
import { useState } from 'react';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, SearchInput } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { index as usersIndex, store as usersStore, update as usersUpdate, destroy as usersDestroy } from '@/routes/users/index';

interface User {
    id: string;
    username: string;
    role: string;
    phone: string | null;
    branch_name: string | null;
    tier_id: string | null;
    tier?: {
        name: string;
    };
}

interface Tier {
    id: string;
    name: string;
}

export default function UserIndex() {
    const { users, tiers, filters } = usePage().props as any;
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'ALL');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        username: '',
        password: '',
        role: 'BUYER',
        phone: '',
        branch_name: '',
        tier_id: '',
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== (filters.search || '') || roleFilter !== (filters.role || 'ALL')) {
                router.get(usersIndex.url(), { search: searchQuery, role: roleFilter }, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true
                });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, roleFilter, filters.role, filters.search]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingUser) {
            put(usersUpdate.url(editingUser.id), {
                onSuccess: () => {
                    setEditingUser(null);
                    reset();
                },
            });
        } else {
            post(usersStore.url(), {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    reset();
                },
            });
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setData({
            username: user.username,
            password: '',
            role: user.role,
            phone: user.phone ?? '',
            branch_name: user.branch_name ?? '',
            tier_id: user.tier_id ?? '',
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
            router.delete(usersDestroy.url(id));
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'SUPERADMIN': return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20"><Shield className="w-3 h-3 mr-1" /> Superadmin</Badge>;
            case 'ADMIN_TIER': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Store className="w-3 h-3 mr-1" /> Admin Tier</Badge>;
            case 'BUYER': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><ShoppingBag className="w-3 h-3 mr-1" /> Buyer</Badge>;
            case 'WAREHOUSE': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Box className="w-3 h-3 mr-1" /> Warehouse</Badge>;
            default: return <Badge variant="outline">{role}</Badge>;
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-8 p-6 md:p-8 lg:p-10 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Head title="Manajemen Pengguna" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent italic flex items-center gap-3">
                        <Users className="h-10 w-10 text-primary" />
                        Manajemen Pengguna
                    </h1>
                    <p className="text-muted-foreground text-lg font-medium">
                        Kelola akun tim operasional dan pembeli Shosha Mart.
                    </p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={(val) => {
                    setIsCreateOpen(val);

                    if (!val) {
                        setEditingUser(null); reset();
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button className="h-12 px-8 rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform font-bold gap-2">
                            <UserPlus className="h-5 w-5" /> Tambah Pengguna
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] rounded-3xl p-8">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black italic">{editingUser ? 'Edit Pengguna' : 'Buat Pengguna Baru'}</DialogTitle>
                            <DialogDescription>
                                Isi informasi di bawah ini untuk {editingUser ? 'memperbarui data' : 'mendaftarkan'} akun pengguna.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="font-bold text-xs uppercase tracking-widest">Username</Label>
                                    <Input
                                        id="username"
                                        value={data.username}
                                        onChange={e => setData('username', e.target.value)}
                                        className="rounded-xl h-12 bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-primary"
                                        placeholder="Contoh: admintier_pusat"
                                    />
                                    {errors.username && <p className="text-destructive text-xs italic font-medium">{errors.username}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password font-bold text-xs uppercase tracking-widest">
                                        Password {editingUser && '(Kosongkan jika tidak diubah)'}
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        className="rounded-xl h-12 bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-primary"
                                        placeholder="********"
                                    />
                                    {errors.password && <p className="text-destructive text-xs italic font-medium">{errors.password}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="role" className="font-bold text-xs uppercase tracking-widest">Role</Label>
                                        <Select value={data.role} onValueChange={val => setData('role', val)}>
                                            <SelectTrigger className="rounded-xl h-12 bg-muted/50 border-none font-medium">
                                                <SelectValue placeholder="Pilih Role" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                                <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
                                                <SelectItem value="ADMIN_TIER">Admin Tier</SelectItem>
                                                <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                                                <SelectItem value="BUYER">Buyer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {(data.role === 'BUYER' || data.role === 'ADMIN_TIER') && (
                                        <div className="space-y-2">
                                            <Label htmlFor="tier" className="font-bold text-xs uppercase tracking-widest">Tier Harga</Label>
                                            <Select value={data.tier_id} onValueChange={val => setData('tier_id', val)}>
                                                <SelectTrigger className="rounded-xl h-12 bg-muted/50 border-none font-medium">
                                                    <SelectValue placeholder="Pilih Tier" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                                    {tiers.map((tier: Tier) => (
                                                        <SelectItem key={tier.id} value={tier.id}>{tier.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch" className="font-bold text-xs uppercase tracking-widest">Nama Cabang / Toko</Label>
                                    <Input
                                        id="branch"
                                        value={data.branch_name}
                                        onChange={e => setData('branch_name', e.target.value)}
                                        className="rounded-xl h-12 bg-muted/50 border-none"
                                        placeholder="Contoh: Shosha Mart Blok M"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full h-12 rounded-full font-black text-lg shadow-xl shadow-primary/20"
                                >
                                    {processing ? <Loader2 className="animate-spin mr-2" /> : (editingUser ? 'Simpan Perubahan' : 'Buat Akun Sekarang')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters and List Section */}
            <Card className="border-sidebar-border/50 shadow-2xl shadow-foreground/5 overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-sidebar-border/50 py-6 px-8">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Cari username atau cabang..."
                            className="md:w-96"
                        />
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-10 px-4 rounded-full border-2 border-primary/20 bg-primary/5 flex items-center gap-2">
                                <Filter className="h-4 w-4 text-primary" />
                                <span className="text-primary font-bold">Filter Role:</span>
                            </Badge>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-40 rounded-full h-10 border-2 border-primary/20 font-bold text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                    <SelectItem value="ALL">Semua Pengguna</SelectItem>
                                    <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
                                    <SelectItem value="ADMIN_TIER">Admin Tier</SelectItem>
                                    <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                                    <SelectItem value="BUYER">Buyer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/20 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                                <tr>
                                    <th className="px-8 py-4">Username & Cabang</th>
                                    <th className="px-6 py-4">Role & Tier</th>
                                    <th className="px-6 py-4">Kontak</th>
                                    <th className="px-8 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {users.data.map((user: User) => (
                                    <tr key={user.id} className="hover:bg-muted/10 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                                                    {user.username[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground text-base">{user.username}</div>
                                                    <div className="text-xs text-muted-foreground font-medium italic">{user.branch_name || 'Tidak ada cabang'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 space-y-1">
                                            <div>{getRoleBadge(user.role)}</div>
                                            {user.tier && (
                                                <div className="text-[10px] font-black tracking-widest uppercase text-primary/70 px-2 py-0.5 bg-primary/5 rounded inline-block">
                                                    Tingkat: {user.tier.name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-xs font-mono text-muted-foreground">{user.phone || '-'}</div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        handleEdit(user); setIsCreateOpen(true);
                                                    }}
                                                    className="rounded-full hover:bg-blue-500/10 hover:text-blue-600"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(user.id)}
                                                    className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination links={users.meta.links} className="px-8 py-4 border-t bg-muted/5" />
                </CardContent>
            </Card>
        </div>
    );
}

UserIndex.layout = {
    breadcrumbs: [
        {
            title: 'Manajemen Pengguna',
            href: usersIndex.url(),
        },
    ],
};
