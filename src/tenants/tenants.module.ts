import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Tenant } from './entities/tenant.entity';
import { TenantVoucherSeries } from './entities/tenant-voucher-series.entity';
import { TenantVoucherSeriesService } from './tenant-voucher-series.service';
import { TenantVoucherSeriesController } from './tenant-voucher-series.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantVoucherSeries])],
  controllers: [TenantsController, TenantVoucherSeriesController],
  providers: [TenantsService, TenantVoucherSeriesService],
  exports: [TenantsService, TenantVoucherSeriesService],
})
export class TenantsModule {}
