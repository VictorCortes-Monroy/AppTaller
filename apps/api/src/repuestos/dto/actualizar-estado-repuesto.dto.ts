import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoRepuesto } from '@prisma/client';

export class ActualizarEstadoRepuestoDto {
  @ApiProperty({
    enum: EstadoRepuesto,
    description: 'Nuevo estado del repuesto (avance forward-only: PENDIENTE→EN_ESPERA→EN_TRANSITO→RECIBIDO)',
  })
  @IsEnum(EstadoRepuesto)
  nuevoEstado: EstadoRepuesto;
}
