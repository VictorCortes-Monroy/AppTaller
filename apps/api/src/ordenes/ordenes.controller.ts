import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { OrdenesService } from './ordenes.service';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { RegistrarEntregaDto } from './dto/registrar-entrega.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { CurrentTaller } from '../auth/decorators/current-taller.decorator';

@ApiTags('Órdenes de Trabajo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ordenes')
export class OrdenesController {
  constructor(private ordenesService: OrdenesService) {}

  @Post()
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Crear OT (valida 1 activa por vehículo)' })
  create(
    @CurrentTaller() idTaller: string,
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: CreateOrdenDto,
  ) {
    return this.ordenesService.create(idTaller, usuario, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar OTs del taller (TECNICO solo ve las suyas)' })
  findAll(
    @CurrentTaller() idTaller: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.ordenesService.findAll(idTaller, usuario);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de OT con repuestos, tareas y log' })
  findOne(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.ordenesService.findOne(id, idTaller, usuario);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Cambiar estado de OT (valida state machine y rol)' })
  cambiarEstado(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: CambiarEstadoDto,
  ) {
    return this.ordenesService.cambiarEstado(id, idTaller, usuario, dto);
  }

  @Patch(':id/entrega')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Registrar datos de salida y marcar OT como ENTREGADO' })
  registrarEntrega(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: RegistrarEntregaDto,
  ) {
    return this.ordenesService.registrarEntrega(id, idTaller, usuario, dto);
  }

  @Get(':id/log')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR, RolUsuario.TECNICO, RolUsuario.BODEGA, RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Log de auditoría de una OT (insert-only, orden cronológico desc)' })
  getLog(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
  ) {
    return this.ordenesService.getLog(id, idTaller);
  }
}
