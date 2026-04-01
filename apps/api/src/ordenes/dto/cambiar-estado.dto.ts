import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoOT } from '@prisma/client';

export class CambiarEstadoDto {
  @ApiProperty({ enum: EstadoOT })
  @IsEnum(EstadoOT)
  nuevoEstado: EstadoOT;

  @ApiPropertyOptional({ description: 'Obligatorio al cancelar' })
  @ValidateIf((o) => o.nuevoEstado === EstadoOT.CANCELADO)
  @IsString()
  comentario?: string;

  @ApiPropertyOptional({ description: 'Descripción libre del cambio' })
  @IsOptional()
  @IsString()
  descripcion?: string;
}
