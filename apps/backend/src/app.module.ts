import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { GameModule } from './game/game.module';
import { GatewayModule } from './gateway/gateway.module';
import { BotModule } from './bot/bot.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    GameModule,
    GatewayModule,
    BotModule,
    AuthModule,
    TelegramBotModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
