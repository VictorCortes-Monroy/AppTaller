import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { InformeTecnicoService } from './informe-tecnico.service';
import { PresignedUrlQueryDto } from './dto/presigned-url.dto';
import { CreateInformeTecnicoDto } from './dto/create-it.dto';
import { CreateTareaITDto } from './dto/create-tarea-it.dto';
import { UpdateTareaITDto } from './dto/update-tarea-it.dto';
import { BulkCreateTareasDto } from './dto/bulk-create-tareas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { CurrentTaller } from '../auth/decorators/current-taller.decorator';

@ApiTags('Informe Técnico (IT + STP)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ordenes/:idOT/it')
export class InformeTecnicoController {
  constructor(private itService: InformeTecnicoService) {}

  @Get('presigned-url')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({
    summary: 'Obtener URL firmada para subir archivo IT directo a S3 (expira en 10 min)',
  })
  getPresignedUrl(
    @Param('idOT') idOT: string,
    @CurrentTaller() idTaller: string,
    @Query() query: PresignedUrlQueryDto,
  ) {
    return this.itService.getPresignedUrl(idOT, idTaller, query.fileName);
  }

  @Post()
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({
    summary: 'Registrar header IT tras subida exitosa a S3',
  })
  crearIT(
    @Param('idOT') idOT: string,
    @CurrentTaller() idTaller: string,
    @CurrentUser('sub') idUsuario: string,
    @Body() dto: CreateInformeTecnicoDto,
  ) {
    return this.itService.crearIT(idOT, idTaller, idUsuario as string, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Ver IT con todas las tareas STP y repuestos asociados' })
  getIT(
    @Param('idOT') idOT: string,
    @CurrentTaller() idTaller: string,
  ) {
    return this.itService.getIT(idOT, idTaller);
  }

  @Post('tareas-bulk')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({
    summary: 'Crear múltiples tareas STP de una vez (bulk paste desde Excel)',
  })
  bulkCrearTareas(
    @Param('idOT') idOT: string,
    @CurrentTaller() idTaller: string,
    @Body() dto: BulkCreateTareasDto,
  ) {
    return this.itService.bulkCrearTareas(idOT, idTaller, dto);
  }

  @Post('tareas')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR)
  @ApiOperation({
    summary: 'Registrar tarea STP. Si requiereRepuesto=true crea repuesto automático.',
  })
  crearTarea(
    @Param('idOT') idOT: string,
    @CurrentTaller() idTaller: string,
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: CreateTareaITDto,
  ) {
    return this.itService.crearTarea(idOT, idTaller, usuario.sub, dto);
  }

  @Patch('tareas/:idTarea')
  @Roles(RolUsuario.JEFE, RolUsuario.SUPERVISOR, RolUsuario.TECNICO)
  @ApiOperation({
    summary: 'Actualizar tarea STP (componente, descripción, completada)',
  })
  actualizarTarea(
    @Param('idOT') idOT: string,
    @Param('idTarea') idTarea: string,
    @CurrentTaller() idTaller: string,
    @Body() dto: UpdateTareaITDto,
  ) {
    return this.itService.actualizarTarea(idOT, idTarea, idTaller, dto);
  }
}
