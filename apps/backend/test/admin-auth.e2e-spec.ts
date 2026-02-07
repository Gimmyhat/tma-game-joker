/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./types/supertest.d.ts" />

import * as bcrypt from 'bcrypt';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin Auth Logout (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId = '';
  let adminUsername = '';

  const adminPassword = 'admin-pass-123';
  const runSuffix = BigInt(Date.now().toString().slice(-9));
  const adminTgId = 920000000000n + runSuffix;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TELEGRAM_BOT_TOKEN = 'your_bot_token_here';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    adminUsername = `logout_admin_${runSuffix.toString()}`;

    const admin = await prisma.user.create({
      data: {
        tgId: adminTgId,
        username: adminUsername,
        role: 'ADMIN',
        adminRole: 'ADMIN',
        passwordHash,
      },
    });

    adminId = admin.id;
  });

  afterAll(async () => {
    if (adminId) {
      await prisma.user.deleteMany({ where: { id: adminId } });
    }

    await app.close();
  });

  it('rejects old token after logout and allows re-login', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({
        username: adminUsername,
        password: adminPassword,
      })
      .expect(200);

    const token = loginRes.body.accessToken as string;
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);

    await request(app.getHttpServer())
      .get('/admin/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/admin/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/admin/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    const adminAfterLogout = await prisma.user.findUnique({
      where: { id: adminId },
      select: { adminTokenVersion: true },
    });
    expect(adminAfterLogout?.adminTokenVersion).toBe(1);

    const reloginRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({
        username: adminUsername,
        password: adminPassword,
      })
      .expect(200);

    const freshToken = reloginRes.body.accessToken as string;
    expect(freshToken).toBeDefined();

    await request(app.getHttpServer())
      .get('/admin/me')
      .set('Authorization', `Bearer ${freshToken}`)
      .expect(200);
  });
});
