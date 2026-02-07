import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('stats')
  @UseGuards(TelegramAuthGuard)
  async getStats(@Request() req: any) {
    return this.referralService.getReferralStats(req.user.id);
  }
}
