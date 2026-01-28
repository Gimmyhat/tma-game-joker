# Telegram Bot Integration

## Context

### Original Request

Создать Telegram Bot как точку входа для TMA (Telegram Mini App) игры Joker. Бот должен позволять пользователям запускать Mini App через кнопку в чате.

### Interview Summary

**Key Discussions**:

- Библиотека: **grammy** (современный, TypeScript-first)
- Архитектура: **встроенный в NestJS** (один процесс)
- Команды: минимум `/start`, `/help`
- Домен: IP сервера, домен по необходимости
- Dev workflow: ngrok для локального тестирования

**Research Findings**:

- `TelegramAuthGuard` уже реализован с HMAC-SHA256 валидацией
- `TELEGRAM_BOT_TOKEN` предусмотрен в .env (placeholder)
- Frontend `TelegramProvider` готов к работе с SDK
- Socket auth flow полностью реализован
- `BotModule` существует, но для AI ботов игры (не Telegram)

### Self-Review (Gap Analysis)

**Potential Gaps Identified:**

1. Graceful shutdown для бота при остановке приложения
2. Error handling при недоступности Telegram API
3. Логирование действий бота
4. Rate limiting (Telegram имеет лимиты)

**Guardrails Applied:**

- НЕ трогаем существующий BotModule (AI боты)
- НЕ модифицируем TelegramAuthGuard (уже работает)
- НЕ меняем frontend (TelegramProvider готов)

---

## Work Objectives

### Core Objective

Создать Telegram Bot модуль в NestJS backend, который обрабатывает команды `/start` и `/help`, и предоставляет inline кнопку для запуска Mini App.

### Concrete Deliverables

- `apps/backend/src/telegram-bot/` - новый модуль
- Рабочий бот с командами /start, /help
- Inline кнопка "Играть" для запуска Mini App
- Документация по настройке BotFather
- Dev workflow с ngrok

### Definition of Done

- [ ] Бот отвечает на /start с приветствием и кнопкой "Играть"
- [ ] Бот отвечает на /help с правилами игры
- [ ] Кнопка "Играть" открывает Mini App
- [ ] Бот запускается вместе с NestJS сервером
- [ ] Graceful shutdown при остановке сервера

### Must Have

- grammy библиотека
- Long polling режим для dev
- Inline keyboard с WebApp button
- ConfigService для токена
- Logger для отладки

### Must NOT Have (Guardrails)

- Webhook режим (только long polling для MVP)
- Inline mode бота
- Статистика/leaderboard команды
- Изменения в существующем BotModule
- Изменения в frontend коде
- Изменения в auth guards

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (Jest настроен)
- **User wants tests**: Manual verification (для бота сложно автотесты)
- **Framework**: Jest (если понадобятся unit тесты)

### Manual QA Procedures

Каждый TODO включает детальные шаги ручной верификации:

- Тестирование через реальный Telegram клиент
- Проверка логов NestJS
- Проверка запуска Mini App через кнопку

---

## Task Flow

```
Task 0 (Подготовка)
    ↓
Task 1 (Зависимости)
    ↓
Task 2 (Базовый модуль)
    ↓
Task 3 (Команда /start)
    ↓
Task 4 (Команда /help)
    ↓
Task 5 (Интеграция в app.module)
    ↓
Task 6 (Environment variables)
    ↓
Task 7 (BotFather настройка)
    ↓
Task 8 (Dev workflow с ngrok)
    ↓
Task 9 (Финальная верификация)
```

## Parallelization

| Task | Depends On | Parallelizable                 |
| ---- | ---------- | ------------------------------ |
| 0    | -          | NO (первый)                    |
| 1    | 0          | NO                             |
| 2    | 1          | NO                             |
| 3    | 2          | YES (с 4)                      |
| 4    | 2          | YES (с 3)                      |
| 5    | 3, 4       | NO                             |
| 6    | 5          | NO                             |
| 7    | 6          | YES (с 8) - BotFather отдельно |
| 8    | 6          | YES (с 7)                      |
| 9    | 7, 8       | NO (финал)                     |

---

## TODOs

### - [ ] 0. Создать Telegram Bot через BotFather

**What to do**:

- Открыть @BotFather в Telegram
- Отправить `/newbot`
- Указать имя бота (например: "Joker Card Game")
- Указать username бота (например: `joker_card_game_bot`)
- Сохранить полученный токен

**Must NOT do**:

- НЕ настраивать webhook (будет long polling)
- НЕ добавлять Menu Button пока (сделаем позже)

**Parallelizable**: NO (первый шаг)

**References**:

- Telegram BotFather: https://t.me/BotFather
- Документация: https://core.telegram.org/bots#botfather

**Acceptance Criteria**:

- [ ] Бот создан в BotFather
- [ ] Токен получен (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
- [ ] Токен сохранён в безопасное место (будет в .env)

**Commit**: NO (не код)

---

### - [ ] 1. Установить зависимости grammy

**What to do**:

- Установить grammy в backend пакет
- Проверить совместимость версий

**Must NOT do**:

- НЕ устанавливать nestjs-grammY (используем напрямую)
- НЕ устанавливать дополнительные плагины

**Parallelizable**: NO (зависимости нужны для следующих шагов)

**References**:

- grammy docs: https://grammy.dev/guide/getting-started
- `apps/backend/package.json` - текущие зависимости

**Acceptance Criteria**:

- [ ] Команда: `cd apps/backend && pnpm add grammy`
- [ ] Проверка: `pnpm list grammy` показывает установленную версию
- [ ] Нет ошибок совместимости в `pnpm install`

**Manual Verification**:

```bash
cd apps/backend
pnpm add grammy
pnpm list grammy
# Expected: grammy@X.Y.Z
```

**Commit**: YES

- Message: `feat(backend): add grammy dependency for Telegram Bot`
- Files: `apps/backend/package.json`, `pnpm-lock.yaml`

---

### - [ ] 2. Создать базовый TelegramBotModule

**What to do**:

- Создать директорию `apps/backend/src/telegram-bot/`
- Создать `telegram-bot.module.ts` с ConfigModule
- Создать `telegram-bot.service.ts` с инициализацией grammy Bot

**Must NOT do**:

- НЕ добавлять команды пока (следующие таски)
- НЕ трогать существующий `bot/` директорию (AI боты)

**Parallelizable**: NO (нужен для команд)

**References**:

- Pattern: `apps/backend/src/auth/auth.module.ts` - структура модуля
- grammy Bot creation: https://grammy.dev/guide/getting-started#create-a-bot

**Pattern References**:

- `apps/backend/src/auth/auth.module.ts:1-11` - паттерн NestJS модуля с ConfigModule

**Files to Create**:

**`apps/backend/src/telegram-bot/telegram-bot.module.ts`**:

```typescript
import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  imports: [ConfigModule],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly botService: TelegramBotService) {}

  async onModuleInit() {
    await this.botService.start();
  }

  async onModuleDestroy() {
    await this.botService.stop();
  }
}
```

**`apps/backend/src/telegram-bot/telegram-bot.service.ts`**:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';

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

    // Commands will be registered here

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
```

**Acceptance Criteria**:

- [ ] Файл `apps/backend/src/telegram-bot/telegram-bot.module.ts` создан
- [ ] Файл `apps/backend/src/telegram-bot/telegram-bot.service.ts` создан
- [ ] TypeScript компилируется без ошибок: `cd apps/backend && pnpm build`
- [ ] Логи показывают warn если токен не настроен

**Manual Verification**:

```bash
cd apps/backend
pnpm build
# Expected: Compilation successful, no errors
```

**Commit**: YES

- Message: `feat(backend): add TelegramBotModule base structure`
- Files: `apps/backend/src/telegram-bot/telegram-bot.module.ts`, `apps/backend/src/telegram-bot/telegram-bot.service.ts`

---

### - [ ] 3. Реализовать команду /start

**What to do**:

- Добавить обработчик /start в TelegramBotService
- Показывать приветствие с inline keyboard
- Добавить WebApp кнопку для запуска Mini App

**Must NOT do**:

- НЕ хардкодить WEBAPP_URL (использовать ConfigService)
- НЕ добавлять сложную логику (только приветствие)

**Parallelizable**: YES (с task 4)

**References**:

- grammy Keyboards: https://grammy.dev/plugins/keyboard
- WebApp button: https://core.telegram.org/bots/webapps#keyboard-button-web-apps

**Pattern References**:

- `apps/frontend/src/providers/TelegramProvider.tsx:45-63` - как TMA получает initData

**Code to Add** (в `telegram-bot.service.ts` метод `start()`):

```typescript
import { InlineKeyboard } from 'grammy';

// В методе start(), после создания bot:
const webAppUrl = this.configService.get<string>('WEBAPP_URL') || 'https://example.com';

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
```

**Acceptance Criteria**:

- [ ] /start показывает приветствие на русском
- [ ] Кнопка "Играть" присутствует
- [ ] Кнопка открывает Mini App (WebApp)
- [ ] WEBAPP_URL берётся из env

**Manual Verification (через Telegram)**:

1. Запустить бота с валидным токеном
2. Открыть чат с ботом в Telegram
3. Отправить `/start`
4. Проверить: сообщение с кнопкой "🎴 Играть"
5. Нажать кнопку → должен открыться Mini App

**Commit**: YES

- Message: `feat(backend): add /start command with WebApp button`
- Files: `apps/backend/src/telegram-bot/telegram-bot.service.ts`

---

### - [ ] 4. Реализовать команду /help

**What to do**:

- Добавить обработчик /help в TelegramBotService
- Показывать краткие правила игры

**Must NOT do**:

- НЕ делать длинное описание (Telegram лимит сообщения)
- НЕ добавлять кнопки (только текст)

**Parallelizable**: YES (с task 3)

**References**:

- Правила игры: `docs/` (если есть документация правил)
- grammy context: https://grammy.dev/guide/context

**Code to Add** (в `telegram-bot.service.ts` метод `start()`):

```typescript
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
```

**Acceptance Criteria**:

- [ ] /help показывает правила на русском
- [ ] Текст читаемый и структурированный
- [ ] Markdown форматирование работает

**Manual Verification (через Telegram)**:

1. Открыть чат с ботом
2. Отправить `/help`
3. Проверить: сообщение с правилами
4. Проверить: форматирование (bold заголовки, списки)

**Commit**: YES

- Message: `feat(backend): add /help command with game rules`
- Files: `apps/backend/src/telegram-bot/telegram-bot.service.ts`

---

### - [ ] 5. Интегрировать TelegramBotModule в AppModule

**What to do**:

- Импортировать TelegramBotModule в app.module.ts
- Добавить в imports array

**Must NOT do**:

- НЕ удалять существующий BotModule (это AI боты!)
- НЕ менять порядок других модулей

**Parallelizable**: NO (зависит от 3, 4)

**References**:

- `apps/backend/src/app.module.ts:1-34` - текущая структура

**Code Changes** (в `app.module.ts`):

```typescript
// Добавить импорт:
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';

// Добавить в imports (после AuthModule):
@Module({
  imports: [
    // ... existing imports ...
    AuthModule,
    TelegramBotModule,  // <-- добавить
  ],
  // ...
})
```

**Acceptance Criteria**:

- [ ] TelegramBotModule импортирован в app.module.ts
- [ ] Приложение запускается без ошибок: `pnpm dev:backend`
- [ ] В логах: "Starting Telegram bot..." или warning о токене

**Manual Verification**:

```bash
cd apps/backend
pnpm dev
# Expected logs:
# [TelegramBotService] Starting Telegram bot (long polling)...
# OR
# [TelegramBotService] TELEGRAM_BOT_TOKEN not configured, bot disabled
```

**Commit**: YES

- Message: `feat(backend): integrate TelegramBotModule into AppModule`
- Files: `apps/backend/src/app.module.ts`

---

### - [ ] 6. Обновить environment variables

**What to do**:

- Добавить WEBAPP_URL в .env.example и .env
- Обновить TELEGRAM_BOT_TOKEN с реальным значением
- Добавить комментарии

**Must NOT do**:

- НЕ коммитить реальный токен (только в .env.example placeholder)
- НЕ удалять существующие переменные

**Parallelizable**: NO (нужен для тестирования)

**References**:

- `.env.example` - текущий шаблон
- `apps/backend/.env` - локальные настройки

**Changes to `.env.example`**:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
WEBAPP_URL=https://your-domain.com

# For development with ngrok:
# WEBAPP_URL=https://abc123.ngrok.io
```

**Changes to local `.env`** (не коммитить):

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...  # реальный токен
WEBAPP_URL=https://abc123.ngrok.io          # ngrok URL
```

**Acceptance Criteria**:

- [ ] .env.example содержит WEBAPP_URL с placeholder
- [ ] Локальный .env содержит реальный токен (для тестирования)
- [ ] Приложение читает обе переменные

**Commit**: YES

- Message: `chore(backend): add WEBAPP_URL to environment config`
- Files: `.env.example`
- Pre-commit: убедиться что реальный токен НЕ в коммите

---

### - [ ] 7. Настроить бота в BotFather

**What to do**:

- Установить описание бота
- Установить команды бота
- Опционально: установить Menu Button

**Must NOT do**:

- НЕ настраивать webhook (используем long polling)
- НЕ менять username после создания

**Parallelizable**: YES (с task 8)

**BotFather Commands**:

```
# Описание бота
/setdescription
@your_bot_username
🃏 Joker - карточная игра для 4 игроков. Делайте ставки, разыгрывайте карты и набирайте очки!

# Короткое описание (About)
/setabouttext
@your_bot_username
Многопользовательская карточная игра Joker. Играйте с друзьями или ботами!

# Команды бота
/setcommands
@your_bot_username
start - Начать игру
help - Правила игры

# (Опционально) Menu Button для Mini App
/setmenubutton
@your_bot_username
# Выбрать "Configure menu button"
# URL: ваш WEBAPP_URL
# Text: 🎴 Играть
```

**Acceptance Criteria**:

- [ ] Описание бота установлено
- [ ] Команды /start и /help видны в меню бота
- [ ] (Опционально) Menu Button настроен

**Manual Verification (через Telegram)**:

1. Открыть @BotFather
2. Отправить `/mybots`
3. Выбрать вашего бота
4. Проверить Bot Settings → описание и команды
5. Открыть чат с ботом → слева от поля ввода меню команд

**Commit**: NO (не код)

---

### - [ ] 8. Настроить dev workflow с ngrok

**What to do**:

- Документировать процесс запуска ngrok
- Создать скрипт для удобства (опционально)

**Must NOT do**:

- НЕ хардкодить ngrok URL (он меняется)
- НЕ требовать платный ngrok (free tier достаточно)

**Parallelizable**: YES (с task 7)

**References**:

- ngrok docs: https://ngrok.com/docs
- Telegram WebApp requirements: HTTPS обязателен

**Dev Workflow Steps**:

1. **Запустить frontend** (в терминале 1):

```bash
cd apps/frontend
pnpm dev
# Запустится на http://localhost:5173
```

2. **Запустить ngrok** (в терминале 2):

```bash
ngrok http 5173
# Получите URL типа https://abc123.ngrok.io
```

3. **Обновить .env** (в apps/backend/.env):

```env
WEBAPP_URL=https://abc123.ngrok.io
```

4. **Запустить backend** (в терминале 3):

```bash
cd apps/backend
pnpm dev
```

5. **Тестировать** в Telegram:

- Отправить /start боту
- Нажать "Играть"
- Mini App откроется с ngrok URL

**Acceptance Criteria**:

- [ ] ngrok tunnel создаётся успешно
- [ ] HTTPS URL доступен
- [ ] Mini App открывается из Telegram
- [ ] Frontend получает initData от Telegram

**Commit**: NO (документация в плане)

---

### - [ ] 9. Финальная верификация

**What to do**:

- Провести полный e2e тест
- Проверить все acceptance criteria
- Убедиться в корректности работы

**Must NOT do**:

- НЕ пропускать шаги верификации
- НЕ считать готовым без реального теста в Telegram

**Parallelizable**: NO (финал)

**Full E2E Test Checklist**:

1. **Backend запущен**:

   ```bash
   cd apps/backend && pnpm dev
   # Логи: [TelegramBotService] Bot @your_bot started successfully
   ```

2. **Frontend запущен + ngrok**:

   ```bash
   cd apps/frontend && pnpm dev
   # В другом терминале:
   ngrok http 5173
   ```

3. **Telegram /start**:
   - [ ] Сообщение приветствия получено
   - [ ] Кнопка "🎴 Играть" видна
   - [ ] Нажатие открывает Mini App

4. **Telegram /help**:
   - [ ] Правила игры показаны
   - [ ] Форматирование корректное

5. **Mini App**:
   - [ ] Открывается без ошибок
   - [ ] TelegramProvider получает initData
   - [ ] WebSocket подключается
   - [ ] Можно начать поиск игры

6. **Graceful Shutdown**:
   - [ ] Ctrl+C в терминале backend
   - [ ] Логи: [TelegramBotService] Stopping Telegram bot...
   - [ ] Процесс завершается чисто

**Acceptance Criteria**:

- [ ] Все 6 пунктов checklist пройдены
- [ ] Нет ошибок в консоли
- [ ] Игра доступна через Telegram

**Commit**: YES (финальный коммит если были исправления)

- Message: `feat(backend): telegram bot integration complete`

---

## Commit Strategy

| After Task | Message                                      | Files                        | Verification     |
| ---------- | -------------------------------------------- | ---------------------------- | ---------------- |
| 1          | `feat(backend): add grammy dependency`       | package.json, pnpm-lock.yaml | pnpm list grammy |
| 2          | `feat(backend): add TelegramBotModule base`  | telegram-bot/\*.ts           | pnpm build       |
| 3          | `feat(backend): add /start command`          | telegram-bot.service.ts      | manual test      |
| 4          | `feat(backend): add /help command`           | telegram-bot.service.ts      | manual test      |
| 5          | `feat(backend): integrate TelegramBotModule` | app.module.ts                | pnpm dev         |
| 6          | `chore(backend): add WEBAPP_URL env`         | .env.example                 | -                |

**Combined option**: После task 5 можно объединить в один коммит:

```
feat(backend): add Telegram Bot integration

- Add grammy dependency
- Create TelegramBotModule with /start and /help commands
- WebApp button for Mini App launch
- Graceful shutdown support
```

---

## Success Criteria

### Verification Commands

```bash
# Build check
cd apps/backend && pnpm build
# Expected: Compilation successful

# Run check
cd apps/backend && pnpm dev
# Expected: [TelegramBotService] Bot @username started successfully

# Telegram test
# Send /start to bot → message with button
# Send /help to bot → rules message
# Click "Играть" → Mini App opens
```

### Final Checklist

- [ ] grammy installed and used
- [ ] /start command with WebApp button
- [ ] /help command with rules
- [ ] Bot starts with NestJS server
- [ ] Bot stops gracefully on shutdown
- [ ] Mini App opens from Telegram
- [ ] No changes to existing BotModule (AI bots)
- [ ] No changes to frontend code
- [ ] No changes to auth guards

---

## Appendix: File Structure After Implementation

```
apps/backend/src/
├── telegram-bot/           # NEW
│   ├── telegram-bot.module.ts
│   └── telegram-bot.service.ts
├── bot/                    # UNCHANGED (AI bots)
│   ├── bot.module.ts
│   ├── bot.service.ts
│   └── strategies/
├── auth/                   # UNCHANGED
│   ├── auth.module.ts
│   └── guards/
│       └── telegram-auth.guard.ts
├── app.module.ts           # MODIFIED (add import)
└── main.ts                 # UNCHANGED
```

## Appendix: Environment Variables

```env
# Required for Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Required for Mini App WebApp button
WEBAPP_URL=https://your-domain.com

# Development with ngrok
# WEBAPP_URL=https://abc123.ngrok.io
```
