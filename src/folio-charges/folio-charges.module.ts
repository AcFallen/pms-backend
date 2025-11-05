import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FolioChargesService } from './folio-charges.service';
import { FolioChargesController } from './folio-charges.controller';
import { FolioCharge } from './entities/folio-charge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FolioCharge])],
  controllers: [FolioChargesController],
  providers: [FolioChargesService],
  exports: [FolioChargesService],
})
export class FolioChargesModule {}
