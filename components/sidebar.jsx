'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Tag, 
  Megaphone, 
  History, 
  LogOut,
  Bell,
  MapPin,
  User,
  Menu,
  X
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export default function Sidebar({ userRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const adminMenuItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Manajemen User', icon: Users },
    { href: '/admin/categories', label: 'Kategori Bencana', icon: Tag },
    { href: '/admin/events', label: 'Pengumuman', icon: Megaphone },
    { href: '/admin/history', label: 'Riwayat', icon: History },
  ];

  const userMenuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/history', label: 'Riwayat', icon: History },
    { href: '/profile/location', label: 'Lokasi Rumah', icon: MapPin },
    { href: '/profile', label: 'Profil', icon: User, exact: true },
  ];

  const menuItems = userRole === 'SSO' ? adminMenuItems : userMenuItems;

  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar border-r border-border">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-sidebar-foreground">SiagaSekitar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {userRole === 'SSO' ? 'Admin Panel' : 'User Dashboard'}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          // Fix: Exact match untuk semua menu item
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-secondary'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Button
          onClick={() => signOut({ callbackUrl: '/login' })}
          variant="ghost"
          className="w-full justify-start gap-3"
        >
          <LogOut className="w-5 h-5" />
          <span>Keluar</span>
        </Button>
      </div>
    </div>
  );
}
