import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { VehiculosService } from './vehiculos.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { UpdateVehiculoDto } from './dto/update-vehiculo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentTaller } from '../auth/decorators/current-taller.decorator';

@ApiTags('Vehículos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehiculos')
export class VehiculosController {
  constructor(private vehiculosService: VehiculosService) {}

  @Post()
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Registrar vehículo (VIN único por taller)' })
  create(@CurrentTaller() idTaller: string, @Body() dto: CreateVehiculoDto) {
    return this.vehiculosService.create(idTaller, dto);
  }

  @Get()
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR, RolUsuario.BODEGA, RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Listar vehículos activos del taller' })
  findAll(@CurrentTaller() idTaller: string) {
    return this.vehiculosService.findAll(idTaller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de vehículo con historial de OTs' })
  findOne(@Param('id') id: string, @CurrentTaller() idTaller: string) {
    return this.vehiculosService.findOne(id, idTaller);
  }

  @Patch(':id')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar / desactivar vehículo' })
  update(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
    @Body() dto: UpdateVehiculoDto,
  ) {
    return this.vehiculosService.update(id, idTaller, dto);
  }
}
