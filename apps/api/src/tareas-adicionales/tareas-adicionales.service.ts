import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EstadoOT, Prisma, RolUsuario, TipoEventoLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTareaAdicionalDto } from './dto/create-tarea-adicional.dto';
import { UpdateTareaAdicionalDto } from './dto/update-tarea-adicional.dto';

const ESTADOS_FINALES = new Set<string>([EstadoOT.ENTREGADO, EstadoOT.CANCELADO]);

@Injectable()
export class TareasAdicionalesService {
  constructor(private prisma: PrismaService) {}

  // ─── Crear ───────────────────────────────────────────────────────────────

  async create(idOT: string, idTaller: string, idUsuario: string, dto: CreateTareaAdicionalDto) {
    const ot = await this.prisma.ordenTrabajo.findFirst({
      where: { id: idOT, idTaller },
    });
    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');

    if (ESTADOS_FINALES.has(ot.estado)) {
      throw new UnprocessableEntityException(
        `No se pueden registrar tareas en una OT en estado ${ot.estado}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const tarea = await tx.tareaAdicional.create({
        data: {
          idOT,
          idUsuario,
          descripcion: dto.descripcion,
          componente: dto.componente,
          tipoTrabajo: dto.tipoTrabajo,
          momentoRegistro: dto.momentoRegistro,
          insumos: dto.insumos,
          costo: new Prisma.Decimal(dto.costo),
        },
        include: { usuario: { select: { nombre: true, rol: true } } },
      });

      await tx.logEstadoOT.create({
        data: {
          idOT,
          idUsuario,
          tipoEvento: TipoEventoLog.REGISTRO_TAREA_ADICIONAL,
          descripcion: `Tarea adicional registrada: ${dto.descripcion}. Costo: $${dto.costo}`,
        },
      });

      return tarea;
    });
  }

  // ─── Listar ───────────────────────────────────────────────────────────────

  async findByOT(idOT: string, idTaller: string) {
    const ot = await this.prisma.ordenTrabajo.findFirst({
      where: { id: idOT, idTaller },
    });
    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');

    return this.prisma.tareaAdicional.findMany({
      where: { idOT },
      include: { usuario: { select: { nombre: true, rol: true } } },
      orderBy: { creadoEn: 'desc' },
    });
  }

  // ─── Editar ───────────────────────────────────────────────────────────────

  async update(
    id: string,
    idTaller: string,
    idUsuario: string,
    rol: RolUsuario,
    dto: UpdateTareaAdicionalDto,
  ) {
    const tarea = await this.prisma.tareaAdicional.findUnique({
      where: { id },
      include: { ordenTrabajo: { select: { idTaller: true, estado: true, id: true } } },
    });

    if (!tarea) throw new NotFoundException('Tarea adicional no encontrada');
    if (tarea.ordenTrabajo.idTaller !== idTaller) {
      throw new NotFoundException('Tarea adicional no encontrada');
    }

    // Solo el creador, SUPERVISOR o JEFE pueden editar
    if (
      tarea.idUsuario !== idUsuario &&
      rol !== RolUsuario.SUPERVISOR &&
      rol !== RolUsuario.JEFE
    ) {
      throw new ForbiddenException('No tienes permiso para editar esta tarea.');
    }

    if (ESTADOS_FINALES.has(tarea.ordenTrabajo.estado)) {
      throw new UnprocessableEntityException(
        'No se puede editar una tarea de una OT en estado final.',
      );
    }

    return this.prisma.tareaAdicional.update({
      where: { id },
      data: {
        descripcion: dto.descripcion,
        componente: dto.componente,
        tipoTrabajo: dto.tipoTrabajo,
        momentoRegistro: dto.momentoRegistro,
        insumos: dto.insumos,
        costo: dto.costo !== undefined ? new Prisma.Decimal(dto.costo) : undefined,
      },
      include: { usuario: { select: { nombre: true, rol: true } } },
    });
  }
}
