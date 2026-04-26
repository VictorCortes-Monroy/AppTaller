import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EstadoOS, RolUsuario } from '@prisma/client';
import { OrdenesServicioService } from './ordenes-servicio.service';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';
import { RegistrarEntregaOsDto } from './dto/registrar-entrega-os.dto';
import { CancelarOsDto } from './dto/cancelar-os.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { CurrentTaller } from '../auth/decorators/current-taller.decorator';

@ApiTags('Órdenes de Servicio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ordenes-servicio')
export class OrdenesServicioController {
  constructor(private readonly service: OrdenesServicioService) {}

  @Post()
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Crear OS para un vehículo (1 OS activa por vehículo)' })
  create(
    @CurrentTaller() idTaller: string,
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: CreateOrdenServicioDto,
  ) {
    return this.service.create(idTaller, usuario, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar OS del taller, con OTs anidadas' })
  findAll(
    @CurrentTaller() idTaller: string,
    @Query('estado') estado?: EstadoOS,
    @Query('idVehiculo') idVehiculo?: string,
  ) {
    return this.service.findAll(idTaller, { estado, idVehiculo });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle OS con OTs hijas, repuestos y log' })
  findOne(@Param('id') id: string, @CurrentTaller() idTaller: string) {
    return this.service.findOne(id, idTaller);
  }

  @Patch(':id/entrega')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({
    summary: 'Cerrar OS (todas las OTs deben estar finalizadas o LISTO_PARA_ENTREGA)',
  })
  registrarEntrega(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: RegistrarEntregaOsDto,
  ) {
    return this.service.registrarEntrega(id, idTaller, usuario, dto);
  }

  @Patch(':id/cancelar')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Cancelar OS (cancela en cascada las OTs activas)' })
  cancelar(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: CancelarOsDto,
  ) {
    return this.service.cancelar(id, idTaller, usuario, dto);
  }

  @Get(':id/log')
  @ApiOperation({ summary: 'Log de auditoría a nivel OS (insert-only)' })
  getLog(@Param('id') id: string, @CurrentTaller() idTaller: string) {
    return this.service.getLog(id, idTaller);
  }
}
