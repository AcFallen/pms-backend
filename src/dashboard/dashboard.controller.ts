import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardMetricsDto } from './dto/dashboard-metrics.dto';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
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
    summary: 'Get dashboard metrics with optional date filters',
    description:
      'Returns key metrics for the authenticated tenant including check-ins today, income by payment method, SUNAT comparison, income by room type, documents generated, and cash invoices. By default shows current month data, but you can specify custom date range using startDate and endDate query parameters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
    type: DashboardMetricsDto,
  })
  async getMetrics(
    @Query() filters: DashboardFiltersDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<DashboardMetricsDto> {
    return this.dashboardService.getMetrics(user.tenantId, filters);
  }
}
