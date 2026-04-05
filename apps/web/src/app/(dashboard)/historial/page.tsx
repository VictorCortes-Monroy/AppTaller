'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EVENTO_VARIANT: Record<string, 'default' | 'success' | 'info' | 'warning' | 'destructive' | 'secondary'> = {
  CREACION_OT: 'secondary',
  CAMBIO_ESTADO: 'info',
  SUBIDA_IT: 'info',
  REGISTRO_TAREA_ADICIONAL: 'warning',
  RECEPCION_REPUESTO: 'success',
  ACTUALIZACION_REPUESTO: 'info',
  ENTREGA_OT: 'success',
  CANCELACION_OT: 'destructive',
};

interface LogEntry {
  id: string;
  tipoEvento: string;
  descripcion: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  fechaEvento: string;
  ordenTrabajo: { numeroOT: string };
  usuario: { nombre: string; rol: string };
}

export default function HistorialPage() {
  const { data: log = [], isLoading } = useQuery<LogEntry[]>({
    queryKey: ['historial'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/historial');
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historial de Eventos</h1>
        <p className="text-muted-foreground">Log inmutable de todas las acciones del taller</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eventos ({log.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Cargando...</div>
          ) : log.length === 0 ? (
            <div className="p-6 text-muted-foreground">Sin eventos</div>
          ) : (
            <div className="divide-y">
              {log.map((entry) => (
                <div key={entry.id} className="px-6 py-3 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{entry.ordenTrabajo.numeroOT}</span>
                      <span className="text-sm text-muted-foreground truncate">{entry.descripcion}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {entry.usuario.nombre} · {entry.usuario.rol}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.fechaEvento).toLocaleString('es-CL')}
                      </span>
                      {entry.estadoAnterior && entry.estadoNuevo && (
                        <span className="text-xs text-muted-foreground">
                          {entry.estadoAnterior} → {entry.estadoNuevo}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={EVENTO_VARIANT[entry.tipoEvento] ?? 'secondary'}
                    className="shrink-0 text-xs"
                  >
                    {entry.tipoEvento.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
