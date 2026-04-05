import { Module } from '@nestjs/common';
import { RepuestosService } from './repuestos.service';
import { RepuestosController } from './repuestos.controller';

@Module({
  controllers: [RepuestosController],
  providers: [RepuestosService],
  exports: [RepuestosService],
})
export class RepuestosModule {}
