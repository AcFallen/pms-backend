import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashierService } from './cashier.service';
import { CashierController } from './cashier.controller';
import { CashierSession } from './entities/cashier.entity';
import { CashierMovement } from './entities/cashier-movement.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CashierSession, CashierMovement, Payment]),
  ],
  controllers: [CashierController],
  providers: [CashierService],
  exports: [CashierService],
})
export class CashierModule {}
