import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/** Default TTL for initData validation (10 minutes) */
const DEFAULT_INIT_DATA_TTL_SECONDS = 600;

/** Verified user data extracted from initData */
export interface VerifiedTelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  private readonly logger = new Logger(TelegramAuthGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();

    // P0-3: SKIP_AUTH only allowed in development mode
    const skipAuth = this.configService.get('SKIP_AUTH');
    const nodeEnv = this.configService.get('NODE_ENV') || process.env.NODE_ENV;
    const isDevelopment = nodeEnv === 'development' || nodeEnv === 'test';

    if (skipAuth === 'true') {
      if (!isDevelopment) {
        this.logger.error('SKIP_AUTH=true is forbidden in production! Rejecting connection.');
        throw new WsException('Authentication required in production');
      }

      // In dev mode with SKIP_AUTH, use query params but mark as dev user
      const userId = client.handshake.query.userId as string;
      const userName = (client.handshake.query.userName as string) || 'DevPlayer';

      if (userId) {
        // Store verified user in socket data for gateway to use
        client.data.verifiedUser = {
          id: parseInt(userId, 10) || Date.now(),
          firstName: userName,
        } as VerifiedTelegramUser;
      }

      this.logger.debug(`Dev mode: SKIP_AUTH enabled for user ${userId}`);
      return true;
    }

    const initData =
      (client.handshake.auth?.initData as string | undefined) ||
      (client.handshake.query.initData as string | undefined);

    if (!initData) {
      throw new WsException('No initData provided');
    }

    // P0-1 + P0-2: Validate signature AND extract verified user
    const verifiedUser = this.validateAndParseInitData(initData);
    if (!verifiedUser) {
      throw new WsException('Invalid initData signature or expired');
    }

    // Store verified user in socket data - gateway MUST use this instead of query params
    client.data.verifiedUser = verifiedUser;

    this.logger.debug(`Authenticated user: ${verifiedUser.id} (${verifiedUser.firstName})`);
    return true;
  }

  /**
   * Validate Telegram initData signature and parse user data
   * P0-1: Extract userId from initData (not from query params)
   * P0-2: Check auth_date TTL to prevent replay attacks
   *
   * @returns VerifiedTelegramUser if valid, null otherwise
   */
  private validateAndParseInitData(initData: string): VerifiedTelegramUser | null {
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      const authDateStr = urlParams.get('auth_date');
      const userStr = urlParams.get('user');

      if (!hash || !authDateStr) {
        this.logger.warn('Missing hash or auth_date in initData');
        return null;
      }

      // P0-2: Check auth_date TTL
      const authDate = parseInt(authDateStr, 10);
      const ttlSeconds =
        parseInt(this.configService.get('INIT_DATA_TTL_SECONDS') || '', 10) ||
        DEFAULT_INIT_DATA_TTL_SECONDS;
      const now = Math.floor(Date.now() / 1000);

      if (now - authDate > ttlSeconds) {
        this.logger.warn(`initData expired: auth_date=${authDate}, now=${now}, ttl=${ttlSeconds}s`);
        return null;
      }

      // Validate HMAC signature
      urlParams.delete('hash');

      const dataCheckString = Array.from(urlParams.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
      if (!botToken) {
        this.logger.error('TELEGRAM_BOT_TOKEN not configured');
        return null;
      }

      const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
      const signature = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      if (signature !== hash) {
        this.logger.warn('Invalid initData signature');
        return null;
      }

      // P0-1: Parse user from initData (authoritative source)
      if (!userStr) {
        this.logger.warn('No user data in initData');
        return null;
      }

      const userData = JSON.parse(userStr);
      if (!userData.id || !userData.first_name) {
        this.logger.warn('Invalid user data structure in initData');
        return null;
      }

      return {
        id: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        username: userData.username,
      };
    } catch (error) {
      this.logger.error(`Failed to parse initData: ${(error as Error).message}`);
      return null;
    }
  }
}
