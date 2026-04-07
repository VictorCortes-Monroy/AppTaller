import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateVehiculoDto } from './create-vehiculo.dto';

export class BulkCreateVehiculoDto {
  @ApiProperty({ type: [CreateVehiculoDto], description: 'Lista de vehículos a crear (max 500)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVehiculoDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  vehiculos: CreateVehiculoDto[];
}
