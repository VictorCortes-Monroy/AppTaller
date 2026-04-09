import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ALLOWED_ORIGINS acepta lista separada por comas para múltiples frontends
  const extraOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000',
                      'http://localhost:3001', 'http://localhost:3002'];
  const allowedOrigins = [
    frontendUrl,
    ...extraOrigins,
    ...(process.env.NODE_ENV !== 'production' ? devOrigins : []),
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('WorkShop Manager API')
    .setDescription('API para gestión de talleres vehiculares mineros')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`WorkShop Manager API running on: http://localhost:${port}/api/v1`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
