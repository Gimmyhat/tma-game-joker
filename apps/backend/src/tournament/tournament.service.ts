import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, TournamentStatus } from '@prisma/client';
import { EventLogService } from '../event-log/event-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListTournamentsDto } from './dto';

const ACTIVE_TOURNAMENT_STATUSES: TournamentStatus[] = [
  TournamentStatus.ANNOUNCED,
  TournamentStatus.REGISTRATION,
  TournamentStatus.STARTED,
];

const ALLOWED_BRACKET_SIZES = [16, 32, 64];

type BracketMatchStatus = 'PENDING' | 'COMPLETED';

interface TournamentBracketMatch {
  id: string;
  stage: number;
  index: number;
  player1UserId: string | null;
  player2UserId: string | null;
  winnerUserId: string | null;
  status: BracketMatchStatus;
}

interface TournamentBracketStage {
  stage: number;
  matches: TournamentBracketMatch[];
}

interface TournamentBracketState {
  format: 'single_elimination';
  size: number;
  currentStage: number;
  finished: boolean;
  winnerUserId: string | null;
  stages: TournamentBracketStage[];
  updatedAt: string;
}

@Injectable()
export class TournamentService {
  private readonly logger = new Logger(TournamentService.name);
  private readonly uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventLogService: EventLogService,
  ) {}

  async listTournaments(query: ListTournamentsDto) {
    const page = Number.isFinite(Number(query.page)) ? Math.max(1, Number(query.page)) : 1;
    const pageSize = Number.isFinite(Number(query.pageSize))
      ? Math.min(100, Math.max(1, Number(query.pageSize)))
      : 20;
    const skip = (page - 1) * pageSize;

    const statuses = this.parseStatuses(query.status);
    const where: Prisma.TournamentWhereInput = statuses.length ? { status: { in: statuses } } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tournament.findMany({
        where,
        orderBy: [{ startTime: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        include: {
          _count: {
            select: {
              participants: true,
              tables: true,
            },
          },
        },
      }),
      this.prisma.tournament.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getTournament(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            participants: true,
            tables: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }

    return tournament;
  }

  async joinTournament(tournamentId: string, userIdInput: string) {
    if (!userIdInput?.trim()) {
      throw new BadRequestException('userId is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const userId = await this.resolveUserIdInTx(tx, userIdInput, true);

      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        select: {
          id: true,
          status: true,
          config: true,
        },
      });

      if (!tournament) {
        throw new NotFoundException(`Tournament ${tournamentId} not found`);
      }

      if (tournament.status !== TournamentStatus.REGISTRATION) {
        throw new BadRequestException('Tournament is not open for registration');
      }

      const existingOwnParticipant = await tx.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId,
          },
        },
      });

      if (existingOwnParticipant) {
        throw new BadRequestException('User is already registered in this tournament');
      }

      const activeTournamentEntry = await tx.tournamentParticipant.findFirst({
        where: {
          userId,
          tournamentId: { not: tournamentId },
          tournament: {
            status: {
              in: ACTIVE_TOURNAMENT_STATUSES,
            },
          },
        },
        select: {
          tournamentId: true,
        },
      });

      if (activeTournamentEntry) {
        throw new BadRequestException('User is already registered in another active tournament');
      }

      const maxPlayers = this.resolveMaxPlayers(tournament.config);
      const participantsCount = await tx.tournamentParticipant.count({
        where: {
          tournamentId,
        },
      });

      if (participantsCount >= maxPlayers) {
        throw new BadRequestException('Tournament registration is full');
      }

      const participant = await tx.tournamentParticipant.create({
        data: {
          tournamentId,
          userId,
          status: 'REGISTERED',
        },
      });

      return {
        tournamentId,
        userId,
        participantId: participant.id,
        status: participant.status,
      };
    });
  }

  async leaveTournament(tournamentId: string, userIdInput: string) {
    if (!userIdInput?.trim()) {
      throw new BadRequestException('userId is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const userId = await this.resolveUserIdInTx(tx, userIdInput, false);

      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!tournament) {
        throw new NotFoundException(`Tournament ${tournamentId} not found`);
      }

      if (
        tournament.status === TournamentStatus.STARTED ||
        tournament.status === TournamentStatus.FINISHED ||
        tournament.status === TournamentStatus.CANCELLED ||
        tournament.status === TournamentStatus.ARCHIVED
      ) {
        throw new BadRequestException('Cannot leave tournament after it has started');
      }

      const participant = await tx.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId,
          },
        },
      });

      if (!participant) {
        throw new NotFoundException('Tournament participant not found');
      }

      await tx.tournamentParticipant.delete({
        where: {
          id: participant.id,
        },
      });

      return {
        tournamentId,
        userId,
        left: true,
      };
    });
  }

  async reportMatchResult(tournamentId: string, matchId: string, winnerUserIdInput: string) {
    if (!winnerUserIdInput?.trim()) {
      throw new BadRequestException('winnerUserId is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const winnerUserId = await this.resolveUserIdInTx(tx, winnerUserIdInput, false);

      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        select: {
          id: true,
          status: true,
          bracketState: true,
          currentStage: true,
        },
      });

      if (!tournament) {
        throw new NotFoundException(`Tournament ${tournamentId} not found`);
      }

      if (tournament.status !== TournamentStatus.STARTED) {
        throw new BadRequestException('Tournament is not started');
      }

      const state = this.parseBracketState(tournament.bracketState);
      const match = this.findMatchById(state, matchId);

      if (!match) {
        throw new NotFoundException(`Match ${matchId} not found`);
      }

      if (match.status === 'COMPLETED') {
        throw new BadRequestException('Match result is already reported');
      }

      if (winnerUserId !== match.player1UserId && winnerUserId !== match.player2UserId) {
        throw new BadRequestException('Winner must be one of match players');
      }

      match.winnerUserId = winnerUserId;
      match.status = 'COMPLETED';
      this.recalculateFromStage(state, match.stage);

      const previousStage = tournament.currentStage;
      const winner = this.getBracketWinner(state);
      const nextStatus = winner ? TournamentStatus.FINISHED : TournamentStatus.STARTED;

      const updatedTournament = await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: nextStatus,
          currentStage: state.currentStage,
          bracketState: state as unknown as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          status: true,
          currentStage: true,
          bracketState: true,
        },
      });

      if (winner) {
        await tx.tournamentParticipant.updateMany({
          where: {
            tournamentId,
            userId: winner,
          },
          data: {
            finalPlace: 1,
          },
        });
      }

      await this.logProgressEvents(
        tournamentId,
        previousStage,
        state.currentStage,
        winner,
        winnerUserId,
      );

      return {
        tournamentId: updatedTournament.id,
        status: updatedTournament.status,
        currentStage: updatedTournament.currentStage,
        winnerUserId: winner,
        bracketState: updatedTournament.bracketState,
      };
    });
  }

  @Cron('0 * * * * *')
  async handleLifecycleTransitions() {
    await this.processLifecycleTransitions();
  }

  async processLifecycleTransitions(now = new Date()) {
    const tournamentDelegate = this.getTournamentDelegate();
    if (!tournamentDelegate) {
      this.logger.warn('Tournament delegate is unavailable, skipping lifecycle processing');
      return {
        announcedToRegistration: 0,
        registrationToStarted: 0,
        startedToFinished: 0,
      };
    }

    const announcedToRegistration = await tournamentDelegate.updateMany({
      where: {
        status: TournamentStatus.ANNOUNCED,
        registrationStart: {
          lte: now,
        },
      },
      data: {
        status: TournamentStatus.REGISTRATION,
      },
    });

    const dueToStart = await tournamentDelegate.findMany({
      where: {
        status: TournamentStatus.REGISTRATION,
        startTime: {
          lte: now,
        },
      },
      select: {
        id: true,
      },
    });

    let registrationToStarted = 0;
    let startedToFinished = 0;
    for (const tournament of dueToStart) {
      const startResult = await this.startTournamentBySchedule(tournament.id);
      if (startResult.status === TournamentStatus.STARTED) {
        registrationToStarted += 1;
      }

      if (startResult.status === TournamentStatus.FINISHED) {
        startedToFinished += 1;
      }
    }

    if (announcedToRegistration.count || registrationToStarted || startedToFinished) {
      this.logger.log(
        `Tournament lifecycle updated: announced->registration=${announcedToRegistration.count}, registration->started=${registrationToStarted}, started->finished=${startedToFinished}`,
      );
    }

    return {
      announcedToRegistration: announcedToRegistration.count,
      registrationToStarted,
      startedToFinished,
    };
  }

  private getTournamentDelegate(): PrismaService['tournament'] | null {
    const prismaWithOptionalTournament = this.prisma as PrismaService & {
      tournament?: PrismaService['tournament'];
    };

    return prismaWithOptionalTournament.tournament ?? null;
  }

  private async startTournamentBySchedule(
    tournamentId: string,
  ): Promise<{ status: TournamentStatus }> {
    return this.prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        select: {
          id: true,
          status: true,
          config: true,
          currentStage: true,
        },
      });

      if (!tournament) {
        throw new NotFoundException(`Tournament ${tournamentId} not found`);
      }

      if (tournament.status !== TournamentStatus.REGISTRATION) {
        return { status: tournament.status };
      }

      const participants = await tx.tournamentParticipant.findMany({
        where: {
          tournamentId,
          status: 'REGISTERED',
        },
        orderBy: [{ registeredAt: 'asc' }, { id: 'asc' }],
        select: {
          userId: true,
        },
      });

      if (participants.length === 0) {
        return { status: tournament.status };
      }

      const maxPlayers = this.resolveMaxPlayers(tournament.config);
      const participantUserIds = participants
        .slice(0, maxPlayers)
        .map((participant) => participant.userId);

      const bracketState = this.buildInitialBracket(participantUserIds, maxPlayers);
      const winner = this.getBracketWinner(bracketState);
      const status = winner ? TournamentStatus.FINISHED : TournamentStatus.STARTED;

      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status,
          currentStage: bracketState.currentStage,
          bracketState: bracketState as unknown as Prisma.InputJsonValue,
        },
      });

      if (winner) {
        await tx.tournamentParticipant.updateMany({
          where: {
            tournamentId,
            userId: winner,
          },
          data: {
            finalPlace: 1,
          },
        });
      }

      await this.logProgressEvents(
        tournamentId,
        tournament.currentStage,
        bracketState.currentStage,
        winner,
        undefined,
      );

      return { status };
    });
  }

  private parseStatuses(statusParam?: string): TournamentStatus[] {
    if (!statusParam?.trim()) {
      return [];
    }

    const values = statusParam
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item.length > 0);

    const validStatuses = values.filter((item): item is TournamentStatus =>
      Object.values(TournamentStatus).includes(item as TournamentStatus),
    );

    return [...new Set(validStatuses)];
  }

  private buildInitialBracket(
    participantUserIds: string[],
    bracketSize: number,
  ): TournamentBracketState {
    const paddedUserIds: Array<string | null> = [...participantUserIds];
    while (paddedUserIds.length < bracketSize) {
      paddedUserIds.push(null);
    }

    const totalStages = Math.log2(bracketSize);
    const stages: TournamentBracketStage[] = [];

    for (let stage = 1; stage <= totalStages; stage += 1) {
      const matchesInStage = bracketSize / 2 ** stage;
      const matches: TournamentBracketMatch[] = [];

      for (let index = 0; index < matchesInStage; index += 1) {
        matches.push({
          id: `s${stage}m${index + 1}`,
          stage,
          index,
          player1UserId: null,
          player2UserId: null,
          winnerUserId: null,
          status: 'COMPLETED',
        });
      }

      stages.push({ stage, matches });
    }

    for (let index = 0; index < stages[0].matches.length; index += 1) {
      const match = stages[0].matches[index];
      match.player1UserId = paddedUserIds[index * 2] ?? null;
      match.player2UserId = paddedUserIds[index * 2 + 1] ?? null;
    }

    const state: TournamentBracketState = {
      format: 'single_elimination',
      size: bracketSize,
      currentStage: 1,
      finished: false,
      winnerUserId: null,
      stages,
      updatedAt: new Date().toISOString(),
    };

    this.recalculateFromStage(state, 1);
    return state;
  }

  private recalculateFromStage(state: TournamentBracketState, startStage: number): void {
    for (let stageNumber = startStage; stageNumber <= state.stages.length; stageNumber += 1) {
      const stage = state.stages[stageNumber - 1];
      for (const match of stage.matches) {
        this.normalizeMatchState(match);
      }

      if (stageNumber === state.stages.length) {
        break;
      }

      if (!stage.matches.every((match) => match.status === 'COMPLETED')) {
        break;
      }

      const nextStage = state.stages[stageNumber];
      for (let nextIndex = 0; nextIndex < nextStage.matches.length; nextIndex += 1) {
        const leftSource = stage.matches[nextIndex * 2];
        const rightSource = stage.matches[nextIndex * 2 + 1];

        const nextMatch = nextStage.matches[nextIndex];
        nextMatch.player1UserId = leftSource?.winnerUserId ?? null;
        nextMatch.player2UserId = rightSource?.winnerUserId ?? null;

        if (
          nextMatch.status === 'COMPLETED' &&
          nextMatch.winnerUserId &&
          (nextMatch.winnerUserId === nextMatch.player1UserId ||
            nextMatch.winnerUserId === nextMatch.player2UserId)
        ) {
          continue;
        }

        nextMatch.winnerUserId = null;
      }
    }

    state.currentStage = this.resolveCurrentStage(state);
    state.winnerUserId = this.getBracketWinner(state);
    state.finished = Boolean(state.winnerUserId);
    state.updatedAt = new Date().toISOString();
  }

  private normalizeMatchState(match: TournamentBracketMatch): void {
    const hasPlayerOne = Boolean(match.player1UserId);
    const hasPlayerTwo = Boolean(match.player2UserId);

    if (hasPlayerOne && hasPlayerTwo) {
      if (
        match.status === 'COMPLETED' &&
        (match.winnerUserId === match.player1UserId || match.winnerUserId === match.player2UserId)
      ) {
        return;
      }

      match.status = 'PENDING';
      match.winnerUserId = null;
      return;
    }

    if (hasPlayerOne || hasPlayerTwo) {
      match.status = 'COMPLETED';
      match.winnerUserId = match.player1UserId ?? match.player2UserId;
      return;
    }

    match.status = 'COMPLETED';
    match.winnerUserId = null;
  }

  private resolveCurrentStage(state: TournamentBracketState): number {
    for (const stage of state.stages) {
      if (stage.matches.some((match) => match.status === 'PENDING')) {
        return stage.stage;
      }
    }

    return state.stages.length;
  }

  private getBracketWinner(state: TournamentBracketState): string | null {
    const finalStage = state.stages[state.stages.length - 1];
    const finalMatch = finalStage?.matches[0];
    if (!finalMatch) {
      return null;
    }

    if (finalMatch.status !== 'COMPLETED') {
      return null;
    }

    return finalMatch.winnerUserId;
  }

  private findMatchById(
    state: TournamentBracketState,
    matchId: string,
  ): TournamentBracketMatch | null {
    for (const stage of state.stages) {
      const match = stage.matches.find((candidate) => candidate.id === matchId);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private parseBracketState(input: Prisma.JsonValue | null): TournamentBracketState {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Tournament bracket is not initialized');
    }

    const candidate = input as Partial<TournamentBracketState>;
    if (!Array.isArray(candidate.stages)) {
      throw new BadRequestException('Tournament bracket is invalid');
    }

    return candidate as TournamentBracketState;
  }

  private async logProgressEvents(
    tournamentId: string,
    previousStage: number,
    nextStage: number,
    winnerUserId: string | null,
    actorId?: string,
  ): Promise<void> {
    if (winnerUserId) {
      await this.eventLogService.logTournamentEvent('TOURNAMENT_FINISHED', tournamentId, actorId, {
        winnerUserId,
      });
      return;
    }

    if (previousStage === 0 && nextStage > 0) {
      await this.eventLogService.logTournamentEvent('TOURNAMENT_STARTED', tournamentId, actorId, {
        currentStage: nextStage,
      });

      if (nextStage > 1) {
        await this.eventLogService.logTournamentEvent(
          'TOURNAMENT_STAGE_STARTED',
          tournamentId,
          actorId,
          { currentStage: nextStage },
        );
      }

      return;
    }

    if (nextStage > previousStage) {
      await this.eventLogService.logTournamentEvent(
        'TOURNAMENT_STAGE_STARTED',
        tournamentId,
        actorId,
        {
          currentStage: nextStage,
        },
      );
    }
  }

  private resolveMaxPlayers(config: Prisma.JsonValue): number {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return 16;
    }

    const candidateKeys = ['maxPlayers', 'bracketSize', 'slots'];
    for (const key of candidateKeys) {
      const raw = (config as Record<string, unknown>)[key];
      const parsed = Number(raw);
      if (ALLOWED_BRACKET_SIZES.includes(parsed)) {
        return parsed;
      }
    }

    return 16;
  }

  private async resolveUserIdInTx(
    tx: Prisma.TransactionClient,
    userIdInput: string,
    createIfTelegramId: boolean,
  ): Promise<string> {
    const candidate = userIdInput.trim();

    if (this.uuidRegex.test(candidate)) {
      const user = await tx.user.findUnique({
        where: { id: candidate },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException(`User ${candidate} not found`);
      }

      return user.id;
    }

    if (!/^\d+$/.test(candidate)) {
      throw new BadRequestException('userId must be UUID or Telegram numeric id');
    }

    const tgId = BigInt(candidate);
    const existingUser = await tx.user.findUnique({
      where: { tgId },
      select: { id: true },
    });

    if (existingUser) {
      return existingUser.id;
    }

    if (!createIfTelegramId) {
      throw new NotFoundException(`User with tgId ${candidate} not found`);
    }

    const createdUser = await tx.user.create({
      data: {
        tgId,
        username: `tg_${candidate}`,
      },
      select: {
        id: true,
      },
    });

    return createdUser.id;
  }
}
