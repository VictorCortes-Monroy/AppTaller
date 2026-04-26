'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  AlertTriangle,
  Truck,
  Search,
  X,
  Package,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ESTADOS_OS_LABELS,
  ESTADOS_OS_VARIANTS,
  KANBAN_COLUMNS_OS,
} from '@/lib/constants';
import { getUser } from '@/lib/auth';

interface OSItem {
  id: string;
  numeroOS: string;
  estado: string;
  fechaIngreso: string;
  motivoIngreso: string | null;
  kilometrajeIngreso: number | null;
  diasEnTaller: number;
  alerta: boolean;
  totalOTs: number;
  repuestosPendientes: number;
  vehiculo: {
    id: string;
    marca: string;
    modelo: string;
    numeroSerie: string;
    cliente: string;
    clienteRef: { id: string; nombre: string } | null;
  };
  ordenesTrabajo: {
    id: string;
    numeroOT: string;
    estado: string;
    frente: string | null;
    tecnico: { id: string; nombre: string } | null;
  }[];
}

interface Cliente {
  id: string;
  nombre: string;
}

interface Vehiculo {
  id: string;
  numeroSerie: string;
  marca: string;
  modelo: string;
  cliente: string;
  idCliente?: string;
  sucursal?: string;
  activo: boolean;
}

// ─── Dialog: Nueva OS ────────────────────────────────────────────────────────

function NuevaOSDialog({ osActivas }: { osActivas: OSItem[] }) {
  const [open, setOpen] = useState(false);
  const [idCliente, setIdCliente] = useState('');
  const [idVehiculo, setIdVehiculo] = useState('');
  const [motivoIngreso, setMotivoIngreso] = useState('');
  const [kilometrajeIngreso, setKilometrajeIngreso] = useState('');
  const router = useRouter();
  const queryClient = useQueryClient();

  const vehiculosConOSActiva = new Set(
    osActivas.map((os) => os.vehiculo.numeroSerie),
  );

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data } = await api.get('/clientes');
      return data;
    },
    enabled: open,
  });

  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({
    queryKey: ['vehiculos'],
    queryFn: async () => {
      const { data } = await api.get('/vehiculos');
      return data;
    },
    enabled: open,
  });

  const vehiculosFiltrados = useMemo(() => {
    if (!idCliente) return [];
    const clienteSel = clientes.find((c) => c.id === idCliente);
    return vehiculos.filter(
      (v) =>
        v.activo &&
        (v.idCliente === idCliente || v.cliente === clienteSel?.nombre),
    );
  }, [idCliente, vehiculos, clientes]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/ordenes-servicio', {
        idVehiculo,
        motivoIngreso: motivoIngreso || undefined,
        kilometrajeIngreso: kilometrajeIngreso
          ? parseInt(kilometrajeIngreso, 10)
          : undefined,
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(`OS ${data.numeroOS} creada`);
      queryClient.invalidateQueries({ queryKey: ['ordenes-servicio'] });
      setOpen(false);
      setIdCliente('');
      setIdVehiculo('');
      setMotivoIngreso('');
      setKilometrajeIngreso('');
      router.push(`/ordenes-servicio/${data.id}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Error al crear OS';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const handleSubmit = () => {
    if (!idVehiculo) {
      toast.error('Selecciona un vehículo');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden de Servicio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Servicio</DialogTitle>
          <p className="text-sm text-muted-foreground">
            La OS es el contenedor de la estadía del vehículo en el taller. Después
            agregarás las OTs (frentes de trabajo) dentro de ella.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={idCliente}
              onValueChange={(v) => {
                setIdCliente(v);
                setIdVehiculo('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vehículo</Label>
            <Select
              value={idVehiculo}
              onValueChange={setIdVehiculo}
              disabled={!idCliente}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !idCliente
                      ? 'Selecciona primero un cliente'
                      : vehiculosFiltrados.length === 0
                      ? 'Sin vehículos disponibles'
                      : 'Selecciona el vehículo'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {vehiculosFiltrados.map((v) => {
                  const tieneOSActiva = vehiculosConOSActiva.has(v.numeroSerie);
                  return (
                    <SelectItem
                      key={v.id}
                      value={v.id}
                      disabled={tieneOSActiva}
                    >
                      {v.marca} {v.modelo} — {v.numeroSerie}
                      {tieneOSActiva && ' (con OS activa)'}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo de ingreso</Label>
            <Textarea
              value={motivoIngreso}
              onChange={(e) => setMotivoIngreso(e.target.value)}
              placeholder="Ej: Mantención 500h + revisión de vibración en motor"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Kilometraje / Horas al ingreso</Label>
            <Input
              type="number"
              value={kilometrajeIngreso}
              onChange={(e) => setKilometrajeIngreso(e.target.value)}
              placeholder="Ej: 12450"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !idVehiculo}
          >
            {createMutation.isPending ? 'Creando...' : 'Crear OS'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de OS en kanban ────────────────────────────────────────────────────

function OSCard({ os }: { os: OSItem }) {
  const otsActivas = os.ordenesTrabajo.filter(
    (ot) => !['ENTREGADO', 'CANCELADO'].includes(ot.estado),
  ).length;

  return (
    <Link href={`/ordenes-servicio/${os.id}`}>
      <Card
        className={`cursor-pointer hover:shadow-md transition-shadow ${
          os.alerta ? 'border-amber-400' : ''
        }`}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm">{os.numeroOS}</span>
            {os.alerta && <AlertTriangle className="h-4 w-4 text-amber-500" />}
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">
              {os.vehiculo.marca} {os.vehiculo.modelo}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {os.vehiculo.numeroSerie}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {os.vehiculo.clienteRef?.nombre ?? os.vehiculo.cliente}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Truck className="h-3 w-3" /> {os.totalOTs} OT
              {os.totalOTs !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {os.diasEnTaller}d
            </span>
            {os.repuestosPendientes > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <Package className="h-3 w-3" /> {os.repuestosPendientes}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function OrdenesServicioPage() {
  const user = getUser();
  const canCreate = user && ['JEFE', 'SUPERVISOR'].includes(user.rol);
  const [search, setSearch] = useState('');

  const { data: oss = [], isLoading } = useQuery<OSItem[]>({
    queryKey: ['ordenes-servicio'],
    queryFn: async () => {
      const { data } = await api.get('/ordenes-servicio');
      return data;
    },
  });

  const filtradas = useMemo(() => {
    if (!search.trim()) return oss;
    const q = search.toLowerCase();
    return oss.filter(
      (os) =>
        os.numeroOS.toLowerCase().includes(q) ||
        os.vehiculo.numeroSerie.toLowerCase().includes(q) ||
        os.vehiculo.marca.toLowerCase().includes(q) ||
        os.vehiculo.modelo.toLowerCase().includes(q) ||
        (os.vehiculo.clienteRef?.nombre ?? os.vehiculo.cliente)
          .toLowerCase()
          .includes(q),
    );
  }, [oss, search]);

  const porColumna = useMemo(() => {
    const map: Record<string, OSItem[]> = {};
    KANBAN_COLUMNS_OS.forEach((col) => (map[col.estado] = []));
    filtradas.forEach((os) => {
      if (map[os.estado]) map[os.estado].push(os);
    });
    return map;
  }, [filtradas]);

  const totalActivas = oss.filter((os) =>
    ['ABIERTA', 'EN_SERVICIO', 'LISTA_PARA_ENTREGA'].includes(os.estado),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Órdenes de Servicio</h1>
          <p className="text-muted-foreground">
            {totalActivas} {totalActivas === 1 ? 'OS activa' : 'OS activas'} en
            taller
          </p>
        </div>
        {canCreate && <NuevaOSDialog osActivas={oss} />}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por OS, VIN, cliente, marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {oss.length === 0
              ? 'No hay órdenes de servicio'
              : 'No hay resultados para tu búsqueda'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {KANBAN_COLUMNS_OS.map((col) => {
            const items = porColumna[col.estado] ?? [];
            return (
              <div key={col.estado} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <Badge variant={ESTADOS_OS_VARIANTS[col.estado] ?? 'secondary'}>
                    {items.length}
                  </Badge>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Sin OS
                    </p>
                  ) : (
                    items.map((os) => <OSCard key={os.id} os={os} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
