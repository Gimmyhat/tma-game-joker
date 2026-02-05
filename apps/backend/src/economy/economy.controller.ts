import { Controller, Get, Param, Query } from '@nestjs/common';
import { EconomyService } from './economy.service';
import { TransactionService } from './transaction.service';
import { TxType, TxStatus } from '@prisma/client';

// Note: Guards will be added in Admin Auth Module phase

@Controller('economy')
export class EconomyController {
  constructor(
    private readonly economyService: EconomyService,
    private readonly transactionService: TransactionService,
  ) {}

  @Get('balance/:userId')
  async getBalance(@Param('userId') userId: string) {
    const result = await this.economyService.getBalance(userId);
    return {
      userId: result.userId,
      balance: result.balance.toString(),
      currency: result.currency,
    };
  }

  @Get('transactions')
  async listTransactions(
    @Query('userId') userId?: string,
    @Query('type') type?: TxType,
    @Query('status') status?: TxStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.transactionService.list(
      { userId, type, status },
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('transactions/:id')
  async getTransaction(@Param('id') id: string) {
    return this.transactionService.getById(id);
  }

  @Get('transactions/user/:userId')
  async getUserTransactions(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.transactionService.getUserHistory(
      userId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('withdrawals/pending')
  async getPendingWithdrawals(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.transactionService.getPendingWithdrawals(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }
}
