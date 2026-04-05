import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentTaller } from '../auth/decorators/current-taller.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('ots-activas')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR, RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Vista 1: OTs activas con alertas de demora (>7 días), repuestos pendientes y tareas adicionales',
  })
  getOtsActivas(@CurrentTaller() idTaller: string) {
    return this.service.getOtsActivas(idTaller);
  }

  @Get('repuestos-pendientes')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR, RolUsuario.BODEGA, RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Vista 2: Repuestos no recibidos agrupados por OT, ordenados por días de espera DESC',
  })
  getRepuestosPendientes(@CurrentTaller() idTaller: string) {
    return this.service.getRepuestosPendientes(idTaller);
  }

  @Get('historial')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR, RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Vista 3: Todos los eventos del taller en orden cronológico descendente (log inmutable)',
  })
  getHistorial(@CurrentTaller() idTaller: string) {
    return this.service.getHistorial(idTaller);
  }
}
