import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EconomyService } from './economy.service';
import { TransactionService } from './transaction.service';
import { EconomyController } from './economy.controller';

@Module({
  imports: [PrismaModule],
  controllers: [EconomyController],
  providers: [EconomyService, TransactionService],
  exports: [EconomyService, TransactionService],
})
export class EconomyModule {}
