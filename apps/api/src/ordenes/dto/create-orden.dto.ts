import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoServicio } from '@prisma/client';

export class CreateOrdenDto {
  @ApiProperty({ description: 'ID del vehículo' })
  @IsString()
  idVehiculo: string;

  @ApiPropertyOptional({ description: 'ID del técnico asignado' })
  @IsOptional()
  @IsString()
  idTecnico?: string;

  @ApiPropertyOptional({ enum: TipoServicio, description: 'Tipo de servicio' })
  @IsOptional()
  @IsEnum(TipoServicio)
  tipoServicio?: TipoServicio;

  @ApiPropertyOptional({ description: 'Motivo de ingreso / descripción inicial' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Kilometraje / horas al ingreso' })
  @IsOptional()
  @IsInt()
  kilometraje?: number;
}
