'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Package, Plus, Check, Pencil, XCircle, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ESTADOS_OT = [
  'INGRESADO', 'EN_EVALUACION', 'ESPERANDO_REPUESTOS', 'EN_EJECUCION',
  'CONTROL_CALIDAD', 'LISTO_PARA_ENTREGA', 'ENTREGADO', 'CANCELADO', 'EN_ESPERA',
];

const ESTADO_LABELS: Record<string, string> = {
  INGRESADO: 'Ingresado', EN_EVALUACION: 'En Evaluación', ESPERANDO_REPUESTOS: 'Esperando Repuestos',
  EN_EJECUCION: 'En Ejecución', CONTROL_CALIDAD: 'Control Calidad',
  LISTO_PARA_ENTREGA: 'Listo p/ Entrega', ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado', EN_ESPERA: 'En Espera',
};

const REPUESTO_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'info' | 'secondary'> = {
  PENDIENTE: 'secondary',
  EN_ESPERA: 'warning',
  EN_TRANSITO: 'info',
  RECIBIDO: 'success',
};

function formatDateShort(date: string) {
  return new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function formatDateTimeShort(date: string) {
  return new Date(date).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Timeline de progreso ─────────────────────────────────────────────────────

const TIMELINE_STEPS = [
  'INGRESADO', 'EN_EVALUACION', 'ESPERANDO_REPUESTOS', 'EN_EJECUCION',
  'CONTROL_CALIDAD', 'LISTO_PARA_ENTREGA', 'ENTREGADO',
];

const STEP_LABELS: Record<string, string> = {
  INGRESADO: 'Ingresado',
  EN_EVALUACION: 'Evaluación',
  ESPERANDO_REPUESTOS: 'Esp. Repuestos',
  EN_EJECUCION: 'Ejecución',
  CONTROL_CALIDAD: 'Control Calidad',
  LISTO_PARA_ENTREGA: 'Listo Entrega',
  ENTREGADO: 'Entregado',
};

interface LogEntry {
  id: string;
  tipoEvento: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  descripcion: string;
  fechaEvento: string;
  usuario?: { nombre: string };
}

function buildStateTimestamps(logs: LogEntry[], creadoEn: string) {
  const map = new Map<string, { date: string; user: string }>();
  map.set('INGRESADO', { date: creadoEn, user: '' });

  const sorted = [...logs]
    .filter((l) => l.tipoEvento === 'CAMBIO_ESTADO' && l.estadoNuevo)
    .sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime());

  for (const entry of sorted) {
    if (entry.estadoNuevo && !map.has(entry.estadoNuevo)) {
      map.set(entry.estadoNuevo, { date: entry.fechaEvento, user: entry.usuario?.nombre ?? '' });
    }
  }
  return map;
}

function OTProgressTimeline({
  currentState,
  logs,
  creadoEn,
  canEdit,
  esEstadoFinal,
  onChangeState,
}: {
  currentState: string;
  logs: LogEntry[];
  creadoEn: string;
  canEdit: boolean;
  esEstadoFinal: boolean;
  onChangeState: (v: string) => void;
}) {
  const timestamps = buildStateTimestamps(logs, creadoEn);

  // CANCELADO: banner rojo
  if (currentState === 'CANCELADO') {
    const cancelEntry = [...logs]
      .filter((l) => l.estadoNuevo === 'CANCELADO')
      .sort((a, b) => new Date(b.fechaEvento).getTime() - new Date(a.fechaEvento).getTime())[0];
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 flex items-center gap-4">
        <XCircle className="h-6 w-6 text-red-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-800">Orden Cancelada</p>
          <p className="text-xs text-red-600">
            {cancelEntry ? `${formatDateTimeShort(cancelEntry.fechaEvento)}` : ''}
            {cancelEntry?.usuario?.nombre ? ` por ${cancelEntry.usuario.nombre}` : ''}
          </p>
        </div>
      </div>
    );
  }

  // EN_ESPERA: encontrar el step real donde se pausó
  let effectiveState = currentState;
  if (currentState === 'EN_ESPERA') {
    const pauseEntry = [...logs]
      .filter((l) => l.estadoNuevo === 'EN_ESPERA')
      .sort((a, b) => new Date(b.fechaEvento).getTime() - new Date(a.fechaEvento).getTime())[0];
    effectiveState = pauseEntry?.estadoAnterior ?? 'INGRESADO';
  }

  const currentIdx = TIMELINE_STEPS.indexOf(effectiveState);

  return (
    <Card>
      <CardContent className="pt-6 pb-4">
        {/* Stepper */}
        <div className="overflow-x-auto">
          <div className="flex items-start min-w-[600px]">
            {TIMELINE_STEPS.map((step, i) => {
              const isCompleted = timestamps.has(step) && i < currentIdx;
              const isCurrent = step === effectiveState;
              const isEntregado = step === 'ENTREGADO' && currentState === 'ENTREGADO';
              const isFuture = !isCompleted && !isCurrent && !isEntregado;
              const ts = timestamps.get(step);

              return (
                <div key={step} className="flex items-start flex-1">
                  <div className="flex flex-col items-center text-center w-full">
                    {/* Circle */}
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all',
                      (isCompleted || isEntregado) && 'bg-green-600 border-green-600 text-white',
                      isCurrent && !isEntregado && 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100 scale-110',
                      isFuture && 'bg-background border-muted-foreground/25 text-muted-foreground',
                    )}>
                      {(isCompleted || isEntregado) ? <Check className="h-4 w-4" /> : (i + 1)}
                    </div>

                    {/* Label */}
                    <span className={cn(
                      'mt-2 text-[11px] font-medium leading-tight max-w-[80px]',
                      (isCompleted || isEntregado) && 'text-green-700',
                      isCurrent && !isEntregado && 'text-blue-700 font-semibold',
                      isFuture && 'text-muted-foreground',
                    )}>
                      {STEP_LABELS[step]}
                    </span>

                    {/* Timestamp */}
                    {ts && (
                      <span className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatDateTimeShort(ts.date)}
                      </span>
                    )}

                    {/* EN_ESPERA badge */}
                    {isCurrent && currentState === 'EN_ESPERA' && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        <Pause className="h-2.5 w-2.5" /> En Espera
                      </span>
                    )}
                  </div>

                  {/* Connecting line */}
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={cn(
                      'h-0.5 mt-4 flex-1 min-w-[12px] mx-0.5',
                      i < currentIdx ? 'bg-green-600' : 'bg-muted-foreground/15',
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cambiar estado */}
        {canEdit && !esEstadoFinal && (
          <div className="flex justify-end mt-4 pt-3 border-t">
            <Select onValueChange={onChangeState}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Cambiar estado..." />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_OT.filter((e) => e !== currentState).map((e) => (
                  <SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TareaIT {
  id: string;
  numero: number;
  componente: string;
  descripcion: string;
  requiereRepuesto: boolean;
  completada: boolean;
  creadoEn: string;
  updatedAt: string;
  repuesto?: { id: string; estado: string; descripcion: string } | null;
}

interface IT {
  id: string;
  tareas: TareaIT[];
}

// ─── Inline editable field ────────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  disabled,
  className = '',
}: {
  value: string;
  onSave: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  };

  if (disabled || !editing) {
    return (
      <span
        className={`cursor-pointer rounded px-1 py-0.5 hover:bg-muted ${className}`}
        onClick={() => {
          if (disabled) return;
          setEditing(true);
          setDraft(value);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {value}
      </span>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') { setEditing(false); setDraft(value); }
      }}
      className={`h-7 px-1 py-0 text-sm ${className}`}
      autoFocus
    />
  );
}

// ─── Checklist de Tareas STP ──────────────────────────────────────────────────

function TareasSTPChecklist({ idOT, canEdit, esEstadoFinal }: { idOT: string; canEdit: boolean; esEstadoFinal: boolean }) {
  const queryClient = useQueryClient();
  const [newComponente, setNewComponente] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');
  const [newRepuesto, setNewRepuesto] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<{ numero: number; componente: string; descripcion: string }[]>([]);
  const editable = canEdit && !esEstadoFinal;

  const { data: it } = useQuery<IT | null>({
    queryKey: ['it', idOT],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/ordenes/${idOT}/it`);
        return data;
      } catch {
        return null;
      }
    },
  });

  const updateTarea = useMutation({
    mutationFn: ({ idTarea, body }: { idTarea: string; body: Record<string, unknown> }) =>
      api.patch(`/ordenes/${idOT}/it/tareas/${idTarea}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it', idOT] }),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error';
      toast.error(msg);
    },
  });

  const crearTarea = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post(`/ordenes/${idOT}/it/tareas`, body),
    onSuccess: () => {
      setNewComponente('');
      setNewDescripcion('');
      setNewRepuesto(false);
      queryClient.invalidateQueries({ queryKey: ['it', idOT] });
      toast.success('Tarea agregada');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error';
      toast.error(msg);
    },
  });

  const bulkCrear = useMutation({
    mutationFn: (body: { tareas: Record<string, unknown>[] }) =>
      api.post(`/ordenes/${idOT}/it/tareas-bulk`, body),
    onSuccess: () => {
      setBulkText('');
      setBulkPreview([]);
      setBulkMode(false);
      queryClient.invalidateQueries({ queryKey: ['it', idOT] });
      toast.success('Tareas importadas');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error al importar';
      toast.error(msg);
    },
  });

  const tareas = it?.tareas ?? [];
  const completadas = tareas.filter((t) => t.completada).length;

  const handleAdd = () => {
    if (!newComponente.trim() || !newDescripcion.trim()) return;
    const nextNumero = tareas.length > 0 ? Math.max(...tareas.map((t) => t.numero)) + 1 : 1;
    crearTarea.mutate({
      numero: nextNumero,
      componente: newComponente.trim(),
      descripcion: newDescripcion.trim(),
      requiereRepuesto: newRepuesto,
    });
  };

  // Parse pasted text: expects tab-separated columns from Excel
  // Format: Componente\tDescripción (2 cols) or #\tComponente\tDescripción (3 cols)
  const parseBulkText = (text: string) => {
    const baseNumero = tareas.length > 0 ? Math.max(...tareas.map((t) => t.numero)) + 1 : 1;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: { numero: number; componente: string; descripcion: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      if (cols.length >= 3 && !isNaN(Number(cols[0]))) {
        // 3+ cols: numero, componente, descripcion
        parsed.push({ numero: Number(cols[0]) || baseNumero + i, componente: cols[1].trim(), descripcion: cols.slice(2).join(' ').trim() });
      } else if (cols.length >= 2) {
        // 2 cols: componente, descripcion
        parsed.push({ numero: baseNumero + i, componente: cols[0].trim(), descripcion: cols.slice(1).join(' ').trim() });
      } else if (cols[0].trim()) {
        // 1 col: treat as descripcion with generic componente
        parsed.push({ numero: baseNumero + i, componente: 'General', descripcion: cols[0].trim() });
      }
    }
    return parsed.filter((p) => p.componente && p.descripcion);
  };

  const handleBulkTextChange = (text: string) => {
    setBulkText(text);
    setBulkPreview(parseBulkText(text));
  };

  const handleBulkImport = () => {
    if (bulkPreview.length === 0) return;
    bulkCrear.mutate({
      tareas: bulkPreview.map((t) => ({
        numero: t.numero,
        componente: t.componente,
        descripcion: t.descripcion,
        requiereRepuesto: false,
      })),
    });
  };

  if (!it) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tareas STP</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Carga el Informe Técnico para habilitar las tareas STP.
          </p>
          <Link href={`/ots/${idOT}/it`}>
            <Button variant="outline" size="sm" className="mt-2">
              <FileText className="mr-2 h-4 w-4" />
              Cargar IT
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Tareas STP
            {tareas.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({completadas}/{tareas.length} completadas)
              </span>
            )}
          </CardTitle>
          <Link href={`/ots/${idOT}/it`}>
            <Button variant="ghost" size="sm" className="text-xs">
              <FileText className="mr-1 h-3 w-3" />
              Ver IT
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {tareas.map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-3 px-4 py-3 transition-colors ${t.completada ? 'bg-muted/40' : ''}`}
            >
              {/* Checkbox */}
              <button
                type="button"
                disabled={!editable}
                onClick={() =>
                  updateTarea.mutate({
                    idTarea: t.id,
                    body: { completada: !t.completada },
                  })
                }
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  t.completada
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input hover:border-primary'
                } ${!editable ? 'opacity-50' : 'cursor-pointer'}`}
              >
                {t.completada && <Check className="h-3 w-3" />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={`flex items-center gap-2 ${t.completada ? 'line-through text-muted-foreground' : ''}`}>
                  <InlineEdit
                    value={t.componente}
                    disabled={!editable}
                    onSave={(v) => updateTarea.mutate({ idTarea: t.id, body: { componente: v } })}
                    className="font-medium text-sm"
                  />
                  <span className="text-muted-foreground">—</span>
                  <InlineEdit
                    value={t.descripcion}
                    disabled={!editable}
                    onSave={(v) => updateTarea.mutate({ idTarea: t.id, body: { descripcion: v } })}
                    className="text-sm"
                  />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {t.requiereRepuesto && t.repuesto ? (
                    <Badge variant={REPUESTO_VARIANT[t.repuesto.estado] ?? 'secondary'} className="text-[10px] px-1.5 py-0">
                      {t.repuesto.estado}
                    </Badge>
                  ) : t.requiereRepuesto ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">SIN REPUESTO</Badge>
                  ) : null}
                  <span>Creada {formatDateShort(t.creadoEn)}</span>
                  {t.updatedAt !== t.creadoEn && (
                    <span>· Mod. {formatDateShort(t.updatedAt)}</span>
                  )}
                </div>
              </div>

              {/* Task number */}
              <span className="shrink-0 text-xs text-muted-foreground">#{t.numero}</span>
            </div>
          ))}

          {tareas.length === 0 && !editable && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin tareas STP registradas
            </p>
          )}

          {/* Add row / Bulk import */}
          {editable && !bulkMode && (
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20">
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="Componente"
                value={newComponente}
                onChange={(e) => setNewComponente(e.target.value)}
                className="h-8 text-sm flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Input
                placeholder="Descripción de la tarea"
                value={newDescripcion}
                onChange={(e) => setNewDescripcion(e.target.value)}
                className="h-8 text-sm flex-[2]"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRepuesto}
                  onChange={(e) => setNewRepuesto(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Rep.
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                disabled={!newComponente.trim() || !newDescripcion.trim() || crearTarea.isPending}
                onClick={handleAdd}
              >
                {crearTarea.isPending ? '...' : 'Agregar'}
              </Button>
              <div className="border-l pl-2 ml-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-xs"
                  onClick={() => setBulkMode(true)}
                >
                  Pegar desde Excel
                </Button>
              </div>
            </div>
          )}

          {editable && bulkMode && (
            <div className="px-4 py-3 space-y-3 bg-muted/20 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Importar tareas desde Excel</p>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setBulkMode(false); setBulkText(''); setBulkPreview([]); }}>
                  Cancelar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copia las columnas desde Excel y pega aqui. Formato: <span className="font-mono bg-muted px-1 rounded">Componente [Tab] Descripcion</span> por fila.
              </p>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={"Motor hidraulico\tReemplazo sello principal\nSistema electrico\tRevision cableado cabina\nFiltros\tCambio filtro aire y aceite"}
                value={bulkText}
                onChange={(e) => handleBulkTextChange(e.target.value)}
              />
              {bulkPreview.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{bulkPreview.length} tareas detectadas:</p>
                  <div className="max-h-32 overflow-y-auto rounded border bg-background text-xs divide-y">
                    {bulkPreview.map((p, i) => (
                      <div key={i} className="flex gap-3 px-3 py-1.5">
                        <span className="text-muted-foreground w-6">#{p.numero}</span>
                        <span className="font-medium w-32 truncate">{p.componente}</span>
                        <span className="flex-1 truncate">{p.descripcion}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={bulkCrear.isPending}
                    onClick={handleBulkImport}
                  >
                    {bulkCrear.isPending ? 'Importando...' : `Importar ${bulkPreview.length} tareas`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const user = getUser();
  const canEdit = user && ['JEFE', 'SUPERVISOR', 'TECNICO'].includes(user.rol);

  const { data: ot, isLoading } = useQuery({
    queryKey: ['ot', id],
    queryFn: async () => {
      const { data } = await api.get(`/ordenes/${id}`);
      return data;
    },
  });

  const { data: log = [] } = useQuery({
    queryKey: ['ot-log', id],
    queryFn: async () => {
      const { data } = await api.get(`/ordenes/${id}/log`);
      return data;
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: (nuevoEstado: string) =>
      api.patch(`/ordenes/${id}/estado`, { nuevoEstado }),
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['ot', id] });
      queryClient.invalidateQueries({ queryKey: ['ot-log', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-ots'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error al cambiar estado';
      toast.error(msg);
    },
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Cargando...</div>;
  if (!ot) return <div className="p-6">OT no encontrada</div>;

  const esEstadoFinal = ['ENTREGADO', 'CANCELADO'].includes(ot.estado);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{ot.numeroOT}</h1>
        <p className="text-muted-foreground">
          {ot.vehiculo?.numeroSerie} — {ot.vehiculo?.marca} {ot.vehiculo?.modelo}
        </p>
      </div>

      <OTProgressTimeline
        currentState={ot.estado}
        logs={log}
        creadoEn={ot.creadoEn}
        canEdit={!!canEdit}
        esEstadoFinal={esEstadoFinal}
        onChangeState={(v) => cambiarEstado.mutate(v)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Técnico</CardTitle></CardHeader>
          <CardContent><p className="font-medium">{ot.tecnico?.nombre ?? '—'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Descripción</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{ot.descripcion ?? '—'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Repuestos pendientes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {ot.repuestos?.filter((r: { estado: string }) => r.estado !== 'RECIBIDO').length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Checklist Tareas STP */}
      <TareasSTPChecklist idOT={id} canEdit={!!canEdit} esEstadoFinal={esEstadoFinal} />

      <div className="flex gap-3">
        <Link href={`/ots/${id}/it`}>
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Informe Técnico
          </Button>
        </Link>
        <Link href={`/repuestos?ot=${id}`}>
          <Button variant="outline" size="sm">
            <Package className="mr-2 h-4 w-4" />
            Repuestos
          </Button>
        </Link>
      </div>

      {/* Tareas adicionales */}
      {ot.tareasAdicionales?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Tareas Adicionales</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Componente</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ot.tareasAdicionales.map((t: { id: string; descripcion: string; componente?: string; costo: string; usuario?: { nombre: string } }) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.descripcion}</TableCell>
                    <TableCell>{t.componente ?? '—'}</TableCell>
                    <TableCell>${Number(t.costo).toLocaleString('es-CL')}</TableCell>
                    <TableCell>{t.usuario?.nombre ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Log de auditoría */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Log de Auditoría</CardTitle>
            {canEdit && !esEstadoFinal && (
              <Link href={`/ots/${id}/tarea`}>
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Tarea adicional
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {log.map((entry: { id: string; tipoEvento: string; descripcion: string; fechaEvento: string; usuario?: { nombre: string } }) => (
              <div key={entry.id} className="px-6 py-3 flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{entry.descripcion}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.usuario?.nombre} · {new Date(entry.fechaEvento).toLocaleString('es-CL')}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">{entry.tipoEvento}</Badge>
              </div>
            ))}
            {log.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">Sin eventos registrados</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
