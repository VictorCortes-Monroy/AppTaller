import { Module } from '@nestjs/common';
import { TareasAdicionalesService } from './tareas-adicionales.service';
import { TareasAdicionalesController } from './tareas-adicionales.controller';
import { TareasAdicionalesItemController } from './tareas-adicionales-item.controller';

@Module({
  controllers: [TareasAdicionalesController, TareasAdicionalesItemController],
  providers: [TareasAdicionalesService],
})
export class TareasAdicionalesModule {}
