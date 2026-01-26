import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { BotModule } from '../bot/bot.module';
import { AuthModule } from '../auth/auth.module';
import { GameGateway } from './game.gateway';

@Module({
  imports: [GameModule, BotModule, AuthModule],
  providers: [GameGateway],
  exports: [GameGateway],
})
export class GatewayModule {}
