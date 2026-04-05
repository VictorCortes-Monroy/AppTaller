import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrigenRepuesto } from '@prisma/client';

export class CreateRepuestoDto {
  @ApiPropertyOptional({
    description: 'ID de la tarea STP asociada (null si es repuesto manual)',
  })
  @IsOptional()
  @IsUUID()
  idTareaIT?: string;

  @ApiProperty({ description: 'Descripción del repuesto', example: 'Filtro de aceite hidráulico' })
  @IsString()
  descripcion: string;

  @ApiProperty({ description: 'Cantidad requerida', example: 2 })
  @IsNumber()
  @IsPositive()
  cantidad: number;

  @ApiProperty({ description: 'Unidad de medida', example: 'unidad' })
  @IsString()
  unidad: string;

  @ApiProperty({ enum: OrigenRepuesto, description: 'Origen del repuesto' })
  @IsEnum(OrigenRepuesto)
  origen: OrigenRepuesto;

  @ApiPropertyOptional({ description: 'Costo unitario (requerido si origen = TALLER)' })
  @ValidateIf((o) => o.origen === OrigenRepuesto.TALLER)
  @IsNumber()
  @IsPositive()
  costo?: number;
}
