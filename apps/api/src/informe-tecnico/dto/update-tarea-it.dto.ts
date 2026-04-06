import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTareaITDto {
  @ApiPropertyOptional({ description: 'Componente afectado' })
  @IsOptional()
  @IsString()
  componente?: string;

  @ApiPropertyOptional({ description: 'Descripción de la tarea' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Marcar como completada' })
  @IsOptional()
  @IsBoolean()
  completada?: boolean;
}
