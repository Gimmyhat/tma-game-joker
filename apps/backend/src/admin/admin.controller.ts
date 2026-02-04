import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { TransactionService } from '../economy/transaction.service';
import { EconomyService } from '../economy/economy.service';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { CreateAdminDto, UpdatePasswordDto, UpdateRoleDto, BlockUserDto } from './dto/admin.dto';
import { User, AdminRole } from '@prisma/client';
import { AdjustBalanceDto } from '../economy/dto';

@Controller('admin')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly transactionService: TransactionService,
    private readonly economyService: EconomyService,
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
        type: type as any,
        status: status as any,
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
}
