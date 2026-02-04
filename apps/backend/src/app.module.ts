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
import { PrismaModule } from './prisma/prisma.module';
import { EconomyModule } from './economy/economy.module';
import { AdminModule } from './admin/admin.module';

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
    PrismaModule,
    DatabaseModule,
    GameModule,
    GatewayModule,
    BotModule,
    AuthModule,
    TelegramBotModule,
    EconomyModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
