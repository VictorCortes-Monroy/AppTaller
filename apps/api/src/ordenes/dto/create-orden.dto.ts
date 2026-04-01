import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrdenDto {
  @ApiProperty({ description: 'ID del vehículo' })
  @IsString()
  idVehiculo: string;

  @ApiPropertyOptional({ description: 'ID del técnico asignado' })
  @IsOptional()
  @IsString()
  idTecnico?: string;

  @ApiPropertyOptional({ description: 'Motivo de ingreso / descripción inicial' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Kilometraje / horas al ingreso' })
  @IsOptional()
  @IsInt()
  kilometraje?: number;
}
