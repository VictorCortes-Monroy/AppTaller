import { IsArray, IsBoolean, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BulkTareaItem {
  @ApiProperty()
  @IsInt()
  @Min(1)
  numero: number;

  @ApiProperty()
  @IsString()
  componente: string;

  @ApiProperty()
  @IsString()
  descripcion: string;

  @ApiProperty()
  @IsBoolean()
  requiereRepuesto: boolean;
}

export class BulkCreateTareasDto {
  @ApiProperty({ type: [BulkTareaItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTareaItem)
  tareas: BulkTareaItem[];
}
