import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TournamentStatus } from '@prisma/client';
import { EventLogService } from '../../event-log/event-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramBotService } from '../../telegram-bot/telegram-bot.service';
import { TournamentService } from '../tournament.service';

describe('TournamentService', () => {
  let service: TournamentService;

  const mockPrismaService = {
    tournament: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    tournamentParticipant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEventLogService = {
    logTournamentEvent: jest.fn().mockResolvedValue(undefined),
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockTelegramBotService = {
    sendMessageToUser: jest.fn().mockResolvedValue({ delivered: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventLogService,
          useValue: mockEventLogService,
        },
        {
          provide: TelegramBotService,
          useValue: mockTelegramBotService,
        },
      ],
    }).compile();

    service = module.get<TournamentService>(TournamentService);
    jest.clearAllMocks();
  });

  describe('joinTournament', () => {
    it('should register user in tournament', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
              create: jest.fn(),
            },
            tournament: {
              findUnique: jest.fn().mockResolvedValue({
                id: 't-1',
                status: TournamentStatus.REGISTRATION,
                config: { maxPlayers: 16 },
              }),
            },
            tournamentParticipant: {
              findUnique: jest.fn().mockResolvedValue(null),
              findFirst: jest.fn().mockResolvedValue(null),
              count: jest.fn().mockResolvedValue(10),
              create: jest.fn().mockResolvedValue({ id: 'p-1', status: 'REGISTERED' }),
            },
          });
        },
      );

      const result = await service.joinTournament('t-1', '123e4567-e89b-42d3-a456-426614174000');

      expect(result.participantId).toBe('p-1');
      expect(result.status).toBe('REGISTERED');
    });

    it('should reject duplicate registration in same tournament', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
              create: jest.fn(),
            },
            tournament: {
              findUnique: jest.fn().mockResolvedValue({
                id: 't-1',
                status: TournamentStatus.REGISTRATION,
                config: { maxPlayers: 16 },
              }),
            },
            tournamentParticipant: {
              findUnique: jest.fn().mockResolvedValue({ id: 'exists' }),
              findFirst: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
            },
          });
        },
      );

      await expect(
        service.joinTournament('t-1', '123e4567-e89b-42d3-a456-426614174000'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if user already in another active tournament', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
              create: jest.fn(),
            },
            tournament: {
              findUnique: jest.fn().mockResolvedValue({
                id: 't-1',
                status: TournamentStatus.REGISTRATION,
                config: { maxPlayers: 16 },
              }),
            },
            tournamentParticipant: {
              findUnique: jest.fn().mockResolvedValue(null),
              findFirst: jest.fn().mockResolvedValue({ tournamentId: 't-2' }),
              count: jest.fn(),
              create: jest.fn(),
            },
          });
        },
      );

      await expect(
        service.joinTournament('t-1', '123e4567-e89b-42d3-a456-426614174000'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when tournament is full', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
              create: jest.fn(),
            },
            tournament: {
              findUnique: jest.fn().mockResolvedValue({
                id: 't-1',
                status: TournamentStatus.REGISTRATION,
                config: { maxPlayers: 16 },
              }),
            },
            tournamentParticipant: {
              findUnique: jest.fn().mockResolvedValue(null),
              findFirst: jest.fn().mockResolvedValue(null),
              count: jest.fn().mockResolvedValue(16),
              create: jest.fn(),
            },
          });
        },
      );

      await expect(
        service.joinTournament('t-1', '123e4567-e89b-42d3-a456-426614174000'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('leaveTournament', () => {
    it('should allow leaving before tournament started', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
              create: jest.fn(),
            },
            tournament: {
              findUnique: jest.fn().mockResolvedValue({
                id: 't-1',
                status: TournamentStatus.REGISTRATION,
              }),
            },
            tournamentParticipant: {
              findUnique: jest.fn().mockResolvedValue({ id: 'p-1' }),
              delete: jest.fn().mockResolvedValue({ id: 'p-1' }),
            },
          });
        },
      );

      const result = await service.leaveTournament('t-1', '123e4567-e89b-42d3-a456-426614174000');

      expect(result.left).toBe(true);
    });

    it('should reject leaving after start', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
              create: jest.fn(),
            },
            tournament: {
              findUnique: jest.fn().mockResolvedValue({
                id: 't-1',
                status: TournamentStatus.STARTED,
              }),
            },
            tournamentParticipant: {
              findUnique: jest.fn(),
              delete: jest.fn(),
            },
          });
        },
      );

      await expect(
        service.leaveTournament('t-1', '123e4567-e89b-42d3-a456-426614174000'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw not found when participant does not exist', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
              create: jest.fn(),
            },
            tournament: {
              findUnique: jest.fn().mockResolvedValue({
                id: 't-1',
                status: TournamentStatus.REGISTRATION,
              }),
            },
            tournamentParticipant: {
              findUnique: jest.fn().mockResolvedValue(null),
              delete: jest.fn(),
            },
          });
        },
      );

      await expect(
        service.leaveTournament('t-1', '123e4567-e89b-42d3-a456-426614174000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('processLifecycleTransitions', () => {
    it('should update statuses and start bracket by time', async () => {
      mockPrismaService.tournament.updateMany.mockResolvedValueOnce({ count: 2 });
      mockPrismaService.tournament.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 't-1' }]);

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            tournament: {
              findUnique: jest.fn().mockResolvedValue({
                id: 't-1',
                status: TournamentStatus.REGISTRATION,
                config: { maxPlayers: 16 },
                currentStage: 0,
              }),
              update: jest.fn().mockResolvedValue({ id: 't-1' }),
            },
            tournamentParticipant: {
              findMany: jest
                .fn()
                .mockResolvedValue([
                  { userId: 'u-1' },
                  { userId: 'u-2' },
                  { userId: 'u-3' },
                  { userId: 'u-4' },
                ]),
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          });
        },
      );

      const result = await service.processLifecycleTransitions(
        new Date('2026-02-07T12:00:00.000Z'),
      );

      expect(result.announcedToRegistration).toBe(2);
      expect(result.registrationToStarted).toBe(1);
      expect(result.startedToFinished).toBe(0);
      expect(mockPrismaService.tournament.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.tournament.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('tournament reminders', () => {
    it('should send day reminder and persist reminder mark', async () => {
      const now = new Date('2026-02-07T12:00:00.000Z');
      mockPrismaService.tournament.updateMany.mockResolvedValueOnce({ count: 0 });
      mockPrismaService.tournament.findMany
        .mockResolvedValueOnce([
          {
            id: 't-rem-1',
            title: 'Weekly Cup',
            startTime: new Date('2026-02-08T12:00:00.000Z'),
            botFillConfig: null,
          },
        ])
        .mockResolvedValueOnce([]);
      mockPrismaService.tournamentParticipant.findMany.mockResolvedValueOnce([
        { user: { tgId: BigInt(123456789), blockedAt: null } },
      ]);
      mockPrismaService.tournament.update.mockResolvedValue({ id: 't-rem-1' });

      await service.processLifecycleTransitions(now);

      expect(mockTelegramBotService.sendMessageToUser).toHaveBeenCalledTimes(1);
      expect(mockEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          contextTournamentId: 't-rem-1',
          details: expect.objectContaining({
            action: 'TOURNAMENT_REMINDER_SENT',
            reminderType: 'DAY',
          }),
        }),
      );
      expect(mockPrismaService.tournament.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't-rem-1' },
          data: {
            botFillConfig: expect.objectContaining({
              reminderMeta: expect.objectContaining({
                daySentAt: now.toISOString(),
              }),
            }),
          },
        }),
      );
    });

    it('should send minute reminder and not resend already sent day reminder', async () => {
      const now = new Date('2026-02-08T11:45:00.000Z');
      mockPrismaService.tournament.updateMany.mockResolvedValueOnce({ count: 0 });
      mockPrismaService.tournament.findMany
        .mockResolvedValueOnce([
          {
            id: 't-rem-2',
            title: 'Weekly Cup',
            startTime: new Date('2026-02-08T12:00:00.000Z'),
            botFillConfig: {
              reminderMeta: {
                daySentAt: '2026-02-07T12:00:00.000Z',
              },
            },
          },
        ])
        .mockResolvedValueOnce([]);
      mockPrismaService.tournamentParticipant.findMany.mockResolvedValueOnce([
        { user: { tgId: BigInt(123456789), blockedAt: null } },
      ]);
      mockPrismaService.tournament.update.mockResolvedValue({ id: 't-rem-2' });

      await service.processLifecycleTransitions(now);

      expect(mockTelegramBotService.sendMessageToUser).toHaveBeenCalledTimes(1);
      expect(mockEventLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          contextTournamentId: 't-rem-2',
          details: expect.objectContaining({
            action: 'TOURNAMENT_REMINDER_SENT',
            reminderType: 'MINUTE',
          }),
        }),
      );
      expect(mockPrismaService.tournament.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            botFillConfig: expect.objectContaining({
              reminderMeta: expect.objectContaining({
                daySentAt: '2026-02-07T12:00:00.000Z',
                minuteSentAt: now.toISOString(),
              }),
            }),
          },
        }),
      );
    });

    it('should skip reminders when both marks already exist', async () => {
      const now = new Date('2026-02-08T11:50:00.000Z');
      mockPrismaService.tournament.updateMany.mockResolvedValueOnce({ count: 0 });
      mockPrismaService.tournament.findMany
        .mockResolvedValueOnce([
          {
            id: 't-rem-3',
            title: 'Weekly Cup',
            startTime: new Date('2026-02-08T12:00:00.000Z'),
            botFillConfig: {
              reminderMeta: {
                daySentAt: '2026-02-07T12:00:00.000Z',
                minuteSentAt: '2026-02-08T11:45:00.000Z',
              },
            },
          },
        ])
        .mockResolvedValueOnce([]);

      await service.processLifecycleTransitions(now);

      expect(mockTelegramBotService.sendMessageToUser).not.toHaveBeenCalled();
      expect(mockPrismaService.tournamentParticipant.findMany).not.toHaveBeenCalled();
      expect(mockPrismaService.tournament.update).not.toHaveBeenCalled();
    });
  });

  describe('reportMatchResult', () => {
    it('should report match and advance stage', async () => {
      const bracketState = {
        format: 'single_elimination',
        size: 16,
        currentStage: 1,
        finished: false,
        winnerUserId: null,
        updatedAt: '2026-02-07T12:00:00.000Z',
        stages: [
          {
            stage: 1,
            matches: [
              {
                id: 's1m1',
                stage: 1,
                index: 0,
                player1UserId: 'user-1',
                player2UserId: 'user-2',
                winnerUserId: null,
                status: 'PENDING',
              },
              {
                id: 's1m2',
                stage: 1,
                index: 1,
                player1UserId: 'user-3',
                player2UserId: null,
                winnerUserId: 'user-3',
                status: 'COMPLETED',
              },
              {
                id: 's1m3',
                stage: 1,
                index: 2,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
              {
                id: 's1m4',
                stage: 1,
                index: 3,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
              {
                id: 's1m5',
                stage: 1,
                index: 4,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
              {
                id: 's1m6',
                stage: 1,
                index: 5,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
              {
                id: 's1m7',
                stage: 1,
                index: 6,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
              {
                id: 's1m8',
                stage: 1,
                index: 7,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
            ],
          },
          {
            stage: 2,
            matches: [
              {
                id: 's2m1',
                stage: 2,
                index: 0,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
              {
                id: 's2m2',
                stage: 2,
                index: 1,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
              {
                id: 's2m3',
                stage: 2,
                index: 2,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
              {
                id: 's2m4',
                stage: 2,
                index: 3,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
            ],
          },
          {
            stage: 3,
            matches: [
              {
                id: 's3m1',
                stage: 3,
                index: 0,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
              {
                id: 's3m2',
                stage: 3,
                index: 1,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
            ],
          },
          {
            stage: 4,
            matches: [
              {
                id: 's4m1',
                stage: 4,
                index: 0,
                player1UserId: null,
                player2UserId: null,
                winnerUserId: null,
                status: 'COMPLETED',
              },
            ],
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
              create: jest.fn(),
            },
            tournament: {
              findUnique: jest.fn().mockResolvedValue({
                id: 't-1',
                status: TournamentStatus.STARTED,
                bracketState,
                currentStage: 1,
              }),
              update: jest.fn().mockImplementation(async ({ data }: { data: any }) => ({
                id: 't-1',
                status: data.status,
                currentStage: data.currentStage,
                bracketState: data.bracketState,
              })),
            },
            tournamentParticipant: {
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          });
        },
      );

      const result = await service.reportMatchResult(
        't-1',
        's1m1',
        '123e4567-e89b-42d3-a456-426614174000',
      );

      expect(result.tournamentId).toBe('t-1');
      expect(result.status).toBe(TournamentStatus.STARTED);
      expect(result.currentStage).toBe(2);
      expect(mockEventLogService.logTournamentEvent).toHaveBeenCalledWith(
        'TOURNAMENT_STAGE_STARTED',
        't-1',
        'user-1',
        { currentStage: 2 },
      );
    });
  });
});
