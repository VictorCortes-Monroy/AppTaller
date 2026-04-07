'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Building2, Car, Wrench, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

const clienteSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  rut: z.string().optional(),
  direccion: z.string().optional(),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').or(z.literal('')).optional(),
});

type ClienteForm = z.infer<typeof clienteSchema>;

interface ClienteRow {
  id: string;
  nombre: string;
  rut: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  creadoEn: string;
  vehiculosCount: number;
  totalServicios: number;
  ultimoServicio: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClientesPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = typeof window !== 'undefined' ? getUser() : null;
  const canCreate = user && ['JEFE', 'SUPERVISOR'].includes(user.rol);

  const { data: clientes = [], isLoading } = useQuery<ClienteRow[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data } = await api.get('/clientes');
      return data;
    },
  });

  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<ClienteForm>({ resolver: zodResolver(clienteSchema) });

  const crearCliente = useMutation({
    mutationFn: (data: ClienteForm) => api.post('/clientes', data),
    onSuccess: () => {
      toast.success('Cliente registrado');
      reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error';
      toast.error(msg);
    },
  });

  const filtered = clientes.filter((c) =>
    !search || c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.rut && c.rut.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gestión centralizada de clientes del taller</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit((v) => crearCliente.mutate(v))} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre / Razón Social *</Label>
                  <Input placeholder="Minera Los Pelambres" {...register('nombre')} />
                  {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>RUT</Label>
                    <Input placeholder="76.333.333-3" {...register('rut')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contacto</Label>
                    <Input placeholder="Juan Pérez" {...register('contacto')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input placeholder="+56 9 1234 5678" {...register('telefono')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input placeholder="contacto@empresa.cl" {...register('email')} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input placeholder="Av. Industrial 1234, Antofagasta" {...register('direccion')} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Registrar Cliente'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-blue-100 p-2"><Building2 className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{clientes.length}</p>
              <p className="text-xs text-muted-foreground">Clientes activos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-green-100 p-2"><Car className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{clientes.reduce((a, c) => a + c.vehiculosCount, 0)}</p>
              <p className="text-xs text-muted-foreground">Vehículos totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-orange-100 p-2"><Wrench className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-2xl font-bold">{clientes.reduce((a, c) => a + c.totalServicios, 0)}</p>
              <p className="text-xs text-muted-foreground">Servicios realizados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por nombre o RUT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Clientes ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {search ? 'Sin resultados para la búsqueda' : 'No hay clientes registrados'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-center">Vehículos</TableHead>
                  <TableHead className="text-center">Servicios</TableHead>
                  <TableHead>Último Servicio</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/clientes/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{c.rut || '—'}</TableCell>
                    <TableCell className="text-sm">{c.contacto || '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{c.vehiculosCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{c.totalServicios}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.ultimoServicio)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.activo ? 'success' : 'secondary'}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
