import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly expiresIn: number;
  private readonly skipS3: boolean;

  constructor(private config: ConfigService) {
    this.bucket = config.get<string>('AWS_S3_BUCKET', 'workshop-manager-it-files');
    this.expiresIn = config.get<number>('S3_PRESIGNED_URL_EXPIRES', 600);
    this.skipS3 = config.get<string>('SKIP_S3', 'false') === 'true';

    this.client = new S3Client({
      region: config.get<string>('AWS_REGION', 'us-east-1'),
      credentials: this.skipS3
        ? { accessKeyId: 'fake', secretAccessKey: 'fake' }
        : {
            accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
            secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
          },
    });
  }

  /**
   * Genera una presigned PUT URL para subir un archivo directamente desde el frontend.
   * Si SKIP_S3=true, devuelve una URL de desarrollo (no funcional) para pruebas locales.
   */
  async generatePresignedPutUrl(key: string, contentType: string): Promise<string> {
    if (this.skipS3) {
      this.logger.warn(`SKIP_S3=true — devolviendo URL fake para key: ${key}`);
      return `https://fake-s3.local/${this.bucket}/${key}?presigned=true`;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn: this.expiresIn });
  }

  /**
   * Devuelve la URL pública del archivo ya subido (para guardar en DB).
   */
  getPublicUrl(key: string): string {
    if (this.skipS3) {
      return `https://fake-s3.local/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }
}
