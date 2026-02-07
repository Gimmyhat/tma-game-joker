import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from '../tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EconomyService } from '../../economy/economy.service';
import { TaskStatus, TaskCompletionStatus } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let prismaService: any;
  let economyService: any;

  beforeEach(async () => {
    prismaService = {
      task: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      taskCompletion: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    economyService = {
      resolveUserId: jest.fn(),
      payoutTaskReward: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prismaService },
        { provide: EconomyService, useValue: economyService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTask', () => {
    it('should create a task', async () => {
      const dto = { title: 'Test Task', rewardAmount: 100 };
      const adminId = 'admin-1';
      prismaService.task.create.mockResolvedValue({ id: 'task-1', ...dto, createdById: adminId });

      const result = await service.createTask(adminId, dto);
      expect(prismaService.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Test Task', createdById: adminId }),
        }),
      );
      expect(result).toEqual(expect.objectContaining({ id: 'task-1' }));
    });
  });

  describe('listTasksForUser', () => {
    it('should return published tasks with completion status', async () => {
      const userId = 'user-1';
      economyService.resolveUserId.mockResolvedValue(userId);
      prismaService.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Task 1',
          status: TaskStatus.PUBLISHED,
          completions: [],
        },
        {
          id: 'task-2',
          title: 'Task 2',
          status: TaskStatus.PUBLISHED,
          completions: [{ status: 'APPROVED', submittedAt: new Date() }],
        },
      ]);

      const result = await service.listTasksForUser('tg-123');
      expect(result).toHaveLength(2);
      expect(result[0].myCompletion).toBeNull();
      expect(result[1].myCompletion).toEqual(expect.objectContaining({ status: 'APPROVED' }));
    });
  });

  describe('submitCompletion', () => {
    it('should submit completion and auto-verify if configured', async () => {
      const userId = 'user-1';
      const taskId = 'task-1';
      economyService.resolveUserId.mockResolvedValue(userId);
      prismaService.task.findUnique.mockResolvedValue({
        id: taskId,
        status: TaskStatus.PUBLISHED,
        autoVerify: true,
        rewardAmount: 50,
      });
      prismaService.taskCompletion.findUnique.mockResolvedValue(null);
      prismaService.taskCompletion.upsert.mockResolvedValue({
        id: 'comp-1',
        taskId,
        userId,
        status: TaskCompletionStatus.APPROVED,
      });
      economyService.payoutTaskReward.mockResolvedValue({
        balanceResult: {},
        transactionId: 'tx-1',
      });
      prismaService.taskCompletion.update.mockResolvedValue({
        id: 'comp-1',
        transactionId: 'tx-1',
      });

      await service.submitCompletion('tg-123', taskId, {});

      expect(economyService.payoutTaskReward).toHaveBeenCalledWith(userId, 50, taskId);
      expect(prismaService.taskCompletion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comp-1' },
          data: { transactionId: 'tx-1' },
        }),
      );
    });

    it('should throw if task not published', async () => {
      economyService.resolveUserId.mockResolvedValue('user-1');
      prismaService.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: TaskStatus.DRAFT,
      });

      await expect(service.submitCompletion('tg-123', 'task-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
