import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  EstadoOS,
  EstadoOT,
  Prisma,
  TipoEventoLog,
  TipoEventoLogOS,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';
import { RegistrarEntregaOsDto } from './dto/registrar-entrega-os.dto';
import { CancelarOsDto } from './dto/cancelar-os.dto';

// Estados que mantienen una OS "abierta" (no finalizada)
export const ESTADOS_OS_ACTIVOS: EstadoOS[] = [
  EstadoOS.ABIERTA,
  EstadoOS.EN_SERVICIO,
  EstadoOS.LISTA_PARA_ENTREGA,
];

// Estados de OT considerados "trabajo activo" (mueven la OS a EN_SERVICIO)
const ESTADOS_OT_TRABAJO_ACTIVO: EstadoOT[] = [
  EstadoOT.EN_EVALUACION,
  EstadoOT.ESPERANDO_REPUESTOS,
  EstadoOT.EN_EJECUCION,
  EstadoOT.CONTROL_CALIDAD,
  EstadoOT.EN_ESPERA,
];

// Estados de OT considerados finalizados pero antes de retiro
const ESTADOS_OT_LISTOS: EstadoOT[] = [
  EstadoOT.LISTO_PARA_ENTREGA,
  EstadoOT.ENTREGADO,
];

const ESTADOS_OT_FINALES: EstadoOT[] = [
  EstadoOT.ENTREGADO,
  EstadoOT.CANCELADO,
];

const OS_SELECT = {
  id: true,
  idTaller: true,
  idVehiculo: true,
  numeroOS: true,
  estado: true,
  kilometrajeIngreso: true,
  kilometrajeSalida: true,
  motivoIngreso: true,
  fechaIngreso: true,
  fechaEntrega: true,
  receptorNombre: true,
  comentarioCancelacion: true,
  creadoEn: true,
  updatedAt: true,
  vehiculo: {
    select: {
      id: true,
      marca: true,
      modelo: true,
      numeroSerie: true,
      cliente: true,
      clienteRef: { select: { id: true, nombre: true } },
    },
  },
} satisfies Prisma.OrdenServicioSelect;

@Injectable()
export class OrdenesServicioService {
  constructor(private prisma: PrismaService) {}

  // ─── Crear OS ──────────────────────────────────────────────────────────────

  async create(idTaller: string, usuario: JwtPayload, dto: CreateOrdenServicioDto) {
    // 1. Validar vehículo del taller
    const vehiculo = await this.prisma.vehiculo.findFirst({
      where: { id: dto.idVehiculo, idTaller, activo: true },
    });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    // 2. Validar que no haya OS activa para ese vehículo
    const osActiva = await this.prisma.ordenServicio.findFirst({
      where: { idVehiculo: dto.idVehiculo, estado: { in: ESTADOS_OS_ACTIVOS } },
    });
    if (osActiva) {
      throw new ConflictException(
        `El vehículo ya tiene una orden de servicio activa: ${osActiva.numeroOS}`,
      );
    }

    // 3. Crear OS y log en transacción
    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const [result] = await tx.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM orden_servicio
        WHERE id_taller = ${idTaller}
          AND EXTRACT(YEAR FROM creado_en) = ${year}
      `;
      const siguiente = Number(result.count) + 1;
      const numeroOS = `OS-${year}-${String(siguiente).padStart(3, '0')}`;

      const os = await tx.ordenServicio.create({
        data: {
          idTaller,
          idVehiculo: dto.idVehiculo,
          numeroOS,
          estado: EstadoOS.ABIERTA,
          motivoIngreso: dto.motivoIngreso,
          kilometrajeIngreso: dto.kilometrajeIngreso,
        },
        select: OS_SELECT,
      });

      await tx.logEstadoOS.create({
        data: {
          idOrdenServicio: os.id,
          idUsuario: usuario.sub,
          tipoEvento: TipoEventoLogOS.CREACION_OS,
          estadoNuevo: EstadoOS.ABIERTA,
          descripcion: `OS creada por ${usuario.email}`,
          comentario: dto.motivoIngreso,
        },
      });

      return os;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ─── Listar OS ─────────────────────────────────────────────────────────────

  async findAll(idTaller: string, filtros?: { estado?: EstadoOS; idVehiculo?: string }) {
    const where: Prisma.OrdenServicioWhereInput = { idTaller };
    if (filtros?.estado) where.estado = filtros.estado;
    if (filtros?.idVehiculo) where.idVehiculo = filtros.idVehiculo;

    const lista = await this.prisma.ordenServicio.findMany({
      where,
      select: {
        ...OS_SELECT,
        ordenesTrabajo: {
          select: {
            id: true,
            numeroOT: true,
            estado: true,
            frente: true,
            tecnico: { select: { id: true, nombre: true } },
            repuestos: { select: { id: true, estado: true } },
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });

    return lista.map((os) => {
      const dias = Math.floor(
        (Date.now() - new Date(os.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24),
      );
      const repuestosPendientes = os.ordenesTrabajo.reduce(
        (acc, ot) => acc + ot.repuestos.filter((r) => r.estado !== 'RECIBIDO').length,
        0,
      );
      return {
        ...os,
        diasEnTaller: dias,
        alerta: dias > 7 && ESTADOS_OS_ACTIVOS.includes(os.estado),
        totalOTs: os.ordenesTrabajo.length,
        repuestosPendientes,
      };
    });
  }

  // ─── Detalle OS ────────────────────────────────────────────────────────────

  async findOne(id: string, idTaller: string) {
    const os = await this.prisma.ordenServicio.findFirst({
      where: { id, idTaller },
      select: {
        ...OS_SELECT,
        ordenesTrabajo: {
          select: {
            id: true,
            numeroOT: true,
            estado: true,
            frente: true,
            tipoServicio: true,
            descripcion: true,
            creadoEn: true,
            tecnico: { select: { id: true, nombre: true } },
            repuestos: {
              select: {
                id: true,
                descripcion: true,
                estado: true,
                cantidad: true,
                unidad: true,
              },
            },
            tareasAdicionales: { select: { id: true, descripcion: true, costo: true } },
          },
          orderBy: { creadoEn: 'asc' },
        },
        logs: {
          select: {
            id: true,
            tipoEvento: true,
            estadoAnterior: true,
            estadoNuevo: true,
            descripcion: true,
            comentario: true,
            fechaEvento: true,
            usuario: { select: { id: true, nombre: true, rol: true } },
          },
          orderBy: { fechaEvento: 'desc' },
        },
      },
    });

    if (!os) throw new NotFoundException('Orden de servicio no encontrada');

    const dias = Math.floor(
      (Date.now() - new Date(os.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24),
    );

    return { ...os, diasEnTaller: dias };
  }

  // ─── Registrar entrega ─────────────────────────────────────────────────────

  async registrarEntrega(
    id: string,
    idTaller: string,
    usuario: JwtPayload,
    dto: RegistrarEntregaOsDto,
  ) {
    const os = await this.prisma.ordenServicio.findFirst({
      where: { id, idTaller },
      include: { ordenesTrabajo: true },
    });
    if (!os) throw new NotFoundException('Orden de servicio no encontrada');

    if (os.estado === EstadoOS.ENTREGADA || os.estado === EstadoOS.CANCELADA) {
      throw new UnprocessableEntityException(
        `La OS está en estado final (${os.estado}) y no admite más cambios`,
      );
    }

    // Todas las OTs deben estar en ENTREGADO/CANCELADO/LISTO_PARA_ENTREGA
    const otsNoFinalizadas = os.ordenesTrabajo.filter(
      (ot) =>
        !ESTADOS_OT_FINALES.includes(ot.estado) &&
        ot.estado !== EstadoOT.LISTO_PARA_ENTREGA,
    );
    if (otsNoFinalizadas.length > 0) {
      throw new UnprocessableEntityException(
        `Hay ${otsNoFinalizadas.length} OT(s) sin finalizar. Cierra todas las OTs antes de entregar la OS.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Llevar todas las OTs LISTO_PARA_ENTREGA → ENTREGADO en cascada
      const otsListas = os.ordenesTrabajo.filter(
        (ot) => ot.estado === EstadoOT.LISTO_PARA_ENTREGA,
      );
      for (const ot of otsListas) {
        await tx.ordenTrabajo.update({
          where: { id: ot.id },
          data: {
            estado: EstadoOT.ENTREGADO,
            kilometrajeSalida: dto.kilometrajeSalida,
            fechaEntrega: new Date(dto.fechaEntrega),
            receptorNombre: dto.receptorNombre,
          },
        });
        await tx.logEstadoOT.create({
          data: {
            idOT: ot.id,
            idUsuario: usuario.sub,
            tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
            estadoAnterior: EstadoOT.LISTO_PARA_ENTREGA,
            estadoNuevo: EstadoOT.ENTREGADO,
            descripcion: `Entrega OS ${os.numeroOS}: vehículo retirado por ${dto.receptorNombre}`,
          },
        });
      }

      // Actualizar OS
      const osActualizada = await tx.ordenServicio.update({
        where: { id },
        data: {
          estado: EstadoOS.ENTREGADA,
          kilometrajeSalida: dto.kilometrajeSalida,
          fechaEntrega: new Date(dto.fechaEntrega),
          receptorNombre: dto.receptorNombre,
        },
        select: OS_SELECT,
      });

      await tx.logEstadoOS.create({
        data: {
          idOrdenServicio: id,
          idUsuario: usuario.sub,
          tipoEvento: TipoEventoLogOS.ENTREGA_OS,
          estadoAnterior: os.estado,
          estadoNuevo: EstadoOS.ENTREGADA,
          descripcion: `Vehículo entregado a ${dto.receptorNombre}. KM salida: ${dto.kilometrajeSalida}`,
          comentario: dto.comentario,
        },
      });

      return osActualizada;
    });
  }

  // ─── Cancelar OS ───────────────────────────────────────────────────────────

  async cancelar(id: string, idTaller: string, usuario: JwtPayload, dto: CancelarOsDto) {
    const os = await this.prisma.ordenServicio.findFirst({
      where: { id, idTaller },
      include: { ordenesTrabajo: true },
    });
    if (!os) throw new NotFoundException('Orden de servicio no encontrada');

    if (os.estado === EstadoOS.ENTREGADA || os.estado === EstadoOS.CANCELADA) {
      throw new UnprocessableEntityException(
        `La OS está en estado final (${os.estado}) y no admite más cambios`,
      );
    }

    if (!dto.comentario?.trim()) {
      throw new BadRequestException('Se requiere comentario para cancelar la OS');
    }

    return this.prisma.$transaction(async (tx) => {
      // Cancelar en cascada las OTs activas (no finalizadas)
      const otsActivas = os.ordenesTrabajo.filter(
        (ot) => !ESTADOS_OT_FINALES.includes(ot.estado),
      );
      for (const ot of otsActivas) {
        await tx.ordenTrabajo.update({
          where: { id: ot.id },
          data: {
            estado: EstadoOT.CANCELADO,
            comentarioCancelacion: `Cancelación en cascada por OS ${os.numeroOS}: ${dto.comentario}`,
          },
        });
        await tx.logEstadoOT.create({
          data: {
            idOT: ot.id,
            idUsuario: usuario.sub,
            tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
            estadoAnterior: ot.estado,
            estadoNuevo: EstadoOT.CANCELADO,
            descripcion: `Cancelada en cascada por cancelación de OS ${os.numeroOS}`,
            comentario: dto.comentario,
          },
        });
      }

      const osActualizada = await tx.ordenServicio.update({
        where: { id },
        data: {
          estado: EstadoOS.CANCELADA,
          comentarioCancelacion: dto.comentario,
        },
        select: OS_SELECT,
      });

      await tx.logEstadoOS.create({
        data: {
          idOrdenServicio: id,
          idUsuario: usuario.sub,
          tipoEvento: TipoEventoLogOS.CANCELACION_OS,
          estadoAnterior: os.estado,
          estadoNuevo: EstadoOS.CANCELADA,
          descripcion: `OS cancelada por ${usuario.email}`,
          comentario: dto.comentario,
        },
      });

      return osActualizada;
    });
  }

  // ─── Log OS ────────────────────────────────────────────────────────────────

  async getLog(id: string, idTaller: string) {
    const os = await this.prisma.ordenServicio.findFirst({ where: { id, idTaller } });
    if (!os) throw new NotFoundException('Orden de servicio no encontrada');

    return this.prisma.logEstadoOS.findMany({
      where: { idOrdenServicio: id },
      include: { usuario: { select: { nombre: true, rol: true } } },
      orderBy: { fechaEvento: 'desc' },
    });
  }

  // ─── Recálculo automático de estado OS ─────────────────────────────────────

  /**
   * Recalcula el estado de una OS según el estado de sus OTs hijas.
   * Esta función se invoca desde OrdenesService cada vez que cambia
   * el estado de una OT (creación, cambio de estado, entrega).
   *
   * Reglas:
   * - No toca OS en estados ENTREGADA o CANCELADA (finales por acción manual)
   * - Si todas las OTs están en INGRESADO o no hay OTs → ABIERTA
   * - Si al menos 1 OT está en estado de trabajo activo → EN_SERVICIO
   * - Si todas las OTs están en LISTO_PARA_ENTREGA/ENTREGADO/CANCELADO
   *   y al menos 1 está en LISTO_PARA_ENTREGA o ENTREGADO → LISTA_PARA_ENTREGA
   *
   * Si el estado calculado difiere del actual, registra log CAMBIO_ESTADO_OS.
   */
  async recalcularEstadoOS(
    idOS: string,
    usuario: JwtPayload,
    tx: Prisma.TransactionClient,
  ): Promise<EstadoOS> {
    const os = await tx.ordenServicio.findUnique({
      where: { id: idOS },
      include: { ordenesTrabajo: { select: { estado: true } } },
    });
    if (!os) throw new NotFoundException('OS no encontrada para recálculo');

    // Estados finales no se tocan
    if (os.estado === EstadoOS.ENTREGADA || os.estado === EstadoOS.CANCELADA) {
      return os.estado;
    }

    const ots = os.ordenesTrabajo;
    let nuevoEstado: EstadoOS;

    if (ots.length === 0) {
      nuevoEstado = EstadoOS.ABIERTA;
    } else if (ots.every((ot) => ot.estado === EstadoOT.INGRESADO)) {
      nuevoEstado = EstadoOS.ABIERTA;
    } else if (ots.some((ot) => ESTADOS_OT_TRABAJO_ACTIVO.includes(ot.estado))) {
      nuevoEstado = EstadoOS.EN_SERVICIO;
    } else if (
      ots.every(
        (ot) =>
          ESTADOS_OT_LISTOS.includes(ot.estado) || ot.estado === EstadoOT.CANCELADO,
      ) &&
      ots.some((ot) => ESTADOS_OT_LISTOS.includes(ot.estado))
    ) {
      nuevoEstado = EstadoOS.LISTA_PARA_ENTREGA;
    } else {
      nuevoEstado = EstadoOS.ABIERTA;
    }

    if (nuevoEstado !== os.estado) {
      await tx.ordenServicio.update({
        where: { id: idOS },
        data: { estado: nuevoEstado },
      });
      await tx.logEstadoOS.create({
        data: {
          idOrdenServicio: idOS,
          idUsuario: usuario.sub,
          tipoEvento: TipoEventoLogOS.CAMBIO_ESTADO_OS,
          estadoAnterior: os.estado,
          estadoNuevo: nuevoEstado,
          descripcion: `Estado de OS recalculado: ${os.estado} → ${nuevoEstado}`,
        },
      });
    }

    return nuevoEstado;
  }
}
