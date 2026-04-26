'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Building2, Car, Wrench, Calendar, Mail, Phone, MapPin, User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface VehiculoCliente {
  id: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  sucursal: string | null;
  activo: boolean;
  _count: { ordenesTrabajo: number; ordenesServicio?: number };
}

interface OrdenCliente {
  id: string;
  numeroOT: string;
  estado: string;
  tipoServicio: string | null;
  frente: string | null;
  descripcion: string | null;
  creadoEn: string;
  fechaEntrega: string | null;
  vehiculo: { marca: string; modelo: string; numeroSerie: string };
  tecnico: { nombre: string } | null;
  ordenServicio: { id: string; numeroOS: string } | null;
}

interface OrdenServicioCliente {
  id: string;
  numeroOS: string;
  estado: string;
  fechaIngreso: string;
  fechaEntrega: string | null;
  motivoIngreso: string | null;
  kilometrajeIngreso: number | null;
  vehiculo: { marca: string; modelo: string; numeroSerie: string };
  ordenesTrabajo: {
    id: string;
    numeroOT: string;
    estado: string;
    frente: string | null;
    tipoServicio: string | null;
    tecnico: { nombre: string } | null;
  }[];
}

interface ClienteDetalle {
  id: string;
  nombre: string;
  rut: string | null;
  direccion: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  creadoEn: string;
  vehiculos: VehiculoCliente[];
  ordenes: OrdenCliente[];
  ordenesServicio: OrdenServicioCliente[];
  resumen: {
    totalVehiculos: number;
    totalServicios: number;
    totalOrdenesServicio: number;
    ultimoServicio: string | null;
  };
}

const ESTADO_COLORS: Record<string, string> = {
  INGRESADO: 'bg-blue-100 text-blue-800',
  EN_DIAGNOSTICO: 'bg-yellow-100 text-yellow-800',
  ESPERANDO_REPUESTOS: 'bg-orange-100 text-orange-800',
  EN_REPARACION: 'bg-purple-100 text-purple-800',
  EN_REVISION: 'bg-indigo-100 text-indigo-800',
  COMPLETADO: 'bg-green-100 text-green-800',
  ENTREGADO: 'bg-gray-100 text-gray-800',
  CANCELADO: 'bg-red-100 text-red-800',
  EN_ESPERA: 'bg-amber-100 text-amber-800',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatEstado(estado: string) {
  return estado.replace(/_/g, ' ');
}

export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: cliente, isLoading } = useQuery<ClienteDetalle>({
    queryKey: ['clientes', id],
    queryFn: async () => {
      const { data } = await api.get(`/clientes/${id}`);
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Cargando cliente...</div>;
  }

  if (!cliente) {
    return <div className="p-6 text-center text-muted-foreground">Cliente no encontrado</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/clientes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
            <Badge variant={cliente.activo ? 'success' : 'secondary'}>
              {cliente.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {cliente.rut && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {cliente.rut}
              </span>
            )}
            {cliente.contacto && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {cliente.contacto}
              </span>
            )}
            {cliente.telefono && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {cliente.telefono}
              </span>
            )}
            {cliente.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {cliente.email}
              </span>
            )}
            {cliente.direccion && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {cliente.direccion}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-blue-100 p-2"><Car className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{cliente.resumen.totalVehiculos}</p>
              <p className="text-xs text-muted-foreground">Vehículos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-indigo-100 p-2"><Wrench className="h-5 w-5 text-indigo-600" /></div>
            <div>
              <p className="text-2xl font-bold">{cliente.resumen.totalOrdenesServicio ?? 0}</p>
              <p className="text-xs text-muted-foreground">Órdenes de Servicio</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-green-100 p-2"><Wrench className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{cliente.resumen.totalServicios}</p>
              <p className="text-xs text-muted-foreground">Trabajos (OT)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-orange-100 p-2"><Calendar className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-sm font-bold">{formatDate(cliente.resumen.ultimoServicio)}</p>
              <p className="text-xs text-muted-foreground">Último servicio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehículos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehículos ({cliente.vehiculos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cliente.vehiculos.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Sin vehículos registrados</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Serie / VIN</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-center">OTs</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cliente.vehiculos.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">{v.numeroSerie}</TableCell>
                    <TableCell className="font-medium">{v.marca} {v.modelo}</TableCell>
                    <TableCell className="text-muted-foreground">{v.sucursal || '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{v._count.ordenesTrabajo}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.activo ? 'success' : 'secondary'}>
                        {v.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Órdenes de Servicio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Órdenes de Servicio ({cliente.ordenesServicio?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!cliente.ordenesServicio || cliente.ordenesServicio.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Sin órdenes de servicio</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° OS</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">OTs</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Fecha Entrega</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cliente.ordenesServicio.map((os) => (
                  <TableRow
                    key={os.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/ordenes-servicio/${os.id}`)}
                  >
                    <TableCell className="font-medium">{os.numeroOS}</TableCell>
                    <TableCell>{os.vehiculo.marca} {os.vehiculo.modelo}</TableCell>
                    <TableCell>
                      <span className="inline-block rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-xs font-medium">
                        {formatEstado(os.estado)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{os.ordenesTrabajo.length}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(os.fechaIngreso)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(os.fechaEntrega)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Historial de Trabajos (OTs) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Trabajos (OTs) ({cliente.ordenes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cliente.ordenes.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Sin trabajos registrados</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° OT</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Frente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cliente.ordenes.map((ot) => (
                  <TableRow
                    key={ot.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/ots/${ot.id}`)}
                  >
                    <TableCell className="font-medium">{ot.numeroOT}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ot.ordenServicio?.numeroOS ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">{ot.frente ?? '—'}</TableCell>
                    <TableCell>{ot.vehiculo.marca} {ot.vehiculo.modelo}</TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_COLORS[ot.estado] || 'bg-gray-100 text-gray-800'}`}>
                        {formatEstado(ot.estado)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{ot.tecnico?.nombre || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(ot.creadoEn)}</TableCell>
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
