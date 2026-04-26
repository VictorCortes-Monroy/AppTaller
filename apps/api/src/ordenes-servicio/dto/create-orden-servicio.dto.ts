import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrdenServicioDto {
  @ApiProperty({ description: 'ID del vehículo que ingresa al taller' })
  @IsString()
  idVehiculo: string;

  @ApiPropertyOptional({ description: 'Motivo de ingreso (anotación libre)' })
  @IsOptional()
  @IsString()
  motivoIngreso?: string;

  @ApiPropertyOptional({ description: 'Kilometraje / horómetro al ingreso' })
  @IsOptional()
  @IsInt()
  kilometrajeIngreso?: number;
}
