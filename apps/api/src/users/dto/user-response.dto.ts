import { ApiProperty } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() idTaller: string;
  @ApiProperty() nombre: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: RolUsuario }) rol: RolUsuario;
  @ApiProperty() activo: boolean;
  @ApiProperty() creadoEn: Date;
}
