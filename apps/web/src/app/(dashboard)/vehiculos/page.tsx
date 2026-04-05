'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';

const vehiculoSchema = z.object({
  marca: z.string().min(1, 'Requerido'),
  modelo: z.string().min(1, 'Requerido'),
  numeroSerie: z.string().min(5, 'Mínimo 5 caracteres'),
  cliente: z.string().min(1, 'Requerido'),
  sucursal: z.string().optional(),
});

type VehiculoForm = z.infer<typeof vehiculoSchema>;

interface Vehiculo {
  id: string;
  numeroSerie: string;
  marca: string;
  modelo: string;
  cliente: string;
  sucursal?: string;
  activo: boolean;
}

export default function VehiculosPage() {
  const [open, setOpen] = useState(false);
  const user = getUser();
  const canCreate = user && ['JEFE', 'SUPERVISOR'].includes(user.rol);
  const queryClient = useQueryClient();

  const { data: vehiculos = [], isLoading } = useQuery<Vehiculo[]>({
    queryKey: ['vehiculos'],
    queryFn: async () => {
      const { data } = await api.get('/vehiculos');
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VehiculoForm>({ resolver: zodResolver(vehiculoSchema) });

  const crearVehiculo = useMutation({
    mutationFn: (data: VehiculoForm) => api.post('/vehiculos', data),
    onSuccess: () => {
      toast.success('Vehículo registrado');
      reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['vehiculos'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error';
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vehículos</h1>
          <p className="text-muted-foreground">Flota registrada en el taller</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo vehículo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar vehículo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit((v) => crearVehiculo.mutate(v))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input placeholder="Komatsu" {...register('marca')} />
                    {errors.marca && <p className="text-xs text-destructive">{errors.marca.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input placeholder="PC200" {...register('modelo')} />
                    {errors.modelo && <p className="text-xs text-destructive">{errors.modelo.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>N° Serie / VIN</Label>
                  <Input placeholder="KMTPC200XYZ123456" {...register('numeroSerie')} />
                  {errors.numeroSerie && <p className="text-xs text-destructive">{errors.numeroSerie.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input placeholder="Minera Los Pelambres" {...register('cliente')} />
                  {errors.cliente && <p className="text-xs text-destructive">{errors.cliente.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Sucursal (opcional)</Label>
                  <Input placeholder="Planta Norte" {...register('sucursal')} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Registrar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Flota ({vehiculos.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Cargando...</div>
          ) : vehiculos.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No hay vehículos registrados</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Serie</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehiculos.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.numeroSerie}</TableCell>
                    <TableCell>{v.marca} {v.modelo}</TableCell>
                    <TableCell>{v.cliente}</TableCell>
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
    </div>
  );
}
