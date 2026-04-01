import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { UpdateVehiculoDto } from './dto/update-vehiculo.dto';

@Injectable()
export class VehiculosService {
  constructor(private prisma: PrismaService) {}

  async create(idTaller: string, dto: CreateVehiculoDto) {
    const existe = await this.prisma.vehiculo.findUnique({
      where: { idTaller_numeroSerie: { idTaller, numeroSerie: dto.numeroSerie } },
    });

    if (existe) {
      throw new ConflictException(`Ya existe un vehículo con VIN "${dto.numeroSerie}" en este taller`);
    }

    return this.prisma.vehiculo.create({
      data: { idTaller, ...dto },
    });
  }

  async findAll(idTaller: string) {
    return this.prisma.vehiculo.findMany({
      where: { idTaller, activo: true },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(id: string, idTaller: string) {
    const vehiculo = await this.prisma.vehiculo.findFirst({
      where: { id, idTaller },
      include: {
        ordenesTrabajo: {
          select: {
            id: true,
            numeroOT: true,
            estado: true,
            creadoEn: true,
            updatedAt: true,
          },
          orderBy: { creadoEn: 'desc' },
        },
      },
    });

    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');
    return vehiculo;
  }

  async update(id: string, idTaller: string, dto: UpdateVehiculoDto) {
    const vehiculo = await this.prisma.vehiculo.findFirst({ where: { id, idTaller } });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    // No se puede desactivar si tiene OTs activas
    if (dto.activo === false) {
      const { ESTADOS_ACTIVOS } = await import('../ordenes/state-machine/ot-transitions');
      const otActiva = await this.prisma.ordenTrabajo.findFirst({
        where: { idVehiculo: id, estado: { in: ESTADOS_ACTIVOS } },
      });
      if (otActiva) {
        throw new ConflictException(
          'No se puede desactivar el vehículo porque tiene una OT activa',
        );
      }
    }

    return this.prisma.vehiculo.update({ where: { id }, data: dto });
  }
}
