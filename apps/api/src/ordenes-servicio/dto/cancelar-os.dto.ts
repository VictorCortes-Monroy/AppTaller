import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelarOsDto {
  @ApiProperty({ description: 'Motivo de cancelación (obligatorio)' })
  @IsString()
  @MinLength(3)
  comentario: string;
}
