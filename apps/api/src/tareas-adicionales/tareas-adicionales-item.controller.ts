import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TareasAdicionalesService } from './tareas-adicionales.service';
import { UpdateTareaAdicionalDto } from './dto/update-tarea-adicional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { CurrentTaller } from '../auth/decorators/current-taller.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Tareas Adicionales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tareas-adicionales')
export class TareasAdicionalesItemController {
  constructor(private service: TareasAdicionalesService) {}

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar tarea adicional (solo creador, SUPERVISOR o JEFE; OT no debe estar en estado final)',
  })
  update(
    @Param('id') id: string,
    @CurrentTaller() idTaller: string,
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: UpdateTareaAdicionalDto,
  ) {
    return this.service.update(id, idTaller, usuario.sub, usuario.rol as RolUsuario, dto);
  }
}
