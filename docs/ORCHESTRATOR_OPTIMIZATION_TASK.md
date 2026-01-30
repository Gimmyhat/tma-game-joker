# Задача для оркестратора: Оптимизация проекта TMA Game Joker

## Контекст
Проведён анализ проекта, результаты в `docs/OPTIMIZATION_REPORT.md`. Необходимо выполнить рефакторинг по приоритетам.

## Задачи для распределения

### 🔴 HIGH Priority

#### Задача 1: Code Splitting в Vite (Frontend)
**Файл:** `apps/frontend/vite.config.ts`
**Описание:** Добавить `rollupOptions.output.manualChunks` для разделения vendor-бандлов (react, framer-motion, telegram-sdk, i18n).
**Агент:** Implementer
**Оценка:** 15 минут

#### Задача 2: Разбить Table.tsx (Frontend)
**Файл:** `apps/frontend/src/components/Table.tsx` (660 строк)
**Описание:** Вынести в отдельные компоненты:
- `TableCards.tsx` — логика renderTableCards()
- `TuzovanieAnimation.tsx` — логика renderTuzovanie()
- `OpponentHand.tsx` — логика renderOpponentHand()
- `TrumpIndicator.tsx` — уже есть как вложенная функция
**Агент:** Implementer
**Оценка:** 1-2 часа

#### Задача 3: Разбить game-engine.service.ts (Backend)
**Файл:** `apps/backend/src/game/services/game-engine.service.ts` (963 строки)
**Описание:** Выделить сервисы:
- `TrumpService` — selectTrump(), handleRedeal()
- `RoundService` — completeRound(), dealNewRound()
- `PulkaService` — completePulka(), startNextPulka()
**Агент:** Architect → Implementer
**Оценка:** 2-3 часа

### 🟡 MEDIUM Priority

#### Задача 4: Lazy Loading для GameScreen
**Файл:** `apps/frontend/src/App.tsx`
**Описание:** Обернуть GameScreen в React.lazy() и Suspense.
**Агент:** Implementer
**Оценка:** 20 минут

#### Задача 5: Rate Limiting на WebSocket
**Файл:** `apps/backend/src/gateway/game.gateway.ts`
**Описание:** Добавить throttle на события throw_card (1 карта в 300ms).
**Агент:** Implementer
**Оценка:** 30 минут

## Порядок выполнения
1. Задача 1 (Code Splitting) — не зависит от других
2. Задача 4 (Lazy Loading) — не зависит от других
3. Задача 2 (Table.tsx) — после задач 1, 4
4. Задача 5 (Rate Limiting) — параллельно с frontend
5. Задача 3 (game-engine) — последней, требует архитектурного решения

## Верификация
После каждой задачи:
- `pnpm build` — проверка сборки
- `pnpm test` — проверка тестов
- Ручная проверка в dev-режиме
