'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  Truck,
  Wrench,
  Clock,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ESTADOS_OT_LABELS,
  ESTADOS_OT_VARIANTS,
  TIPO_SERVICIO_LABELS,
  FRENTES_TRABAJO,
} from '@/lib/constants';
import { getUser } from '@/lib/auth';

interface OSDetalle {
  id: string;
  numeroOS: string;
  estado: string;
  fechaIngreso: string;
  fechaEntrega: string | null;
  motivoIngreso: string | null;
  kilometrajeIngreso: number | null;
  kilometrajeSalida: number | null;
  receptorNombre: string | null;
  comentarioCancelacion: string | null;
  diasEnTaller: number;
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
    tipoServicio: string | null;
    descripcion: string | null;
    creadoEn: string;
    tecnico: { id: string; nombre: string } | null;
    repuestos: { id: string; descripcion: string; estado: string; cantidad: number; unidad: string }[];
    tareasAdicionales: { id: string; descripcion: string; costo: number }[];
  }[];
  logs: {
    id: string;
    tipoEvento: string;
    estadoAnterior: string | null;
    estadoNuevo: string | null;
    descripcion: string;
    comentario: string | null;
    fechaEvento: string;
    usuario: { id: string; nombre: string; rol: string };
  }[];
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

// ─── Dialog: Nueva OT en esta OS ─────────────────────────────────────────────

function NuevaOTEnOSDialog({ os }: { os: OSDetalle }) {
  const [open, setOpen] = useState(false);
  const [frente, setFrente] = useState('');
  const [tipoServicio, setTipoServicio] = useState('');
  const [idTecnico, setIdTecnico] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const queryClient = useQueryClient();

  const { data: usuarios = [] } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    },
    enabled: open,
  });
  const tecnicos = usuarios.filter((u) => u.rol === 'TECNICO' && u.activo);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/ordenes', {
        idOrdenServicio: os.id,
        frente: frente || undefined,
        tipoServicio: tipoServicio || undefined,
        idTecnico: idTecnico || undefined,
        descripcion: descripcion || undefined,
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(`OT ${data.numeroOT} creada en ${os.numeroOS}`);
      queryClient.invalidateQueries({ queryKey: ['ordenes-servicio', os.id] });
      queryClient.invalidateQueries({ queryKey: ['ordenes-servicio'] });
      setOpen(false);
      setFrente('');
      setTipoServicio('');
      setIdTecnico('');
      setDescripcion('');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Error al crear OT';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva OT en esta OS
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva OT — {os.numeroOS}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Vehículo: {os.vehiculo.marca} {os.vehiculo.modelo} —{' '}
            {os.vehiculo.numeroSerie}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Frente de trabajo</Label>
            <Select value={frente} onValueChange={setFrente}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el frente (Motor, Hidráulico...)" />
              </SelectTrigger>
              <SelectContent>
                {FRENTES_TRABAJO.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de servicio</Label>
            <Select value={tipoServicio} onValueChange={setTipoServicio}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de servicio" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_SERVICIO_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Técnico asignado (opcional)</Label>
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

          <div className="space-y-2">
            <Label>Descripción del frente</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalle del trabajo a realizar en este frente"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creando...' : 'Crear OT'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: Registrar Entrega OS ────────────────────────────────────────────

function EntregaOSDialog({ os }: { os: OSDetalle }) {
  const [open, setOpen] = useState(false);
  const [kilometrajeSalida, setKilometrajeSalida] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [receptorNombre, setReceptorNombre] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/ordenes-servicio/${os.id}/entrega`, {
        kilometrajeSalida: parseInt(kilometrajeSalida, 10),
        fechaEntrega: new Date(fechaEntrega).toISOString(),
        receptorNombre,
      });
      return data;
    },
    onSuccess: () => {
      toast.success(`OS ${os.numeroOS} entregada`);
      queryClient.invalidateQueries({ queryKey: ['ordenes-servicio', os.id] });
      queryClient.invalidateQueries({ queryKey: ['ordenes-servicio'] });
      setOpen(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Error al registrar entrega';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Registrar entrega
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar entrega — {os.numeroOS}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Esto cerrará la OS y todas las OTs en LISTO_PARA_ENTREGA pasarán a
            ENTREGADO.
          </p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Kilometraje / horómetro de salida</Label>
            <Input
              type="number"
              value={kilometrajeSalida}
              onChange={(e) => setKilometrajeSalida(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha de entrega</Label>
            <Input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre de quien retira</Label>
            <Input
              value={receptorNombre}
              onChange={(e) => setReceptorNombre(e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              !kilometrajeSalida ||
              !receptorNombre ||
              !fechaEntrega
            }
          >
            {mutation.isPending ? 'Registrando...' : 'Confirmar entrega'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: Cancelar OS ─────────────────────────────────────────────────────

function CancelarOSDialog({ os }: { os: OSDetalle }) {
  const [open, setOpen] = useState(false);
  const [comentario, setComentario] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/ordenes-servicio/${os.id}/cancelar`, {
        comentario,
      });
      return data;
    },
    onSuccess: () => {
      toast.success(`OS ${os.numeroOS} cancelada`);
      queryClient.invalidateQueries({ queryKey: ['ordenes-servicio', os.id] });
      queryClient.invalidateQueries({ queryKey: ['ordenes-servicio'] });
      setOpen(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Error al cancelar OS';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar OS
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar OS — {os.numeroOS}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cancelará la OS y todas las OTs activas en cascada. Comentario obligatorio.
          </p>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Motivo de cancelación</Label>
          <Textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || comentario.trim().length < 3}
          >
            {mutation.isPending ? 'Cancelando...' : 'Confirmar cancelación'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página detalle ─────────────────────────────────────────────────────────

export default function OrdenServicioDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const user = getUser();
  const canManage = user && ['JEFE', 'SUPERVISOR'].includes(user.rol);

  const { data: os, isLoading } = useQuery<OSDetalle>({
    queryKey: ['ordenes-servicio', id],
    queryFn: async () => {
      const { data } = await api.get(`/ordenes-servicio/${id}`);
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Cargando...</div>;
  }
  if (!os) {
    return <div className="text-center py-12 text-muted-foreground">OS no encontrada</div>;
  }

  const todasOTsListas = os.ordenesTrabajo.every(
    (ot) => ot.estado === 'LISTO_PARA_ENTREGA' || ot.estado === 'ENTREGADO' || ot.estado === 'CANCELADO',
  );
  const hayOTConListo = os.ordenesTrabajo.some(
    (ot) => ot.estado === 'LISTO_PARA_ENTREGA' || ot.estado === 'ENTREGADO',
  );
  const puedeEntregar =
    canManage &&
    os.ordenesTrabajo.length > 0 &&
    todasOTsListas &&
    hayOTConListo &&
    os.estado !== 'ENTREGADA' &&
    os.estado !== 'CANCELADA';
  const puedeCancelar =
    canManage && os.estado !== 'ENTREGADA' && os.estado !== 'CANCELADA';

  // Repuestos consolidados de todas las OTs
  const repuestosConsolidados = os.ordenesTrabajo.flatMap((ot) =>
    ot.repuestos.map((r) => ({ ...r, otNumero: ot.numeroOT, frente: ot.frente })),
  );

  return (
    <div className="space-y-6">
      {/* Header con breadcrumb */}
      <div className="space-y-2">
        <Link
          href="/ordenes-servicio"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Órdenes de Servicio
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{os.numeroOS}</h1>
              <Badge variant={ESTADOS_OS_VARIANTS[os.estado] ?? 'secondary'}>
                {ESTADOS_OS_LABELS[os.estado] ?? os.estado}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {os.vehiculo.marca} {os.vehiculo.modelo} — {os.vehiculo.numeroSerie}
              {' · '}
              {os.vehiculo.clienteRef?.nombre ?? os.vehiculo.cliente}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage &&
              os.estado !== 'ENTREGADA' &&
              os.estado !== 'CANCELADA' && <NuevaOTEnOSDialog os={os} />}
            {puedeEntregar && <EntregaOSDialog os={os} />}
            {puedeCancelar && <CancelarOSDialog os={os} />}
          </div>
        </div>
      </div>

      {/* Datos OS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" /> Tiempo en taller
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {os.diasEnTaller}{' '}
              <span className="text-base font-normal text-muted-foreground">días</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Ingreso: {new Date(os.fechaIngreso).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Wrench className="h-4 w-4" /> Frentes de trabajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{os.ordenesTrabajo.length}</p>
            <p className="text-xs text-muted-foreground">OTs en esta OS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Truck className="h-4 w-4" /> Kilometraje ingreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {os.kilometrajeIngreso?.toLocaleString() ?? '—'}
            </p>
            {os.kilometrajeSalida && (
              <p className="text-xs text-muted-foreground">
                Salida: {os.kilometrajeSalida.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {os.motivoIngreso && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Motivo de ingreso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{os.motivoIngreso}</p>
          </CardContent>
        </Card>
      )}

      {/* OTs anidadas */}
      <Card>
        <CardHeader>
          <CardTitle>Frentes de trabajo (OTs)</CardTitle>
        </CardHeader>
        <CardContent>
          {os.ordenesTrabajo.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Sin OTs en esta OS. {canManage && 'Crea la primera con "Nueva OT en esta OS".'}
            </p>
          ) : (
            <div className="space-y-2">
              {os.ordenesTrabajo.map((ot) => (
                <Link
                  key={ot.id}
                  href={`/ots/${ot.id}`}
                  className="block border rounded-lg p-3 hover:bg-muted/30 transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{ot.numeroOT}</span>
                      {ot.frente && (
                        <Badge variant="secondary">{ot.frente}</Badge>
                      )}
                      <Badge
                        variant={ESTADOS_OT_VARIANTS[ot.estado] ?? 'secondary'}
                      >
                        {ESTADOS_OT_LABELS[ot.estado] ?? ot.estado}
                      </Badge>
                    </div>
                    {ot.tecnico && (
                      <span className="text-xs text-muted-foreground">
                        {ot.tecnico.nombre}
                      </span>
                    )}
                  </div>
                  {ot.descripcion && (
                    <p className="text-sm text-muted-foreground">
                      {ot.descripcion}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {ot.repuestos.length > 0 && (
                      <span>
                        {ot.repuestos.length} repuesto
                        {ot.repuestos.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {ot.tareasAdicionales.length > 0 && (
                      <span>
                        {ot.tareasAdicionales.length} tarea
                        {ot.tareasAdicionales.length !== 1 ? 's' : ''} adicional
                        {ot.tareasAdicionales.length !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repuestos consolidados */}
      {repuestosConsolidados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Repuestos consolidados ({repuestosConsolidados.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {repuestosConsolidados.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-sm border-b pb-2"
                >
                  <div>
                    <p className="font-medium">{r.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.otNumero} {r.frente && `· ${r.frente}`} · {r.cantidad}{' '}
                      {r.unidad}
                    </p>
                  </div>
                  <Badge variant={r.estado === 'RECIBIDO' ? 'success' : 'warning'}>
                    {r.estado}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log OS */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de la OS</CardTitle>
        </CardHeader>
        <CardContent>
          {os.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin eventos</p>
          ) : (
            <div className="space-y-3">
              {os.logs.map((log) => (
                <div key={log.id} className="border-l-2 border-primary/40 pl-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">{log.tipoEvento}</Badge>
                    {log.estadoAnterior && log.estadoNuevo && (
                      <span className="text-xs text-muted-foreground">
                        {log.estadoAnterior} → {log.estadoNuevo}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{log.descripcion}</p>
                  {log.comentario && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">
                      "{log.comentario}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.usuario.nombre} ({log.usuario.rol}) ·{' '}
                    {new Date(log.fechaEvento).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
