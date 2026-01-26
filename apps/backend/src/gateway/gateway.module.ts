import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { BotModule } from '../bot/bot.module';
import { AuthModule } from '../auth/auth.module';
import { GameGateway } from './game.gateway';
import { ConnectionRegistryService } from './connection-registry.service';

@Module({
  imports: [GameModule, BotModule, AuthModule],
  providers: [GameGateway, ConnectionRegistryService],
  exports: [GameGateway],
})
export class GatewayModule {}
