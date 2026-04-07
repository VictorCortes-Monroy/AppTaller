import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentTaller } from '../auth/decorators/current-taller.decorator';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private service: ClientesService) {}

  @Post()
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Registrar cliente (nombre único por taller)' })
  create(@CurrentTaller() idTaller: string, @Body() dto: CreateClienteDto) {
    return this.service.create(idTaller, dto);
  }

  @Get()
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR, RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Listar clientes con resumen de vehículos y servicios' })
  findAll(@CurrentTaller() idTaller: string) {
    return this.service.findAll(idTaller);
  }

  @Get(':id')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR, RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Detalle de cliente con vehículos, OTs e historial' })
  findOne(@Param('id') id: string, @CurrentTaller() idTaller: string) {
    return this.service.findOne(id, idTaller);
  }

  @Patch(':id')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar datos del cliente' })
  update(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.service.update(id, idTaller, dto);
  }
}
