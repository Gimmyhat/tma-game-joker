import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard } from 'grammy';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Bot | null = null;

  constructor(private readonly configService: ConfigService) {}

  async start(): Promise<void> {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!token || token === 'your_bot_token_here') {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured, bot disabled');
      return;
    }

    this.bot = new Bot(token);
    const webAppUrl = this.configService.get<string>('WEBAPP_URL') || 'https://example.com';

    // /start command - welcome message with WebApp button
    this.bot.command('start', async (ctx) => {
      const keyboard = new InlineKeyboard().webApp('🎴 Играть', webAppUrl);

      await ctx.reply(
        '🃏 *Добро пожаловать в Joker!*\n\n' +
          'Это карточная игра для 4 игроков.\n' +
          'Нажмите кнопку ниже, чтобы начать игру!',
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      );
    });

    // /help command - game rules
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        '📖 *Правила игры Joker*\n\n' +
          '• Игра для 4 игроков\n' +
          '• Колода: 36 карт + 2 джокера\n' +
          '• Цель: набрать максимум очков за 4 пульки\n\n' +
          '*Фазы раунда:*\n' +
          '1️⃣ Раздача карт\n' +
          '2️⃣ Ставки (сколько взяток возьмёте)\n' +
          '3️⃣ Розыгрыш (ходите по очереди)\n' +
          '4️⃣ Подсчёт очков\n\n' +
          'Используйте /start чтобы начать игру!',
        { parse_mode: 'Markdown' },
      );
    });

    // Error handling
    this.bot.catch((err) => {
      this.logger.error(`Bot error: ${err.message}`, err.stack);
    });

    this.logger.log('Starting Telegram bot (long polling)...');
    this.bot.start({
      onStart: (botInfo) => {
        this.logger.log(`Bot @${botInfo.username} started successfully`);
      },
    });
  }

  async stop(): Promise<void> {
    if (this.bot) {
      this.logger.log('Stopping Telegram bot...');
      await this.bot.stop();
      this.bot = null;
    }
  }

  getBot(): Bot | null {
    return this.bot;
  }
}
