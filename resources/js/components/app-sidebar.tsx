import { Link, usePage, router } from '@inertiajs/react';
import { BookOpen, FolderGit2, LayoutGrid, ShoppingBag, Users, ShoppingCart, History, CreditCard } from 'lucide-react';
import { useEffect } from 'react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as ordersIndex } from '@/routes/orders/index';
import { index as productsIndex } from '@/routes/products/index';
import { index as usersIndex } from '@/routes/users/index';
import { index as stockLogsIndex } from '@/routes/stock-logs/index';
import { index as settlementsIndex } from '@/routes/settlements/index';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage().props as any;
    const user = auth?.user;
    const { setOpenMobile, isMobile } = useSidebar();

    // Close mobile sidebar on navigation
    useEffect(() => {
        return router.on('navigate', () => {
            if (isMobile) {
                setOpenMobile(false);
            }
        });
    }, [isMobile, setOpenMobile]);

    const mainNavItems: NavItem[] = [
        {
            title: 'Dasbor',
            href: dashboard.url(),
            icon: LayoutGrid,
        },
        {
            title: 'Katalog Produk',
            href: productsIndex.url(),
            icon: ShoppingBag,
        },
    ];

    if (user?.role === 'SUPERADMIN') {
        mainNavItems.push({
            title: 'Manajemen Pengguna',
            href: usersIndex.url(),
            icon: Users,
        });

        mainNavItems.push({
            title: 'Riwayat Stok',
            href: stockLogsIndex.url(),
            icon: History,
        });
    }

    if (user?.role === 'WAREHOUSE') {
        mainNavItems.push({
            title: 'Riwayat Stok',
            href: stockLogsIndex.url(),
            icon: History,
        });
    }

    if (user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_TIER' || user?.role === 'WAREHOUSE') {
        mainNavItems.push({
            title: 'Kelola Pesanan',
            href: ordersIndex.url(),
            icon: ShoppingCart,
        });
    } else if (user?.role === 'BUYER') {
        mainNavItems.push({
            title: 'Pesanan Saya',
            href: ordersIndex.url(),
            icon: ShoppingCart,
        });
    }

    if (user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_TIER') {
        mainNavItems.push({
            title: 'Hutang & Pelunasan',
            href: settlementsIndex.url(),
            icon: CreditCard,
        });
    }

    const footerNavItems: NavItem[] = [
        {
            title: 'Repositori',
            href: 'https://github.com/laravel/react-starter-kit',
            icon: FolderGit2,
        },
        {
            title: 'Dokumentasi',
            href: 'https://laravel.com/docs/starter-kits#react',
            icon: BookOpen,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard.url()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
