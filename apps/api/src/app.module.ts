import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { OrdenesModule } from './ordenes/ordenes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    // ─── Fase 1 ───────────────────────────────
    AuthModule,
    UsersModule,
    // ─── Fase 2 ───────────────────────────────
    VehiculosModule,
    OrdenesModule,
    // ─── Fase 3 (pendiente) ───────────────────
    // InformeTecnicoModule,
    // ─── Fase 4 (pendiente) ───────────────────
    // RepuestosModule,
    // ─── Fase 5 (pendiente) ───────────────────
    // TareasAdicionalesModule,
    // ─── Fase 6 (pendiente) ───────────────────
    // DashboardModule,
  ],
})
export class AppModule {}
