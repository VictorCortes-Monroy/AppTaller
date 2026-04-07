import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async create(idTaller: string, dto: CreateClienteDto) {
    const existe = await this.prisma.cliente.findUnique({
      where: { idTaller_nombre: { idTaller, nombre: dto.nombre } },
    });
    if (existe) {
      throw new ConflictException(`Ya existe un cliente "${dto.nombre}" en este taller`);
    }

    return this.prisma.cliente.create({
      data: { idTaller, ...dto },
    });
  }

  async findAll(idTaller: string) {
    const clientes = await this.prisma.cliente.findMany({
      where: { idTaller, activo: true },
      select: {
        id: true, nombre: true, rut: true, contacto: true, telefono: true, email: true, activo: true, creadoEn: true,
        _count: { select: { vehiculos: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    // Obtener stats de OTs por cliente en una sola query
    const stats = await this.prisma.$queryRaw<
      { clienteId: string; totalOts: number; ultimoServicio: Date | null }[]
    >`
      SELECT c.id as "clienteId",
             COUNT(ot.id)::int as "totalOts",
             MAX(ot.creado_en) as "ultimoServicio"
      FROM cliente c
      LEFT JOIN vehiculo v ON v.id_cliente = c.id
      LEFT JOIN orden_trabajo ot ON ot.id_vehiculo = v.id
      WHERE c.id_taller = ${idTaller} AND c.activo = true
      GROUP BY c.id
    `;

    const statsMap = new Map(stats.map((s) => [s.clienteId, s]));

    return clientes.map((c) => {
      const s = statsMap.get(c.id);
      return {
        ...c,
        vehiculosCount: c._count.vehiculos,
        totalServicios: s?.totalOts ?? 0,
        ultimoServicio: s?.ultimoServicio ?? null,
      };
    });
  }

  async findOne(id: string, idTaller: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, idTaller },
      include: {
        vehiculos: {
          select: {
            id: true, marca: true, modelo: true, numeroSerie: true,
            sucursal: true, activo: true, creadoEn: true,
            _count: { select: { ordenesTrabajo: true } },
          },
          orderBy: { creadoEn: 'desc' },
        },
      },
    });

    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    // OTs de todos los vehículos del cliente
    const ordenes = await this.prisma.ordenTrabajo.findMany({
      where: {
        idTaller,
        vehiculo: { idCliente: id },
      },
      select: {
        id: true, numeroOT: true, estado: true, tipoServicio: true,
        descripcion: true, creadoEn: true, fechaEntrega: true,
        vehiculo: { select: { marca: true, modelo: true, numeroSerie: true } },
        tecnico: { select: { nombre: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    });

    // Resumen
    const stats = await this.prisma.ordenTrabajo.aggregate({
      where: { idTaller, vehiculo: { idCliente: id } },
      _count: { id: true },
      _max: { creadoEn: true },
    });

    return {
      ...cliente,
      ordenes,
      resumen: {
        totalVehiculos: cliente.vehiculos.length,
        totalServicios: stats._count.id,
        ultimoServicio: stats._max.creadoEn,
      },
    };
  }

  async update(id: string, idTaller: string, dto: UpdateClienteDto) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id, idTaller } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    if (dto.nombre && dto.nombre !== cliente.nombre) {
      const duplicado = await this.prisma.cliente.findUnique({
        where: { idTaller_nombre: { idTaller, nombre: dto.nombre } },
      });
      if (duplicado) throw new ConflictException(`Ya existe un cliente "${dto.nombre}"`);
    }

    return this.prisma.cliente.update({ where: { id }, data: dto });
  }
}
