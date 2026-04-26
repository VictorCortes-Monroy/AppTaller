'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, AlertTriangle, Truck, Search, X, Package, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUser } from '@/lib/auth';

const ESTADO_LABELS: Record<string, string> = {
  INGRESADO: 'Ingresado',
  EN_EVALUACION: 'En Evaluación',
  ESPERANDO_REPUESTOS: 'Esperando Repuestos',
  EN_EJECUCION: 'En Ejecución',
  CONTROL_CALIDAD: 'Control Calidad',
  LISTO_PARA_ENTREGA: 'Listo p/ Entrega',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  EN_ESPERA: 'En Espera',
};

const ESTADO_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'info' | 'secondary'> = {
  INGRESADO: 'secondary',
  EN_EVALUACION: 'info',
  ESPERANDO_REPUESTOS: 'warning',
  EN_EJECUCION: 'info',
  CONTROL_CALIDAD: 'info',
  LISTO_PARA_ENTREGA: 'success',
  ENTREGADO: 'success',
  CANCELADO: 'destructive',
  EN_ESPERA: 'warning',
};

interface OTItem {
  id: string;
  numeroOT: string;
  estado: string;
  frente: string | null;
  diasEnTaller: number;
  alerta: boolean;
  vehiculo: { numeroSerie: string; modelo: string; marca: string; cliente: string };
  tecnico: { nombre: string } | null;
  ordenServicio: { id: string; numeroOS: string; estado: string } | null;
  repuestosPendientes: number;
  tareasAdicionalesCount: number;
}

interface Vehiculo {
  id: string;
  numeroSerie: string;
  marca: string;
  modelo: string;
  cliente: string;
  sucursal?: string;
  activo: boolean;
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

// ─── Formulario Nueva OT ─────────────────────────────────────────────────────

const TIPO_SERVICIO_OPTIONS = [
  { value: 'MANTENCION_PREVENTIVA', label: 'Mantención Preventiva' },
  { value: 'MANTENCION_CORRECTIVA', label: 'Mantención Correctiva' },
  { value: 'REPARACION_MAYOR', label: 'Reparación Mayor' },
  { value: 'INSPECCION', label: 'Inspección' },
  { value: 'GARANTIA', label: 'Garantía' },
  { value: 'OTRO', label: 'Otro' },
];

function NuevaOTDialog({ otsActivas }: { otsActivas: OTItem[] }) {
  const [open, setOpen] = useState(false);
  const [cliente, setCliente] = useState('');
  const [idVehiculo, setIdVehiculo] = useState('');
  const [idTecnico, setIdTecnico] = useState('');
  const [tipoServicio, setTipoServicio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const router = useRouter();
  const queryClient = useQueryClient();

  const vehiculosConOT = new Set(
    otsActivas.map((ot) => ot.vehiculo.numeroSerie),
  );

  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({
    queryKey: ['vehiculos'],
    queryFn: async () => {
      const { data } = await api.get('/vehiculos');
      return data;
    },
    enabled: open,
  });

  const { data: usuarios = [] } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    },
    enabled: open,
  });

  const tecnicos = usuarios.filter((u) => u.rol === 'TECNICO' && u.activo);
  const vehiculosActivos = vehiculos.filter((v) => v.activo);

  // Clientes únicos
  const clientes = useMemo(
    () => Array.from(new Set(vehiculosActivos.map((v) => v.cliente))).sort(),
    [vehiculosActivos],
  );

  // Vehículos filtrados por cliente seleccionado
  const vehiculosFiltrados = cliente
    ? vehiculosActivos.filter((v) => v.cliente === cliente)
    : [];

  const resetForm = () => {
    setCliente('');
    setIdVehiculo('');
    setIdTecnico('');
    setTipoServicio('');
    setDescripcion('');
    setKilometraje('');
  };

  const crearOT = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { idVehiculo };
      if (idTecnico) body.idTecnico = idTecnico;
      if (tipoServicio) body.tipoServicio = tipoServicio;
      if (descripcion.trim()) body.descripcion = descripcion.trim();
      if (kilometraje) body.kilometraje = parseInt(kilometraje, 10);
      const { data } = await api.post('/ordenes', body);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`OT creada: ${data.numeroOT}`);
      resetForm();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard-ots'] });
      router.push(`/ots/${data.id}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Error al crear la OT';
      toast.error(msg);
    },
  });

  const vehiculoSeleccionado = vehiculosActivos.find((v) => v.id === idVehiculo);
  const tieneOTActiva = vehiculoSeleccionado
    ? vehiculosConOT.has(vehiculoSeleccionado.numeroSerie)
    : false;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva OT
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Orden de Trabajo</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!idVehiculo || tieneOTActiva) return;
            crearOT.mutate();
          }}
          className="space-y-4"
        >
          {/* 1. Cliente */}
          <div className="space-y-2">
            <Label>
              Cliente <span className="text-destructive">*</span>
            </Label>
            <Select
              value={cliente}
              onValueChange={(v) => {
                setCliente(v);
                setIdVehiculo(''); // reset vehículo al cambiar cliente
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Vehículo (filtrado por cliente) */}
          <div className="space-y-2">
            <Label>
              Vehículo <span className="text-destructive">*</span>
            </Label>
            <Select
              value={idVehiculo}
              onValueChange={setIdVehiculo}
              disabled={!cliente}
            >
              <SelectTrigger>
                <SelectValue placeholder={cliente ? 'Seleccionar vehículo...' : 'Selecciona un cliente primero'} />
              </SelectTrigger>
              <SelectContent>
                {vehiculosFiltrados.map((v) => {
                  const conOT = vehiculosConOT.has(v.numeroSerie);
                  return (
                    <SelectItem key={v.id} value={v.id} disabled={conOT}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{v.marca} {v.modelo}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground font-mono">{v.numeroSerie}</span>
                        {conOT && <Badge variant="warning" className="text-[10px] px-1 py-0 ml-1">OT activa</Badge>}
                      </div>
                    </SelectItem>
                  );
                })}
                {vehiculosFiltrados.length === 0 && (
                  <SelectItem value="__none__" disabled>Sin vehículos para este cliente</SelectItem>
                )}
              </SelectContent>
            </Select>
            {vehiculoSeleccionado && (
              <div className="rounded-md border bg-muted/50 p-3 text-sm flex items-center gap-3">
                <Truck className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">{vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}</p>
                  <p className="text-xs text-muted-foreground">
                    VIN: {vehiculoSeleccionado.numeroSerie}
                    {vehiculoSeleccionado.sucursal && <> · Sucursal: {vehiculoSeleccionado.sucursal}</>}
                  </p>
                </div>
              </div>
            )}
            {tieneOTActiva && (
              <p className="text-xs text-destructive">
                Este vehículo ya tiene una OT activa
              </p>
            )}
          </div>

          {/* 3. Tipo de servicio + Técnico */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de servicio</Label>
              <Select value={tipoServicio} onValueChange={setTipoServicio}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_SERVICIO_OPTIONS.map((ts) => (
                    <SelectItem key={ts.value} value={ts.value}>
                      {ts.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Técnico asignado</Label>
              <Select value={idTecnico} onValueChange={setIdTecnico}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  {tecnicos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 4. Descripción */}
          <div className="space-y-2">
            <Label>Motivo de ingreso</Label>
            <Textarea
              placeholder="Mantención 500 horas, falla hidráulica, etc."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
            />
          </div>

          {/* 5. Kilometraje */}
          <div className="space-y-2">
            <Label>Kilometraje / Horas</Label>
            <Input
              type="number"
              min={0}
              placeholder="12500"
              value={kilometraje}
              onChange={(e) => setKilometraje(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!idVehiculo || tieneOTActiva || crearOT.isPending}
          >
            {crearOT.isPending ? 'Creando...' : 'Crear Orden de Trabajo'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Kanban ───────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { key: 'INGRESADO',           label: 'Ingresado',      color: 'bg-slate-50',  accent: 'border-t-slate-400',  dot: 'bg-slate-400' },
  { key: 'EN_EVALUACION',       label: 'Evaluación',     color: 'bg-blue-50',   accent: 'border-t-blue-500',   dot: 'bg-blue-500' },
  { key: 'ESPERANDO_REPUESTOS', label: 'Esp. Repuestos', color: 'bg-amber-50',  accent: 'border-t-amber-500',  dot: 'bg-amber-500' },
  { key: 'EN_EJECUCION',        label: 'Ejecución',      color: 'bg-indigo-50', accent: 'border-t-indigo-500', dot: 'bg-indigo-500' },
  { key: 'CONTROL_CALIDAD',     label: 'Control Calidad', color: 'bg-purple-50', accent: 'border-t-purple-500', dot: 'bg-purple-500' },
  { key: 'LISTO_PARA_ENTREGA',  label: 'Listo Entrega',  color: 'bg-green-50',  accent: 'border-t-green-500',  dot: 'bg-green-500' },
  { key: 'EN_ESPERA',           label: 'En Espera',      color: 'bg-orange-50', accent: 'border-t-orange-500', dot: 'bg-orange-500' },
];

function OTKanbanCard({ ot }: { ot: OTItem }) {
  return (
    <Link href={`/ots/${ot.id}`}>
      <div className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{ot.numeroOT}</span>
          {ot.alerta && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
        </div>

        {ot.ordenServicio && (
          <p className="text-[10px] text-muted-foreground">
            {ot.ordenServicio.numeroOS}
            {ot.frente ? ` · ${ot.frente}` : ''}
          </p>
        )}

        {/* Vehicle */}
        <div>
          <p className="text-sm font-medium truncate">{ot.vehiculo.marca} {ot.vehiculo.modelo}</p>
          <p className="text-[11px] text-muted-foreground truncate">{ot.vehiculo.cliente}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1 truncate">
            <User className="h-3 w-3" />
            <span className="truncate">{ot.tecnico?.nombre ?? 'Sin asignar'}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ot.repuestosPendientes > 0 && (
              <span className="flex items-center gap-0.5 text-amber-600">
                <Package className="h-3 w-3" /> {ot.repuestosPendientes}
              </span>
            )}
            <span className={`flex items-center gap-0.5 ${ot.alerta ? 'text-amber-600 font-bold' : ''}`}>
              <Clock className="h-3 w-3" /> {ot.diasEnTaller}d
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OtsPage() {
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  useEffect(() => { setUser(getUser()); }, []);
  const canCreate = user && ['JEFE', 'SUPERVISOR'].includes(user.rol);

  // Filtros
  const [searchText, setSearchText] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterMarca, setFilterMarca] = useState('');
  const [filterTecnico, setFilterTecnico] = useState('');

  const { data: ots = [], isLoading } = useQuery<OTItem[]>({
    queryKey: ['dashboard-ots'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/ots-activas');
      return data;
    },
  });

  // Opciones dinámicas para filtros
  const marcas = useMemo(() => Array.from(new Set(ots.map((o) => o.vehiculo.marca))).sort(), [ots]);
  const tecnicos = useMemo(() => Array.from(new Set(ots.filter((o) => o.tecnico).map((o) => o.tecnico!.nombre))).sort(), [ots]);

  // Filtrado client-side
  const filteredOts = useMemo(() => {
    return ots.filter((ot) => {
      const q = searchText.toLowerCase();
      if (q && !(
        ot.vehiculo.cliente.toLowerCase().includes(q) ||
        ot.vehiculo.numeroSerie.toLowerCase().includes(q) ||
        ot.numeroOT.toLowerCase().includes(q) ||
        ot.vehiculo.marca.toLowerCase().includes(q) ||
        ot.vehiculo.modelo.toLowerCase().includes(q)
      )) return false;
      if (filterEstado && ot.estado !== filterEstado) return false;
      if (filterMarca && ot.vehiculo.marca !== filterMarca) return false;
      if (filterTecnico && ot.tecnico?.nombre !== filterTecnico) return false;
      return true;
    });
  }, [ots, searchText, filterEstado, filterMarca, filterTecnico]);

  const hasFilters = searchText || filterEstado || filterMarca || filterTecnico;
  const clearFilters = () => { setSearchText(''); setFilterEstado(''); setFilterMarca(''); setFilterTecnico(''); };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trabajos (OT)</h1>
          <p className="text-muted-foreground">
            {ots.length} OTs activas en el taller. Las OTs se crean dentro de una{' '}
            <Link href="/ordenes-servicio" className="underline">Orden de Servicio</Link>.
          </p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, VIN, OT..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {KANBAN_COLUMNS.map((col) => (
              <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMarca} onValueChange={setFilterMarca}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent>
            {marcas.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTecnico} onValueChange={setFilterTecnico}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Técnico" />
          </SelectTrigger>
          <SelectContent>
            {tecnicos.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
            <X className="h-4 w-4 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Cargando tablero...</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const columnOts = filteredOts.filter((ot) => ot.estado === col.key);
            return (
              <div
                key={col.key}
                className={`flex flex-col min-w-[220px] w-[250px] flex-shrink-0 rounded-lg border-t-4 ${col.accent} ${col.color}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                    <span className="text-sm font-semibold">{col.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium bg-white/70 rounded-full px-2 py-0.5">
                    {columnOts.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2 px-2 pb-2 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {columnOts.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-muted-foreground/15 p-4 text-center text-xs text-muted-foreground">
                      Sin OTs
                    </div>
                  )}
                  {columnOts.map((ot) => (
                    <OTKanbanCard key={ot.id} ot={ot} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
