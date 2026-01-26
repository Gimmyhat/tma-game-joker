import { Injectable } from '@nestjs/common';

@Injectable()
export class ConnectionRegistryService {
  private socketToPlayer: Map<string, { id: string; name: string }> = new Map();

  register(socketId: string, playerId: string, playerName: string): void {
    this.socketToPlayer.set(socketId, { id: playerId, name: playerName });
  }

  getBySocketId(socketId: string): { id: string; name: string } | undefined {
    return this.socketToPlayer.get(socketId);
  }

  unregister(socketId: string): void {
    this.socketToPlayer.delete(socketId);
  }
}
