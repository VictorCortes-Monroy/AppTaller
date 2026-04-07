import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { UpdateVehiculoDto } from './dto/update-vehiculo.dto';
import { BulkCreateVehiculoDto } from './dto/bulk-create-vehiculo.dto';

@Injectable()
export class VehiculosService {
  constructor(private prisma: PrismaService) {}

  private async resolveCliente(idTaller: string, clienteNombre: string): Promise<string> {
    const existing = await this.prisma.cliente.findUnique({
      where: { idTaller_nombre: { idTaller, nombre: clienteNombre } },
    });
    if (existing) return existing.id;

    const nuevo = await this.prisma.cliente.create({
      data: { idTaller, nombre: clienteNombre },
    });
    return nuevo.id;
  }

  async create(idTaller: string, dto: CreateVehiculoDto) {
    const existe = await this.prisma.vehiculo.findUnique({
      where: { idTaller_numeroSerie: { idTaller, numeroSerie: dto.numeroSerie } },
    });

    if (existe) {
      throw new ConflictException(`Ya existe un vehículo con VIN "${dto.numeroSerie}" en este taller`);
    }

    const idCliente = await this.resolveCliente(idTaller, dto.cliente);

    return this.prisma.vehiculo.create({
      data: { idTaller, idCliente, ...dto },
    });
  }

  async bulkCreate(idTaller: string, dto: BulkCreateVehiculoDto) {
    const vins = dto.vehiculos.map((v) => v.numeroSerie);

    // Duplicados dentro del lote
    const dupsInBatch = vins.filter((n, i) => vins.indexOf(n) !== i);
    if (dupsInBatch.length > 0) {
      throw new ConflictException(`VINs duplicados en el lote: ${[...new Set(dupsInBatch)].join(', ')}`);
    }

    // VINs ya existentes en BD
    const existing = await this.prisma.vehiculo.findMany({
      where: { idTaller, numeroSerie: { in: vins } },
      select: { numeroSerie: true },
    });
    if (existing.length > 0) {
      throw new ConflictException(`VINs ya registrados: ${existing.map((e) => e.numeroSerie).join(', ')}`);
    }

    // Resolver clientes para cada vehículo
    const clienteMap = new Map<string, string>();
    for (const v of dto.vehiculos) {
      if (!clienteMap.has(v.cliente)) {
        clienteMap.set(v.cliente, await this.resolveCliente(idTaller, v.cliente));
      }
    }

    const result = await this.prisma.vehiculo.createMany({
      data: dto.vehiculos.map((v) => ({
        idTaller,
        idCliente: clienteMap.get(v.cliente),
        ...v,
      })),
    });

    return { created: result.count };
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
