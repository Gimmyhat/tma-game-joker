# Draft: Telegram Bot Integration

## Текущее состояние проекта

### Что уже есть:

- **TelegramProvider** (`apps/frontend/src/providers/TelegramProvider.tsx`):
  - Использует `@telegram-apps/sdk-react`
  - SDK инициализация, получение initData и user
  - Dev fallback для разработки без Telegram
  - Передача initData в socket.ts

- **Socket Client** (`apps/frontend/src/lib/socket.ts`):
  - Отправляет initData в `auth.initData` при handshake
  - Отправляет userId и userName в query params
  - Поддержка mock данных для dev режима

- **TelegramAuthGuard** (`apps/backend/src/auth/guards/telegram-auth.guard.ts`):
  - Валидация initData через HMAC-SHA256
  - SKIP_AUTH=true для dev режима
  - Использует TELEGRAM_BOT_TOKEN из env

- **GameGateway** (`apps/backend/src/gateway/game.gateway.ts`):
  - Применяет TelegramAuthGuard на уровне класса
  - Получает userId/userName из query params

- **Environment Variables**:
  - `TELEGRAM_BOT_TOKEN` - уже предусмотрен, но placeholder
  - `SKIP_AUTH=true` в dev режиме

### Чего НЕ хватает:

1. **Telegram Bot** - нет бота для запуска TMA
2. **Menu Button** - не настроен в BotFather
3. **WebApp URL** - нет HTTPS endpoint для TMA
4. **Bot commands** - /start, /help, /play

## Requirements (confirmed)

- [pending]

## Technical Decisions

- [pending - library choice]
- [pending - bot architecture]

## Research Findings

- Auth infrastructure готова (TelegramAuthGuard работает)
- initData validation корректная (HMAC-SHA256)
- Frontend → Backend auth flow реализован
- Нужен только Bot + его интеграция с NestJS

## Open Questions

1. Какую библиотеку для бота использовать? (grammy / telegraf / node-telegram-bot-api)
2. Где будет хоститься бот? (в том же NestJS процессе или отдельно?)
3. Какие команды нужны? (минимум /start /help /play или больше?)
4. Нужна ли inline mode?
5. Как тестировать локально? (ngrok/localtunnel?)
6. Production domain известен?

## Scope Boundaries

- INCLUDE: Bot creation, commands, Mini App launch button
- INCLUDE: BotFather configuration instructions
- INCLUDE: Dev workflow (ngrok setup)
- EXCLUDE: Игровая логика (уже готова)
- EXCLUDE: Frontend изменения (TelegramProvider готов)
