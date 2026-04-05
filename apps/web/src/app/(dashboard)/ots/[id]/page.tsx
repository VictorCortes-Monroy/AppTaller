'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Package, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ot.numeroOT}</h1>
          <p className="text-muted-foreground">
            {ot.vehiculo?.numeroSerie} — {ot.vehiculo?.marca} {ot.vehiculo?.modelo}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{ESTADO_LABELS[ot.estado] ?? ot.estado}</Badge>
          {canEdit && !esEstadoFinal && (
            <Select onValueChange={(v) => cambiarEstado.mutate(v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Cambiar estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_OT.filter((e) => e !== ot.estado).map((e) => (
                  <SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

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
