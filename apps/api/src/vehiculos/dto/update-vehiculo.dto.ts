import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVehiculoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() marca?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cliente?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sucursal?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
  // numeroSerie no se puede modificar (VIN es inmutable)
}
