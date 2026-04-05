import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { S3Module } from './common/s3/s3.module';
import { InformeTecnicoModule } from './informe-tecnico/informe-tecnico.module';
import { RepuestosModule } from './repuestos/repuestos.module';
import { TareasAdicionalesModule } from './tareas-adicionales/tareas-adicionales.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    // ─── Common ───────────────────────────────
    S3Module,
    // ─── Fase 1 ───────────────────────────────
    AuthModule,
    UsersModule,
    // ─── Fase 2 ───────────────────────────────
    VehiculosModule,
    OrdenesModule,
    // ─── Fase 3 ───────────────────────────────
    InformeTecnicoModule,
    // ─── Fase 4 ───────────────────────────────
    RepuestosModule,
    // ─── Fase 5 ───────────────────────────────
    TareasAdicionalesModule,
    // ─── Fase 6 ───────────────────────────────
    DashboardModule,
  ],
})
export class AppModule {}
