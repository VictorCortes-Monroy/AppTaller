'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
        {canCreate && (
          <Link href="/ots/nueva">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva OT
            </Button>
          </Link>
        )}
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
