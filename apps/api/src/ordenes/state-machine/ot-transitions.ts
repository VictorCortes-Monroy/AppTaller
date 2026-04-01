import { EstadoOT, RolUsuario } from '@prisma/client';

/**
 * Transiciones válidas por estado actual.
 * EN_ESPERA es especial: la transición de salida se determina dinámicamente
 * buscando el estado previo en el LogEstadoOT.
 */
export const TRANSICIONES_VALIDAS: Record<EstadoOT, EstadoOT[]> = {
  [EstadoOT.INGRESADO]:            [EstadoOT.EN_EVALUACION, EstadoOT.EN_ESPERA, EstadoOT.CANCELADO],
  [EstadoOT.EN_EVALUACION]:        [EstadoOT.ESPERANDO_REPUESTOS, EstadoOT.EN_EJECUCION, EstadoOT.EN_ESPERA, EstadoOT.CANCELADO],
  [EstadoOT.ESPERANDO_REPUESTOS]:  [EstadoOT.EN_EJECUCION, EstadoOT.EN_ESPERA, EstadoOT.CANCELADO],
  [EstadoOT.EN_EJECUCION]:         [EstadoOT.CONTROL_CALIDAD, EstadoOT.EN_ESPERA, EstadoOT.CANCELADO],
  [EstadoOT.CONTROL_CALIDAD]:      [EstadoOT.LISTO_PARA_ENTREGA, EstadoOT.EN_EJECUCION, EstadoOT.EN_ESPERA, EstadoOT.CANCELADO],
  [EstadoOT.LISTO_PARA_ENTREGA]:   [EstadoOT.ENTREGADO, EstadoOT.EN_ESPERA, EstadoOT.CANCELADO],
  [EstadoOT.ENTREGADO]:            [], // estado final
  [EstadoOT.CANCELADO]:            [], // estado final
  [EstadoOT.EN_ESPERA]:            [], // dinámico — ver OrdenesService.resolverSalidaEnEspera()
};

/** Estados que se consideran "activos" (no finalizados) */
export const ESTADOS_ACTIVOS: EstadoOT[] = [
  EstadoOT.INGRESADO,
  EstadoOT.EN_EVALUACION,
  EstadoOT.ESPERANDO_REPUESTOS,
  EstadoOT.EN_EJECUCION,
  EstadoOT.CONTROL_CALIDAD,
  EstadoOT.LISTO_PARA_ENTREGA,
  EstadoOT.EN_ESPERA,
];

/** Estados finales (no admiten más cambios) */
export const ESTADOS_FINALES: EstadoOT[] = [EstadoOT.ENTREGADO, EstadoOT.CANCELADO];

/**
 * Transiciones permitidas para TECNICO.
 * Solo puede avanzar en OTs asignadas a él; no puede cancelar ni pausar.
 */
export const TRANSICIONES_TECNICO: Partial<Record<EstadoOT, EstadoOT[]>> = {
  [EstadoOT.EN_EVALUACION]:       [EstadoOT.ESPERANDO_REPUESTOS, EstadoOT.EN_EJECUCION],
  [EstadoOT.ESPERANDO_REPUESTOS]: [EstadoOT.EN_EJECUCION],
  [EstadoOT.EN_EJECUCION]:        [EstadoOT.CONTROL_CALIDAD],
  [EstadoOT.CONTROL_CALIDAD]:     [EstadoOT.LISTO_PARA_ENTREGA],
};

/**
 * Verifica si una transición es válida para el rol dado.
 * Para EN_ESPERA la validación de salida la hace el service dinámicamente.
 */
export function esTransicionValida(
  estadoActual: EstadoOT,
  estadoNuevo: EstadoOT,
  rol: RolUsuario,
): boolean {
  if (rol === RolUsuario.TECNICO) {
    const permitidas = TRANSICIONES_TECNICO[estadoActual] ?? [];
    return permitidas.includes(estadoNuevo);
  }

  // Para EN_ESPERA → el service valida el estado de retorno dinámicamente
  if (estadoActual === EstadoOT.EN_ESPERA) return true;

  const permitidas = TRANSICIONES_VALIDAS[estadoActual] ?? [];
  return permitidas.includes(estadoNuevo);
}
