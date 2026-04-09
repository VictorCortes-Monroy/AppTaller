import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EstadoOT, Prisma, RolUsuario, TipoEventoLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { RegistrarEntregaDto } from './dto/registrar-entrega.dto';
import {
  ESTADOS_ACTIVOS,
  ESTADOS_FINALES,
  esTransicionValida,
  TRANSICIONES_VALIDAS,
} from './state-machine/ot-transitions';

// Selección estándar para respuestas de OT
const OT_SELECT = {
  id: true,
  idTaller: true,
  idVehiculo: true,
  idTecnico: true,
  numeroOT: true,
  estado: true,
  tipoServicio: true,
  descripcion: true,
  kilometraje: true,
  kilometrajeSalida: true,
  fechaEntrega: true,
  receptorNombre: true,
  comentarioCancelacion: true,
  creadoEn: true,
  updatedAt: true,
  vehiculo: { select: { id: true, marca: true, modelo: true, numeroSerie: true, cliente: true } },
  tecnico: { select: { id: true, nombre: true } },
} satisfies Prisma.OrdenTrabajoSelect;

@Injectable()
export class OrdenesService {
  constructor(private prisma: PrismaService) {}

  // ─── Crear OT ─────────────────────────────────────────────────────────────

  async create(idTaller: string, usuario: JwtPayload, dto: CreateOrdenDto) {
    // 1. Validar que el vehículo pertenece al taller
    const vehiculo = await this.prisma.vehiculo.findFirst({
      where: { id: dto.idVehiculo, idTaller, activo: true },
    });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    // 2. Validar que no hay OT activa para el vehículo
    const otActiva = await this.prisma.ordenTrabajo.findFirst({
      where: { idVehiculo: dto.idVehiculo, estado: { in: ESTADOS_ACTIVOS } },
    });
    if (otActiva) {
      throw new ConflictException(
        `El vehículo ya tiene una OT activa: ${otActiva.numeroOT}`,
      );
    }

    // 3. Validar técnico si se especificó
    if (dto.idTecnico) {
      const tecnico = await this.prisma.usuario.findFirst({
        where: { id: dto.idTecnico, idTaller, rol: RolUsuario.TECNICO, activo: true },
      });
      if (!tecnico) throw new NotFoundException('Técnico no encontrado en este taller');
    }

    // 4. Generar número OT en transacción serializable
    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();

      // Contar OTs del taller en el año actual
      const [result] = await tx.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM orden_trabajo
        WHERE id_taller = ${idTaller}
          AND EXTRACT(YEAR FROM creado_en) = ${year}
      `;
      const siguiente = Number(result.count) + 1;
      const numeroOT = `OT-${year}-${String(siguiente).padStart(3, '0')}`;

      const ot = await tx.ordenTrabajo.create({
        data: {
          idTaller,
          idVehiculo: dto.idVehiculo,
          idTecnico: dto.idTecnico,
          numeroOT,
          estado: EstadoOT.INGRESADO,
          tipoServicio: dto.tipoServicio,
          descripcion: dto.descripcion,
          kilometraje: dto.kilometraje,
        },
        select: OT_SELECT,
      });

      // 5. Log de creación (inmutable desde el inicio)
      await tx.logEstadoOT.create({
        data: {
          idOT: ot.id,
          idUsuario: usuario.sub,
          tipoEvento: TipoEventoLog.CREACION_OT,
          estadoNuevo: EstadoOT.INGRESADO,
          descripcion: `OT creada por ${usuario.email}`,
        },
      });

      return ot;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ─── Listar OTs ───────────────────────────────────────────────────────────

  async findAll(idTaller: string, usuario: JwtPayload) {
    const where: Prisma.OrdenTrabajoWhereInput = { idTaller };

    return this.prisma.ordenTrabajo.findMany({
      where,
      select: OT_SELECT,
      orderBy: { creadoEn: 'desc' },
    });
  }

  // ─── Detalle OT ───────────────────────────────────────────────────────────

  async findOne(id: string, idTaller: string, usuario: JwtPayload) {
    const where: Prisma.OrdenTrabajoWhereInput = { id, idTaller };

    const ot = await this.prisma.ordenTrabajo.findFirst({
      where,
      select: {
        ...OT_SELECT,
        repuestos: { orderBy: { creadoEn: 'asc' } },
        tareasAdicionales: {
          include: { usuario: { select: { id: true, nombre: true } } },
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
            usuario: { select: { id: true, nombre: true } },
          },
          orderBy: { fechaEvento: 'asc' },
        },
      },
    });

    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');
    return ot;
  }

  // ─── Cambiar estado ───────────────────────────────────────────────────────

  async cambiarEstado(id: string, idTaller: string, usuario: JwtPayload, dto: CambiarEstadoDto) {
    const ot = await this.prisma.ordenTrabajo.findFirst({ where: { id, idTaller } });
    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');

    // TECNICO solo puede operar en OTs asignadas a él
    if (usuario.rol === RolUsuario.TECNICO && ot.idTecnico !== usuario.sub) {
      throw new ForbiddenException('Solo puedes modificar OTs asignadas a ti');
    }

    if (ESTADOS_FINALES.includes(ot.estado)) {
      throw new UnprocessableEntityException(
        `La OT está en estado final (${ot.estado}) y no admite más cambios`,
      );
    }

    if (dto.nuevoEstado === EstadoOT.CANCELADO && !dto.comentario?.trim()) {
      throw new BadRequestException('Se requiere comentario para cancelar una OT');
    }

    // Validar transición según rol
    const esValida = await this.validarTransicion(ot, dto.nuevoEstado, usuario);
    if (!esValida) {
      throw new UnprocessableEntityException(
        `Transición inválida: ${ot.estado} → ${dto.nuevoEstado} no está permitida para el rol ${usuario.rol}`,
      );
    }

    const estadoAnterior = ot.estado;

    return this.prisma.$transaction(async (tx) => {
      const otActualizada = await tx.ordenTrabajo.update({
        where: { id },
        data: {
          estado: dto.nuevoEstado,
          ...(dto.nuevoEstado === EstadoOT.CANCELADO && {
            comentarioCancelacion: dto.comentario,
          }),
        },
        select: OT_SELECT,
      });

      await tx.logEstadoOT.create({
        data: {
          idOT: id,
          idUsuario: usuario.sub,
          tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
          estadoAnterior,
          estadoNuevo: dto.nuevoEstado,
          descripcion: dto.descripcion ?? `Estado cambiado de ${estadoAnterior} a ${dto.nuevoEstado}`,
          comentario: dto.comentario,
        },
      });

      return otActualizada;
    });
  }

  // ─── Registrar entrega ────────────────────────────────────────────────────

  async registrarEntrega(id: string, idTaller: string, usuario: JwtPayload, dto: RegistrarEntregaDto) {
    const ot = await this.prisma.ordenTrabajo.findFirst({ where: { id, idTaller } });
    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');

    if (ot.estado !== EstadoOT.LISTO_PARA_ENTREGA) {
      throw new UnprocessableEntityException(
        `La OT debe estar en LISTO_PARA_ENTREGA para registrar la entrega. Estado actual: ${ot.estado}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const otActualizada = await tx.ordenTrabajo.update({
        where: { id },
        data: {
          estado: EstadoOT.ENTREGADO,
          kilometrajeSalida: dto.kilometrajeSalida,
          fechaEntrega: new Date(dto.fechaEntrega),
          receptorNombre: dto.receptorNombre,
        },
        select: OT_SELECT,
      });

      await tx.logEstadoOT.create({
        data: {
          idOT: id,
          idUsuario: usuario.sub,
          tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
          estadoAnterior: EstadoOT.LISTO_PARA_ENTREGA,
          estadoNuevo: EstadoOT.ENTREGADO,
          descripcion: `Vehículo entregado a ${dto.receptorNombre}. KM salida: ${dto.kilometrajeSalida}`,
        },
      });

      return otActualizada;
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Valida la transición teniendo en cuenta el estado especial EN_ESPERA.
   * Si la OT está en EN_ESPERA, el único destino válido es el estado
   * inmediatamente anterior a haber entrado en pausa.
   */
  private async validarTransicion(
    ot: { id: string; estado: EstadoOT },
    nuevoEstado: EstadoOT,
    usuario: JwtPayload,
  ): Promise<boolean> {
    if (ot.estado === EstadoOT.EN_ESPERA) {
      const estadoPrevio = await this.resolverSalidaEnEspera(ot.id);
      if (!estadoPrevio) return false;
      return nuevoEstado === estadoPrevio;
    }

    return esTransicionValida(ot.estado, nuevoEstado, usuario.rol as RolUsuario);
  }

  // ─── Log de auditoría ────────────────────────────────────────────────────

  async getLog(idOT: string, idTaller: string) {
    const ot = await this.prisma.ordenTrabajo.findFirst({
      where: { id: idOT, idTaller },
    });
    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');

    return this.prisma.logEstadoOT.findMany({
      where: { idOT },
      include: { usuario: { select: { nombre: true, rol: true } } },
      orderBy: { fechaEvento: 'desc' },
    });
  }

  /**
   * Busca en el log cuál era el estado de la OT antes de entrar en EN_ESPERA.
   */
  private async resolverSalidaEnEspera(idOT: string): Promise<EstadoOT | null> {
    const logEntrada = await this.prisma.logEstadoOT.findFirst({
      where: { idOT, estadoNuevo: EstadoOT.EN_ESPERA },
      orderBy: { fechaEvento: 'desc' },
    });
    return logEntrada?.estadoAnterior ?? null;
  }
}
