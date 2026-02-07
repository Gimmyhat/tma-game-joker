import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

type LeaderboardRow = {
  id: string;
  tgId: string;
  username: string | null;
  countryCode: string | null;
  balanceCj: string;
  rating: number;
  wins: number;
  games: number;
  place1: number;
  place2: number;
  place3: number;
};

type SortBy = 'rating' | 'wins' | 'games' | 'balance';
type SortOrder = 'asc' | 'desc';

const SORT_EXPRESSION_MAP: Record<SortBy, Prisma.Sql> = {
  rating: Prisma.sql`COALESCE(NULLIF(u.stats->>'rating', '')::int, 0)`,
  wins: Prisma.sql`(
    COALESCE(NULLIF(u.stats->'wins'->>'paid_tables', '')::int, 0) +
    COALESCE(NULLIF(u.stats->'wins'->>'free_tables', '')::int, 0) +
    COALESCE(NULLIF(u.stats->'wins'->>'paid_tournaments', '')::int, 0) +
    COALESCE(NULLIF(u.stats->'wins'->>'free_tournaments', '')::int, 0)
  )`,
  games: Prisma.sql`COALESCE(NULLIF(u.stats->>'total_games', '')::int, 0)`,
  balance: Prisma.sql`u.balance_cj`,
};

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async listLeaderboard(query: LeaderboardQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy: SortBy = query.sortBy ?? 'rating';
    const order: SortOrder = query.order ?? 'desc';
    const offset = (page - 1) * pageSize;

    const direction = order === 'asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');
    const sortExpression = SORT_EXPRESSION_MAP[sortBy];

    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<LeaderboardRow[]>(Prisma.sql`
        SELECT
          u.id,
          u.tg_id::text AS "tgId",
          u.username,
          u.country_code AS "countryCode",
          u.balance_cj::text AS "balanceCj",
          COALESCE(NULLIF(u.stats->>'rating', '')::int, 0) AS rating,
          (
            COALESCE(NULLIF(u.stats->'wins'->>'paid_tables', '')::int, 0) +
            COALESCE(NULLIF(u.stats->'wins'->>'free_tables', '')::int, 0) +
            COALESCE(NULLIF(u.stats->'wins'->>'paid_tournaments', '')::int, 0) +
            COALESCE(NULLIF(u.stats->'wins'->>'free_tournaments', '')::int, 0)
          ) AS wins,
          COALESCE(NULLIF(u.stats->>'total_games', '')::int, 0) AS games,
          COALESCE(NULLIF(u.stats->'places'->>'1st', '')::int, 0) AS "place1",
          COALESCE(NULLIF(u.stats->'places'->>'2nd', '')::int, 0) AS "place2",
          COALESCE(NULLIF(u.stats->'places'->>'3rd', '')::int, 0) AS "place3"
        FROM users u
        WHERE
          u.status = 'ACTIVE'::"UserStatus"
          AND u.blocked_at IS NULL
          AND u.is_bot = false
        ORDER BY
          ${sortExpression} ${direction},
          COALESCE(NULLIF(u.stats->>'rating', '')::int, 0) DESC,
          (
            COALESCE(NULLIF(u.stats->'wins'->>'paid_tables', '')::int, 0) +
            COALESCE(NULLIF(u.stats->'wins'->>'free_tables', '')::int, 0) +
            COALESCE(NULLIF(u.stats->'wins'->>'paid_tournaments', '')::int, 0) +
            COALESCE(NULLIF(u.stats->'wins'->>'free_tournaments', '')::int, 0)
          ) DESC,
          COALESCE(NULLIF(u.stats->>'total_games', '')::int, 0) DESC,
          u.created_at ASC,
          u.id ASC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `),
      this.prisma.user.count({
        where: {
          status: 'ACTIVE',
          blockedAt: null,
          isBot: false,
        },
      }),
    ]);

    const items = rows.map((row, index) => {
      const games = Number(row.games || 0);
      const wins = Number(row.wins || 0);
      const winRate = games > 0 ? Number(((wins / games) * 100).toFixed(2)) : 0;

      return {
        rank: offset + index + 1,
        userId: row.id,
        tgId: row.tgId,
        username: row.username,
        countryCode: row.countryCode,
        rating: Number(row.rating || 0),
        wins,
        games,
        winRate,
        balanceCj: row.balanceCj,
        places: {
          first: Number(row.place1 || 0),
          second: Number(row.place2 || 0),
          third: Number(row.place3 || 0),
        },
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      sortBy,
      order,
    };
  }
}
