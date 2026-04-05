import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { RepuestosService } from './repuestos.service';
import { CreateRepuestoDto } from './dto/create-repuesto.dto';
import { ActualizarEstadoRepuestoDto } from './dto/actualizar-estado-repuesto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTaller } from '../auth/decorators/current-taller.decorator';

@Controller()
@ApiTags('Repuestos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class RepuestosController {
  constructor(private repuestosService: RepuestosService) {}

  @Post('ordenes/:idOT/repuestos')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Agregar repuesto manual a una OT' })
  create(
    @Param('idOT') idOT: string,
    @CurrentTaller() idTaller: string,
    @CurrentUser('sub') idUsuario: string,
    @Body() dto: CreateRepuestoDto,
  ) {
    return this.repuestosService.create(idOT, idTaller, idUsuario as string, dto);
  }

  @Get('ordenes/:idOT/repuestos')
  @ApiOperation({ summary: 'Listar repuestos de una OT' })
  findByOT(
    @Param('idOT') idOT: string,
    @CurrentTaller() idTaller: string,
  ) {
    return this.repuestosService.findByOT(idOT, idTaller);
  }

  @Patch('repuestos/:id/estado')
  @Roles(RolUsuario.BODEGA)
  @ApiOperation({
    summary: 'Avanzar estado de un repuesto (solo BODEGA). Forward-only: PENDIENTE→EN_ESPERA→EN_TRANSITO→RECIBIDO',
  })
  actualizarEstado(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
    @CurrentUser('sub') idUsuario: string,
    @Body() dto: ActualizarEstadoRepuestoDto,
  ) {
    return this.repuestosService.actualizarEstado(id, idTaller, idUsuario as string, dto);
  }

  @Get('repuestos/pendientes')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR, RolUsuario.BODEGA, RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Dashboard bodega: repuestos pendientes agrupados por OT con días de espera' })
  getPendientes(@CurrentTaller() idTaller: string) {
    return this.repuestosService.getPendientes(idTaller);
  }
}
