import type {
    DragEndEvent} from '@dnd-kit/core';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, usePage, useForm, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ArrowUpDown, Box, Check, ChevronDown, Download, Filter, Grid, LayoutGrid, List, Loader2, MoreVertical, Package, Plus, Search, Table, Trash, Upload, X, Archive, Clock, History as HistoryIcon, ArrowUpCircle, ArrowDownCircle, UserCircle, BookOpen, FolderGit2, ShoppingBag, Users, ShoppingCart, Pencil, Trash2, GripVertical, Info, FileSpreadsheet } from 'lucide-react';
import { useState, useEffect } from 'react';
import OrderController from '@/actions/App/Http/Controllers/OrderController';
import ProductController from '@/actions/App/Http/Controllers/ProductController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, SearchInput } from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetDescription,
} from "@/components/ui/sheet";
import { cn } from '@/lib/utils';
import { index as productsIndex } from '@/routes/products/index';
import { stockHistory as getStockHistory } from '@/routes/api/products/index';

interface Tier {
    id: string;
    name: string;
}

interface TierPrice {
    id: string;
    tier_id: string;
    price: number;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    stock: number;
    base_price?: number;
    display_price: number;
    image_url: string | null;
    satuan_barang: string;
    tier_prices?: TierPrice[];
}

interface PaginatedProducts {
    data: Product[];
    links: any[];
    meta: any;
}

interface UserAuth {
    user: {
        id: string;
        role: string;
    };
}

// Draggable Product Item for Reordering
function SortableProductItem({ product }: { product: Product }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: product.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-4 p-4 bg-background border-2 rounded-2xl transition-all group",
                isDragging ? "shadow-2xl border-primary ring-4 ring-primary/10 opacity-90 scale-[1.02]" : "border-muted/30 hover:border-primary/20"
            )}
        >
            <div 
                {...attributes} 
                {...listeners} 
                className="cursor-move p-2 -ml-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground group-hover:text-primary"
            >
                <GripVertical className="h-5 w-5" />
            </div>

            {product.image_url ? (
                <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-muted">
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                </div>
            ) : (
                <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 border border-muted">
                    <Package className="h-6 w-6 text-muted-foreground/30" />
                </div>
            )}

            <div className="flex-1 min-w-0">
                <p className="font-black text-sm uppercase tracking-tight truncate leading-tight">{product.name}</p>
                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">{product.sku}</p>
            </div>

            <div className="text-right">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary">
                    {product.satuan_barang}
                </Badge>
            </div>
        </div>
    );
}

export default function ProductsIndex() {
    const { products, auth_role, filters, buyers, tiers } = usePage().props as any;
    const isSuperAdmin = auth_role === 'SUPERADMIN';
    const isWarehouse = auth_role === 'WAREHOUSE';
    const isBuyer = auth_role === 'BUYER';
    const canManageProducts = isSuperAdmin || isWarehouse;

    const [search, setSearch] = useState(filters.search || '');
    const [cartRegistry, setCartRegistry] = useState<Record<string, Product>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('shosha_cart_registry');

            return saved ? JSON.parse(saved) : {};
        }

        return {};
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search || '')) {
                router.get(productsIndex.url(), { search }, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true
                });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [search, filters.search]);

    // --- Buyer Cart Logic ---
    const cart = useForm<{
        items: { product_id: string; quantity: number; price?: number }[];
        nama_pemesan: string;
        jenis_pesanan: string;
        created_at: string;
        buyer_id?: string;
    }>({
        items: (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('shosha_cart_items') || '[]') : []),
        nama_pemesan: '',
        jenis_pesanan: 'awal bulan',
        created_at: new Date().toISOString().split('T')[0],
        buyer_id: '',
    });

    // --- Persistence Logic ---
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('shosha_cart_items', JSON.stringify(cart.data.items));
            localStorage.setItem('shosha_cart_registry', JSON.stringify(cartRegistry));
        }
    }, [cart.data.items, cartRegistry]);

    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

    const handleQuantityChange = (product_id: string, quantity: number) => {
        const existingItem = cart.data.items.find(item => item.product_id === product_id);

        if (quantity <= 0) {
            cart.setData('items', cart.data.items.filter(item => item.product_id !== product_id));

            return;
        }

        // --- Persistent Registry Logic ---
        // Save product details to the registry so we can remember its price/name even if searched away
        if (!cartRegistry[product_id]) {
            const productInfo = products.data.find(p => p.id === product_id);

            if (productInfo) {
                setCartRegistry(prev => ({ ...prev, [product_id]: productInfo }));
            }
        }

        if (existingItem) {
            cart.setData('items', cart.data.items.map(item =>
                item.product_id === product_id ? { ...item, quantity } : item
            ));
        } else {
            const prod = products.data.find(p => p.id === product_id);
            cart.setData('items', [...cart.data.items, { 
                product_id, 
                quantity, 
                price: prod?.display_price 
            }]);
        }
    };

    const handlePriceChange = (product_id: string, price: number) => {
        cart.setData('items', cart.data.items.map(item =>
            item.product_id === product_id ? { ...item, price: Math.max(0, price) } : item
        ));
    };

    const getQuantity = (product_id: string) => {
        return cart.data.items.find(item => item.product_id === product_id)?.quantity || 0;
    };

    const totalCartItems = cart.data.items.reduce((acc, item) => acc + item.quantity, 0);
    const totalCartPrice = cart.data.items.reduce((acc, item) => {
        const prod = cartRegistry[item.product_id] || products.data.find(p => p.id === item.product_id);
        const price = item.price ?? prod?.display_price ?? 0;

        return acc + (price * item.quantity);
    }, 0);

    const submitOrder = (e: React.FormEvent) => {
        e.preventDefault();
        cart.post(OrderController.store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                cart.setData('items', []);
                setCartRegistry({});
                setIsCheckoutModalOpen(false);

                if (typeof window !== 'undefined') {
                    localStorage.removeItem('shosha_cart_items');
                    localStorage.removeItem('shosha_cart_registry');
                }
            }
        });
    };

    // --- Superadmin CRUD Logic ---
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isPriceConfirmModalOpen, setIsPriceConfirmModalOpen] = useState(false);
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
    const [reorderItems, setReorderItems] = useState<Product[]>([]);
    const [isSavingReorder, setIsSavingReorder] = useState(false);

    // --- Stock Management Logic ---
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockProduct, setStockProduct] = useState<Product | null>(null);
    const [activeStockTab, setActiveStockTab] = useState<'edit' | 'history'>('edit');
    const [productHistory, setProductHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const stockForm = useForm({
        amount: 1,
        type: 'add' as 'add' | 'sub',
        reason: 'Baru',
    });

    const openStockModal = (product: Product) => {
        setStockProduct(product);
        setActiveStockTab('edit');
        setIsStockModalOpen(true);
    };

    const handleStockSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockProduct) return;

        stockForm.post(ProductController.updateStock.url(stockProduct.id), {
            onSuccess: () => {
                setIsStockModalOpen(false);
                stockForm.reset();
            },
            preserveScroll: true,
        });
    };

    // --- Reordering Logic ---
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setReorderItems((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const startReordering = async () => {
        setIsReorderModalOpen(true);

        // Fetch all products for reordering (from API endpoint that returns all)
        try {
            const response = await fetch('/api/products');
            const data = await response.json();
            setReorderItems(data);
        } catch (error) {
            console.error("Failed to fetch products for reordering:", error);
        }
    };

    const fetchHistory = async () => {
        if (!stockProduct) return;
        setIsLoadingHistory(true);
        try {
            const response = await fetch(getStockHistory.url({ product: stockProduct.id }));
            const data = await response.json();
            setProductHistory(data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const saveReorder = () => {
        setIsSavingReorder(true);
        router.post('/products/reorder', {
            ids: reorderItems.map(i => i.id)
        }, {
            onSuccess: () => {
                setIsReorderModalOpen(false);
                setIsSavingReorder(false);
            },
            onError: () => {
                setIsSavingReorder(false);
                alert("Gagal menyimpan urutan.");
            }
        });
    };

    const importForm = useForm({
        file: null as File | null,
    });

    const productForm = useForm({
        name: '',
        sku: '',
        image_url: '',
        satuan_barang: '',
        base_price: 0,
        stock: 0,
        tier_prices: tiers.map(t => ({ tier_id: t.id, price: 0 }))
    });

    const openCreateModal = () => {
        setEditingProduct(null);
        productForm.reset();
        productForm.setData({
            name: '',
            sku: '',
            image_url: '',
            satuan_barang: '',
            base_price: 0,
            stock: 0,
            tier_prices: tiers.map(t => ({ tier_id: t.id, price: 0 }))
        });
        setIsManageModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        productForm.clearErrors();
        productForm.setData({
            name: product.name,
            sku: product.sku,
            image_url: product.image_url || '',
            satuan_barang: product.satuan_barang || '',
            base_price: product.base_price || 0,
            stock: product.stock,
            tier_prices: tiers.map(t => {
                const existingPrice = product.tier_prices?.find(tp => tp.tier_id === t.id);

                return { tier_id: t.id, price: existingPrice ? existingPrice.price : 0 };
            })
        });
        setIsManageModalOpen(true);
    };

    const hasPriceChanged = () => {
        if (!editingProduct) {
return false;
}

        if (parseFloat(productForm.data.base_price.toString()) !== parseFloat((editingProduct.base_price || 0).toString())) {
return true;
}

        return productForm.data.tier_prices.some(tp => {
            const original = editingProduct.tier_prices?.find(otp => otp.tier_id === tp.tier_id);

            return parseFloat((original ? original.price : 0).toString()) !== parseFloat(tp.price.toString());
        });
    };

    const handleProductSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingProduct && hasPriceChanged()) {
            setIsPriceConfirmModalOpen(true);
        } else {
            submitProduct(false);
        }
    };

    const submitProduct = (updatePastOrders: boolean) => {
        if (editingProduct) {
            // Transform directly before submission to include the flag
            router.put(ProductController.update.url(editingProduct.id), {
                ...productForm.data,
                update_past_orders: updatePastOrders
            }, {
                onSuccess: () => {
                    setIsManageModalOpen(false);
                    setIsPriceConfirmModalOpen(false);
                },
                preserveScroll: true,
            });
        } else {
            productForm.post(ProductController.store.url(), {
                onSuccess: () => setIsManageModalOpen(false),
            });
        }
    };

    const handleDeleteProduct = (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
            router.delete(ProductController.destroy.url(id));
        }
    };

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        importForm.post(ProductController.import.url(), {
            onSuccess: () => {
                setIsImportModalOpen(false);
                importForm.reset();
            },
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto animate-in fade-in duration-500">
            <Head title="Katalog Produk" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-4xl font-extrabold tracking-tight">Katalog Produk</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Info className="h-4 w-4" />
                    </p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Cari nama atau SKU..."
                        className="md:w-80"
                    />
                    {canManageProducts && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={startReordering}
                                className="rounded-full h-12 px-6 shadow-sm gap-2 border-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50"
                            >
                                <GripVertical className="h-4 w-4" /> Merapikan Katalog
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsImportModalOpen(true)}
                                className="rounded-full h-12 px-6 shadow-sm gap-2 border-2"
                            >
                                <Upload className="h-4 w-4" /> Import
                            </Button>
                            <Button onClick={openCreateModal} className="rounded-full h-12 px-6 shadow-lg gap-2">
                                <Plus className="h-5 w-5" /> Tambah Produk
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.data.map((product) => (
                    <Card key={product.id} className="group flex flex-col relative overflow-hidden transition-all hover:shadow-xl border-sidebar-border/70 dark:border-sidebar-border">
                        {canManageProducts && (
                            <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-md bg-amber-500 hover:bg-amber-600 text-white border-none" onClick={() => openStockModal(product)} title="Kelola Stock">
                                    <Archive className="h-4 w-4" />
                                </Button>
                                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-md" onClick={() => openEditModal(product)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full shadow-md" onClick={() => handleDeleteProduct(product.id)}>
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <CardHeader className="p-0 border-b border-border/10 overflow-hidden relative">
                            {product.image_url ? (
                                <div className="aspect-[4/3] w-full overflow-hidden bg-muted/5">
                                    <img
                                        src={product.image_url}
                                        alt={product.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                </div>
                            ) : (
                                <div className="aspect-[4/3] w-full bg-muted/10 flex items-center justify-center">
                                    <Package className="h-12 w-12 text-muted-foreground/20" />
                                </div>
                            )}
                            <div className="p-5 pr-16 bg-gradient-to-t from-background/80 to-transparent pt-10 mt-[-40px] relative z-10">
                                <CardTitle className="text-lg line-clamp-2 leading-tight font-black italic tracking-tight uppercase">
                                    {product.name}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="text-[10px] text-muted-foreground font-black opacity-70 uppercase tracking-widest leading-none">
                                        {product.sku}
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-border" />
                                    <div className="text-[10px] text-primary font-black uppercase tracking-widest leading-none">
                                        {product.satuan_barang}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-4 pt-4">
                            <div className="flex justify-between items-baseline">
                                <div className="flex flex-col">
                                    <div className="text-2xl font-black text-primary tracking-tighter">
                                        {formatCurrency(product.display_price)}
                                    </div>
                                    <div className="text-[10px] font-black text-muted-foreground/50 italic uppercase tracking-tighter -mt-1 ml-1">
                                        / {product.satuan_barang}
                                    </div>
                                </div>
                                <Badge variant={product.stock > 0 ? "outline" : "destructive"} className="text-[10px] uppercase font-bold tracking-widest">
                                    {product.stock > 0 ? `STOK: ${product.stock}` : 'HABIS'}
                                </Badge>
                            </div>

                            {canManageProducts && product.base_price !== undefined && (
                                <div className="rounded-lg bg-primary/5 p-3 space-y-2 border border-primary/10">
                                    <div className="flex justify-between text-xs items-center">
                                        <span className="text-muted-foreground">Harga Modal:</span>
                                        <span className="font-bold">{formatCurrency(product.base_price)}</span>
                                    </div>
                                    <div className="h-px bg-primary/10" />
                                    <div className="space-y-1">
                                        {tiers.map(t => {
                                            const tp = product.tier_prices?.find(p => p.tier_id === t.id);

                                            return (
                                                <div key={t.id} className="flex justify-between text-[10px] items-center">
                                                    <span className="text-muted-foreground uppercase tracking-wider font-semibold">{t.name}:</span>
                                                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                                        {tp ? formatCurrency(tp.price) : 'Default'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>

                        {(isBuyer || isSuperAdmin) && (
                            <CardFooter className="pt-3 pb-4 bg-muted/20 border-t items-center justify-between">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Jumlah</div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-full border-2"
                                        onClick={() => handleQuantityChange(product.id, getQuantity(product.id) - 1)}
                                        disabled={getQuantity(product.id) <= 0}
                                    >
                                        -
                                    </Button>
                                    <Input
                                        type="number"
                                        className="h-8 w-12 text-center font-bold px-1 border-none focus-visible:ring-0 bg-transparent"
                                        value={getQuantity(product.id).toString()}
                                        onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-full border-2"
                                        onClick={() => handleQuantityChange(product.id, getQuantity(product.id) + 1)}
                                        disabled={getQuantity(product.id) >= product.stock}
                                    >
                                        +
                                    </Button>
                                </div>
                            </CardFooter>
                        )}
                    </Card>
                ))}
            </div>

            <Pagination links={products.meta.links} className="pb-24" />

            {/* Floating Cart Button */}
            {(isBuyer || isSuperAdmin) && totalCartItems > 0 && !isCartSheetOpen && (
                <div className="fixed bottom-6 left-6 md:left-auto md:right-6 z-40 flex items-center justify-center animate-in zoom-in-50 duration-300">
                    <Button
                        size="icon"
                        onClick={() => setIsCartSheetOpen(prev => !prev)}
                        className="h-16 w-16 rounded-full shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 relative group border-4 border-background"
                    >
                        <ShoppingCart className="h-7 w-7 text-primary-foreground group-hover:scale-110 transition-transform" />
                        <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-red-500 flex items-center justify-center text-[11px] font-black text-white border-2 border-background animate-in fade-in zoom-in-50">
                            {totalCartItems}
                        </div>
                    </Button>
                </div>
            )}

            {/* Cart Sheet Side Panel */}
            <Sheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
                <SheetContent side="right" className="w-[95vw] sm:max-w-md p-0 border-none shadow-2xl flex flex-col bg-background">
                    <SheetHeader className="p-6 md:p-8 border-b bg-muted/10">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <SheetTitle className="text-xl font-black italic uppercase tracking-tight">Keranjang Belanja</SheetTitle>
                                <SheetDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Manage item pilihan Anda di sini.</SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                        {cart.data.items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-40">
                                <Package className="h-16 w-16 text-muted-foreground" />
                                <p className="font-black italic uppercase text-xs tracking-widest">Keranjang masih kosong</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {cart.data.items.map((item) => {
                                    const prod = cartRegistry[item.product_id] || products.data.find(p => p.id === item.product_id);

                                    if (!prod) {
return null;
}

                                    return (
                                        <Card key={item.product_id} className="border-2 border-muted/30 shadow-none hover:border-primary/20 transition-all group">
                                            <CardContent className="p-4 flex gap-4 items-center">
                                                {prod.image_url ? (
                                                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                                                        <img src={prod.image_url} alt={prod.name} className="h-full w-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="h-16 w-16 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                                                        <Package className="h-8 w-8 text-muted-foreground/30" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className="font-black text-sm uppercase tracking-tight break-words leading-tight">{prod.name}</p>
                                                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">{prod.sku}</p>
                                                    <p className="font-black text-primary mt-1">{formatCurrency(prod.display_price)}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {isSuperAdmin && (
                                                        <div className="flex flex-col items-end gap-1 mb-1">
                                                            <div className="text-[8px] font-black uppercase tracking-widest text-primary">Harga Custom</div>
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1.5 text-[8px] font-black text-muted-foreground/50">Rp</span>
                                                                <Input 
                                                                    type="number"
                                                                    className="h-7 w-24 pl-6 text-[10px] font-black rounded-lg border-primary/20 focus:border-primary"
                                                                    value={item.price ?? 0}
                                                                    onChange={(e) => handlePriceChange(item.product_id, parseFloat(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1 bg-muted/30 rounded-full p-1 h-8">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 rounded-full"
                                                            onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                                                        >
                                                            -
                                                        </Button>
                                                        <span className="w-6 text-center font-black text-xs">{item.quantity}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 rounded-full"
                                                            onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                                                            disabled={item.quantity >= prod.stock}
                                                        >
                                                            +
                                                        </Button>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                                        onClick={() => handleQuantityChange(item.product_id, 0)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {cart.data.items.length > 0 && (
                        <SheetFooter className="p-6 md:p-8 bg-muted/5 border-t flex flex-col gap-4 mt-0 sm:flex-col">
                            <div className="w-full space-y-2">
                                <div className="flex justify-between items-center text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                                    <span>Estimasi Subtotal</span>
                                    <span>{totalCartItems} Items</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold uppercase tracking-tight">Total Akhir:</span>
                                    <span className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(totalCartPrice)}</span>
                                </div>
                            </div>
                            <Button
                                className="w-full h-14 rounded-full font-black italic shadow-lg shadow-primary/20 text-lg uppercase tracking-tight group"
                                onClick={() => {
                                    setIsCartSheetOpen(false);
                                    setIsCheckoutModalOpen(true);
                                }}
                            >
                                Lanjut Pembayaran
                                <Plus className="h-5 w-5 ml-2 group-hover:rotate-90 transition-transform" />
                            </Button>
                        </SheetFooter>
                    )}
                </SheetContent>
            </Sheet>

            {/* Buyer Checkout Modal */}
            <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-md rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-6 md:p-8 pb-0 shrink-0">
                        <DialogTitle className="text-2xl font-black italic tracking-tight uppercase flex items-center gap-2">
                            <ShoppingCart className="h-6 w-6 text-primary" />
                            Konfirmasi Pesanan
                        </DialogTitle>
                        <DialogDescription className="font-bold text-muted-foreground text-xs uppercase tracking-widest">
                            Lengkapi detail pemesanan di bawah ini.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitOrder} className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-muted/20 border-2 border-dashed border-muted/50 space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Package className="h-3 w-3" /> Ringkasan Pesanan ({totalCartItems} Item)
                                    </Label>
                                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/20">
                                        {cart.data.items.map((item) => {
                                            const prod = cartRegistry[item.product_id] || products.data.find(p => p.id === item.product_id);

                                            if (!prod) {
return null;
}

                                            return (
                                                <div key={item.product_id} className="flex justify-between items-center text-[11px] bg-background/50 p-2 rounded-lg border group">
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <p className="font-black truncate uppercase tracking-tight text-foreground/80">{prod.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[9px] text-muted-foreground font-bold">{item.quantity} {prod.satuan_barang} x </p>
                                                            {isSuperAdmin ? (
                                                                <div className="relative">
                                                                    <span className="absolute left-1.5 top-0.5 text-[7px] font-black text-muted-foreground/40">Rp</span>
                                                                    <Input 
                                                                        type="number"
                                                                        className="h-5 w-20 pl-5 pr-1 text-[9px] font-black rounded-md border-primary/20 focus:border-primary p-0 bg-transparent"
                                                                        value={item.price ?? 0}
                                                                        onChange={(e) => handlePriceChange(item.product_id, parseFloat(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <span className="text-[9px] text-muted-foreground font-bold">{formatCurrency(prod.display_price)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="font-black text-primary">
                                                        {formatCurrency((item.price ?? prod.display_price) * item.quantity)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {isSuperAdmin && (
                                    <div className="space-y-2 p-4 rounded-2xl bg-amber-500/5 border-2 border-amber-500/10">
                                        <Label htmlFor="buyer_id" className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                                            <Users className="h-3 w-3" />
                                            Pilih Buyer (Admin Only)
                                        </Label>
                                        <Select
                                            value={cart.data.buyer_id}
                                            onValueChange={val => cart.setData('buyer_id', val)}
                                        >
                                            <SelectTrigger className="h-11 rounded-xl border-2 border-amber-500/20 font-bold focus:ring-amber-500/20 bg-white">
                                                <SelectValue placeholder="Pilih Cabang / Buyer" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-2">
                                                {buyers.map((buyer: any) => (
                                                    <SelectItem key={buyer.id} value={buyer.id} className="font-bold uppercase text-[10px] tracking-widest text-amber-600">
                                                        {buyer.branch_name || buyer.username}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {cart.errors.buyer_id && <p className="text-destructive text-[10px] font-bold italic">{cart.errors.buyer_id}</p>}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="nama_pemesan" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nama Pemesan (Wajib)</Label>
                                    <Input
                                        id="nama_pemesan"
                                        value={cart.data.nama_pemesan}
                                        onChange={e => cart.setData('nama_pemesan', e.target.value)}
                                        placeholder="Masukkan nama pemesan..."
                                        className="font-bold h-11 rounded-xl border-2 focus:border-primary/50 transition-all"
                                    />
                                    {cart.errors.nama_pemesan && <p className="text-destructive text-[10px] font-bold italic">{cart.errors.nama_pemesan}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="jenis_pesanan" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Jenis Pesanan</Label>
                                    <Select
                                        value={cart.data.jenis_pesanan}
                                        onValueChange={val => cart.setData('jenis_pesanan', val)}
                                    >
                                        <SelectTrigger className="h-11 rounded-xl border-2 font-bold focus:ring-primary/20">
                                            <SelectValue placeholder="Pilih Jenis Pesanan" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-2">
                                            <SelectItem value="awal bulan" className="font-bold uppercase text-[10px] tracking-widest">Akhir Bulan</SelectItem>
                                            <SelectItem value="pertengahan bulan" className="font-bold uppercase text-[10px] tracking-widest">Pertengahan Bulan</SelectItem>
                                            <SelectItem value="Lembur" className="font-bold uppercase text-[10px] tracking-widest">Lembur</SelectItem>
                                            <SelectItem value="tambahan bulan ini" className="font-bold uppercase text-[10px] tracking-widest">Tambahan Bulan Ini</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {cart.errors.jenis_pesanan && <p className="text-destructive text-[10px] font-bold italic">{cart.errors.jenis_pesanan}</p>}
                                </div>

                                <div className="space-y-2 p-4 rounded-2xl bg-primary/5 border-2 border-primary/10">
                                    <Label htmlFor="created_at" className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        Tanggal Pesanan
                                    </Label>
                                    <Input
                                        id="created_at"
                                        type="date"
                                        value={cart.data.created_at}
                                        onChange={e => cart.setData('created_at', e.target.value)}
                                        className="font-bold h-11 rounded-xl border-2 border-primary/20 focus:border-primary/50 bg-white"
                                    />
                                    {cart.errors.created_at && <p className="text-destructive text-[10px] font-bold italic">{cart.errors.created_at}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 bg-muted/10 border-t shrink-0 space-y-4">
                            <div className="p-4 rounded-2xl bg-primary/5 border-2 border-primary/10">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Estimasi</span>
                                    <span className="text-lg font-black text-primary tracking-tighter">{formatCurrency(totalCartPrice)}</span>
                                </div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Harga belum termasuk biaya distribusi jika ada.</p>
                            </div>

                            <DialogFooter className="flex-col sm:flex-row gap-2">
                                <Button type="button" variant="ghost" className="rounded-full font-black italic uppercase text-xs tracking-widest" onClick={() => setIsCheckoutModalOpen(false)}>Kembali</Button>
                                <Button type="submit" disabled={cart.processing} className="rounded-full font-black italic shadow-lg shadow-primary/20 flex-1 h-12">
                                    {cart.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'KIRIM PESANAN SEKARANG'}
                                </Button>
                            </DialogFooter>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Superadmin Manage Product Modal */}
            <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-2xl overflow-y-auto max-h-[90vh] rounded-3xl p-0 border-none shadow-2xl">
                    <DialogHeader className="p-6 md:p-8 pb-0">
                        <DialogTitle className="text-xl md:text-2xl font-black flex items-center gap-2 italic tracking-tight uppercase">
                            <Package className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                            {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                        </DialogTitle>
                        <DialogDescription className="text-xs md:text-sm font-medium">Isi detail produk dan atur harga khusus tier di bawah ini.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleProductSubmit} className="space-y-6 p-6 md:p-8 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">Nama Produk</Label>
                                <Input
                                    id="name"
                                    value={productForm.data.name}
                                    onChange={e => productForm.setData('name', e.target.value)}
                                    placeholder="Contoh: Beras Pandan Wangi 5kg"
                                    className="font-bold h-10 md:h-11 rounded-xl"
                                />
                                {productForm.errors.name && <p className="text-destructive text-[10px] font-bold">{productForm.errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sku" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">SKU / Kode Produk</Label>
                                <Input
                                    id="sku"
                                    value={productForm.data.sku}
                                    onChange={e => productForm.setData('sku', e.target.value)}
                                    placeholder="Contoh: BRS-001"
                                    className="font-mono uppercase h-10 md:h-11 rounded-xl"
                                />
                                {productForm.errors.sku && <p className="text-destructive text-[10px] font-bold">{productForm.errors.sku}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="image_url" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">URL Gambar Produk</Label>
                                <Input
                                    id="image_url"
                                    value={productForm.data.image_url}
                                    onChange={e => productForm.setData('image_url', e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="font-bold h-10 md:h-11 rounded-xl"
                                />
                                {productForm.errors.image_url && <p className="text-destructive text-[10px] font-bold">{productForm.errors.image_url}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="satuan_barang" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground flex justify-between">
                                    Satuan Barang
                                    <span className={cn("text-[9px] normal-case tracking-normal",
                                        productForm.data.satuan_barang.length > 0 && productForm.data.satuan_barang.length <= 20 ? "text-emerald-500" : "text-amber-500"
                                    )}>
                                        {productForm.data.satuan_barang.length}/20 (Max 20)
                                    </span>
                                </Label>
                                <Input
                                    id="satuan_barang"
                                    value={productForm.data.satuan_barang}
                                    onChange={e => productForm.setData('satuan_barang', e.target.value.toUpperCase())}
                                    placeholder="BOTOL"
                                    maxLength={20}
                                    className="font-black h-10 md:h-11 rounded-xl placeholder:font-medium tracking-widest"
                                />
                                {productForm.errors.satuan_barang && <p className="text-destructive text-[10px] font-bold italic">{productForm.errors.satuan_barang}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="base_price" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">Harga Modal (Dasar)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 md:top-3 text-muted-foreground text-xs font-bold">Rp</span>
                                    <Input
                                        id="base_price"
                                        type="number"
                                        value={productForm.data.base_price}
                                        onChange={e => productForm.setData('base_price', parseFloat(e.target.value) || 0)}
                                        className="pl-10 font-black h-10 md:h-11 rounded-xl"
                                    />
                                </div>
                                {productForm.errors.base_price && <p className="text-destructive text-[10px] font-bold">{productForm.errors.base_price}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="stock" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">Stok Awal</Label>
                                <Input
                                    id="stock"
                                    type="number"
                                    value={productForm.data.stock}
                                    onChange={e => productForm.setData('stock', parseInt(e.target.value) || 0)}
                                    className="font-black h-10 md:h-11 rounded-xl"
                                />
                                {productForm.errors.stock && <p className="text-destructive text-[10px] font-bold">{productForm.errors.stock}</p>}
                            </div>
                        </div>

                        <div className="bg-muted/10 p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-4 border-2 border-dashed border-muted">
                            <h3 className="font-black text-[10px] md:text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                <div className="h-px flex-1 bg-primary/10" />
                                Penyesuaian Harga Tier
                                <div className="h-px flex-1 bg-primary/10" />
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                {tiers.map((tier, index) => (
                                    <div key={tier.id} className="space-y-1.5 bg-background p-3 md:p-4 rounded-xl border-2 border-transparent hover:border-primary/20 transition-all shadow-sm">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {tier.name}
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-muted-foreground text-[10px] font-bold">Rp</span>
                                            <Input
                                                type="number"
                                                value={productForm.data.tier_prices[index].price}
                                                onChange={e => {
                                                    const newTierPrices = [...productForm.data.tier_prices];
                                                    newTierPrices[index].price = parseFloat(e.target.value) || 0;
                                                    productForm.setData('tier_prices', newTierPrices);
                                                }}
                                                className="pl-8 md:pl-10 font-mono text-xs md:text-sm h-9 md:h-10 rounded-lg border-none bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary/30"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="gap-3 sm:gap-2">
                            <Button type="button" variant="ghost" className="rounded-full font-bold text-xs uppercase tracking-widest" onClick={() => setIsManageModalOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={productForm.processing} className="rounded-full font-black italic shadow-lg shadow-primary/20 px-8">
                                {productForm.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingProduct ? 'SIMPAN PERUBAHAN' : 'TAMBAH PRODUK')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {/* Superadmin Import Modal */}
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-md rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden">
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-2xl font-black italic tracking-tight uppercase flex items-center gap-2">
                            <FileSpreadsheet className="h-6 w-6 text-primary" />
                            Import Produk
                        </DialogTitle>
                        <DialogDescription className="font-bold text-muted-foreground text-xs uppercase tracking-widest">
                            Upload file CSV untuk menambah produk secara massal.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleImportSubmit} className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="p-6 border-2 border-dashed rounded-3xl bg-muted/5 flex flex-col items-center justify-center gap-4 group hover:bg-primary/5 transition-all cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => importForm.setData('file', e.target.files?.[0] || null)}
                                />
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Upload className="h-6 w-6 text-primary" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold uppercase tracking-tight">
                                        {importForm.data.file ? importForm.data.file.name : 'Pilih file CSV'}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">Hanya mendukung format .CSV</p>
                                </div>
                            </div>

                            <a
                                href={ProductController.downloadTemplate.url()}
                                className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/10 transition-all"
                            >
                                <Download className="h-4 w-4" /> Download Template CSV
                            </a>
                        </div>

                        {importForm.errors.file && (
                            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-bold italic">
                                {importForm.errors.file}
                            </div>
                        )}

                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button type="button" variant="ghost" className="rounded-full font-black italic uppercase text-xs tracking-widest" onClick={() => setIsImportModalOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={importForm.processing || !importForm.data.file} className="rounded-full font-black italic shadow-lg shadow-primary/20 flex-1 h-12">
                                {importForm.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'MULAI IMPORT SEKARANG'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {/* Price Update Confirmation Modal */}
            <Dialog open={isPriceConfirmModalOpen} onOpenChange={setIsPriceConfirmModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-md rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden">
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-2xl font-black italic tracking-tight uppercase flex items-center gap-2">
                            <Info className="h-6 w-6 text-amber-500" />
                            Konfirmasi Harga
                        </DialogTitle>
                        <DialogDescription className="font-bold text-muted-foreground text-xs uppercase tracking-widest leading-relaxed">
                            Anda telah mengubah harga produk ini. Bagaimana perubahan ini harus diterapkan?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-4">
                        <div className="p-4 rounded-2xl bg-amber-500/5 border-2 border-amber-500/10 text-[11px] font-medium leading-relaxed text-amber-700 dark:text-amber-400">
                            <strong>Perhatian:</strong> Jika Anda memilih untuk memperbarui pesanan yang lampau, total biaya pada pesanan tersebut akan otomatis dihitung ulang sesuai harga baru.
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <Button
                                onClick={() => submitProduct(true)}
                                disabled={productForm.processing}
                                className="h-14 rounded-2xl font-black italic flex flex-col items-center justify-center gap-0 group bg-amber-600 hover:bg-amber-700"
                            >
                                <span className="text-sm uppercase tracking-tight">Ya, Update Semua Pesanan</span>
                                <span className="text-[9px] font-bold opacity-70 tracking-widest">BERPENGARUH PADA DATA LAMA</span>
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => submitProduct(false)}
                                disabled={productForm.processing}
                                className="h-14 rounded-2xl font-black italic flex flex-col items-center justify-center gap-0 border-2 hover:bg-muted/50"
                            >
                                <span className="text-sm uppercase tracking-tight text-foreground/80">Tidak, Hanya Pesanan Baru</span>
                                <span className="text-[9px] font-black text-muted-foreground tracking-widest">DATA LAMA TETAP AMAN</span>
                            </Button>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-muted/10 border-t flex justify-center sm:justify-center">
                        <Button
                            variant="ghost"
                            className="rounded-full font-black italic uppercase text-xs tracking-widest opacity-50 hover:opacity-100"
                            onClick={() => setIsPriceConfirmModalOpen(false)}
                        >
                            Batalkan Perubahan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Superadmin Reorder Modal */}
            <Dialog open={isReorderModalOpen} onOpenChange={setIsReorderModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-2xl rounded-3xl p-0 border-none shadow-2xl overflow-hidden flex flex-col h-[85vh]">
                    <DialogHeader className="p-8 pb-4 shrink-0 bg-emerald-500/[0.03] border-b">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-600 shadow-lg flex items-center justify-center text-white">
                                <GripVertical className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col">
                                <DialogTitle className="text-2xl font-black italic tracking-tight uppercase leading-none mb-1">Merapikan Katalog</DialogTitle>
                                <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Tarik dan pindahkan produk untuk mengatur urutan tampilan.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 custom-scrollbar">
                        {reorderItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30 py-20">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="font-black italic uppercase text-xs tracking-widest">Memuat produk...</p>
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={reorderItems.map(i => i.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-3">
                                        {reorderItems.map((product) => (
                                            <SortableProductItem key={product.id} product={product} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>

                    <DialogFooter className="p-8 pt-4 bg-background border-t flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setIsReorderModalOpen(false)}
                            className="rounded-full h-14 px-8 font-black italic uppercase text-xs tracking-widest"
                            disabled={isSavingReorder}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={saveReorder}
                            disabled={isSavingReorder || reorderItems.length === 0}
                            className="flex-1 rounded-full h-14 px-10 bg-emerald-600 hover:bg-emerald-700 text-white font-[1000] italic shadow-lg shadow-emerald-500/20 text-sm uppercase tracking-widest gap-3"
                        >
                            {isSavingReorder ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Check className="h-5 w-5" />
                            )}
                            SIMPAN URUTAN BARU
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- Manage Stock Modal --- */}
            <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-3xl group/modal focus-visible:outline-none">
                    <DialogHeader className="p-8 pb-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Archive className="h-24 w-24 rotate-12" />
                        </div>
                        <div className="flex items-center justify-between relative z-10 w-full">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner">
                                    <Archive className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col">
                                    <DialogTitle className="text-2xl font-[1000] italic uppercase tracking-tighter leading-none">Kelola Stok</DialogTitle>
                                    <DialogDescription className="text-white/80 font-black uppercase tracking-widest text-[10px] mt-1 line-clamp-1 border-t border-white/20 pt-1">
                                        {stockProduct?.name}
                                    </DialogDescription>
                                </div>
                            </div>

                            <div className="flex bg-black/10 rounded-full p-1 self-start">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeStockTab === 'edit' ? "bg-white text-orange-600 shadow-sm" : "text-white/70 hover:text-white"
                                    )}
                                    onClick={() => setActiveStockTab('edit')}
                                >
                                    Update
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeStockTab === 'history' ? "bg-white text-orange-600 shadow-sm" : "text-white/70 hover:text-white"
                                    )}
                                    onClick={() => setActiveStockTab('history')}
                                >
                                    Riwayat
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {activeStockTab === 'edit' ? (
                        <form onSubmit={handleStockSubmit} className="p-8 space-y-6 bg-background relative">
                            <div className="space-y-5">
                                <div className="flex p-1.5 bg-muted/50 rounded-[1.25rem] border-2 border-muted">
                                    <Button
                                        type="button"
                                        variant={stockForm.data.type === 'add' ? 'default' : 'ghost'}
                                        className={cn(
                                            "flex-1 rounded-xl h-12 font-black uppercase tracking-widest text-xs italic transition-all duration-300",
                                            stockForm.data.type === 'add' ? "bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white scale-100" : "opacity-50 scale-95 hover:opacity-100"
                                        )}
                                        onClick={() => stockForm.setData('type', 'add')}
                                    >
                                        Tambah
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={stockForm.data.type === 'sub' ? 'default' : 'ghost'}
                                        className={cn(
                                            "flex-1 rounded-xl h-12 font-black uppercase tracking-widest text-xs italic transition-all duration-300",
                                            stockForm.data.type === 'sub' ? "bg-rose-600 shadow-lg shadow-rose-500/20 text-white scale-100" : "opacity-50 scale-95 hover:opacity-100"
                                        )}
                                        onClick={() => stockForm.setData('type', 'sub')}
                                    >
                                        Kurang
                                    </Button>
                                </div>

                                <div className="space-y-2 group/input">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-2 group-focus-within/input:text-primary transition-colors">Jumlah Unit</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={stockForm.data.amount}
                                            onChange={e => stockForm.setData('amount', parseInt(e.target.value) || 0)}
                                            className="h-14 rounded-2xl border-2 border-muted focus-visible:ring-primary focus-visible:border-primary font-black text-xl px-6 transition-all shadow-sm"
                                            required
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">
                                            {stockProduct?.satuan_barang}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-2">Alasan Perubahan</Label>
                                    <Select
                                        value={stockForm.data.reason}
                                        onValueChange={val => stockForm.setData('reason', val)}
                                    >
                                        <SelectTrigger className="h-14 rounded-2xl border-2 border-muted font-black uppercase text-xs tracking-widest px-6 shadow-sm focus:ring-primary focus:border-primary">
                                            <SelectValue placeholder="Pilih alasan..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-2 shadow-2xl p-2 h-auto max-h-60">
                                            <SelectItem value="Baru" className="font-black uppercase text-[10px] tracking-widest rounded-xl p-3 focus:bg-emerald-50 focus:text-emerald-600 cursor-pointer">Baru / Restock</SelectItem>
                                            <SelectItem value="Rusak" className="font-black uppercase text-[10px] tracking-widest rounded-xl p-3 focus:bg-rose-50 focus:text-rose-600 cursor-pointer">Barang Rusak</SelectItem>
                                            <SelectItem value="Expired" className="font-black uppercase text-[10px] tracking-widest rounded-xl p-3 focus:bg-amber-50 focus:text-amber-600 cursor-pointer">Kedaluwarsa</SelectItem>
                                            <SelectItem value="Cacat" className="font-black uppercase text-[10px] tracking-widest rounded-xl p-3 focus:bg-orange-50 focus:text-orange-600 cursor-pointer">Cacat Produksi</SelectItem>
                                            <SelectItem value="Lainnya" className="font-black uppercase text-[10px] tracking-widest rounded-xl p-3 focus:bg-muted cursor-pointer">Lainnya...</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {['Baru', 'Rusak', 'Expired', 'Cacat'].indexOf(stockForm.data.reason) === -1 && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-2">Keterangan Tambahan</Label>
                                        <Input
                                            placeholder="Tuliskan alasan detail..."
                                            value={['Baru', 'Rusak', 'Expired', 'Cacat'].includes(stockForm.data.reason) ? '' : stockForm.data.reason}
                                            onChange={e => stockForm.setData('reason', e.target.value)}
                                            className="h-14 rounded-2xl border-2 border-primary/20 italic font-bold px-6 shadow-sm focus-visible:ring-primary focus-visible:border-primary"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsStockModalOpen(false)}
                                    className="rounded-full h-14 px-8 font-black italic uppercase text-[10px] tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={stockForm.processing}
                                    className={cn(
                                        "flex-1 rounded-full h-14 px-10 text-white font-[1000] italic shadow-2xl text-xs uppercase tracking-[0.1em] gap-3 transition-all active:scale-95",
                                        stockForm.data.type === 'add'
                                            ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30"
                                            : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/30"
                                    )}
                                >
                                    {stockForm.processing ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Archive className="h-5 w-5" />
                                    )}
                                    KONFIRMASI STOK
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        <div className="p-0 bg-background max-h-[500px] flex flex-col">
                            <div className="p-8 pb-0 overflow-y-auto flex-1 custom-scrollbar">
                                <div className="space-y-4 mb-8">
                                    {isLoadingHistory ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse italic">Memuat Riwayat...</p>
                                        </div>
                                    ) : productHistory.length > 0 ? (
                                        productHistory.map((log) => (
                                            <div key={log.id} className="p-4 rounded-2xl bg-muted/30 border border-sidebar-border/50 group/log hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "h-6 px-2 rounded-lg flex items-center gap-1 text-[8px] font-black uppercase tracking-widest border",
                                                            log.type === 'add' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                                        )}>
                                                            {log.type === 'add' ? <ArrowUpCircle className="w-2 h-2" /> : <ArrowDownCircle className="w-2 h-2" />}
                                                            {log.type === 'add' ? 'Masuk' : 'Keluar'}
                                                        </div>
                                                        <span className="text-[10px] font-black italic text-muted-foreground/50">{format(new Date(log.created_at), 'H:m dd MMM', { locale: localeId })}</span>
                                                    </div>
                                                    <div className="text-sm font-black italic">
                                                        {log.type === 'add' ? '+' : ''}{log.amount} <span className="text-[8px] uppercase tracking-widest opacity-50">{stockProduct?.satuan_barang}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <UserCircle className="w-3 h-3 text-primary/40" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/70">{log.user.username}</span>
                                                    </div>
                                                    <div className="h-1 w-1 rounded-full bg-border" />
                                                    <span className="text-[9px] font-medium text-muted-foreground italic leading-none truncate max-w-[150px]">"{log.reason}"</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30 text-center px-10">
                                            <HistoryIcon className="h-12 w-12" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">Belum Ada Riwayat Stok Tercatat Untuk Produk Ini</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-8 pt-4 bg-muted/30 border-t flex justify-center">
                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveStockTab('edit')}
                                    className="rounded-full h-10 px-8 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-background"
                                >
                                    <Archive className="w-3 h-3" /> Kembali ke Manajemen
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Katalog Produk',
            href: productsIndex.url(),
        },
    ],
};
