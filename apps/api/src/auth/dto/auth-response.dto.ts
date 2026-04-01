import { ApiProperty } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: RolUsuario }) rol: RolUsuario;
  @ApiProperty() idTaller: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}
