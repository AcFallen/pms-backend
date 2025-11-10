import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { NubefactService } from './services/nubefact.service';
import { Invoice } from './entities/invoice.entity';
import { Folio } from '../folios/entities/folio.entity';
import { FolioCharge } from '../folio-charges/entities/folio-charge.entity';
import { TenantVoucherSeries } from '../teanant-vourcher-series/entities/tenant-voucher-series.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Guest } from '../guests/entities/guest.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      Folio,
      FolioCharge,
      TenantVoucherSeries,
      Reservation,
      Guest,
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, NubefactService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
