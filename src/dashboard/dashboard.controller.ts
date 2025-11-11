import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardMetricsDto } from './dto/dashboard-metrics.dto';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Get dashboard metrics for current month',
    description:
      'Returns key metrics for the authenticated tenant including check-ins today, income by payment method, SUNAT comparison, income by room type, documents generated, and cash invoices. All data is filtered by tenant and limited to the current month.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
    type: DashboardMetricsDto,
  })
  async getMetrics(@CurrentUser() user: CurrentUserData): Promise<DashboardMetricsDto> {
    return this.dashboardService.getMetrics(user.tenantId);
  }
}
