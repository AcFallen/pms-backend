import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';
import { Folio } from '../folios/entities/folio.entity';
import { FolioCharge } from '../folio-charges/entities/folio-charge.entity';
import { Product } from '../products/entities/product.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Room } from '../rooms/entities/room.entity';
import { Guest } from '../guests/entities/guest.entity';
import { RoomType } from '../room-types/entities/room-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Folio,
      FolioCharge,
      Product,
      Payment,
      Reservation,
      Room,
      Guest,
      RoomType,
    ]),
  ],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
