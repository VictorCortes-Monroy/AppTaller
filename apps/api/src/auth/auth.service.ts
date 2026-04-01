import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Buscar usuario por email (sin filtro de taller aún — no tenemos id_taller)
    const usuario = await this.prisma.usuario.findFirst({
      where: { email: dto.email, activo: true },
      include: { taller: { select: { activo: true } } },
    });

    if (!usuario || !usuario.taller.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordOk = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      idTaller: usuario.idTaller,
    };

    return {
      accessToken: this.signAccess(payload),
      refreshToken: this.signRefresh(payload),
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        idTaller: usuario.idTaller,
      },
    };
  }

  async refresh(userId: string, idTaller: string): Promise<{ accessToken: string }> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: userId, idTaller, activo: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado o inactivo');
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      idTaller: usuario.idTaller,
    };

    return { accessToken: this.signAccess(payload) };
  }

  async getMe(userId: string, idTaller: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: userId, idTaller },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        idTaller: true,
        activo: true,
        creadoEn: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  private signAccess(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '8h'),
    });
  }

  private signRefresh(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
    });
  }
}
