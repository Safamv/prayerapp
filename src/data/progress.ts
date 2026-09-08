import { today as todayOf } from './clock'
import { toSchedulerPassageProgress, toSchedulerSegmentProgress } from './progressMapping'
import { countReviews, listReviewLog } from './reviewLog'
import { listSegmentProgress } from './segmentProgress'
import { listPassageSegments } from './segmentation'
import { listPassagesOnList, type ListedPassage } from './upkeep'
import { getOrCreateUserStats, updateUserStats } from './userStats'
import {
  currentStreak,
  freshnessCounts,
  lapseCount,
  lastActiveDay,
  longestIntervalDays,
  longestStreak,
  passageFreshness,
  type Freshness,
  type FreshnessCounts,
  type PassageFreshnessInput,
} from '../progress'
import type { Day, Instant, PassageRow, UserPrayerRow } from './types'

/**
 * **Scope 11, read out of the database.** Freshness, the streak and the passage
 * detail view.
 *
 * The decisions are all next door in `src/progress/`, which is pure and knows
 * nothing about Dexie. This module does the reading, the renaming and the
 * joining, and makes no decision of its own. It is the same split
 * `src/data/dailyQueue.ts` has with `src/queue/`, for the same reason: the
 * arithmetic that would be expensive to get wrong is testable without a
 * database.
 *
 * **No new instrumentation.** Scope 11.3 says the whole of the passage detail
 * view "falls straight out of `segment_progress`", and it does: every function
 * here reads columns that have existed since session 2. No column was added, no
 * Dexie version was bumped, and nothing on a tester's phone was migrated.
 *
 * A memorisation module. Nothing under `src/features/discover/` may import it
 * (principle 7.6, enforced by `src/principles/discover-isolation.test.ts`).
 */

/**
 * **The days the reader has been active**, in their own timezone.
 *
 * `review_log.created_at` is a UTC instant, and the streak counts calendar days
 * as the reader lived them. A review at nine in the morning in Melbourne is
 * stored as the previous day in UTC, so counting days off the stored string
 * would tell a Melbourne reader they had broken a streak they had not broken.
 * `today()` in `clock.ts` already formats a `Date` in the device's own zone and
 * carries that reasoning; this hands it each instant in turn.
 */
export function activeDaysFrom(instants: readonly Instant[]): Day[] {
  return [...new Set(instants.map((instant) => todayOf(new Date(instant))))]
}

export interface Streak {
  /** Scope 11.4. What the Memorise tab says, when it says anything. */
  readonly current: number
  /** `user_stats.streak_longest`. Deliberately not rendered. Decision D11.4. */
  readonly longest: number
  readonly lastActive: Day | null
}

/**
 * **The streak, derived from `review_log` every time.** Scope 11.4.
 *
 * Not incremented in a stored counter: a counter that misses one write is wrong
 * for ever and has nothing to be checked against, and `src/data/reviewLog.ts`
 * was written in session 2 with this in mind. A whole-passage recital counts
 * like any other day's work, because decision D9.3 gave the log somewhere to
 * record one.
 *
 * `user_stats` is written as a by-product rather than read. Scope section 10
 * gives that table four columns and a row that says nought about a reader who
 * has done ninety days is a row that lies, which matters at v1.0 when it syncs.
 * Nothing displayed ever comes from it. Decision D11.4.
 */
export async function getStreak(userId: string, today: Day = todayOf()): Promise<Streak> {
  const [rows, total] = await Promise.all([listReviewLog(userId), countReviews(userId)])
  const days = activeDaysFrom(rows.map((row) => row.created_at))

  const streak: Streak = {
    current: currentStreak(days, today),
    longest: longestStreak(days),
    lastActive: lastActiveDay(days),
  }

  const stored = await getOrCreateUserStats(userId)
  if (
    stored.streak_current !== streak.current ||
    stored.streak_longest !== streak.longest ||
    stored.last_active_date !== streak.lastActive ||
    stored.total_reviews !== total
  ) {
    await updateUserStats(userId, {
      streak_current: streak.current,
      streak_longest: streak.longest,
      last_active_date: streak.lastActive,
      total_reviews: total,
    })
  }

  return streak
}

/** The freshness inputs for one passage on the list, gathered from three tables. */
async function freshnessInputOf(
  userPrayer: UserPrayerRow,
  progressBySegment: ReadonlyMap<string, ReturnType<typeof toSchedulerSegmentProgress>>,
): Promise<PassageFreshnessInput> {
  const segments = await listPassageSegments(userPrayer.passage_id)
  return {
    upkeepState: userPrayer.upkeep_state,
    passage: toSchedulerPassageProgress(userPrayer),
    segments: segments.map((segment) => ({
      progress: progressBySegment.get(segment.id) ?? null,
    })),
  }
}

/** A passage on the list, and the star beside it. */
export interface PassageWithFreshness {
  readonly passage: PassageRow
  readonly userPrayer: UserPrayerRow
  readonly freshness: Freshness
}

/**
 * **Everything on the reader's list, with its freshness**, in the order they
 * arranged it.
 *
 * Read as two whole-table queries and joined in memory rather than as a query
 * per passage, which is the shape `readQueueInput` next door already uses. A V0
 * list is a handful of passages.
 */
export async function listPassageFreshness(
  userId: string,
  today: Day = todayOf(),
): Promise<PassageWithFreshness[]> {
  const [listed, progressRows] = await Promise.all([
    listPassagesOnList(userId),
    listSegmentProgress(userId),
  ])
  const progressBySegment = new Map(
    progressRows.map((row) => [row.segment_id, toSchedulerSegmentProgress(row)]),
  )

  return Promise.all(
    listed.map(async (entry: ListedPassage) => ({
      passage: entry.passage,
      userPrayer: entry.userPrayer,
      freshness: passageFreshness(
        await freshnessInputOf(entry.userPrayer, progressBySegment),
        today,
      ),
    })),
  )
}

/**
 * **The passage detail view's five facts.** Scope 11.3.
 *
 * > The honest answer to "how well do I know this, and am I done?"
 *
 * Current freshness, the longest interval reached, the lapse count, the
 * milestone date if there is one, and how many lines sit at each state. All of
 * it out of `segment_progress` and `user_prayers`.
 *
 * `promoted` is here because the last of those five means something different
 * once a passage has been promoted. Scope 8.7 keeps the line state and stops
 * surfacing it, and none of those lines has been reviewed since the promotion,
 * so a breakdown would say "needs review" of every line of a passage the reader
 * finished a fortnight ago. The screen states the promotion instead. See
 * decision D11.5.
 */
export interface PassageDetail {
  readonly passage: PassageRow
  readonly userPrayer: UserPrayerRow
  readonly freshness: Freshness
  readonly counts: FreshnessCounts
  readonly lineCount: number
  /** The plain SM-2 interval, in days, or `null` if nothing has settled yet. */
  readonly longestIntervalDays: number | null
  readonly lapses: number
  /** Scope 11.3's "milestone date, if reached". Kept through a demotion (D9.5). */
  readonly milestoneReachedAt: Instant | null
  /** Whether the passage comes round as a whole right now (scope 8.7). */
  readonly promoted: boolean
}

export async function getPassageDetail(
  userId: string,
  passageId: string,
  today: Day = todayOf(),
): Promise<PassageDetail | null> {
  const listed = await listPassagesOnList(userId)
  const entry = listed.find((row) => row.passage.id === passageId)
  if (entry === undefined) return null

  const progressRows = await listSegmentProgress(userId)
  const progressBySegment = new Map(
    progressRows.map((row) => [row.segment_id, toSchedulerSegmentProgress(row)]),
  )
  const input = await freshnessInputOf(entry.userPrayer, progressBySegment)

  return {
    passage: entry.passage,
    userPrayer: entry.userPrayer,
    freshness: passageFreshness(input, today),
    counts: freshnessCounts(input, today),
    lineCount: input.segments.length,
    longestIntervalDays: longestIntervalDays(input),
    lapses: lapseCount(input),
    milestoneReachedAt: entry.userPrayer.milestone_reached_at,
    promoted: input.passage !== null,
  }
}
