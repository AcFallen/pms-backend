import { Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantInvoiceResetService } from './tenant-invoice-reset.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('scheduled-tasks')
@ApiBearerAuth('JWT-auth')
@Controller('scheduled-tasks')
export class ScheduledTasksController {
  constructor(
    private readonly tenantInvoiceResetService: TenantInvoiceResetService,
  ) {}

  @Post('reset-invoice-counters')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Manually reset monthly invoice counters for all tenants',
    description:
      'Admin-only endpoint to manually trigger the monthly invoice counter reset. Useful for testing or special cases. Normally this runs automatically via cron job.',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice counters successfully reset',
    schema: {
      example: {
        success: true,
        resetCount: 5,
        message: 'Successfully reset invoice counters for 5 tenant(s)',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only ADMIN users can access this endpoint',
  })
  async manualResetInvoiceCounters() {
    const result = await this.tenantInvoiceResetService.manualReset();
    return {
      ...result,
      message: result.success
        ? `Successfully reset invoice counters for ${result.resetCount} tenant(s)`
        : 'Failed to reset invoice counters',
    };
  }
}
