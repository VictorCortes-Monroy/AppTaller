'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertTriangle,
  ClipboardList,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Activity,
  FolderKanban,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Colores y labels ─────────────────────────────────────────────────────────

const ESTADO_COLORS: Record<string, string> = {
  INGRESADO: '#94a3b8',
  EN_EVALUACION: '#3b82f6',
  ESPERANDO_REPUESTOS: '#f59e0b',
  EN_EJECUCION: '#6366f1',
  CONTROL_CALIDAD: '#8b5cf6',
  LISTO_PARA_ENTREGA: '#22c55e',
  ENTREGADO: '#16a34a',
  CANCELADO: '#ef4444',
  EN_ESPERA: '#f97316',
};

const ESTADO_LABELS: Record<string, string> = {
  INGRESADO: 'Ingresado',
  EN_EVALUACION: 'Evaluación',
  ESPERANDO_REPUESTOS: 'Esp. Repuestos',
  EN_EJECUCION: 'Ejecución',
  CONTROL_CALIDAD: 'Control Calidad',
  LISTO_PARA_ENTREGA: 'Listo Entrega',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  EN_ESPERA: 'En Espera',
};

const TIPO_LABELS: Record<string, string> = {
  MANTENCION_PREVENTIVA: 'Mant. Preventiva',
  MANTENCION_CORRECTIVA: 'Mant. Correctiva',
  REPARACION_MAYOR: 'Rep. Mayor',
  INSPECCION: 'Inspección',
  GARANTIA: 'Garantía',
  OTRO: 'Otro',
  SIN_TIPO: 'Sin tipo',
};

const TIPO_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e', '#6366f1', '#94a3b8'];

const EVENTO_LABELS: Record<string, string> = {
  CAMBIO_ESTADO: 'Cambios estado',
  CREACION_OT: 'OTs creadas',
  SUBIDA_IT: 'IT subidos',
  REGISTRO_TAREA_ADICIONAL: 'Tareas reg.',
  ACTUALIZACION_REPUESTO: 'Rep. actualizados',
  RECEPCION_REPUESTO: 'Rep. recibidos',
};

const REPUESTO_COLORS: Record<string, string> = {
  PENDIENTE: '#94a3b8',
  EN_ESPERA: '#f59e0b',
  EN_TRANSITO: '#3b82f6',
  RECIBIDO: '#22c55e',
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Resumen {
  kpis: {
    osActivas?: number;
    osTotal?: number;
    osConAlerta?: number;
    otsActivas: number;
    otsCompletadas: number;
    otsCanceladas: number;
    otsTotal: number;
    otsConAlerta: number;
    promedioDiasActivas: number;
    repuestosPendientes: number;
  };
  otsPorEstado: { estado: string; count: number }[];
  otsPorTipo: { tipo: string; count: number }[];
  repuestosPorEstado: { estado: string; count: number }[];
  actividadPorDia: { fecha: string; acciones: number }[];
  actividadPorTipo: { tipo: string; count: number }[];
}

interface OTActiva {
  id: string;
  numeroOT: string;
  estado: string;
  diasEnTaller: number;
  alerta: boolean;
  vehiculo: { numeroSerie: string; marca: string; modelo: string; cliente: string };
  tecnico: { nombre: string } | null;
  repuestosPendientes: number;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, icon: Icon, variant = 'default' }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
}) {
  const colors = {
    default: 'text-foreground',
    warning: 'text-amber-600',
    success: 'text-green-600',
    destructive: 'text-red-600',
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold ${colors[variant]}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <Icon className={`h-8 w-8 ${colors[variant]} opacity-40`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom tooltip for charts ────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">{p.name || 'Valor'}: <span className="font-medium text-foreground">{p.value}</span></p>
      ))}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: resumen, isLoading } = useQuery<Resumen>({
    queryKey: ['dashboard-resumen'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/resumen');
      return data;
    },
  });

  const { data: otsActivas = [] } = useQuery<OTActiva[]>({
    queryKey: ['dashboard-ots'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/ots-activas');
      return data;
    },
  });

  if (isLoading || !resumen) {
    return <div className="p-6 text-muted-foreground">Cargando dashboard...</div>;
  }

  const { kpis } = resumen;

  // Preparar datos para gráficos
  const estadoData = resumen.otsPorEstado.map((e) => ({
    name: ESTADO_LABELS[e.estado] || e.estado,
    value: e.count,
    fill: ESTADO_COLORS[e.estado] || '#94a3b8',
  }));

  const tipoData = resumen.otsPorTipo.map((t, i) => ({
    name: TIPO_LABELS[t.tipo] || t.tipo,
    value: t.count,
    fill: TIPO_COLORS[i % TIPO_COLORS.length],
  }));

  const actividadData = resumen.actividadPorDia.map((d) => ({
    fecha: new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
    acciones: d.acciones,
  }));

  const repuestoData = resumen.repuestosPorEstado.map((r) => ({
    name: r.estado,
    value: r.count,
    fill: REPUESTO_COLORS[r.estado] || '#94a3b8',
  }));

  // OTs prioritarias (con alerta o más días)
  const otsPrioritarias = otsActivas
    .sort((a, b) => b.diasEnTaller - a.diasEnTaller)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Monitoreo</h1>
        <p className="text-muted-foreground">Resumen operacional del taller</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard
          title="OS Activas"
          value={kpis.osActivas ?? 0}
          subtitle={`de ${kpis.osTotal ?? 0} total`}
          icon={FolderKanban}
        />
        <KpiCard
          title="OTs Activas"
          value={kpis.otsActivas}
          subtitle={`${kpis.promedioDiasActivas}d promedio`}
          icon={ClipboardList}
        />
        <KpiCard
          title="Completadas"
          value={kpis.otsCompletadas}
          subtitle={`de ${kpis.otsTotal} total`}
          icon={CheckCircle2}
          variant="success"
        />
        <KpiCard
          title="Con Alerta"
          value={kpis.otsConAlerta}
          subtitle="> 7 días en taller"
          icon={AlertTriangle}
          variant={kpis.otsConAlerta > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          title="Repuestos Pendientes"
          value={kpis.repuestosPendientes}
          subtitle="sin recibir"
          icon={Package}
          variant={kpis.repuestosPendientes > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Gráficos fila 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OTs por Estado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">OTs por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={estadoData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="OTs" radius={[0, 4, 4, 0]}>
                    {estadoData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* OTs por Tipo de Servicio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por Tipo de Servicio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tipoData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {tipoData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos fila 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Actividad últimos 7 días */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Actividad Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actividadData} margin={{ left: -10, right: 10 }}>
                  <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="acciones" name="Acciones" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Actividad por tipo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acciones (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resumen.actividadPorTipo
                .sort((a, b) => b.count - a.count)
                .map((a) => (
                  <div key={a.tipo} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">
                      {EVENTO_LABELS[a.tipo] || a.tipo}
                    </span>
                    <span className="text-sm font-bold">{a.count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OTs Prioritarias + Repuestos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tabla OTs prioritarias */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">OTs Prioritarias</CardTitle>
              <Link href="/ots">
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver todas <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {otsPrioritarias.length === 0 && (
                <p className="px-6 py-4 text-sm text-muted-foreground text-center">Sin OTs activas</p>
              )}
              {otsPrioritarias.map((ot) => (
                <Link key={ot.id} href={`/ots/${ot.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {ot.alerta && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      <span className="font-medium text-sm">{ot.numeroOT}</span>
                      <Badge
                        variant={ot.estado === 'EN_EVALUACION' ? 'info' : ot.estado === 'ESPERANDO_REPUESTOS' ? 'warning' : 'secondary'}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {ESTADO_LABELS[ot.estado] || ot.estado}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {ot.vehiculo.marca} {ot.vehiculo.modelo} · {ot.vehiculo.cliente}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${ot.alerta ? 'text-amber-600' : ''}`}>{ot.diasEnTaller}d</p>
                    {ot.repuestosPendientes > 0 && (
                      <p className="text-xs text-muted-foreground">{ot.repuestosPendientes} rep.</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Estado de Repuestos */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Estado de Repuestos</CardTitle>
              <Link href="/repuestos">
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver todos <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {repuestoData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin repuestos registrados</p>
            ) : (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={repuestoData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                      >
                        {repuestoData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {repuestoData.map((r) => (
                    <div key={r.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.fill }} />
                      <span>{r.name}</span>
                      <span className="font-bold">{r.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
