import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantInvoiceResetService } from './tenant-invoice-reset.service';
import { ScheduledTasksController } from './scheduled-tasks.controller';
import { Tenant } from '../tenants/entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [ScheduledTasksController],
  providers: [TenantInvoiceResetService],
  exports: [TenantInvoiceResetService],
})
export class ScheduledTasksModule {}
