import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoServicio } from '@prisma/client';

export class CreateOrdenDto {
  @ApiProperty({ description: 'ID de la Orden de Servicio padre (contenedor)' })
  @IsString()
  idOrdenServicio: string;

  @ApiPropertyOptional({
    description: 'Frente de trabajo (ej: Motor, Hidráulico, Eléctrico, Transmisión)',
  })
  @IsOptional()
  @IsString()
  frente?: string;

  @ApiPropertyOptional({ description: 'ID del técnico asignado' })
  @IsOptional()
  @IsString()
  idTecnico?: string;

  @ApiPropertyOptional({ enum: TipoServicio, description: 'Tipo de servicio' })
  @IsOptional()
  @IsEnum(TipoServicio)
  tipoServicio?: TipoServicio;

  @ApiPropertyOptional({ description: 'Descripción del frente / trabajo específico' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Kilometraje / horas al ingreso (legacy, se hereda de la OS)' })
  @IsOptional()
  @IsInt()
  kilometraje?: number;
}
