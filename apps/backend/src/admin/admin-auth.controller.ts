import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
import { LoginDto } from './dto/admin.dto';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.adminService.login(dto.username, dto.password);
  }
}
