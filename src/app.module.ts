import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { AuthModule } from './auth/auth.module';
import { RoomTypesModule } from './room-types/room-types.module';
import { RoomsModule } from './rooms/rooms.module';
import { RatesModule } from './rates/rates.module';
import { GuestsModule } from './guests/guests.module';
import { ReservationsModule } from './reservations/reservations.module';
import { CleaningTasksModule } from './cleaning-tasks/cleaning-tasks.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { ProductsModule } from './products/products.module';
import { FoliosModule } from './folios/folios.module';
import { FolioChargesModule } from './folio-charges/folio-charges.module';
import { PaymentsModule } from './payments/payments.module';
import { InvoicesModule } from './invoices/invoices.module';
import { TenantVoucherSeriesModule } from './teanant-vourcher-series/tenant-voucher-serie.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CashierModule } from './cashier/cashier.module';
import { PosModule } from './pos/pos.module';
import { GuestIncidentsModule } from './guest-incidents/guest-incidents.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('DB_SYNCHRONIZE') === 'true',

        // logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    UsersModule,
    TenantsModule,
    TenantVoucherSeriesModule,
    AuthModule,
    RoomTypesModule,
    RoomsModule,
    RatesModule,
    GuestsModule,
    ReservationsModule,
    CleaningTasksModule,
    ProductCategoriesModule,
    ProductsModule,
    FoliosModule,
    FolioChargesModule,
    PaymentsModule,
    InvoicesModule,
    ScheduledTasksModule,
    DashboardModule,
    CashierModule,
    PosModule,
    GuestIncidentsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
