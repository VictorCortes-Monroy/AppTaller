import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoOT } from '@prisma/client';

export class CreateTareaAdicionalDto {
  @ApiProperty({ description: 'Descripción del trabajo adicional identificado' })
  @IsString()
  descripcion: string;

  @ApiPropertyOptional({ description: 'Componente afectado', example: 'Sistema hidráulico' })
  @IsOptional()
  @IsString()
  componente?: string;

  @ApiPropertyOptional({ description: 'Tipo de trabajo (inspección, reparación, reemplazo…)' })
  @IsOptional()
  @IsString()
  tipoTrabajo?: string;

  @ApiProperty({
    enum: EstadoOT,
    description: 'Estado de la OT en que se identificó el trabajo (selección manual del usuario)',
  })
  @IsEnum(EstadoOT)
  momentoRegistro: EstadoOT;

  @ApiPropertyOptional({ description: 'Insumos utilizados' })
  @IsOptional()
  @IsString()
  insumos?: string;

  @ApiProperty({ description: 'Costo del trabajo adicional (siempre requerido)', example: 45000 })
  @IsNumber()
  @IsPositive()
  costo: number;
}
