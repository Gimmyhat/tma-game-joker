import { Test, TestingModule } from '@nestjs/testing';
import { GameAuditService } from '../services/game-audit.service';
import { RedisService } from '../../database/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GameState } from '@joker/shared';

describe('GameAuditService', () => {
  let service: GameAuditService;
  let redisService: jest.Mocked<RedisService>;
  let prismaService: jest.Mocked<PrismaService>;
  let redisClient: any;

  beforeEach(async () => {
    redisClient = {
      rpush: jest.fn(),
      expire: jest.fn(),
      lrange: jest.fn(),
    };

    const redisServiceMock = {
      getClient: jest.fn().mockReturnValue(redisClient),
    };

    const prismaServiceMock = {
      finishedGame: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameAuditService,
        { provide: RedisService, useValue: redisServiceMock },
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    service = module.get<GameAuditService>(GameAuditService);
    redisService = module.get(RedisService);
    prismaService = module.get(PrismaService);
  });

  describe('logAction', () => {
    it('should push action to Redis buffer', async () => {
      const roomId = 'room-123';
      const action = 'BET';
      const playerId = 'player-1';
      const data = { amount: 10 };

      await service.logAction(roomId, action, playerId, data);

      expect(redisService.getClient).toHaveBeenCalled();
      expect(redisClient.rpush).toHaveBeenCalledWith(
        'game:audit:room-123',
        expect.stringContaining('"a":"BET"'),
      );
      expect(redisClient.expire).toHaveBeenCalledWith('game:audit:room-123', 24 * 60 * 60);
    });

    it('should handle Redis errors gracefully', async () => {
      redisClient.rpush.mockRejectedValue(new Error('Redis error'));
      await expect(service.logAction('room', 'act', 'p1', {})).resolves.not.toThrow();
    });
  });

  describe('saveGameRecord', () => {
    it('should flush logs from Redis to Prisma', async () => {
      const gameState = {
        id: 'room-123',
        createdAt: Date.now(),
        finishedAt: Date.now(),
        winnerId: 'winner',
        players: [
          { id: 'p1', name: 'P1', totalScore: 100, isBot: false },
          { id: 'p2', name: 'P2', totalScore: 50, isBot: true },
        ],
      } as unknown as GameState;

      const logs = [
        JSON.stringify({ t: 1, a: 'START', p: 'sys', d: {} }),
        JSON.stringify({ t: 2, a: 'BET', p: 'p1', d: { amount: 10 } }),
      ];

      redisClient.lrange.mockResolvedValue(logs);

      await service.saveGameRecord(gameState);

      expect(redisClient.lrange).toHaveBeenCalledWith('game:audit:room-123', 0, -1);
      expect(prismaService.finishedGame.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'room-123',
          winnerId: 'winner',
          gameLog: expect.arrayContaining([
            expect.objectContaining({ a: 'START' }),
            expect.objectContaining({ a: 'BET' }),
          ]),
        }),
      });
    });
  });
});
