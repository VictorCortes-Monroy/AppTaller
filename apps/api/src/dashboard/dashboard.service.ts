import { Injectable } from '@nestjs/common';
import { EstadoOS, EstadoOT, EstadoRepuesto, TipoEventoLog } from '@prisma/client';
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

const ESTADOS_OS_ACTIVOS: EstadoOS[] = [
  EstadoOS.ABIERTA,
  EstadoOS.EN_SERVICIO,
  EstadoOS.LISTA_PARA_ENTREGA,
];

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
      otsPorEstado[ot.estado] = (otsPorEstado[ot.estado] || 0) + 1;
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

    // OS por estado
    const todasOS = await this.prisma.ordenServicio.findMany({
      where: { idTaller },
      select: { id: true, estado: true, fechaIngreso: true },
    });
    const osPorEstado: Record<string, number> = {};
    let osActivas = 0;
    for (const os of todasOS) {
      osPorEstado[os.estado] = (osPorEstado[os.estado] || 0) + 1;
      if (ESTADOS_OS_ACTIVOS.includes(os.estado)) osActivas++;
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

    const actividadPorDia: Record<string, number> = {};
    for (const log of actividadReciente) {
      const dia = log.fechaEvento.toISOString().substring(0, 10);
      actividadPorDia[dia] = (actividadPorDia[dia] || 0) + 1;
    }

    const actividadPorTipo: Record<string, number> = {};
    for (const log of actividadReciente) {
      actividadPorTipo[log.tipoEvento] = (actividadPorTipo[log.tipoEvento] || 0) + 1;
    }

    const otsConAlerta = todasOTs.filter((ot) => {
      if (!ESTADOS_ACTIVOS_OT_STR.has(ot.estado)) return false;
      return Math.floor((ahora - ot.creadoEn.getTime()) / 86_400_000) > UMBRAL_DIAS_ALERTA;
    }).length;

    const osConAlerta = todasOS.filter((os) => {
      if (!ESTADOS_OS_ACTIVOS.includes(os.estado)) return false;
      return Math.floor((ahora - os.fechaIngreso.getTime()) / 86_400_000) > UMBRAL_DIAS_ALERTA;
    }).length;

    return {
      kpis: {
        osActivas,
        osTotal: todasOS.length,
        osConAlerta,
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
      osPorEstado: Object.entries(osPorEstado).map(([estado, count]) => ({ estado, count })),
      repuestosPorEstado: repuestosPorEstado.map((r) => ({ estado: r.estado, count: r._count.id })),
      actividadPorDia: Object.entries(actividadPorDia).map(([fecha, count]) => ({ fecha, acciones: count })),
      actividadPorTipo: Object.entries(actividadPorTipo).map(([tipo, count]) => ({ tipo, count })),
    };
  }

  // ─── Vista 1: OTs Activas (con contexto de OS padre) ──────────────────────

  async getOtsActivas(idTaller: string) {
    const ots = await this.prisma.ordenTrabajo.findMany({
      where: {
        idTaller,
        estado: { in: [...ESTADOS_ACTIVOS_OT_STR] as EstadoOT[] },
      },
      include: {
        vehiculo: { select: { numeroSerie: true, modelo: true, marca: true, cliente: true } },
        tecnico: { select: { nombre: true } },
        ordenServicio: { select: { id: true, numeroOS: true, estado: true } },
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
        frente: ot.frente,
        diasEnTaller,
        alerta: diasEnTaller > UMBRAL_DIAS_ALERTA,
        vehiculo: ot.vehiculo,
        tecnico: ot.tecnico,
        ordenServicio: ot.ordenServicio,
        repuestosPendientes: ot.repuestos.length,
        tareasAdicionalesCount: ot.tareasAdicionales.length,
        creadoEn: ot.creadoEn,
      };
    });
  }

  // ─── Vista 2: Repuestos Pendientes (con contexto OS) ──────────────────────

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
            frente: true,
            vehiculo: { select: { numeroSerie: true, modelo: true, marca: true, cliente: true } },
            ordenServicio: { select: { id: true, numeroOS: true } },
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

  // ─── Vista 3: Historial combinado (logs OT + OS) ──────────────────────────

  async getHistorial(idTaller: string) {
    const [logsOT, logsOS] = await Promise.all([
      this.prisma.logEstadoOT.findMany({
        where: { ordenTrabajo: { idTaller } },
        include: {
          ordenTrabajo: { select: { numeroOT: true, ordenServicio: { select: { numeroOS: true } } } },
          usuario: { select: { nombre: true, rol: true } },
        },
        orderBy: { fechaEvento: 'desc' },
      }),
      this.prisma.logEstadoOS.findMany({
        where: { ordenServicio: { idTaller } },
        include: {
          ordenServicio: { select: { numeroOS: true } },
          usuario: { select: { nombre: true, rol: true } },
        },
        orderBy: { fechaEvento: 'desc' },
      }),
    ]);

    // Combinar y ordenar cronológicamente
    const eventos = [
      ...logsOT.map((l) => ({
        id: l.id,
        nivel: 'OT' as const,
        tipoEvento: l.tipoEvento,
        estadoAnterior: l.estadoAnterior,
        estadoNuevo: l.estadoNuevo,
        descripcion: l.descripcion,
        comentario: l.comentario,
        fechaEvento: l.fechaEvento,
        ordenTrabajo: { numeroOT: l.ordenTrabajo.numeroOT },
        ordenServicio: l.ordenTrabajo.ordenServicio
          ? { numeroOS: l.ordenTrabajo.ordenServicio.numeroOS }
          : null,
        usuario: l.usuario,
      })),
      ...logsOS.map((l) => ({
        id: l.id,
        nivel: 'OS' as const,
        tipoEvento: l.tipoEvento,
        estadoAnterior: l.estadoAnterior,
        estadoNuevo: l.estadoNuevo,
        descripcion: l.descripcion,
        comentario: l.comentario,
        fechaEvento: l.fechaEvento,
        ordenTrabajo: null,
        ordenServicio: { numeroOS: l.ordenServicio.numeroOS },
        usuario: l.usuario,
      })),
    ];

    return eventos.sort((a, b) => b.fechaEvento.getTime() - a.fechaEvento.getTime());
  }
}
