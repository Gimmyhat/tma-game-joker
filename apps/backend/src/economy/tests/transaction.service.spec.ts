import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from '../transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';

describe('TransactionService', () => {
  let service: TransactionService;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    tgId: BigInt(123456789),
    username: 'testuser',
    balanceCj: new Decimal('100.00'),
  };

  const mockTransaction = {
    id: 'tx-123',
    userId: mockUser.id,
    amount: new Decimal('-10.00'),
    type: 'WITHDRAW',
    status: 'PENDING',
    balanceAfter: new Decimal('90.00'),
    createdAt: new Date(),
  };

  const mockPrismaService = {
    transaction: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);

    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should return transaction with user info', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        user: { id: mockUser.id, username: 'testuser', tgId: mockUser.tgId },
      });

      const result = await service.getById('tx-123');

      expect(result?.id).toBe('tx-123');
      expect(mockPrismaService.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'tx-123' },
        include: expect.any(Object),
      });
    });

    it('should return null if not found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return paginated transactions', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrismaService.transaction.count.mockResolvedValue(1);

      const result = await service.list({}, 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should apply filters', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([]);
      mockPrismaService.transaction.count.mockResolvedValue(0);

      await service.list({ userId: mockUser.id, type: 'WITHDRAW', status: 'PENDING' }, 1, 20);

      expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUser.id,
            type: 'WITHDRAW',
            status: 'PENDING',
          }),
        }),
      );
    });
  });

  describe('createWithdrawal', () => {
    it('should create pending withdrawal and hold amount', async () => {
      const newBalance = new Decimal('90.00');

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
              update: jest.fn().mockResolvedValue({ ...mockUser, balanceCj: newBalance }),
            },
            transaction: {
              create: jest.fn().mockResolvedValue(mockTransaction),
            },
          });
        },
      );

      const result = await service.createWithdrawal(mockUser.id, 10, 'wallet-address');

      expect(result.id).toBe('tx-123');
      expect(result.status).toBe('PENDING');
    });

    it('should throw BadRequestException if amount <= 0', async () => {
      await expect(service.createWithdrawal(mockUser.id, 0)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if insufficient balance', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue({ ...mockUser, balanceCj: new Decimal('5') }),
            },
          });
        },
      );

      await expect(service.createWithdrawal(mockUser.id, 100)).rejects.toThrow(BadRequestException);
    });

    it('should return existing transaction for duplicate idempotency key', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await service.createWithdrawal(mockUser.id, 10, undefined, 'idempotency-key');

      expect(result).toBe(mockTransaction);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('approveWithdrawal', () => {
    it('should approve pending withdrawal', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);
      mockPrismaService.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: 'SUCCESS',
        processedAt: new Date(),
      });

      const result = await service.approveWithdrawal('tx-123', 'admin-id');

      expect(result.status).toBe('SUCCESS');
      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-123' },
        data: expect.objectContaining({
          status: 'SUCCESS',
          initiatedById: 'admin-id',
        }),
      });
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(service.approveWithdrawal('nonexistent', 'admin-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if not a withdrawal', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        type: 'DEPOSIT',
      });

      await expect(service.approveWithdrawal('tx-123', 'admin-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if already processed', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        status: 'SUCCESS',
      });

      await expect(service.approveWithdrawal('tx-123', 'admin-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rejectWithdrawal', () => {
    it('should reject and refund withdrawal', async () => {
      const refundedBalance = new Decimal('110.00');

      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
              update: jest.fn().mockResolvedValue({ ...mockUser, balanceCj: refundedBalance }),
            },
            transaction: {
              update: jest.fn().mockResolvedValue({
                ...mockTransaction,
                status: 'CANCELLED',
                rejectionReason: 'Invalid wallet',
              }),
              create: jest.fn().mockResolvedValue({ id: 'refund-tx' }),
            },
          });
        },
      );

      const result = await service.rejectWithdrawal('tx-123', 'admin-id', 'Invalid wallet');

      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('createDeposit', () => {
    it('should create deposit and credit balance', async () => {
      const newBalance = new Decimal('150.00');
      const depositTx = {
        id: 'deposit-123',
        userId: mockUser.id,
        amount: new Decimal('50.00'),
        type: 'DEPOSIT',
        status: 'SUCCESS',
        balanceAfter: newBalance,
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
              update: jest.fn().mockResolvedValue({ ...mockUser, balanceCj: newBalance }),
            },
            transaction: {
              create: jest.fn().mockResolvedValue(depositTx),
            },
          });
        },
      );

      const result = await service.createDeposit(mockUser.id, 50);

      expect(result.id).toBe('deposit-123');
      expect(result.status).toBe('SUCCESS');
    });

    it('should throw BadRequestException if amount <= 0', async () => {
      await expect(service.createDeposit(mockUser.id, 0)).rejects.toThrow(BadRequestException);
    });

    it('should return existing transaction for duplicate idempotency key', async () => {
      const existingDeposit = { id: 'existing-deposit', type: 'DEPOSIT' };
      mockPrismaService.transaction.findUnique.mockResolvedValue(existingDeposit);

      const result = await service.createDeposit(mockUser.id, 50, 'idempotency-key');

      expect(result).toBe(existingDeposit);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });
});
