import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const skipAuth = this.configService.get('SKIP_AUTH');
    // For development, allow skipping auth if enabled
    if (skipAuth === 'true') {
      return true;
    }

    console.log('Auth check failed. SKIP_AUTH:', skipAuth); // Debug log

    const client: Socket = context.switchToWs().getClient();
    const initData =
      (client.handshake.auth?.initData as string | undefined) ||
      (client.handshake.query.initData as string | undefined);

    if (!initData) {
      throw new WsException('No initData provided');
    }

    if (!this.validateInitData(initData)) {
      throw new WsException('Invalid initData signature');
    }

    return true;
  }

  /**
   * Validate Telegram initData signature
   * Algorithm: HMAC-SHA256(data_check_string, secret_key)
   */
  private validateInitData(initData: string): boolean {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) return false;

    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN not set');
      return false;
    }

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();

    const signature = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return signature === hash;
  }
}
