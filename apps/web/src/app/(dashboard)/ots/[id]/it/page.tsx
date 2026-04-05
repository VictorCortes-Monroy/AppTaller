'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Upload, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const itSchema = z.object({
  fechaEvaluacion: z.string().min(1, 'Requerido'),
  evaluador: z.string().min(1, 'Requerido'),
  kilometraje: z.coerce.number().min(0),
  observaciones: z.string().optional(),
});

const tareaSchema = z.object({
  numero: z.coerce.number().min(1),
  componente: z.string().min(1, 'Requerido'),
  descripcion: z.string().min(1, 'Requerido'),
  requiereRepuesto: z.boolean(),
});

type ITForm = z.infer<typeof itSchema>;
type TareaForm = z.infer<typeof tareaSchema>;

export default function ITPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const user = getUser();
  const canEdit = user && ['JEFE', 'SUPERVISOR'].includes(user.rol);

  const { data: it, isLoading } = useQuery({
    queryKey: ['it', id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/ordenes/${id}/it`);
        return data;
      } catch {
        return null;
      }
    },
  });

  const itForm = useForm<ITForm>({ resolver: zodResolver(itSchema) });
  const tareaForm = useForm<TareaForm>({ resolver: zodResolver(tareaSchema), defaultValues: { requiereRepuesto: false } });

  const crearIT = useMutation({
    mutationFn: async (formData: ITForm & { file: File }) => {
      // 1. Obtener presigned URL
      const { data: presigned } = await api.get(`/ordenes/${id}/it/presigned-url`, {
        params: { fileName: formData.file.name },
      });
      // 2. Subir archivo a S3
      await fetch(presigned.presignedUrl, {
        method: 'PUT',
        body: formData.file,
        headers: { 'Content-Type': formData.file.type },
      });
      // 3. Confirmar IT
      const { data } = await api.post(`/ordenes/${id}/it`, {
        key: presigned.key,
        fechaEvaluacion: formData.fechaEvaluacion,
        evaluador: formData.evaluador,
        kilometraje: formData.kilometraje,
        observaciones: formData.observaciones,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Informe Técnico registrado');
      queryClient.invalidateQueries({ queryKey: ['it', id] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error al registrar IT';
      toast.error(msg);
    },
  });

  const crearTarea = useMutation({
    mutationFn: (data: TareaForm) => api.post(`/ordenes/${id}/it/tareas`, data),
    onSuccess: () => {
      toast.success('Tarea STP registrada');
      tareaForm.reset();
      queryClient.invalidateQueries({ queryKey: ['it', id] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error';
      toast.error(msg);
    },
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Informe Técnico</h1>
        <p className="text-muted-foreground">OT {id}</p>
      </div>

      {!it && canEdit && (
        <Card>
          <CardHeader><CardTitle>Cargar Informe Técnico</CardTitle></CardHeader>
          <CardContent>
            <form
              onSubmit={itForm.handleSubmit(async (values) => {
                const fileInput = document.getElementById('it-file') as HTMLInputElement;
                const file = fileInput?.files?.[0];
                if (!file) { toast.error('Selecciona un archivo'); return; }
                crearIT.mutate({ ...values, file });
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de evaluación</Label>
                  <Input type="date" {...itForm.register('fechaEvaluacion')} />
                </div>
                <div className="space-y-2">
                  <Label>Evaluador</Label>
                  <Input placeholder="Nombre del evaluador" {...itForm.register('evaluador')} />
                </div>
                <div className="space-y-2">
                  <Label>Horómetro / Kilometraje</Label>
                  <Input type="number" min="0" {...itForm.register('kilometraje')} />
                </div>
                <div className="space-y-2">
                  <Label>Archivo IT (PDF/XLS/XLSX)</Label>
                  <Input id="it-file" type="file" accept=".pdf,.xls,.xlsx" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Input placeholder="Observaciones generales" {...itForm.register('observaciones')} />
              </div>
              <Button type="submit" disabled={crearIT.isPending}>
                <Upload className="mr-2 h-4 w-4" />
                {crearIT.isPending ? 'Subiendo...' : 'Registrar IT'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {it && (
        <Card>
          <CardHeader><CardTitle>Informe Técnico Registrado</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground">Evaluador</p><p className="font-medium">{it.evaluador}</p></div>
              <div><p className="text-muted-foreground">Fecha</p><p className="font-medium">{new Date(it.fechaEvaluacion).toLocaleDateString('es-CL')}</p></div>
              <div><p className="text-muted-foreground">Horómetro</p><p className="font-medium">{it.kilometraje}</p></div>
            </div>
            {it.observaciones && <p className="text-sm text-muted-foreground">{it.observaciones}</p>}
            {it.archivoUrl && (
              <a href={it.archivoUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                Ver archivo adjunto
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {it && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tareas STP ({it.tareas?.length ?? 0})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Componente</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Repuesto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {it.tareas?.map((t: { id: string; numero: number; componente: string; descripcion: string; requiereRepuesto: boolean; repuesto?: { estado: string } }) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.numero}</TableCell>
                    <TableCell>{t.componente}</TableCell>
                    <TableCell>{t.descripcion}</TableCell>
                    <TableCell>
                      {t.requiereRepuesto ? (
                        <Badge variant={t.repuesto?.estado === 'RECIBIDO' ? 'success' : 'warning'}>
                          {t.repuesto?.estado ?? 'SIN REPUESTO'}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {(!it.tareas || it.tareas.length === 0) && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin tareas registradas</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            {canEdit && (
              <form
                onSubmit={tareaForm.handleSubmit((values) => crearTarea.mutate(values))}
                className="border-t pt-4 space-y-3"
              >
                <p className="text-sm font-medium">Agregar tarea STP</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>N° Tarea</Label>
                    <Input type="number" min="1" {...tareaForm.register('numero')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Componente</Label>
                    <Input {...tareaForm.register('componente')} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Descripción</Label>
                  <Input {...tareaForm.register('descripcion')} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="requiereRepuesto" {...tareaForm.register('requiereRepuesto')} />
                  <Label htmlFor="requiereRepuesto">Requiere repuesto</Label>
                </div>
                <Button type="submit" size="sm" disabled={crearTarea.isPending}>
                  <Plus className="mr-2 h-4 w-4" />
                  {crearTarea.isPending ? 'Guardando...' : 'Agregar tarea'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
