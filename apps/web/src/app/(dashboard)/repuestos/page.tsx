'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente', EN_ESPERA: 'En Espera', EN_TRANSITO: 'En Tránsito', RECIBIDO: 'Recibido',
};

const ESTADO_NEXT: Record<string, string> = {
  PENDIENTE: 'EN_ESPERA', EN_ESPERA: 'EN_TRANSITO', EN_TRANSITO: 'RECIBIDO',
};

interface Repuesto {
  id: string;
  descripcion: string;
  cantidad: string;
  unidad: string;
  origen: string;
  estado: string;
  costo?: string;
  diasEspera: number;
  tareaIT?: { numero: number; componente: string };
}

interface GrupoOT {
  ot: {
    id: string;
    numeroOT: string;
    estado: string;
    frente: string | null;
    vehiculo: { numeroSerie: string; modelo: string; marca: string; cliente: string };
    ordenServicio: { id: string; numeroOS: string } | null;
  };
  repuestos: Repuesto[];
}

export default function RepuestosPage() {
  const user = getUser();
  const isBodega = user?.rol === 'BODEGA';
  const queryClient = useQueryClient();

  const { data: grupos = [], isLoading } = useQuery<GrupoOT[]>({
    queryKey: ['repuestos-pendientes'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/repuestos-pendientes');
      return data;
    },
  });

  const avanzarEstado = useMutation({
    mutationFn: ({ id, nuevoEstado }: { id: string; nuevoEstado: string }) =>
      api.patch(`/repuestos/${id}/estado`, { nuevoEstado }),
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['repuestos-pendientes'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error';
      toast.error(msg);
    },
  });

  const totalPendientes = grupos.reduce((sum, g) => sum + g.repuestos.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Repuestos Pendientes</h1>
        <p className="text-muted-foreground">{totalPendientes} repuesto(s) sin recibir</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Cargando...</div>
      ) : grupos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay repuestos pendientes
          </CardContent>
        </Card>
      ) : (
        grupos.map((grupo) => (
          <Card key={grupo.ot.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {grupo.ot.ordenServicio && (
                  <span className="text-muted-foreground font-normal text-sm">
                    {grupo.ot.ordenServicio.numeroOS} ·{' '}
                  </span>
                )}
                {grupo.ot.numeroOT}
                {grupo.ot.frente && (
                  <span className="font-normal text-muted-foreground"> · {grupo.ot.frente}</span>
                )}
                {' — '}
                {grupo.ot.vehiculo.numeroSerie}{' '}
                <span className="font-normal text-muted-foreground">
                  ({grupo.ot.vehiculo.modelo})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Días espera</TableHead>
                    {isBodega && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupo.repuestos.map((r) => (
                    <TableRow key={r.id} className={r.diasEspera > 7 ? 'bg-amber-50' : ''}>
                      <TableCell>
                        <p className="font-medium">{r.descripcion}</p>
                        {r.tareaIT && (
                          <p className="text-xs text-muted-foreground">
                            STP #{r.tareaIT.numero} — {r.tareaIT.componente}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {r.cantidad} {r.unidad}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.origen}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.estado === 'EN_TRANSITO' ? 'info' : r.estado === 'EN_ESPERA' ? 'warning' : 'secondary'}>
                          {ESTADO_LABELS[r.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={r.diasEspera > 7 ? 'font-bold text-amber-600' : ''}>
                          {r.diasEspera}d
                        </span>
                      </TableCell>
                      {isBodega && (
                        <TableCell>
                          {ESTADO_NEXT[r.estado] && (
                            <Select
                              onValueChange={(v) => avanzarEstado.mutate({ id: r.id, nuevoEstado: v })}
                            >
                              <SelectTrigger className="w-36 h-8 text-xs">
                                <SelectValue placeholder="Avanzar estado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={ESTADO_NEXT[r.estado]}>
                                  {ESTADO_LABELS[ESTADO_NEXT[r.estado]]}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
