'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  History,
  Car,
  Building2,
  Users,
  LogOut,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearTokens, getUser, TokenPayload } from '@/lib/auth';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Inicio',
    icon: LayoutDashboard,
    roles: ['JEFE', 'SUPERVISOR', 'ADMIN'],
    exact: true,
  },
  {
    href: '/ots',
    label: 'Gestión de Actividades',
    icon: ClipboardList,
    roles: ['JEFE', 'SUPERVISOR', 'TECNICO', 'ADMIN'],
  },
  {
    href: '/repuestos',
    label: 'Repuestos',
    icon: Package,
    roles: ['JEFE', 'SUPERVISOR', 'BODEGA', 'ADMIN'],
  },
  {
    href: '/historial',
    label: 'Historial',
    icon: History,
    roles: ['JEFE', 'SUPERVISOR', 'ADMIN'],
  },
  {
    href: '/vehiculos',
    label: 'Vehículos',
    icon: Car,
    roles: ['JEFE', 'SUPERVISOR', 'ADMIN'],
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: Building2,
    roles: ['JEFE', 'SUPERVISOR', 'ADMIN'],
  },
  {
    href: '/usuarios',
    label: 'Usuarios',
    icon: Users,
    roles: ['JEFE'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<TokenPayload | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    clearTokens();
    document.cookie = 'access_token=; path=/; max-age=0';
    router.push('/login');
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !user || item.roles.includes(user.rol),
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Wrench className="h-5 w-5 text-primary" />
        <span className="font-semibold">WorkShop Manager</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const isActive = ('exact' in item && item.exact)
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
          );
        })}
      </nav>

      <div className="border-t p-4 space-y-2">
        {user && (
          <div className="px-3 py-1">
            <p className="text-sm font-medium truncate">{user.nombre}</p>
            <p className="text-xs text-muted-foreground">{user.rol}</p>
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
