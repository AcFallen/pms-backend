import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestIncidentsService } from './guest-incidents.service';
import { GuestIncidentsController } from './guest-incidents.controller';
import { GuestIncident } from './entities/guest-incident.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Guest } from '../guests/entities/guest.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GuestIncident, Reservation, Guest, User]),
  ],
  controllers: [GuestIncidentsController],
  providers: [GuestIncidentsService],
  exports: [GuestIncidentsService],
})
export class GuestIncidentsModule {}
