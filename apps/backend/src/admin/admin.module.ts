import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EconomyModule,
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          'ADMIN_JWT_SECRET',
          'admin-jwt-secret-change-in-production',
        ),
        signOptions: {
          expiresIn: '8h' as const,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService, JwtStrategy, AdminJwtAuthGuard, RolesGuard],
  exports: [AdminService, AdminJwtAuthGuard, RolesGuard],
})
export class AdminModule {}
