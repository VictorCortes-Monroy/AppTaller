import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 12;

const USER_SELECT = {
  id: true,
  idTaller: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
  // passwordHash nunca se expone
  passwordHash: false,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(idTaller: string, dto: CreateUserDto) {
    const existe = await this.prisma.usuario.findFirst({
      where: { email: dto.email, idTaller },
    });

    if (existe) {
      throw new ConflictException('Ya existe un usuario con ese email en este taller');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.prisma.usuario.create({
      data: {
        idTaller,
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        rol: dto.rol,
      },
      select: USER_SELECT,
    });
  }

  async findAll(idTaller: string) {
    return this.prisma.usuario.findMany({
      where: { idTaller },
      select: USER_SELECT,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string, idTaller: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, idTaller },
      select: USER_SELECT,
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  async update(id: string, idTaller: string, dto: UpdateUserDto) {
    await this.findOne(id, idTaller); // valida que existe y pertenece al taller

    const data: Record<string, unknown> = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.rol !== undefined) data.rol = dto.rol;
    if (dto.activo !== undefined) data.activo = dto.activo;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }
}
