import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Socket } from 'socket.io';

export interface VerifiedTelegramUser {
  id: bigint;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isBot?: boolean;
  isPremium?: boolean;
  allowsWriteToPm?: boolean;
  photoUrl?: string;
  startParam?: string; // Added field
}

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  private readonly logger = new Logger(TelegramAuthGuard.name);
  private readonly botToken: string;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set. Auth will fail in production.');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      process.env.SKIP_AUTH === 'true' &&
      (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
    ) {
      return true;
    }

    const client: Socket = context.switchToWs().getClient();
    const initData =
      (client.handshake.auth?.initData as string) || (client.handshake.query?.initData as string);

    if (!initData) {
      throw new UnauthorizedException('Missing initData');
    }

    const user = this.validateAndParseInitData(initData);
    if (!user) {
      throw new UnauthorizedException('Invalid initData signature');
    }

    // Attach to socket data for gateway access
    client.data.verifiedUser = user;
    return true;
  }

  validateAndParseInitData(initData: string): VerifiedTelegramUser | null {
    // Allow mock data in dev/test mode if SKIP_AUTH is true
    if (
      process.env.SKIP_AUTH === 'true' &&
      (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
    ) {
      const urlParams = new URLSearchParams(initData);
      const userStr = urlParams.get('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const startParam = urlParams.get('start_param') || undefined;
          return {
            id: BigInt(user.id),
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
            languageCode: user.language_code,
            isBot: user.is_bot,
            isPremium: user.is_premium,
            allowsWriteToPm: user.allows_write_to_pm,
            photoUrl: user.photo_url,
            startParam,
          };
        } catch (e) {
          this.logger.warn('Failed to parse mock user JSON', e);
        }
      }
    }

    if (!this.botToken) return null;

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    // Extract start_param immediately
    const startParam = urlParams.get('start_param') || undefined;

    if (!hash) {
      this.logger.debug('No hash in initData');
      return null;
    }

    urlParams.delete('hash');

    // Sort keys alphabetically
    const paramsToCheck: string[] = [];
    urlParams.forEach((val, key) => {
      paramsToCheck.push(`${key}=${val}`);
    });
    paramsToCheck.sort();

    const dataCheckString = paramsToCheck.join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(this.botToken).digest();
    const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      this.logger.debug(`Hash mismatch. Calc: ${calculatedHash}, Recv: ${hash}`);
      return null;
    }

    // Parse user object
    const userStr = urlParams.get('user');
    if (!userStr) return null;

    try {
      const user = JSON.parse(userStr);
      return {
        id: BigInt(user.id),
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        languageCode: user.language_code,
        isBot: user.is_bot,
        isPremium: user.is_premium,
        allowsWriteToPm: user.allows_write_to_pm,
        photoUrl: user.photo_url,
        startParam, // Include startParam in result
      };
    } catch (e) {
      this.logger.error('Failed to parse user JSON', e);
      return null;
    }
  }
}
