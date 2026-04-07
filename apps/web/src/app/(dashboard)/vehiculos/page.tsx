'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
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

// ─── Bulk Import Dialog ───────────────────────────────────────────────────────

interface ParsedRow {
  marca: string;
  modelo: string;
  numeroSerie: string;
  cliente: string;
  sucursal: string;
  error?: string;
}

function BulkImportDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const queryClient = useQueryClient();

  const validRows = rows.filter((r) => !r.error);
  const errorRows = rows.filter((r) => r.error);

  const importMutation = useMutation({
    mutationFn: (vehiculos: Omit<ParsedRow, 'error'>[]) =>
      api.post('/vehiculos/bulk', { vehiculos }),
    onSuccess: (res) => {
      toast.success(`${res.data.created} vehículos importados`);
      setRows([]);
      setFileName('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['vehiculos'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error al importar';
      toast.error(msg);
    },
  });

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const data = [
      { marca: 'Komatsu', modelo: 'PC200', numeroSerie: 'KMTPC200XYZ123456', cliente: 'Minera Los Pelambres', sucursal: 'Planta Norte' },
      { marca: 'Caterpillar', modelo: '320GC', numeroSerie: 'CAT0320GC987654', cliente: 'Codelco', sucursal: '' },
      { marca: 'Komatsu', modelo: 'HD785', numeroSerie: 'KMTHD785ABC000001', cliente: 'Minera Escondida', sucursal: 'Faena Principal' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vehiculos');
    XLSX.writeFile(wb, 'plantilla_vehiculos.xlsx');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    const vins = new Set<string>();
    const parsed: ParsedRow[] = json.map((row) => {
      const marca = String(row['marca'] ?? row['Marca'] ?? '').trim();
      const modelo = String(row['modelo'] ?? row['Modelo'] ?? '').trim();
      const numeroSerie = String(row['numeroSerie'] ?? row['NumeroSerie'] ?? row['VIN'] ?? row['vin'] ?? row['numero_serie'] ?? '').trim();
      const cliente = String(row['cliente'] ?? row['Cliente'] ?? '').trim();
      const sucursal = String(row['sucursal'] ?? row['Sucursal'] ?? '').trim();

      let error: string | undefined;
      if (!marca) error = 'Marca requerida';
      else if (!modelo) error = 'Modelo requerido';
      else if (!numeroSerie || numeroSerie.length < 5) error = 'VIN requerido (min 5 chars)';
      else if (!cliente) error = 'Cliente requerido';
      else if (vins.has(numeroSerie)) error = 'VIN duplicado en el archivo';

      if (numeroSerie) vins.add(numeroSerie);
      return { marca, modelo, numeroSerie, cliente, sucursal, error };
    });

    setRows(parsed);
  };

  const resetDialog = () => {
    setRows([]);
    setFileName('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetDialog(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Vehículos desde Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Upload + Template */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                className="cursor-pointer"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate} className="shrink-0">
              <Download className="mr-2 h-4 w-4" />
              Plantilla
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Columnas esperadas: <span className="font-mono">marca, modelo, numeroSerie, cliente, sucursal</span>
          </p>

          {/* Step 2: Preview */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="h-4 w-4" /> {validRows.length} válidos
                </span>
                {errorRows.length > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" /> {errorRows.length} con errores
                  </span>
                )}
                <span className="text-muted-foreground">· {fileName}</span>
              </div>

              <div className="max-h-[300px] overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>VIN</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className={r.error ? 'bg-red-50' : ''}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-sm">{r.marca || '—'}</TableCell>
                        <TableCell className="text-sm">{r.modelo || '—'}</TableCell>
                        <TableCell className="text-sm font-mono">{r.numeroSerie || '—'}</TableCell>
                        <TableCell className="text-sm">{r.cliente || '—'}</TableCell>
                        <TableCell className="text-sm">{r.sucursal || '—'}</TableCell>
                        <TableCell>
                          {r.error ? (
                            <span className="text-xs text-red-600">{r.error}</span>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Step 3: Import */}
              <Button
                className="w-full"
                disabled={validRows.length === 0 || errorRows.length > 0 || importMutation.isPending}
                onClick={() => importMutation.mutate(validRows.map(({ error, ...v }) => v))}
              >
                {importMutation.isPending
                  ? 'Importando...'
                  : `Importar ${validRows.length} vehículos`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

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
          <div className="flex gap-2">
          <BulkImportDialog />
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
          </div>
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
