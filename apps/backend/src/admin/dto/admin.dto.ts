import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class CreateAdminDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}

export class UpdatePasswordDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole | null;
}

export class BlockUserDto {
  @IsString()
  reason!: string;
}
