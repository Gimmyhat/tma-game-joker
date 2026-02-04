import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { EventLogService, EventLogFilter } from './event-log.service';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { EventType, Severity } from '@prisma/client';

@Controller('admin/event-log')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class EventLogController {
  constructor(private readonly eventLogService: EventLogService) {}

  @Get()
  @Roles('MODERATOR')
  async list(
    @Query('eventType') eventType?: EventType,
    @Query('severity') severity?: Severity,
    @Query('actorId') actorId?: string,
    @Query('targetId') targetId?: string,
    @Query('targetType') targetType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const filter: EventLogFilter = {
      eventType,
      severity,
      actorId,
      targetId,
      targetType,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    return this.eventLogService.list(
      filter,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
  }

  @Get('security')
  @Roles('ADMIN')
  async getSecurityEvents(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.eventLogService.getSecurityEvents(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
  }

  @Get('user/:userId')
  @Roles('MODERATOR')
  async getUserActivity(@Param('userId') userId: string, @Query('limit') limit?: string) {
    return this.eventLogService.getUserActivity(userId, limit ? parseInt(limit, 10) : 20);
  }

  @Get('admin/:adminId')
  @Roles('ADMIN')
  async getAdminAuditTrail(
    @Param('adminId') adminId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.eventLogService.getAdminAuditTrail(
      adminId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
  }

  @Get(':id')
  @Roles('MODERATOR')
  async getById(@Param('id') id: string) {
    return this.eventLogService.getById(id);
  }
}
