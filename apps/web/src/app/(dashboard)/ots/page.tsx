'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, AlertTriangle, Truck } from 'lucide-react';
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
  diasEnTaller: number;
  alerta: boolean;
  vehiculo: { numeroSerie: string; modelo: string; marca: string; cliente: string };
  tecnico: { nombre: string } | null;
  repuestosPendientes: number;
  tareasAdicionalesCount: number;
}

interface Vehiculo {
  id: string;
  numeroSerie: string;
  marca: string;
  modelo: string;
  cliente: string;
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

  const resetForm = () => {
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
          {/* Vehículo (requerido) */}
          <div className="space-y-2">
            <Label>
              Vehículo <span className="text-destructive">*</span>
            </Label>
            <Select value={idVehiculo} onValueChange={setIdVehiculo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar vehículo..." />
              </SelectTrigger>
              <SelectContent>
                {vehiculosActivos.map((v) => {
                  const conOT = vehiculosConOT.has(v.numeroSerie);
                  return (
                    <SelectItem key={v.id} value={v.id} disabled={conOT}>
                      {v.numeroSerie} — {v.marca} {v.modelo}
                      {conOT ? ' (OT activa)' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {vehiculoSeleccionado && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground pl-6">
                  Cliente: <span className="font-medium text-foreground">{vehiculoSeleccionado.cliente}</span>
                  {vehiculoSeleccionado.sucursal && (
                    <> · Sucursal: <span className="font-medium text-foreground">{vehiculoSeleccionado.sucursal}</span></>
                  )}
                </div>
              </div>
            )}
            {tieneOTActiva && (
              <p className="text-xs text-destructive">
                Este vehículo ya tiene una OT activa
              </p>
            )}
          </div>

          {/* Tipo de servicio + Técnico en fila */}
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

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Motivo de ingreso</Label>
            <Textarea
              placeholder="Mantención 500 horas, falla hidráulica, etc."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
            />
          </div>

          {/* Kilometraje */}
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

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OtsPage() {
  const user = getUser();
  const canCreate = user && ['JEFE', 'SUPERVISOR'].includes(user.rol);

  const { data: ots = [], isLoading } = useQuery<OTItem[]>({
    queryKey: ['dashboard-ots'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/ots-activas');
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground">OTs activas del taller</p>
        </div>
        {canCreate && <NuevaOTDialog otsActivas={ots} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OTs Activas ({ots.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Cargando...</div>
          ) : ots.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No hay OTs activas</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° OT</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead className="text-right">Repuestos</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ots.map((ot) => (
                  <TableRow key={ot.id} className={ot.alerta ? 'bg-amber-50' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {ot.alerta && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        {ot.numeroOT}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ot.vehiculo.numeroSerie}</p>
                        <p className="text-xs text-muted-foreground">
                          {ot.vehiculo.marca} {ot.vehiculo.modelo} · {ot.vehiculo.cliente}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_VARIANT[ot.estado] ?? 'secondary'}>
                        {ESTADO_LABELS[ot.estado] ?? ot.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>{ot.tecnico?.nombre ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <span className={ot.alerta ? 'font-bold text-amber-600' : ''}>
                        {ot.diasEnTaller}d
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {ot.repuestosPendientes > 0 && (
                        <Badge variant="warning">{ot.repuestosPendientes}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/ots/${ot.id}`}>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </Link>
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
