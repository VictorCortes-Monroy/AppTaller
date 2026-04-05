import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const EXTENSIONES_VALIDAS = ['pdf', 'xls', 'xlsx'] as const;

export class PresignedUrlQueryDto {
  @ApiProperty({
    description: 'Nombre original del archivo a subir',
    example: 'informe-tecnico-PC200.pdf',
  })
  @IsString()
  fileName: string;
}

export class PresignedUrlResponseDto {
  @ApiProperty({ description: 'URL firmada para hacer PUT directo a S3 (expira en 10 min)' })
  presignedUrl: string;

  @ApiProperty({ description: 'Key del objeto en S3 — guardar y enviar en POST /it' })
  key: string;
}

export function extensionDesdeNombre(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function esExtensionValida(ext: string): boolean {
  return (EXTENSIONES_VALIDAS as readonly string[]).includes(ext);
}

export function contentTypeDesdeExt(ext: string): string {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext] ?? 'application/octet-stream';
}
