import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrigenRepuesto } from '@prisma/client';

export class CreateTareaITDto {
  @ApiProperty({ description: 'Número de tarea en el STP (correlativo)', example: 1 })
  @IsInt()
  @Min(1)
  numero: number;

  @ApiProperty({ description: 'Componente afectado', example: 'Motor hidráulico' })
  @IsString()
  componente: string;

  @ApiProperty({ description: 'Descripción de la tarea de servicio' })
  @IsString()
  descripcion: string;

  @ApiProperty({ description: '¿La tarea requiere repuesto?' })
  @IsBoolean()
  requiereRepuesto: boolean;

  // ── Campos condicionales: solo si requiereRepuesto = true ──

  @ApiPropertyOptional({ description: 'Descripción del repuesto (requerido si requiereRepuesto)' })
  @ValidateIf((o) => o.requiereRepuesto === true)
  @IsString()
  descripcionRepuesto?: string;

  @ApiPropertyOptional({ description: 'Cantidad requerida', example: 2 })
  @ValidateIf((o) => o.requiereRepuesto === true)
  @IsNumber()
  @IsPositive()
  cantidad?: number;

  @ApiPropertyOptional({ description: 'Unidad de medida', example: 'unidad' })
  @ValidateIf((o) => o.requiereRepuesto === true)
  @IsString()
  unidad?: string;

  @ApiPropertyOptional({ enum: OrigenRepuesto, description: 'Origen del repuesto' })
  @ValidateIf((o) => o.requiereRepuesto === true)
  @IsEnum(OrigenRepuesto)
  origen?: OrigenRepuesto;

  @ApiPropertyOptional({ description: 'Costo unitario (requerido si origen = TALLER)' })
  @ValidateIf((o) => o.requiereRepuesto === true && o.origen === OrigenRepuesto.TALLER)
  @IsNumber()
  @IsPositive()
  costo?: number;
}
