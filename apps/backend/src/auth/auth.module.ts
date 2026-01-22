import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramAuthGuard } from './guards/telegram-auth.guard';

@Module({
  imports: [ConfigModule],
  providers: [TelegramAuthGuard],
  exports: [TelegramAuthGuard],
})
export class AuthModule {}
