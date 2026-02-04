
## v1.3.1 (2026-02-04) — Questions Resolved

- **Источник**: Ответы заказчика.
- **Закрыто**:
  - **Q12 (House Edge)**: Установлено 10% комиссии с банкролла платных столов.
  - **Q17 (RBAC)**: ADMIN может редактировать Global Settings. Только God Mode эксклюзивен для SUPERADMIN.
  - **Q18 (Audit Trail)**: История изменений Global Settings не требуется на данном этапе.
- **Обновлено**:
  - TECH_SPEC v0.5: Удалена таблица `global_settings_history`, обновлена RBAC матрица.
  - ADMIN_PANEL_MATRIX: Global Settings доступен для ADMIN.
- **Status**: READY FOR PHASE 2 DEVELOPMENT.

## v1.3 (2026-02-04) — Documentation Complete

- **Источник**: Экспертный анализ готовности к Phase 2.
- **Добавлено**:
  - **Раздел 1.1**: Термины и определения (CJ, House Edge, Ledger, Пулька, Тузование, Взятка, Штанга, Премия).
  - **REQ-9 AC11**: House Edge и Referral Bonus % в Global Settings.
  - **REQ-9 AC12**: Мульти-сортировка и сложные фильтры (AND/OR, Like, Range, Enum, Boolean).
  - **Роли**: Добавлен Super-Admin как отдельная роль.
- **Уточнено**:
  - **REQ-11 AC2**: Детализирована механика Affiliate (% от House Edge).
  - **REQ-11 AC3**: Уточнено — 5 preset аватаров, ISO-коды стран.
  - **REQ-11 AC4**: Раздельная громкость музыки и эффектов.
- **Документация**:
  - Создан TECH_SPEC v0.5 с недостающими схемами БД.
  - Создана матрица Admin Panel экранов.
- **Status**: READY FOR PHASE 2 DEVELOPMENT.

## v1.2 (2026-02-04) — Senior Audit Polish

- **Источник**: Senior Tech Review.
- **Исправлено (Risks)**:
  - **Bots**: Уточнено "Rule-based AI (Standard/Killer)" вместо "Dumb".
  - **Rating**: Устранен конфликт REQ-6 vs REQ-11 (Free столы без рейтинга).
  - **Security**: Добавлено требование RBAC и Audit Log для действий в God Mode.
- **Добавлено**:
  - Ссылка на `docs/TECH_SPEC.md` — детальную спецификацию архитектуры.
- **Status**: READY FOR DEVELOPMENT.

## v1.0 (2026-02-04) — Sign-Ready

- **Источник**: Final User Checklist.
- **Добавлено**:
  - **REQ-8**: Детализация таблицы транзакций (колонки, фильтры).
  - **REQ-9**: AND/OR логика в фильтрах админки.
  - **REQ-10**: Сетки 16/32/64, 1-4 призовых места.
  - **REQ-11**: Affiliate UX (Copy/Send), Notifications via Bot.
  - **Clarification**: Wallet Mock (Only text field).
- **Status**: APPROVED (Ready for Signing).
## v0.9 (2026-02-04) — Phase 2 Scope Detailing (Gap Closer)

- **Источник**: AI-аудит (Coverage Matrix).
- **Добавлено в In Scope**:
  - **REQ-5 (UI)**: Чат (Emojis/Replicas), системный лог стола.
  - **REQ-6 (Lobby)**: Типы столов (Training/Free/Paid), уровни ставок.
  - **REQ-9 (Admin)**: Card Swap (cheat/debug), редактирование Upline (партнерка).
  - **REQ-10 (Tournaments)**: Настройка распределения призовых.
  - **REQ-11 (Meta)**: Текстовое поле привязки кошелька (Wallet Address).
- **Уточнено (Out of Scope)**:
  - Web3/Blockchain интеграция (TON Connect) явно исключена.
- **Status**: DRAFT.
## v0.8 (2026-02-04) — Phase 2 Scope Finalization (Analysed)

- **Источник**: Повторный AI-аудит (User Stories coverage).
- **Исправлено**:
  - **Conflict**: Удалено требование "UI соответствует финальным макетам" из Этапа 4.
  - **REQ-8 (Economy)**: Добавлены `Refund`, `TaskReward`.
  - **REQ-9 (Admin)**: Детально расписаны инструменты управления турнирами, логами и контентом.
  - **REQ-10**: Добавлены UX-сценарии (подтверждение, статус записи).
  - **REQ-11**: Добавлен Onboarding (Telegram) и Notifications.
- **Добавлено в вопросы**:
  - Q10 (Формула рейтинга X/Y), Q11 (Timer N), Q12 (House Edge).
- **Status**: DRAFT.
## v0.7 (2026-02-04) — Phase 2 Scope Detailing (Analysed)

- **Источник**: AI-анализ "User Stories" и "Scope Analysis".
- **Изменено**:
  - **Header**: v0.7 (Complete MVP Plan).
  - **REQ-5 (UI)**: Снижен приоритет дизайна до "Functional MVP" (Wireframe/Basic), но анимации обязательны.
  - **REQ-8 (Economy)**: Добавлены транзакции, модерация выводов, идемпотентность, статусы.
  - **REQ-9 (Admin)**: Добавлен "God Mode" (просмотр карт), Killer Mode, Мульти-сортировка.
  - **REQ-10 (Tournaments)**: Добавлены правила No-Show, Lifecycle, ограничения по участию.
  - **REQ-11 (Meta)**: Добавлена формула рейтинга, профиль (аватары/флаги), настройки.
  - **Stack**: Next.js заменен на Vite (согласно архитектуре), добавлен TailAdmin.
- **Status**: DRAFT (Ready for Review).

## v0.6 (2026-02-04) — Phase 2 Scope Definition

- **Источник**: Запрос заказчика на следующий этап (Complete MVP).
- **Добавлено в In Scope**:
  - **REQ-8 (Economy)**: Внутренняя экономика (Ledger), транзакции CJ.
  - **REQ-9 (Admin)**: Modern Admin Panel (TailAdmin style) - управление юзерами, столами, логами.
  - **REQ-10 (Tournaments)**: Турнирная механика, сетки, призовые.
  - **REQ-11 (Meta)**: Рейтинги, реферальная программа, задания.
- **Уточнено**:
  - Платежные системы: внешняя интеграция Out of Scope, но внутренняя логика обязательна.
  - Админка: приоритет повышен до High, требования к UI (tailadmin).
  - Сроки/Этапы обновлены под новые фичи.
- **Status**: DRAFT (Pending Approval).
## v0.5.1 (2026-01-24) — Исправление E2E тестов

- **Проблема**: Frontend E2E тест `4 players can place bets` падал — кнопка "Find Game" не была видна.
- **Корневая причина**: Тест проверял `if (isVisible())` вместо ожидания подключения сокета.
- **Исправлено**:
  - `game-flow.spec.ts`: заменён `if (isVisible())` на `waitFor({ timeout: 20000 })`.
  - `health.controller.ts`: создан endpoint `/api/health` для проверки готовности backend.
  - `app.module.ts`: добавлен `HealthController`.
  - `e2e.yml`: удалён неиспользуемый postgres service, убран `DATABASE_URL`.
- **Status**: IMPLEMENTED.

## v0.5 (2026-01-24) — Исправление механики джокера

- **Источник**: Анализ правил грузинского покера (Pagat.com, Wikipedia).
- **Проблема обнаружена**:
  - Frontend (`JokerOptionModal.tsx`) показывал все 4 опции джокера в любой момент.
  - Правильно: опции зависят от позиции в взятке.
- **Исправлено**:
  - `JokerOptionModal.tsx`: добавлен проп `isLeading`, фильтрация опций.
  - `GameScreen.tsx`: передаёт `isLeading={gameState.table.length === 0}`.
- **Правильная механика джокера**:
  - **Ведение взятки** (первый ход): High/Low + выбор масти.
  - **Не первый ход**: Top/Bottom (бьёт/не бьёт).
- **Backend**: Валидация была корректной (`move.validator.ts`), изменений не требуется.
- **Status**: IMPLEMENTED.

## v0.4 (2026-01-22) — Q9 закрыт

- **Источник**: Исследование правил "Популярного" (Грузинского) Джокера.
- **Решено**:
  - Q9 (структура раундов) — подтверждена структура 8+4+8+4=24.
  - Пулька 2: 4 раздачи по 9 карт (с выбором козыря).
  - Пулька 4: 4 раздачи по 9 карт (копия Пульки 2).
- **Обновлено**:
  - ROADMAP.md: исправлена структура раундов (раунды 9-12 и 21-24).
  - DEVELOPMENT_PLAN.md: версия 1.1 → 1.2, убран блокер, добавлена таблица структуры.
  - docs/Правила и механика игры Joker.md: уточнено описание 2-го круга.
- **Status**: READY FOR DEVELOPMENT (Sprint 0 can start).

## v0.3 (2026-01-22) — Ревизия документации

- **Источник**: Анализ соответствия TOR ↔ ROADMAP ↔ Правила игры.
- **Критические находки**:
  - Обнаружено противоречие в структуре раундов/пулек (Q9 добавлен в OPEN_QUESTIONS как High Priority Blocker).
  - ROADMAP описывает Пульку 4 как "раздачи по 2-8 карт", правила — как "копия пульки 2" (по 9 карт).
- **Технические риски**:
  - Логика сравнения двух Джокеров "Top" некорректна (нет порядка ходов).
  - Логика премий не полностью соответствует правилам (соседство на премии).
  - Не обработан кейс "Джокер как козырь → игра без козырей".
  - Валидация ответа на Джокер "High" (высшая карта) отсутствует.
- **Изменено в DEVELOPMENT_PLAN**:
  - Версия: 1.0 → 1.1.
  - Sprint 4: добавлен буфер +3 дня.
  - S3-12 (drag & drop): SHOULD → MUST.
  - Добавлена задача S3-0 (анализ Figma).
  - Добавлена секция "Известные технические риски".
- **Status**: DRAFT (requires Q9 resolution before Sprint 1).

## v0.2 (2026-01-21)

- **Источник**: Анализ `ROADMAP.md` (техническая спецификация).
- **Изменено**:
  - Добавлен срок разработки: 7-8 недель.
  - Добавлена ожидаемая нагрузка: 100-200 игр.
  - REQ-4 (Подсчет очков): детализированы формулы (AC1-AC6).
  - REQ-5 (UI): добавлен AC4 (таймер хода).
- **Добавлено**:
  - REQ-6: Лобби и Матчмейкинг (4 AC).
  - REQ-7: Сетевая устойчивость / Reconnect (4 AC).
  - Раздел 4 (NFR): заполнены конкретные значения.
  - Раздел 5 (Этапы): план из 4 этапов.
  - Раздел 6 (Definition of Done): 5 критериев завершения.
  - Раздел 9 (Технологический стек): рекомендуемый стек.
- **Перенесено в Out of scope**:
  - Leaderboard (требует уточнения Q7).
  - История игр (требует уточнения Q6).
- **Закрыто вопросов**: Q1 (частично), Q2 (частично), Q3, Q4.
- **Status**: DRAFT (not for signing).

## v0.1 (2026-01-21)

- Initial draft created from client brief.
- Status: DRAFT (not for signing).
