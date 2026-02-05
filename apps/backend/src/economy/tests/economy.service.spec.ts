import { Test, TestingModule } from '@nestjs/testing';
import { EconomyService } from '../economy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';

describe('EconomyService', () => {
  let service: EconomyService;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    tgId: BigInt(123456789),
    username: 'testuser',
    balanceCj: new Decimal('100.00'),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EconomyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EconomyService>(EconomyService);
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return user balance', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getBalance(mockUser.id);

      expect(result.userId).toBe(mockUser.id);
      expect(result.balance.toString()).toBe('100');
      expect(result.currency).toBe('CJ');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getBalance('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrCreateUser', () => {
    it('should return existing user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getOrCreateUser(mockUser.tgId, 'testuser');

      expect(result).toBe(mockUser);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should create new user if not exists', async () => {
      const newUser = { ...mockUser, id: 'new-id' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(newUser);

      const result = await service.getOrCreateUser(BigInt(999), 'newuser');

      expect(result).toBe(newUser);
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return true if balance >= amount', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasSufficientBalance(mockUser.id, 50);

      expect(result).toBe(true);
    });

    it('should return false if balance < amount', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasSufficientBalance(mockUser.id, 150);

      expect(result).toBe(false);
    });
  });

  describe('holdForBet', () => {
    it('should hold amount and return result', async () => {
      const newBalance = new Decimal('90.00');
      const transaction = { id: 'tx-123', status: 'SUCCESS', balanceAfter: newBalance };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
              update: jest.fn().mockResolvedValue({ ...mockUser, balanceCj: newBalance }),
            },
            transaction: {
              create: jest.fn().mockResolvedValue(transaction),
            },
          });
        },
      );

      const result = await service.holdForBet(mockUser.id, 10, 'table-123');

      expect(result.success).toBe(true);
      expect(result.holdId).toBe('tx-123');
    });

    it('should throw BadRequestException if amount <= 0', async () => {
      await expect(service.holdForBet(mockUser.id, 0, 'table-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.holdForBet(mockUser.id, -5, 'table-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return existing transaction for duplicate idempotency key', async () => {
      const existingTx = { id: 'tx-existing', status: 'SUCCESS', balanceAfter: new Decimal('90') };
      mockPrismaService.transaction.findUnique.mockResolvedValue(existingTx);

      const result = await service.holdForBet(mockUser.id, 10, 'table-123', 'idempotency-key');

      expect(result.success).toBe(true);
      expect(result.holdId).toBe('tx-existing');
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('payoutWinnings', () => {
    it('should credit winnings to user', async () => {
      const newBalance = new Decimal('150.00');
      const transaction = { id: 'tx-456', status: 'SUCCESS', balanceAfter: newBalance };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
              update: jest.fn().mockResolvedValue({ ...mockUser, balanceCj: newBalance }),
            },
            transaction: {
              create: jest.fn().mockResolvedValue(transaction),
            },
          });
        },
      );

      const result = await service.payoutWinnings(mockUser.id, 50, 'table-123');

      expect(result.userId).toBe(mockUser.id);
      expect(result.balance.toString()).toBe('150');
      expect(result.currency).toBe('CJ');
    });
  });

  describe('adjustBalance', () => {
    it('should allow positive adjustment', async () => {
      const newBalance = new Decimal('200.00');

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
              update: jest.fn().mockResolvedValue({ ...mockUser, balanceCj: newBalance }),
            },
            transaction: {
              create: jest.fn().mockResolvedValue({ id: 'tx-adj' }),
            },
          });
        },
      );

      const result = await service.adjustBalance(mockUser.id, 100, 'admin-id', 'Bonus');

      expect(result.balance.toString()).toBe('200');
    });

    it('should allow negative adjustment if balance remains positive', async () => {
      const newBalance = new Decimal('50.00');

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
              update: jest.fn().mockResolvedValue({ ...mockUser, balanceCj: newBalance }),
            },
            transaction: {
              create: jest.fn().mockResolvedValue({ id: 'tx-adj' }),
            },
          });
        },
      );

      const result = await service.adjustBalance(mockUser.id, -50, 'admin-id', 'Penalty');

      expect(result.balance.toString()).toBe('50');
    });

    it('should throw BadRequestException if resulting balance is negative', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
            },
          });
        },
      );

      await expect(
        service.adjustBalance(mockUser.id, -200, 'admin-id', 'Excessive penalty'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
