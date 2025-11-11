import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Folio } from '../folios/entities/folio.entity';
import { RoomType } from '../room-types/entities/room-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      Payment,
      Invoice,
      Folio,
      RoomType,
    ]),
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
