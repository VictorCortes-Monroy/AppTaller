import { Module } from '@nestjs/common';
import { OrdenesService } from './ordenes.service';
import { OrdenesController } from './ordenes.controller';
import { OrdenesServicioModule } from '../ordenes-servicio/ordenes-servicio.module';

@Module({
  imports: [OrdenesServicioModule],
  controllers: [OrdenesController],
  providers: [OrdenesService],
  exports: [OrdenesService],
})
export class OrdenesModule {}
