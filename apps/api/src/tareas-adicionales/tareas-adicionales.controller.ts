import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { TareasAdicionalesService } from './tareas-adicionales.service';
import { CreateTareaAdicionalDto } from './dto/create-tarea-adicional.dto';
import { UpdateTareaAdicionalDto } from './dto/update-tarea-adicional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { CurrentTaller } from '../auth/decorators/current-taller.decorator';

@ApiTags('Tareas Adicionales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ordenes/:idOT/tareas-adicionales')
export class TareasAdicionalesController {
  constructor(private service: TareasAdicionalesService) {}

  @Post()
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Registrar trabajo adicional identificado durante la ejecución' })
  create(
    @Param('idOT') idOT: string,
    @CurrentTaller() idTaller: string,
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: CreateTareaAdicionalDto,
  ) {
    return this.service.create(idOT, idTaller, usuario.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tareas adicionales de una OT' })
  findByOT(
    @Param('idOT') idOT: string,
    @CurrentTaller() idTaller: string,
  ) {
    return this.service.findByOT(idOT, idTaller);
  }
}
