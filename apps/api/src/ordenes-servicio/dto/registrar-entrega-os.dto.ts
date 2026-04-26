import { IsDateString, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegistrarEntregaOsDto {
  @ApiProperty({ description: 'Kilometraje / horómetro al retirar el vehículo' })
  @IsInt()
  kilometrajeSalida: number;

  @ApiProperty({ description: 'Fecha real de entrega (ISO 8601)' })
  @IsDateString()
  fechaEntrega: string;

  @ApiProperty({ description: 'Nombre de quien retira el vehículo' })
  @IsString()
  @MinLength(2)
  receptorNombre: string;

  @ApiPropertyOptional({ description: 'Comentario opcional' })
  @IsOptional()
  @IsString()
  comentario?: string;
}
