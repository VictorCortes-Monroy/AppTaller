import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoOT } from '@prisma/client';

export class UpdateTareaAdicionalDto {
  @ApiPropertyOptional({ description: 'Descripción del trabajo adicional' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Componente afectado' })
  @IsOptional()
  @IsString()
  componente?: string;

  @ApiPropertyOptional({ description: 'Tipo de trabajo' })
  @IsOptional()
  @IsString()
  tipoTrabajo?: string;

  @ApiPropertyOptional({ enum: EstadoOT, description: 'Estado de OT en que se identificó el trabajo' })
  @IsOptional()
  @IsEnum(EstadoOT)
  momentoRegistro?: EstadoOT;

  @ApiPropertyOptional({ description: 'Insumos utilizados' })
  @IsOptional()
  @IsString()
  insumos?: string;

  @ApiPropertyOptional({ description: 'Costo del trabajo adicional' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  costo?: number;
}
