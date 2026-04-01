import { IsDateString, IsInt, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegistrarEntregaDto {
  @ApiProperty({ description: 'Kilometraje / horas al momento de entrega' })
  @IsInt()
  kilometrajeSalida: number;

  @ApiProperty({ description: 'Fecha y hora real de entrega (ISO 8601)', example: '2026-04-10T15:30:00Z' })
  @IsDateString()
  fechaEntrega: string;

  @ApiProperty({ description: 'Nombre de quien retira el vehículo' })
  @IsString()
  receptorNombre: string;
}
