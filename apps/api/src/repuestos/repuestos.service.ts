import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EstadoOT, EstadoRepuesto, OrigenRepuesto, Prisma, TipoEventoLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRepuestoDto } from './dto/create-repuesto.dto';
import { ActualizarEstadoRepuestoDto } from './dto/actualizar-estado-repuesto.dto';

// Transiciones válidas de estado de repuesto (forward-only)
const TRANSICIONES_REPUESTO: Record<EstadoRepuesto, EstadoRepuesto[]> = {
  [EstadoRepuesto.PENDIENTE]: [EstadoRepuesto.EN_ESPERA],
  [EstadoRepuesto.EN_ESPERA]: [EstadoRepuesto.EN_TRANSITO],
  [EstadoRepuesto.EN_TRANSITO]: [EstadoRepuesto.RECIBIDO],
  [EstadoRepuesto.RECIBIDO]: [],
};

const ESTADOS_FINALES_OT_STR = new Set<string>([
  EstadoOT.ENTREGADO,
  EstadoOT.CANCELADO,
  EstadoOT.LISTO_PARA_ENTREGA,
]);

@Injectable()
export class RepuestosService {
  constructor(private prisma: PrismaService) {}

  // ─── Crear repuesto manual ────────────────────────────────────────────────

  async create(idOT: string, idTaller: string, idUsuario: string, dto: CreateRepuestoDto) {
    const ot = await this.prisma.ordenTrabajo.findFirst({
      where: { id: idOT, idTaller },
    });
    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');

    if (ESTADOS_FINALES_OT_STR.has(ot.estado)) {
      throw new UnprocessableEntityException(
        `No se pueden agregar repuestos a una OT en estado ${ot.estado}.`,
      );
    }

    if (dto.origen === OrigenRepuesto.TALLER && dto.costo === undefined) {
      throw new BadRequestException('El costo es obligatorio cuando el origen es TALLER.');
    }

    return this.prisma.$transaction(async (tx) => {
      const repuesto = await tx.repuesto.create({
        data: {
          idOT,
          idTareaIT: dto.idTareaIT ?? null,
          descripcion: dto.descripcion,
          cantidad: new Prisma.Decimal(dto.cantidad),
          unidad: dto.unidad,
          origen: dto.origen,
          costo: dto.costo !== undefined ? new Prisma.Decimal(dto.costo) : null,
          estado: EstadoRepuesto.PENDIENTE,
        },
      });

      await tx.logEstadoOT.create({
        data: {
          idOT,
          idUsuario,
          tipoEvento: TipoEventoLog.REGISTRO_TAREA_ADICIONAL,
          descripcion: `Repuesto manual agregado: ${dto.descripcion} (${dto.cantidad} ${dto.unidad})`,
        },
      });

      return repuesto;
    });
  }

  // ─── Listar repuestos de una OT ───────────────────────────────────────────

  async findByOT(idOT: string, idTaller: string) {
    const ot = await this.prisma.ordenTrabajo.findFirst({
      where: { id: idOT, idTaller },
    });
    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');

    return this.prisma.repuesto.findMany({
      where: { idOT },
      include: { tareaIT: { select: { numero: true, componente: true } } },
      orderBy: { creadoEn: 'asc' },
    });
  }

  // ─── Actualizar estado (solo BODEGA) ──────────────────────────────────────

  async actualizarEstado(
    id: string,
    idTaller: string,
    idUsuario: string,
    dto: ActualizarEstadoRepuestoDto,
  ) {
    const repuesto = await this.prisma.repuesto.findUnique({
      where: { id },
      include: { ordenTrabajo: { select: { idTaller: true, id: true } } },
    });

    if (!repuesto) throw new NotFoundException('Repuesto no encontrado');

    // Multi-tenant: verificar que el repuesto pertenece al taller del usuario
    if (repuesto.ordenTrabajo.idTaller !== idTaller) {
      throw new NotFoundException('Repuesto no encontrado');
    }

    const transicionesValidas = TRANSICIONES_REPUESTO[repuesto.estado];
    if (!transicionesValidas.includes(dto.nuevoEstado)) {
      throw new UnprocessableEntityException(
        `Transición inválida: ${repuesto.estado} → ${dto.nuevoEstado}. ` +
          `Transiciones válidas: ${transicionesValidas.join(', ') || 'ninguna (estado final)'}`,
      );
    }

    const idOT = repuesto.ordenTrabajo.id;
    const esRecepcion = dto.nuevoEstado === EstadoRepuesto.RECIBIDO;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.repuesto.update({
        where: { id },
        data: {
          estado: dto.nuevoEstado,
          ...(esRecepcion && {
            fechaRecepcion: new Date(),
            idReceptor: idUsuario,
          }),
        },
      });

      await tx.logEstadoOT.create({
        data: {
          idOT,
          idUsuario,
          tipoEvento: esRecepcion
            ? TipoEventoLog.RECEPCION_REPUESTO
            : TipoEventoLog.ACTUALIZACION_REPUESTO,
          descripcion: `Repuesto "${repuesto.descripcion}" cambió de ${repuesto.estado} a ${dto.nuevoEstado}`,
        },
      });

      return updated;
    });
  }

  // ─── Dashboard bodega: repuestos pendientes de todos los talleres ─────────

  async getPendientes(idTaller: string) {
    const repuestos = await this.prisma.repuesto.findMany({
      where: {
        estado: { in: [EstadoRepuesto.PENDIENTE, EstadoRepuesto.EN_ESPERA, EstadoRepuesto.EN_TRANSITO] },
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

    // Calcular días de espera y agrupar por OT
    const ahora = Date.now();
    const porOT: Record<string, { ot: (typeof repuestos)[number]['ordenTrabajo']; items: typeof repuestos }> = {};

    for (const r of repuestos) {
      if (!porOT[r.idOT]) porOT[r.idOT] = { ot: r.ordenTrabajo, items: [] };
      porOT[r.idOT].items.push(r);
    }

    return Object.values(porOT).map(({ ot, items }) => ({
      ot,
      repuestos: items.map((r) => ({
        ...r,
        diasEspera: Math.floor((ahora - r.creadoEn.getTime()) / 86_400_000),
      })),
    }));
  }
}
