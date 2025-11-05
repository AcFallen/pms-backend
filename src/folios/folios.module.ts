import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoliosService } from './folios.service';
import { FoliosController } from './folios.controller';
import { Folio } from './entities/folio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Folio])],
  controllers: [FoliosController],
  providers: [FoliosService],
  exports: [FoliosService],
})
export class FoliosModule {}
