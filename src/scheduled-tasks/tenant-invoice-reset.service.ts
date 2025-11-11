import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class TenantInvoiceResetService {
  private readonly logger = new Logger(TenantInvoiceResetService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  /**
   * Cron job que se ejecuta el último día de cada mes a las 23:59
   * Resetea el contador de facturas mensuales de todos los tenants
   * Expresión cron: '59 23 L * *' donde L = último día del mes
   *
   * Nota: @nestjs/schedule no soporta 'L' directamente, por lo que usamos
   * una expresión que se ejecuta todos los días a las 23:59 y verificamos
   * manualmente si es el último día del mes
   */
  @Cron('59 23 * * *', {
    name: 'reset-tenant-invoice-counters',
    timeZone: 'America/Lima', // Zona horaria de Perú
  })
  async resetMonthlyInvoiceCounters() {
    const now = new Date();

    // Verificar si hoy es el último día del mes
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Si mañana es el día 1, significa que hoy es el último día del mes
    if (tomorrow.getDate() !== 1) {
      // No es el último día del mes, no hacer nada
      return;
    }

    this.logger.log('🔄 Starting monthly invoice counter reset for all tenants...');

    try {
      // Obtener todos los tenants activos
      const tenants = await this.tenantRepository.find();

      if (tenants.length === 0) {
        this.logger.warn('No tenants found to reset invoice counters');
        return;
      }

      // Calcular la fecha del primer día del próximo mes
      const nextMonthStart = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      );

      // Resetear el contador para todos los tenants
      let resetCount = 0;
      for (const tenant of tenants) {
        await this.tenantRepository.update(
          { id: tenant.id },
          {
            currentMonthInvoiceCount: 0,
            lastInvoiceCountReset: nextMonthStart,
          },
        );
        resetCount++;
      }

      this.logger.log(
        `✅ Successfully reset invoice counters for ${resetCount} tenant(s)`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error resetting invoice counters: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Método manual para forzar el reseteo (útil para pruebas o casos especiales)
   */
  async manualReset(): Promise<{ success: boolean; resetCount: number }> {
    this.logger.log('🔧 Manual reset of invoice counters triggered...');

    try {
      const tenants = await this.tenantRepository.find();
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let resetCount = 0;
      for (const tenant of tenants) {
        await this.tenantRepository.update(
          { id: tenant.id },
          {
            currentMonthInvoiceCount: 0,
            lastInvoiceCountReset: currentMonthStart,
          },
        );
        resetCount++;
      }

      this.logger.log(`✅ Manual reset completed: ${resetCount} tenant(s)`);
      return { success: true, resetCount };
    } catch (error) {
      this.logger.error(`❌ Manual reset failed: ${error.message}`);
      return { success: false, resetCount: 0 };
    }
  }
}
