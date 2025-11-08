import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantVoucherSeriesController } from './tenant-voucher-series.controller';
import { TenantVoucherSeriesService } from './tenant-voucher-series.service';
import { TenantVoucherSeries } from './entities/tenant-voucher-series.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TenantVoucherSeries])],
  controllers: [TenantVoucherSeriesController],
  providers: [TenantVoucherSeriesService],
  exports: [TenantVoucherSeriesService],
})
export class TenantVoucherSeriesModule {}
