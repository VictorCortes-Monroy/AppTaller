import { Module } from '@nestjs/common';
import { InformeTecnicoService } from './informe-tecnico.service';
import { InformeTecnicoController } from './informe-tecnico.controller';

@Module({
  controllers: [InformeTecnicoController],
  providers: [InformeTecnicoService],
  exports: [InformeTecnicoService],
})
export class InformeTecnicoModule {}
