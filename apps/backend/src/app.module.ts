import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from './game/game.module';
import { BotModule } from './bot/bot.module';
import { AuthModule } from './auth/auth.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { PrismaModule } from './prisma/prisma.module';
import { EconomyModule } from './economy/economy.module';
import { AdminModule } from './admin/admin.module';
import { EventLogModule } from './event-log/event-log.module';
import { TournamentModule } from './tournament/tournament.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ReferralModule } from './referral/referral.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    GameModule,
    BotModule,
    AdminModule,
    EconomyModule,
    TelegramBotModule,
    EventLogModule,
    TournamentModule,
    LeaderboardModule,
    ReferralModule,
    GatewayModule,
  ],
})
export class AppModule {}
