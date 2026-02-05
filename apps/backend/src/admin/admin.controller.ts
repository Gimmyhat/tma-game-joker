import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  NotificationService,
  CreateNotificationDto,
  UpdateNotificationDto,
} from './notification.service';
import { TransactionService } from '../economy/transaction.service';
import { EconomyService } from '../economy/economy.service';
import { RoomManager } from '../game/services/room.manager';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { CreateAdminDto, UpdatePasswordDto, UpdateRoleDto, BlockUserDto } from './dto/admin.dto';
import { User, AdminRole, TxType, TxStatus, NotificationStatus } from '@prisma/client';
import { AdjustBalanceDto } from '../economy/dto';

@Controller('admin')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly notificationService: NotificationService,
    private readonly transactionService: TransactionService,
    private readonly economyService: EconomyService,
    private readonly roomManager: RoomManager,
  ) {}

  // ===== Dashboard =====

  @Get('dashboard')
  @Roles('OPERATOR')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('me')
  @Roles('OPERATOR')
  async getMe(@CurrentAdmin() admin: User) {
    return {
      id: admin.id,
      username: admin.username,
      role: admin.adminRole,
    };
  }

  // ===== Users Management =====

  @Get('users')
  @Roles('OPERATOR')
  async listUsers(
    @Query('search') search?: string,
    @Query('role') role?: AdminRole,
    @Query('blocked') blocked?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.listUsers(
      {
        search,
        role,
        isBlocked: blocked === 'true' ? true : blocked === 'false' ? false : undefined,
      },
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('users/:id')
  @Roles('OPERATOR')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Get('users/:id/detail')
  @Roles('OPERATOR')
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Get('users/:id/referrals')
  @Roles('OPERATOR')
  async getUserReferrals(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUserReferrals(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('users/:id/block')
  @Roles('MODERATOR')
  async blockUser(@Param('id') id: string, @Body() dto: BlockUserDto, @CurrentAdmin() admin: User) {
    return this.adminService.blockUser(id, admin.id, dto.reason);
  }

  @Post('users/:id/unblock')
  @Roles('MODERATOR')
  async unblockUser(@Param('id') id: string, @CurrentAdmin() admin: User) {
    return this.adminService.unblockUser(id, admin.id);
  }

  @Put('users/:id/role')
  @Roles('ADMIN')
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentAdmin() admin: User,
  ) {
    return this.adminService.updateUserRole(id, dto.role ?? null, admin.id);
  }

  @Put('users/:id/balance')
  @Roles('ADMIN')
  async adjustUserBalance(
    @Param('id') id: string,
    @Body() dto: AdjustBalanceDto,
    @CurrentAdmin() admin: User,
  ) {
    return this.economyService.adjustBalance(id, dto.amount, admin.id, dto.comment);
  }

  // ===== Admin Users Management =====

  @Post('admins')
  @Roles('SUPERADMIN')
  async createAdmin(@Body() dto: CreateAdminDto, @CurrentAdmin() admin: User) {
    return this.adminService.createAdmin(dto.username, dto.password, dto.role, admin.id);
  }

  @Put('admins/:id/password')
  @Roles('SUPERADMIN')
  async updateAdminPassword(@Param('id') id: string, @Body() dto: UpdatePasswordDto) {
    await this.adminService.updatePassword(id, dto.newPassword);
    return { success: true };
  }

  // ===== Transactions =====

  @Get('transactions')
  @Roles('OPERATOR')
  async listTransactions(
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.transactionService.list(
      {
        userId,
        type: type as TxType | undefined,
        status: status as TxStatus | undefined,
      },
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('transactions/pending-withdrawals')
  @Roles('MODERATOR')
  async getPendingWithdrawals(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.transactionService.getPendingWithdrawals(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Post('transactions/:id/approve')
  @Roles('MODERATOR')
  async approveWithdrawal(@Param('id') id: string, @CurrentAdmin() admin: User) {
    return this.transactionService.approveWithdrawal(id, admin.id);
  }

  @Post('transactions/:id/reject')
  @Roles('MODERATOR')
  async rejectWithdrawal(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @CurrentAdmin() admin: User,
  ) {
    return this.transactionService.rejectWithdrawal(id, admin.id, dto.reason);
  }

  // ===== Global Settings =====

  @Get('settings')
  @Roles('OPERATOR')
  async getAllSettings() {
    return this.adminService.getAllSettings();
  }

  @Get('settings/:key')
  @Roles('OPERATOR')
  async getSetting(@Param('key') key: string) {
    return this.adminService.getSetting(key);
  }

  @Put('settings/:key')
  @Roles('ADMIN')
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: { value: unknown; description?: string },
    @CurrentAdmin() admin: User,
  ) {
    return this.adminService.upsertSetting(key, dto.value, dto.description ?? null, admin.id);
  }

  @Put('settings')
  @Roles('ADMIN')
  async updateSettings(
    @Body() dto: { settings: Array<{ key: string; value: unknown; description?: string }> },
    @CurrentAdmin() admin: User,
  ) {
    return this.adminService.updateSettings(dto.settings, admin.id);
  }

  // ===== Tables (Active Games) =====

  @Get('tables')
  @Roles('OPERATOR')
  async listTables() {
    return this.roomManager.getAllRooms();
  }

  @Get('tables/:id')
  @Roles('OPERATOR')
  async getTable(@Param('id') id: string) {
    const room = await this.roomManager.getRoom(id);
    if (!room) {
      return { error: 'Room not found' };
    }
    return {
      id: room.id,
      gameState: room.gameState,
      connectedPlayers: Array.from(room.sockets.keys()),
    };
  }

  // ===== Tasks Management =====

  @Get('tasks')
  @Roles('OPERATOR')
  async listTasks(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.listTasks(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      status,
    );
  }

  @Get('tasks/:id')
  @Roles('OPERATOR')
  async getTask(@Param('id') id: string) {
    return this.adminService.getTask(id);
  }

  @Post('tasks')
  @Roles('MODERATOR')
  async createTask(
    @Body()
    dto: {
      title: string;
      shortDescription?: string;
      longDescription?: string;
      rewardAmount?: number;
      rewardCurrency?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      autoVerify?: boolean;
    },
  ) {
    return this.adminService.createTask({
      title: dto.title,
      shortDescription: dto.shortDescription,
      longDescription: dto.longDescription,
      rewardAmount: dto.rewardAmount,
      rewardCurrency: dto.rewardCurrency,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      status: dto.status,
      autoVerify: dto.autoVerify,
    });
  }

  @Put('tasks/:id')
  @Roles('MODERATOR')
  async updateTask(
    @Param('id') id: string,
    @Body()
    dto: {
      title?: string;
      shortDescription?: string;
      longDescription?: string;
      rewardAmount?: number;
      rewardCurrency?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      autoVerify?: boolean;
    },
  ) {
    return this.adminService.updateTask(id, {
      title: dto.title,
      shortDescription: dto.shortDescription,
      longDescription: dto.longDescription,
      rewardAmount: dto.rewardAmount,
      rewardCurrency: dto.rewardCurrency,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      status: dto.status,
      autoVerify: dto.autoVerify,
    });
  }

  @Post('tasks/:id/delete')
  @Roles('ADMIN')
  async deleteTask(@Param('id') id: string) {
    await this.adminService.deleteTask(id);
    return { success: true };
  }

  @Get('tasks/:id/completions')
  @Roles('OPERATOR')
  async listTaskCompletions(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.listTaskCompletions(
      id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      status,
    );
  }

  @Post('task-completions/:id/approve')
  @Roles('MODERATOR')
  async approveTaskCompletion(@Param('id') id: string, @CurrentAdmin() admin: User) {
    await this.adminService.approveTaskCompletion(id, admin.id);
    return { success: true };
  }

  @Post('task-completions/:id/reject')
  @Roles('MODERATOR')
  async rejectTaskCompletion(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @CurrentAdmin() admin: User,
  ) {
    await this.adminService.rejectTaskCompletion(id, admin.id, dto.reason);
    return { success: true };
  }

  // ===== Notifications Management =====

  @Get('notifications')
  @Roles('OPERATOR')
  async listNotifications(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notificationService.listNotifications(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      status as NotificationStatus | undefined,
    );
  }

  @Get('notifications/:id')
  @Roles('OPERATOR')
  async getNotification(@Param('id') id: string) {
    return this.notificationService.getNotification(id);
  }

  @Post('notifications')
  @Roles('MODERATOR')
  async createNotification(@Body() dto: CreateNotificationDto, @CurrentAdmin() admin: User) {
    return this.notificationService.createNotification(dto, admin.id);
  }

  @Put('notifications/:id')
  @Roles('MODERATOR')
  async updateNotification(@Param('id') id: string, @Body() dto: UpdateNotificationDto) {
    return this.notificationService.updateNotification(id, dto);
  }

  @Post('notifications/:id/delete')
  @Roles('ADMIN')
  async deleteNotification(@Param('id') id: string) {
    await this.notificationService.deleteNotification(id);
    return { success: true };
  }

  @Post('notifications/:id/send')
  @Roles('MODERATOR')
  async sendNotification(@Param('id') id: string, @CurrentAdmin() admin: User) {
    return this.notificationService.sendNotification(id, admin.id);
  }

  @Get('notifications/:id/deliveries')
  @Roles('OPERATOR')
  async listNotificationDeliveries(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notificationService.getNotificationDeliveries(
      id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      status,
    );
  }
}
