import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClienteDto {
  @ApiProperty({ description: 'Nombre de la empresa/cliente', example: 'Minera Los Pelambres' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ description: 'RUT de la empresa', example: '76.333.333-3' })
  @IsOptional()
  @IsString()
  rut?: string;

  @ApiPropertyOptional({ description: 'Dirección' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ description: 'Nombre de contacto' })
  @IsOptional()
  @IsString()
  contacto?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Email de contacto' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
