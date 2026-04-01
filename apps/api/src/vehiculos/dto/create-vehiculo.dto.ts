import { IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehiculoDto {
  @ApiProperty({ example: 'Komatsu' })
  @IsString()
  marca: string;

  @ApiProperty({ example: 'PC200' })
  @IsString()
  modelo: string;

  @ApiProperty({ example: 'KMTPC200XYZ123456', description: 'VIN / número de serie' })
  @IsString()
  @Length(5, 50)
  numeroSerie: string;

  @ApiProperty({ example: 'Minera Los Pelambres' })
  @IsString()
  cliente: string;

  @ApiPropertyOptional({ example: 'Planta Norte' })
  @IsOptional()
  @IsString()
  sucursal?: string;
}
