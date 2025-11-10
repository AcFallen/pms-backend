import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoliosService } from './folios.service';
import { FoliosController } from './folios.controller';
import { Folio } from './entities/folio.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Folio, Reservation, Payment])],
  controllers: [FoliosController],
  providers: [FoliosService],
  exports: [FoliosService],
})
export class FoliosModule {}
