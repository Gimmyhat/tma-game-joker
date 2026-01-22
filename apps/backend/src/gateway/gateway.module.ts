import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { BotModule } from '../bot/bot.module';
import { AuthModule } from '../auth/auth.module';
import { GameGateway } from './game.gateway';
import { RoomManager } from './room.manager';

@Module({
  imports: [GameModule, BotModule, AuthModule],
  providers: [GameGateway, RoomManager],
  exports: [GameGateway, RoomManager],
})
export class GatewayModule {}
