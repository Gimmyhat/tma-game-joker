import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  SubmitTaskCompletionDto,
  ReviewTaskCompletionDto,
} from './dto/task.dto';
import { TaskStatus, TaskCompletionStatus, Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
  ) {}

  async createTask(adminId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        ...dto,
        createdById: adminId,
        status: dto.status || TaskStatus.DRAFT,
      } as Prisma.TaskUncheckedCreateInput,
    });
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.task.update({
      where: { id },
      data: dto as Prisma.TaskUncheckedUpdateInput,
    });
  }

  async deleteTask(id: string) {
    // Only if no completions? Or just archive?
    // For safety, let's just archive or delete if no completions.
    const completionsCount = await this.prisma.taskCompletion.count({ where: { taskId: id } });
    if (completionsCount > 0) {
      return this.prisma.task.update({
        where: { id },
        data: { status: TaskStatus.ARCHIVED },
      });
    }
    return this.prisma.task.delete({ where: { id } });
  }

  async listTasksForUser(userIdOrTgId: string | bigint) {
    const userId = await this.economyService.resolveUserId(userIdOrTgId.toString());
    // Return all PUBLISHED tasks
    // Include user's completion status
    const tasks = await this.prisma.task.findMany({
      where: {
        status: TaskStatus.PUBLISHED,
        OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }],
      },
      include: {
        completions: {
          where: { userId },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((task) => {
      const completion = task.completions[0];
      return {
        ...task,
        myCompletion: completion
          ? { status: completion.status, submittedAt: completion.submittedAt }
          : null,
      };
    });
  }

  async getTask(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async submitCompletion(
    userIdOrTgId: string | bigint,
    taskId: string,
    dto: SubmitTaskCompletionDto,
  ) {
    const userId = await this.economyService.resolveUserId(userIdOrTgId.toString());
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== TaskStatus.PUBLISHED) {
      throw new BadRequestException('Task is not published');
    }

    // Check existing
    const existing = await this.prisma.taskCompletion.findUnique({
      where: {
        taskId_userId: { taskId, userId },
      },
    });

    if (existing) {
      if (existing.status === TaskCompletionStatus.APPROVED) {
        throw new BadRequestException('Task already completed');
      }
      if (existing.status === TaskCompletionStatus.PENDING) {
        throw new BadRequestException('Task already submitted and pending review');
      }
      // If REJECTED, allow re-submit? Assuming yes.
    }

    // Create or Update
    const completion = await this.prisma.taskCompletion.upsert({
      where: {
        taskId_userId: { taskId, userId },
      },
      create: {
        taskId,
        userId,
        status: task.autoVerify ? TaskCompletionStatus.APPROVED : TaskCompletionStatus.PENDING,
        proofData: dto.proofData || {},
      },
      update: {
        status: task.autoVerify ? TaskCompletionStatus.APPROVED : TaskCompletionStatus.PENDING,
        proofData: dto.proofData || {},
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });

    // If auto-verify approved, pay reward immediately
    if (completion.status === TaskCompletionStatus.APPROVED) {
      await this.processReward(completion.id, userId, task.rewardAmount, task.id);
    }

    return completion;
  }

  async reviewCompletion(adminId: string, completionId: string, dto: ReviewTaskCompletionDto) {
    const completion = await this.prisma.taskCompletion.findUnique({
      where: { id: completionId },
      include: { task: true },
    });

    if (!completion) {
      throw new NotFoundException('Completion not found');
    }

    if (completion.status === TaskCompletionStatus.APPROVED) {
      throw new BadRequestException('Already approved');
    }

    const updated = await this.prisma.taskCompletion.update({
      where: { id: completionId },
      data: {
        status:
          dto.status === 'APPROVED' ? TaskCompletionStatus.APPROVED : TaskCompletionStatus.REJECTED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });

    if (updated.status === TaskCompletionStatus.APPROVED) {
      await this.processReward(
        updated.id,
        updated.userId,
        completion.task.rewardAmount,
        completion.task.id,
      );
    }

    return updated;
  }

  private async processReward(
    completionId: string,
    userId: string,
    amount: Prisma.Decimal,
    taskId: string,
  ) {
    // Avoid double pay
    const completion = await this.prisma.taskCompletion.findUnique({
      where: { id: completionId },
    });
    if (completion?.transactionId) {
      return; // Already paid
    }

    // Transaction logic
    // We can reuse EconomyService if it exposes a generic credit method,
    // or use adjustBalance, or create a specific method for Task Reward.
    // EconomyService.adjustBalance might be suitable if we treat it as Admin Adjustment or create a new type.
    // Schema has TxType.TASK_REWARD.

    // We need to implement `processTaskReward` in EconomyService or use `adjustBalance` with type override if possible.
    // EconomyService `adjustBalance` uses `ADMIN_ADJUSTMENT`.
    // Let's verify EconomyService capabilities.
    // For now, I will use a direct Prisma transaction here or call a new method in EconomyService.
    // Best to encapsulate in EconomyService.

    const tx = await this.economyService.payoutTaskReward(userId, Number(amount), taskId);

    await this.prisma.taskCompletion.update({
      where: { id: completionId },
      data: { transactionId: tx.transactionId },
    });
  }
}
