import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EstadoOT, EstadoRepuesto, Prisma, TipoEventoLog } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../common/s3/s3.service';
import {
  contentTypeDesdeExt,
  esExtensionValida,
  extensionDesdeNombre,
} from './dto/presigned-url.dto';
import { CreateInformeTecnicoDto } from './dto/create-it.dto';
import { CreateTareaITDto } from './dto/create-tarea-it.dto';
import { UpdateTareaITDto } from './dto/update-tarea-it.dto';
import { BulkCreateTareasDto } from './dto/bulk-create-tareas.dto';

@Injectable()
export class InformeTecnicoService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  // ─── Presigned URL ────────────────────────────────────────────────────────

  async getPresignedUrl(idOT: string, idTaller: string, fileName: string) {
    const ot = await this.validarOTParaIT(idOT, idTaller);

    const ext = extensionDesdeNombre(fileName);
    if (!esExtensionValida(ext)) {
      throw new BadRequestException(
        `Extensión "${ext}" no permitida. Use PDF, XLS o XLSX.`,
      );
    }

    const key = `it-files/${idTaller}/${idOT}/${randomUUID()}.${ext}`;
    const presignedUrl = await this.s3.generatePresignedPutUrl(key, contentTypeDesdeExt(ext));

    return { presignedUrl, key };
  }

  // ─── Crear IT ─────────────────────────────────────────────────────────────

  async crearIT(idOT: string, idTaller: string, idUsuario: string, dto: CreateInformeTecnicoDto) {
    await this.validarOTParaIT(idOT, idTaller);

    // Validar que el key pertenece a esta OT/taller (seguridad)
    const expectedPrefix = `it-files/${idTaller}/${idOT}/`;
    if (!dto.key.startsWith(expectedPrefix)) {
      throw new BadRequestException('El key del archivo no corresponde a esta OT.');
    }

    const ext = dto.key.split('.').pop()?.toLowerCase() ?? '';
    if (!esExtensionValida(ext)) {
      throw new BadRequestException('Extensión de archivo inválida en el key.');
    }

    const archivoNombre = dto.key.split('/').pop() ?? dto.key;

    return this.prisma.$transaction(async (tx) => {
      const it = await tx.informeTecnico.create({
        data: {
          idOT,
          fechaEvaluacion: new Date(dto.fechaEvaluacion),
          evaluador: dto.evaluador,
          kilometraje: dto.kilometraje,
          observaciones: dto.observaciones,
          archivoUrl: this.s3.getPublicUrl(dto.key),
          archivoNombre,
        },
        include: { tareas: true },
      });

      await tx.logEstadoOT.create({
        data: {
          idOT,
          idUsuario,
          tipoEvento: TipoEventoLog.SUBIDA_IT,
          descripcion: `Informe Técnico cargado por ${archivoNombre}. Evaluador: ${dto.evaluador}`,
        },
      });

      return it;
    });
  }

  // ─── Ver IT ───────────────────────────────────────────────────────────────

  async getIT(idOT: string, idTaller: string) {
    // Validar que la OT pertenece al taller
    const ot = await this.prisma.ordenTrabajo.findFirst({
      where: { id: idOT, idTaller },
    });
    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');

    const it = await this.prisma.informeTecnico.findUnique({
      where: { idOT },
      include: {
        tareas: {
          include: { repuesto: true },
          orderBy: { numero: 'asc' },
        },
      },
    });

    if (!it) throw new NotFoundException('Esta OT no tiene Informe Técnico registrado');
    return it;
  }

  // ─── Crear Tarea STP ──────────────────────────────────────────────────────

  async crearTarea(idOT: string, idTaller: string, idUsuario: string, dto: CreateTareaITDto) {
    // Verificar que el IT existe y pertenece al taller
    const ot = await this.prisma.ordenTrabajo.findFirst({
      where: { id: idOT, idTaller },
      include: { informeTecnico: true },
    });
    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');
    if (!ot.informeTecnico) {
      throw new UnprocessableEntityException(
        'Debes cargar el Informe Técnico antes de registrar tareas STP.',
      );
    }
    if (ot.estado === EstadoOT.ENTREGADO || ot.estado === EstadoOT.CANCELADO) {
      throw new UnprocessableEntityException(
        'No se pueden agregar tareas a una OT en estado final.',
      );
    }

    const idIT = ot.informeTecnico.id;

    return this.prisma.$transaction(async (tx) => {
      const tarea = await tx.tareaIT.create({
        data: {
          idIT,
          numero: dto.numero,
          componente: dto.componente,
          descripcion: dto.descripcion,
          requiereRepuesto: dto.requiereRepuesto,
        },
      });

      if (dto.requiereRepuesto) {
        await tx.repuesto.create({
          data: {
            idOT,
            idTareaIT: tarea.id,
            descripcion: dto.descripcionRepuesto!,
            cantidad: new Prisma.Decimal(dto.cantidad!),
            unidad: dto.unidad!,
            origen: dto.origen!,
            costo: dto.costo !== undefined ? new Prisma.Decimal(dto.costo) : null,
            estado: EstadoRepuesto.PENDIENTE,
          },
        });

        await tx.logEstadoOT.create({
          data: {
            idOT,
            idUsuario,
            tipoEvento: TipoEventoLog.REGISTRO_TAREA_ADICIONAL,
            descripcion: `Tarea STP #${dto.numero} creó repuesto automáticamente: ${dto.descripcionRepuesto}`,
          },
        });
      }

      return tx.tareaIT.findUnique({
        where: { id: tarea.id },
        include: { repuesto: true },
      });
    });
  }

  // ─── Bulk Create Tareas STP ────────────────────────────────────────────────

  async bulkCrearTareas(idOT: string, idTaller: string, dto: BulkCreateTareasDto) {
    const ot = await this.prisma.ordenTrabajo.findFirst({
      where: { id: idOT, idTaller },
      include: { informeTecnico: { select: { id: true } } },
    });
    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');
    if (!ot.informeTecnico) {
      throw new UnprocessableEntityException(
        'Debes cargar el Informe Técnico antes de registrar tareas STP.',
      );
    }
    if (ot.estado === EstadoOT.ENTREGADO || ot.estado === EstadoOT.CANCELADO) {
      throw new UnprocessableEntityException(
        'No se pueden agregar tareas a una OT en estado final.',
      );
    }

    const idIT = ot.informeTecnico.id;

    return this.prisma.$transaction(async (tx) => {
      const created: unknown[] = [];
      for (const item of dto.tareas) {
        const tarea = await tx.tareaIT.create({
          data: {
            idIT,
            numero: item.numero,
            componente: item.componente,
            descripcion: item.descripcion,
            requiereRepuesto: item.requiereRepuesto,
          },
          include: { repuesto: true },
        });
        created.push(tarea);
      }
      return created;
    });
  }

  // ─── Actualizar Tarea STP ──────────────────────────────────────────────────

  async actualizarTarea(
    idOT: string,
    idTarea: string,
    idTaller: string,
    dto: UpdateTareaITDto,
  ) {
    const ot = await this.prisma.ordenTrabajo.findFirst({
      where: { id: idOT, idTaller },
      include: { informeTecnico: { select: { id: true } } },
    });
    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');
    if (ot.estado === EstadoOT.ENTREGADO || ot.estado === EstadoOT.CANCELADO) {
      throw new UnprocessableEntityException(
        'No se pueden modificar tareas de una OT en estado final.',
      );
    }
    if (!ot.informeTecnico) {
      throw new NotFoundException('Esta OT no tiene Informe Técnico.');
    }

    const tarea = await this.prisma.tareaIT.findFirst({
      where: { id: idTarea, idIT: ot.informeTecnico.id },
    });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');

    return this.prisma.tareaIT.update({
      where: { id: idTarea },
      data: {
        ...(dto.componente !== undefined && { componente: dto.componente }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.completada !== undefined && { completada: dto.completada }),
      },
      include: { repuesto: true },
    });
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  private async validarOTParaIT(idOT: string, idTaller: string) {
    const ot = await this.prisma.ordenTrabajo.findFirst({
      where: { id: idOT, idTaller },
      include: { informeTecnico: { select: { id: true } } },
    });

    if (!ot) throw new NotFoundException('Orden de trabajo no encontrada');

    if (ot.estado !== EstadoOT.EN_EVALUACION) {
      throw new UnprocessableEntityException(
        `El IT solo se puede cargar cuando la OT está en EN_EVALUACION. Estado actual: ${ot.estado}`,
      );
    }

    if (ot.informeTecnico) {
      throw new ConflictException('Esta OT ya tiene un Informe Técnico registrado.');
    }

    return ot;
  }
}
