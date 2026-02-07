/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./types/supertest.d.ts" />

import { TaskCompletionStatus, TaskStatus, TxType } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ValidationPipe, CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TelegramAuthGuard, VerifiedTelegramUser } from '../src/auth/guards/telegram-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';

class TestTelegramAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: VerifiedTelegramUser;
    }>();

    const headerValue = req.headers['x-test-tg-id'];
    const tgIdStr =
      typeof headerValue === 'string' && /^\d+$/.test(headerValue) ? headerValue : '0';

    req.user = {
      id: tgIdStr === '0' ? 777000001n : BigInt(tgIdStr),
      firstName: 'E2E',
      username: 'tasks_e2e_user',
    };

    return true;
  }
}

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let playerTgId: bigint;

  let manualTaskId: string;
  let manualCompletionId: string;
  let autoTaskId: string;
  let autoCompletionId: string;

  const createdTaskIds: string[] = [];
  const createdUserIds: string[] = [];
  const runSuffix = BigInt(Date.now().toString().slice(-9));
  const adminTgId = 900000000000n + runSuffix;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TELEGRAM_BOT_TOKEN = 'your_bot_token_here';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(TelegramAuthGuard)
      .useValue(new TestTelegramAuthGuard())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    playerTgId = 800000000000n + runSuffix;

    const admin = await prisma.user.create({
      data: {
        tgId: adminTgId,
        username: `tasks_admin_${runSuffix.toString()}`,
        role: 'ADMIN',
        adminRole: 'ADMIN',
      },
    });
    createdUserIds.push(admin.id);

    const player = await prisma.user.create({
      data: {
        tgId: playerTgId,
        username: `tasks_player_${runSuffix.toString()}`,
      },
    });
    createdUserIds.push(player.id);

    adminToken = jwtService.sign({
      sub: admin.id,
      username: admin.username,
      role: admin.adminRole,
      tokenVersion: admin.adminTokenVersion,
    });
  });

  afterAll(async () => {
    if (createdTaskIds.length > 0) {
      await prisma.taskCompletion.deleteMany({
        where: { taskId: { in: createdTaskIds } },
      });
      await prisma.transaction.deleteMany({
        where: {
          type: TxType.TASK_REWARD,
          referenceType: 'TASK',
          referenceId: { in: createdTaskIds },
        },
      });
      await prisma.task.deleteMany({ where: { id: { in: createdTaskIds } } });
    }

    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }

    await app.close();
  });

  it('POST /tasks requires admin jwt', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'no-auth', rewardAmount: 1 })
      .expect(401);
  });

  it('POST /tasks + PATCH /tasks/:id create and update task', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `manual-task-${runSuffix.toString()}`,
        shortDescription: 'manual verification task',
        rewardAmount: 125,
        status: TaskStatus.PUBLISHED,
        autoVerify: false,
      })
      .expect(201);

    manualTaskId = createRes.body.id;
    createdTaskIds.push(manualTaskId);

    expect(createRes.body.status).toBe(TaskStatus.PUBLISHED);
    expect(createRes.body.autoVerify).toBe(false);

    const updateRes = await request(app.getHttpServer())
      .patch(`/tasks/${manualTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ shortDescription: 'manual verification task (updated)' })
      .expect(200);

    expect(updateRes.body.shortDescription).toContain('updated');
  });

  it('GET /tasks returns published tasks for user', async () => {
    const res = await request(app.getHttpServer())
      .get('/tasks')
      .set('x-test-tg-id', playerTgId.toString())
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const task = res.body.find((item: { id: string }) => item.id === manualTaskId);
    expect(task).toBeDefined();
    expect(task.myCompletion).toBeNull();
  });

  it('POST /tasks/:id/complete creates completion with PENDING status (manual)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/tasks/${manualTaskId}/complete`)
      .set('x-test-tg-id', playerTgId.toString())
      .send({ proofData: { screenshot: 'https://example.com/proof.png' } })
      .expect(201);

    manualCompletionId = res.body.id;
    expect(res.body.status).toBe(TaskCompletionStatus.PENDING);

    const dbCompletion = await prisma.taskCompletion.findUnique({
      where: { id: manualCompletionId },
    });
    expect(dbCompletion).not.toBeNull();
    expect(dbCompletion?.transactionId).toBeNull();
  });

  it('POST /tasks/completions/:id/review APPROVED credits TASK_REWARD', async () => {
    const playerBefore = await prisma.user.findUnique({
      where: { tgId: playerTgId },
      select: { balanceCj: true },
    });
    expect(playerBefore).not.toBeNull();

    const reviewRes = await request(app.getHttpServer())
      .post(`/tasks/completions/${manualCompletionId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })
      .expect(201);

    expect(reviewRes.body.status).toBe(TaskCompletionStatus.APPROVED);
    expect(reviewRes.body.transactionId ?? null).toBeNull();

    const reviewedCompletion = await prisma.taskCompletion.findUnique({
      where: { id: manualCompletionId },
      select: { transactionId: true },
    });
    expect(reviewedCompletion?.transactionId).toBeDefined();

    const tx = await prisma.transaction.findUnique({
      where: { id: reviewedCompletion?.transactionId || '' },
    });
    expect(tx).not.toBeNull();
    expect(tx?.type).toBe(TxType.TASK_REWARD);
    expect(tx?.referenceId).toBe(manualTaskId);

    const playerAfter = await prisma.user.findUnique({
      where: { tgId: playerTgId },
      select: { balanceCj: true },
    });
    expect(playerAfter).not.toBeNull();

    const beforeBalance = Number(playerBefore?.balanceCj ?? 0);
    const afterBalance = Number(playerAfter?.balanceCj ?? 0);
    expect(afterBalance - beforeBalance).toBe(125);
  });

  it('AUTO task completion is APPROVED and gets transactionId in DB', async () => {
    const createAutoRes = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `auto-task-${runSuffix.toString()}`,
        rewardAmount: 75,
        status: TaskStatus.PUBLISHED,
        autoVerify: true,
      })
      .expect(201);

    autoTaskId = createAutoRes.body.id;
    createdTaskIds.push(autoTaskId);

    const submitRes = await request(app.getHttpServer())
      .post(`/tasks/${autoTaskId}/complete`)
      .set('x-test-tg-id', playerTgId.toString())
      .send({ proofData: { code: 'AUTO-OK' } })
      .expect(201);

    autoCompletionId = submitRes.body.id;
    expect(submitRes.body.status).toBe(TaskCompletionStatus.APPROVED);

    const dbCompletion = await prisma.taskCompletion.findUnique({
      where: { id: autoCompletionId },
    });
    expect(dbCompletion?.transactionId).toBeDefined();

    const rewardTx = await prisma.transaction.findUnique({
      where: { id: dbCompletion?.transactionId || '' },
    });
    expect(rewardTx).not.toBeNull();
    expect(rewardTx?.type).toBe(TxType.TASK_REWARD);

    await request(app.getHttpServer())
      .post(`/tasks/${autoTaskId}/complete`)
      .set('x-test-tg-id', playerTgId.toString())
      .send({ proofData: { code: 'AUTO-RETRY' } })
      .expect(400);
  });

  it('DELETE /tasks/:id archives task when completion exists', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/tasks/${manualTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.status).toBe(TaskStatus.ARCHIVED);
  });
});
