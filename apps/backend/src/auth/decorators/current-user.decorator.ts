import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TelegramUser | undefined => {
    const client: Socket = ctx.switchToWs().getClient();
    const initData = client.handshake.query.initData as string;

    if (!initData) return undefined;

    try {
      const urlParams = new URLSearchParams(initData);
      const userJson = urlParams.get('user');
      return userJson ? JSON.parse(userJson) : undefined;
    } catch (e) {
      return undefined;
    }
  },
);
