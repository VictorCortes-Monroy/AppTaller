import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentTaller } from '../auth/decorators/current-taller.decorator';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles(RolUsuario.JEFE)
  @ApiOperation({ summary: 'Crear usuario en el taller (solo Jefe)' })
  create(
    @CurrentTaller() idTaller: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(idTaller, dto);
  }

  @Get()
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Listar usuarios del taller' })
  findAll(@CurrentTaller() idTaller: string) {
    return this.usersService.findAll(idTaller);
  }

  @Get(':id')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Ver detalle de un usuario' })
  findOne(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
  ) {
    return this.usersService.findOne(id, idTaller);
  }

  @Patch(':id')
  @Roles(RolUsuario.JEFE)
  @ApiOperation({ summary: 'Actualizar o desactivar usuario (solo Jefe)' })
  update(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, idTaller, dto);
  }
}
