import { Test, TestingModule } from '@nestjs/testing';
import { GameCleanupService } from '../services/game-cleanup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('GameCleanupService', () => {
  let service: GameCleanupService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const prismaServiceMock = {
      finishedGame: {
        updateMany: jest.fn(),
      },
    };

    const configServiceMock = {
      get: jest.fn().mockReturnValue('mock-db-url'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameCleanupService,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<GameCleanupService>(GameCleanupService);
    prismaService = module.get(PrismaService);
  });

  it('should clean up old logs', async () => {
    // @ts-ignore
    prismaService.finishedGame.updateMany.mockResolvedValue({ count: 5 });

    await service.handleLogCleanup();

    // @ts-ignore
    expect(prismaService.finishedGame.updateMany).toHaveBeenCalledWith({
      where: {
        finishedAt: {
          lt: expect.any(Date), // 3 days ago
        },
      },
      data: {
        gameLog: [],
      },
    });
  });
});
