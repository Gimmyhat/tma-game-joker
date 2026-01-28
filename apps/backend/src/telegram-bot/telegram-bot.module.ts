import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  imports: [ConfigModule],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly botService: TelegramBotService) {}

  async onModuleInit() {
    await this.botService.start();
  }

  async onModuleDestroy() {
    await this.botService.stop();
  }
}
