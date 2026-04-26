export const PARTES_VEHICULO = [
  'Motor',
  'Cabina',
  'Rodado',
  'Sistema Hidráulico',
  'Transmisión',
  'Chasis',
  'Sistema Eléctrico',
  'Frenos',
  'Sistema Neumático',
  'Carrocería',
  'Filtros',
  'General',
];

export const TIPOS_TRABAJO = [
  'Inspección',
  'Reparación',
  'Reemplazo',
  'Ajuste',
  'Mantención',
  'Otro',
];

// Frentes de trabajo (para campo `frente` en OT, dentro de OS)
export const FRENTES_TRABAJO = [
  'Motor',
  'Hidráulico',
  'Eléctrico',
  'Transmisión',
  'Frenos',
  'Neumático',
  'Inspección general',
  'Mantención preventiva',
  'Otro',
];

// ─── Estados de Orden de Trabajo (OT) ─────────────────────────────────────────

export const ESTADOS_OT_LABELS: Record<string, string> = {
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

export const ESTADOS_OT_COLORS: Record<string, string> = {
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

export const ESTADOS_OT_VARIANTS: Record<
  string,
  'default' | 'warning' | 'success' | 'destructive' | 'info' | 'secondary'
> = {
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

// ─── Estados de Orden de Servicio (OS) ────────────────────────────────────────

export const ESTADOS_OS_LABELS: Record<string, string> = {
  ABIERTA: 'Abierta',
  EN_SERVICIO: 'En Servicio',
  LISTA_PARA_ENTREGA: 'Lista p/ Entrega',
  ENTREGADA: 'Entregada',
  CANCELADA: 'Cancelada',
};

export const ESTADOS_OS_COLORS: Record<string, string> = {
  ABIERTA: '#94a3b8',
  EN_SERVICIO: '#6366f1',
  LISTA_PARA_ENTREGA: '#22c55e',
  ENTREGADA: '#16a34a',
  CANCELADA: '#ef4444',
};

export const ESTADOS_OS_VARIANTS: Record<
  string,
  'default' | 'warning' | 'success' | 'destructive' | 'info' | 'secondary'
> = {
  ABIERTA: 'secondary',
  EN_SERVICIO: 'info',
  LISTA_PARA_ENTREGA: 'success',
  ENTREGADA: 'success',
  CANCELADA: 'destructive',
};

// Columnas del kanban OS (sin estado CANCELADA, igual que OT)
export const KANBAN_COLUMNS_OS = [
  { estado: 'ABIERTA', label: 'Abierta' },
  { estado: 'EN_SERVICIO', label: 'En Servicio' },
  { estado: 'LISTA_PARA_ENTREGA', label: 'Lista p/ Entrega' },
  { estado: 'ENTREGADA', label: 'Entregada' },
];

// ─── Tipo de servicio ─────────────────────────────────────────────────────────

export const TIPO_SERVICIO_LABELS: Record<string, string> = {
  MANTENCION_PREVENTIVA: 'Mantención Preventiva',
  MANTENCION_CORRECTIVA: 'Mantención Correctiva',
  REPARACION_MAYOR: 'Reparación Mayor',
  INSPECCION: 'Inspección',
  GARANTIA: 'Garantía',
  OTRO: 'Otro',
};
