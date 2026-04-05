import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInformeTecnicoDto {
  @ApiProperty({
    description: 'Key S3 recibida del endpoint presigned-url',
    example: 'it-files/taller-id/ot-id/uuid.pdf',
  })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Fecha de evaluación Komatsu (ISO 8601)', example: '2026-04-01' })
  @IsDateString()
  fechaEvaluacion: string;

  @ApiProperty({ description: 'Nombre del evaluador Komatsu' })
  @IsString()
  evaluador: string;

  @ApiProperty({ description: 'Horómetro / kilometraje leído en la evaluación' })
  @IsInt()
  @Min(0)
  kilometraje: number;

  @ApiPropertyOptional({ description: 'Observaciones generales del informe' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
