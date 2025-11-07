import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatesService } from './rates.service';
import { RatesController } from './rates.controller';
import { Rate } from './entities/rate.entity';
import { RoomType } from '../room-types/entities/room-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rate, RoomType])],
  controllers: [RatesController],
  providers: [RatesService],
  exports: [RatesService],
})
export class RatesModule {}
