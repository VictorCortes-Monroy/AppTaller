import { Injectable } from '@nestjs/common';
import { EstadoOT, EstadoRepuesto, TipoEventoLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ESTADOS_ACTIVOS_OT_STR = new Set<string>([
  EstadoOT.INGRESADO,
  EstadoOT.EN_EVALUACION,
  EstadoOT.ESPERANDO_REPUESTOS,
  EstadoOT.EN_EJECUCION,
  EstadoOT.CONTROL_CALIDAD,
  EstadoOT.LISTO_PARA_ENTREGA,
  EstadoOT.EN_ESPERA,
]);

const ESTADOS_REPUESTO_PENDIENTE = [
  EstadoRepuesto.PENDIENTE,
  EstadoRepuesto.EN_ESPERA,
  EstadoRepuesto.EN_TRANSITO,
];

const UMBRAL_DIAS_ALERTA = 7;

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ─── Resumen general ──────────────────────────────────────────────────────

  async getResumen(idTaller: string) {
    const ahora = Date.now();

    // OTs por estado
    const todasOTs = await this.prisma.ordenTrabajo.findMany({
      where: { idTaller },
      select: { id: true, estado: true, tipoServicio: true, creadoEn: true },
    });

    const otsPorEstado: Record<string, number> = {};
    const otsPorTipo: Record<string, number> = {};
    let otsActivas = 0;
    let otsCompletadas = 0;
    let otsCanceladas = 0;
    let totalDiasActivas = 0;

    for (const ot of todasOTs) {
      // Por estado
      otsPorEstado[ot.estado] = (otsPorEstado[ot.estado] || 0) + 1;

      // Por tipo de servicio
      const tipo = ot.tipoServicio || 'SIN_TIPO';
      otsPorTipo[tipo] = (otsPorTipo[tipo] || 0) + 1;

      if (ESTADOS_ACTIVOS_OT_STR.has(ot.estado)) {
        otsActivas++;
        totalDiasActivas += Math.floor((ahora - ot.creadoEn.getTime()) / 86_400_000);
      } else if (ot.estado === EstadoOT.ENTREGADO) {
        otsCompletadas++;
      } else if (ot.estado === EstadoOT.CANCELADO) {
        otsCanceladas++;
      }
    }

    // Repuestos pendientes
    const repuestosPendientes = await this.prisma.repuesto.count({
      where: {
        estado: { in: ESTADOS_REPUESTO_PENDIENTE },
        ordenTrabajo: { idTaller },
      },
    });

    const repuestosPorEstado = await this.prisma.repuesto.groupBy({
      by: ['estado'],
      where: { ordenTrabajo: { idTaller } },
      _count: { id: true },
    });

    // Actividad reciente (últimos 7 días)
    const hace7dias = new Date(ahora - 7 * 86_400_000);
    const actividadReciente = await this.prisma.logEstadoOT.findMany({
      where: {
        ordenTrabajo: { idTaller },
        fechaEvento: { gte: hace7dias },
      },
      select: { tipoEvento: true, fechaEvento: true },
      orderBy: { fechaEvento: 'asc' },
    });

    // Agrupar actividad por día
    const actividadPorDia: Record<string, number> = {};
    for (const log of actividadReciente) {
      const dia = log.fechaEvento.toISOString().substring(0, 10);
      actividadPorDia[dia] = (actividadPorDia[dia] || 0) + 1;
    }

    // Actividad por tipo
    const actividadPorTipo: Record<string, number> = {};
    for (const log of actividadReciente) {
      actividadPorTipo[log.tipoEvento] = (actividadPorTipo[log.tipoEvento] || 0) + 1;
    }

    // OTs con alerta (>7 días)
    const otsConAlerta = todasOTs.filter((ot) => {
      if (!ESTADOS_ACTIVOS_OT_STR.has(ot.estado)) return false;
      return Math.floor((ahora - ot.creadoEn.getTime()) / 86_400_000) > UMBRAL_DIAS_ALERTA;
    }).length;

    return {
      kpis: {
        otsActivas,
        otsCompletadas,
        otsCanceladas,
        otsTotal: todasOTs.length,
        otsConAlerta,
        promedioDiasActivas: otsActivas > 0 ? Math.round(totalDiasActivas / otsActivas) : 0,
        repuestosPendientes,
      },
      otsPorEstado: Object.entries(otsPorEstado).map(([estado, count]) => ({ estado, count })),
      otsPorTipo: Object.entries(otsPorTipo).map(([tipo, count]) => ({ tipo, count })),
      repuestosPorEstado: repuestosPorEstado.map((r) => ({ estado: r.estado, count: r._count.id })),
      actividadPorDia: Object.entries(actividadPorDia).map(([fecha, count]) => ({ fecha, acciones: count })),
      actividadPorTipo: Object.entries(actividadPorTipo).map(([tipo, count]) => ({ tipo, count })),
    };
  }

  // ─── Vista 1: OTs Activas ─────────────────────────────────────────────────

  async getOtsActivas(idTaller: string) {
    const ots = await this.prisma.ordenTrabajo.findMany({
      where: {
        idTaller,
        estado: { in: [...ESTADOS_ACTIVOS_OT_STR] as EstadoOT[] },
      },
      include: {
        vehiculo: { select: { numeroSerie: true, modelo: true, marca: true, cliente: true } },
        tecnico: { select: { nombre: true } },
        repuestos: {
          where: { estado: { in: ESTADOS_REPUESTO_PENDIENTE } },
          select: { id: true },
        },
        tareasAdicionales: { select: { id: true } },
      },
      orderBy: { creadoEn: 'asc' },
    });

    const ahora = Date.now();
    return ots.map((ot) => {
      const diasEnTaller = Math.floor(
        (ahora - ot.creadoEn.getTime()) / 86_400_000,
      );
      return {
        id: ot.id,
        numeroOT: ot.numeroOT,
        estado: ot.estado,
        diasEnTaller,
        alerta: diasEnTaller > UMBRAL_DIAS_ALERTA,
        vehiculo: ot.vehiculo,
        tecnico: ot.tecnico,
        repuestosPendientes: ot.repuestos.length,
        tareasAdicionalesCount: ot.tareasAdicionales.length,
        creadoEn: ot.creadoEn,
      };
    });
  }

  // ─── Vista 2: Repuestos Pendientes ────────────────────────────────────────

  async getRepuestosPendientes(idTaller: string) {
    const repuestos = await this.prisma.repuesto.findMany({
      where: {
        estado: { in: ESTADOS_REPUESTO_PENDIENTE },
        ordenTrabajo: { idTaller },
      },
      include: {
        ordenTrabajo: {
          select: {
            id: true,
            numeroOT: true,
            estado: true,
            vehiculo: { select: { numeroSerie: true, modelo: true, marca: true, cliente: true } },
          },
        },
        tareaIT: { select: { numero: true, componente: true } },
      },
      orderBy: { creadoEn: 'asc' },
    });

    const ahora = Date.now();
    const porOT: Record<string, { ot: (typeof repuestos)[number]['ordenTrabajo']; items: typeof repuestos }> = {};

    for (const r of repuestos) {
      if (!porOT[r.idOT]) porOT[r.idOT] = { ot: r.ordenTrabajo, items: [] };
      porOT[r.idOT].items.push(r);
    }

    return Object.values(porOT)
      .map(({ ot, items }) => ({
        ot,
        repuestos: items.map((r) => ({
          ...r,
          diasEspera: Math.floor((ahora - r.creadoEn.getTime()) / 86_400_000),
        })),
      }))
      .sort((a, b) => {
        const maxA = Math.max(...a.repuestos.map((r) => r.diasEspera));
        const maxB = Math.max(...b.repuestos.map((r) => r.diasEspera));
        return maxB - maxA;
      });
  }

  // ─── Vista 3: Historial de eventos ───────────────────────────────────────

  async getHistorial(idTaller: string) {
    return this.prisma.logEstadoOT.findMany({
      where: { ordenTrabajo: { idTaller } },
      include: {
        ordenTrabajo: { select: { numeroOT: true } },
        usuario: { select: { nombre: true, rol: true } },
      },
      orderBy: { fechaEvento: 'desc' },
    });
  }
}
