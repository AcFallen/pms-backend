import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';
import { Guest } from './entities/guest.entity';
import { GuestIncident } from '../guest-incidents/entities/guest-incident.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Guest, GuestIncident])],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
