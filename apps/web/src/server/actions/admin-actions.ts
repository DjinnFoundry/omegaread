'use server';

import { getDb } from '@/server/db';
import { requireAdminAuth } from '@/server/admin-auth';
import {
  generatedStories,
  responses,
  sessions,
  students,
  asc,
  count,
  desc,
  eq,
  gte,
  sql,
} from '@omegaread/db';

const STORIES_WINDOW_DAYS = 30;
const ENGAGEMENT_WINDOW_DAYS = 30;
const COHORT_WINDOW_WEEKS = 12;
const MAX_COHORT_SERIES = 4;
const RETENTION_CHECKPOINTS = [1, 7, 30] as const;

type UsageBreakdown = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type CohortSeriesPoint = {
  week: string;
  avgComprehension: number | null;
  sessions: number;
  students: number;
};

export interface AdminDashboardData {
  generatedAt: string;
  totals: {
    students: number;
    stories: number;
    readingSessions: number;
    avgCompletionRate30d: number | null;
    totalStoryTokens: number;
    totalQuestionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number | null;
    pricingConfigured: boolean;
  };
  storiesByDay: Array<{
    date: string;
    stories: number;
    totalTokens: number;
    estimatedCostUsd: number | null;
  }>;
  completionByDay: Array<{
    date: string;
    storiesGenerated: number;
    readingCompletions: number;
    completionRate: number | null;
  }>;
  readingsByStudent: Array<{
    studentId: string;
    nombre: string;
    registeredAt: string;
    totalReadings: number;
    avgComprehension: number | null;
    lastReadingAt: string | null;
  }>;
  engagement: {
    dau: number;
    wau: number;
    dauWauRatio: number | null;
    series: Array<{
      date: string;
      dau: number;
      wau: number;
      dauWauRatio: number | null;
    }>;
  };
  comprehensionByCohort: {
    weeks: string[];
    cohorts: Array<{
      cohort: string;
      students: number;
      points: CohortSeriesPoint[];
    }>;
  };
  retentionByCohort: {
    anchor: 'first_reading_completion';
    cohorts: Array<{
      cohort: string;
      students: number;
      activatedStudents: number;
      d1: { eligible: number; retained: number; rate: number | null };
      d7: { eligible: number; retained: number; rate: number | null };
      d30: { eligible: number; retained: number; rate: number | null };
    }>;
  };
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toUtcDayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeekMonday(date: Date): Date {
  const day = date.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  return startOfUtcDay(addUtcDays(date, delta));
}

function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function parseNumericValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractUsageCandidate(value: unknown): UsageBreakdown | null {
  const record = asRecord(value);
  if (!record) return null;

  const promptTokens = Math.max(0, parseNumericValue(record.promptTokens));
  const completionTokens = Math.max(0, parseNumericValue(record.completionTokens));
  const totalFromPayload = Math.max(0, parseNumericValue(record.totalTokens));
  const totalTokens = totalFromPayload > 0 ? totalFromPayload : promptTokens + completionTokens;

  if (promptTokens === 0 && completionTokens === 0 && totalTokens === 0) return null;
  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

function extractStoryUsage(metadata: unknown): UsageBreakdown | null {
  const root = asRecord(metadata);
  if (!root) return null;

  const candidates = [
    root.llmUsage,
    root.usage,
    root.tokenUsage,
    root.llm_usage,
  ];

  for (const candidate of candidates) {
    const usage = extractUsageCandidate(candidate);
    if (usage) return usage;
  }

  return null;
}

function extractQuestionsUsage(metadata: unknown): UsageBreakdown | null {
  const root = asRecord(metadata);
  if (!root) return null;

  const candidates = [
    root.llmQuestionsUsage,
    root.questionsUsage,
    root.questionUsage,
    root.llm_questions_usage,
  ];

  for (const candidate of candidates) {
    const usage = extractUsageCandidate(candidate);
    if (usage) return usage;
  }

  return null;
}

function getRates() {
  const inputPer1M = Math.max(0, parseNumericValue(process.env.LLM_COST_INPUT_USD_PER_1M));
  const outputPer1M = Math.max(0, parseNumericValue(process.env.LLM_COST_OUTPUT_USD_PER_1M));
  return {
    inputPer1M,
    outputPer1M,
    configured: inputPer1M > 0 || outputPer1M > 0,
  };
}

function estimateCostUsd(usage: UsageBreakdown, rates: ReturnType<typeof getRates>): number | null {
  if (!rates.configured) return null;
  const inputCost = (usage.promptTokens / 1_000_000) * rates.inputPer1M;
  const outputCost = (usage.completionTokens / 1_000_000) * rates.outputPer1M;
  return round(inputCost + outputCost, 6);
}

function cohortLabelFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function resolveReadingCompletionDate(params: {
  metadata: unknown;
  sessionCompleted: boolean;
  iniciadaEn: Date;
  finalizadaEn: Date | null;
}): Date | null {
  const root = asRecord(params.metadata);
  if (root) {
    const eventDate = parseDate(root.lecturaCompletadaEn ?? root.readingCompletedAt);
    if (eventDate) return eventDate;
    if (root.lecturaCompletada === true || root.readingCompleted === true) {
      return params.finalizadaEn ?? params.iniciadaEn;
    }
  }

  // Fallback historico: en datos antiguos, completada=true implicaba lectura finalizada.
  if (params.sessionCompleted) {
    return params.finalizadaEn ?? params.iniciadaEn;
  }

  return null;
}

export async function obtenerAdminDashboard(): Promise<AdminDashboardData> {
  await requireAdminAuth();
  const db = await getDb();
  const now = new Date();
  const nowDay = startOfUtcDay(now);
  const storyWindowStart = addUtcDays(nowDay, -(STORIES_WINDOW_DAYS - 1));
  const engagementWindowStart = addUtcDays(nowDay, -(ENGAGEMENT_WINDOW_DAYS - 1));
  const currentWeekStart = startOfUtcWeekMonday(nowDay);
  const cohortWindowStart = addUtcDays(currentWeekStart, -7 * (COHORT_WINDOW_WEEKS - 1));

  const rates = getRates();

  const [
    totalStudentsResult,
    totalStoriesResult,
    studentsRows,
    storiesRows,
    sessionStatsRows,
  ] = await Promise.all([
    db.select({ value: count() }).from(students),
    db.select({ value: count() }).from(generatedStories),
    db
      .select({
        id: students.id,
        nombre: students.nombre,
        creadoEn: students.creadoEn,
      })
      .from(students)
      .orderBy(desc(students.creadoEn)),
    db
      .select({
        creadoEn: generatedStories.creadoEn,
        metadata: generatedStories.metadata,
      })
      .from(generatedStories)
      .where(gte(generatedStories.creadoEn, storyWindowStart))
      .orderBy(asc(generatedStories.creadoEn)),
    db
      .select({
        sessionId: sessions.id,
        studentId: sessions.studentId,
        iniciadaEn: sessions.iniciadaEn,
        finalizadaEn: sessions.finalizadaEn,
        sessionCompleted: sessions.completada,
        metadata: sessions.metadata,
        comprehension: sql<number | null>`
          CASE
            WHEN count(${responses.id}) = 0 THEN NULL
            ELSE (sum(CASE WHEN ${responses.correcta} = 1 THEN 1 ELSE 0 END) * 100.0 / count(${responses.id}))
          END
        `,
      })
      .from(sessions)
      .leftJoin(responses, eq(responses.sessionId, sessions.id))
      .where(eq(sessions.tipoActividad, 'lectura'))
      .groupBy(
        sessions.id,
        sessions.studentId,
        sessions.iniciadaEn,
        sessions.finalizadaEn,
        sessions.completada,
        sessions.metadata,
      )
      .orderBy(asc(sessions.iniciadaEn)),
  ]);

  const totalStudents = Number(totalStudentsResult[0]?.value ?? 0);
  const totalStories = Number(totalStoriesResult[0]?.value ?? 0);

  const storyDayMap = new Map<
    string,
    { stories: number; totalTokens: number; estimatedCostUsd: number | null }
  >();
  let totalStoryTokens = 0;
  let totalStoryCost = 0;
  let hasStoryCost = false;

  for (const row of storiesRows) {
    const day = toDateKey(row.creadoEn);
    const entry = storyDayMap.get(day) ?? { stories: 0, totalTokens: 0, estimatedCostUsd: null };
    entry.stories += 1;

    const usage = extractStoryUsage(row.metadata);
    if (usage) {
      entry.totalTokens += usage.totalTokens;
      totalStoryTokens += usage.totalTokens;
      const estimated = estimateCostUsd(usage, rates);
      if (estimated !== null) {
        hasStoryCost = true;
        totalStoryCost += estimated;
        entry.estimatedCostUsd = round((entry.estimatedCostUsd ?? 0) + estimated, 6);
      }
    }

    storyDayMap.set(day, entry);
  }

  const storiesByDay: AdminDashboardData['storiesByDay'] = [];
  for (let i = 0; i < STORIES_WINDOW_DAYS; i++) {
    const day = toDateKey(addUtcDays(storyWindowStart, i));
    const data = storyDayMap.get(day);
    storiesByDay.push({
      date: day,
      stories: data?.stories ?? 0,
      totalTokens: data?.totalTokens ?? 0,
      estimatedCostUsd: data?.estimatedCostUsd ?? null,
    });
  }

  const studentMetrics = new Map<
    string,
    {
      totalReadings: number;
      sumComprehension: number;
      comprehensionCount: number;
      lastReadingAt: Date | null;
    }
  >();
  const dailyActiveStudents = new Map<string, Set<string>>();
  const readingCompletionsByDay = new Map<string, number>();
  const studentCompletionHistory = new Map<
    string,
    { firstDayIndex: number; completionDayIndexes: Set<number> }
  >();
  let totalReadingSessions = 0;
  const totalQuestionUsage: UsageBreakdown = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  let totalQuestionCost = 0;
  let hasQuestionCost = false;

  for (const row of sessionStatsRows) {
    const completedAt = resolveReadingCompletionDate({
      metadata: row.metadata,
      sessionCompleted: row.sessionCompleted,
      iniciadaEn: row.iniciadaEn,
      finalizadaEn: row.finalizadaEn ?? null,
    });
    if (!completedAt) continue;

    totalReadingSessions += 1;
    const completedDayIndex = toUtcDayIndex(completedAt);
    const completionHistory = studentCompletionHistory.get(row.studentId);
    if (!completionHistory) {
      studentCompletionHistory.set(row.studentId, {
        firstDayIndex: completedDayIndex,
        completionDayIndexes: new Set<number>([completedDayIndex]),
      });
    } else {
      completionHistory.completionDayIndexes.add(completedDayIndex);
      if (completedDayIndex < completionHistory.firstDayIndex) {
        completionHistory.firstDayIndex = completedDayIndex;
      }
    }

    const metric = studentMetrics.get(row.studentId) ?? {
      totalReadings: 0,
      sumComprehension: 0,
      comprehensionCount: 0,
      lastReadingAt: null,
    };

    metric.totalReadings += 1;
    if (typeof row.comprehension === 'number' && Number.isFinite(row.comprehension)) {
      metric.sumComprehension += row.comprehension;
      metric.comprehensionCount += 1;
    }
    if (!metric.lastReadingAt || completedAt > metric.lastReadingAt) {
      metric.lastReadingAt = completedAt;
    }
    studentMetrics.set(row.studentId, metric);

    const dayKey = toDateKey(completedAt);
    if (completedAt >= storyWindowStart && completedAt <= now) {
      readingCompletionsByDay.set(dayKey, (readingCompletionsByDay.get(dayKey) ?? 0) + 1);
    }

    if (completedAt >= engagementWindowStart) {
      const active = dailyActiveStudents.get(dayKey) ?? new Set<string>();
      active.add(row.studentId);
      dailyActiveStudents.set(dayKey, active);
    }

    const questionUsage = extractQuestionsUsage(row.metadata);
    if (questionUsage) {
      totalQuestionUsage.promptTokens += questionUsage.promptTokens;
      totalQuestionUsage.completionTokens += questionUsage.completionTokens;
      totalQuestionUsage.totalTokens += questionUsage.totalTokens;
      const estimated = estimateCostUsd(questionUsage, rates);
      if (estimated !== null) {
        hasQuestionCost = true;
        totalQuestionCost += estimated;
      }
    }
  }

  const readingsByStudent: AdminDashboardData['readingsByStudent'] = studentsRows
    .map((student) => {
      const metric = studentMetrics.get(student.id);
      const avgComprehension =
        metric && metric.comprehensionCount > 0
          ? round(metric.sumComprehension / metric.comprehensionCount, 1)
          : null;
      return {
        studentId: student.id,
        nombre: student.nombre,
        registeredAt: toDateKey(student.creadoEn),
        totalReadings: metric?.totalReadings ?? 0,
        avgComprehension,
        lastReadingAt: metric?.lastReadingAt ? toDateKey(metric.lastReadingAt) : null,
      };
    })
    .sort((a, b) => {
      if (b.totalReadings !== a.totalReadings) return b.totalReadings - a.totalReadings;
      return a.nombre.localeCompare(b.nombre);
    });

  const engagementSeries: AdminDashboardData['engagement']['series'] = [];
  for (let i = 0; i < ENGAGEMENT_WINDOW_DAYS; i++) {
    const day = addUtcDays(engagementWindowStart, i);
    const dayKey = toDateKey(day);
    const dau = dailyActiveStudents.get(dayKey)?.size ?? 0;

    const weeklySet = new Set<string>();
    for (let j = 0; j < 7; j++) {
      const backDayKey = toDateKey(addUtcDays(day, -j));
      const active = dailyActiveStudents.get(backDayKey);
      if (!active) continue;
      for (const studentId of active) {
        weeklySet.add(studentId);
      }
    }

    const wau = weeklySet.size;
    engagementSeries.push({
      date: dayKey,
      dau,
      wau,
      dauWauRatio: wau > 0 ? round((dau / wau) * 100, 1) : null,
    });
  }

  const engagementToday = engagementSeries[engagementSeries.length - 1] ?? {
    dau: 0,
    wau: 0,
    dauWauRatio: null,
  };

  const completionByDay: AdminDashboardData['completionByDay'] = [];
  const completionRates: number[] = [];
  for (let i = 0; i < STORIES_WINDOW_DAYS; i++) {
    const day = toDateKey(addUtcDays(storyWindowStart, i));
    const storiesGenerated = storyDayMap.get(day)?.stories ?? 0;
    const readingCompletions = readingCompletionsByDay.get(day) ?? 0;
    const completionRate =
      storiesGenerated > 0 ? round((readingCompletions / storiesGenerated) * 100, 1) : null;
    if (completionRate !== null) completionRates.push(completionRate);
    completionByDay.push({
      date: day,
      storiesGenerated,
      readingCompletions,
      completionRate,
    });
  }

  const avgCompletionRate30d =
    completionRates.length > 0
      ? round(
        completionRates.reduce((sum, value) => sum + value, 0) / completionRates.length,
        1,
      )
      : null;

  const studentCohort = new Map<string, string>();
  const cohortStudentCount = new Map<string, number>();
  for (const student of studentsRows) {
    const cohort = cohortLabelFromDate(student.creadoEn);
    studentCohort.set(student.id, cohort);
    cohortStudentCount.set(cohort, (cohortStudentCount.get(cohort) ?? 0) + 1);
  }

  const nowDayIndex = toUtcDayIndex(nowDay);
  const retentionAccumulator = new Map<
    string,
    {
      students: number;
      activatedStudents: number;
      d1: { eligible: number; retained: number };
      d7: { eligible: number; retained: number };
      d30: { eligible: number; retained: number };
    }
  >();

  for (const [cohort, studentsCount] of cohortStudentCount.entries()) {
    retentionAccumulator.set(cohort, {
      students: studentsCount,
      activatedStudents: 0,
      d1: { eligible: 0, retained: 0 },
      d7: { eligible: 0, retained: 0 },
      d30: { eligible: 0, retained: 0 },
    });
  }

  for (const student of studentsRows) {
    const cohort = studentCohort.get(student.id);
    if (!cohort) continue;

    const acc = retentionAccumulator.get(cohort);
    if (!acc) continue;

    const history = studentCompletionHistory.get(student.id);
    if (!history) continue;
    acc.activatedStudents += 1;

    for (const checkpoint of RETENTION_CHECKPOINTS) {
      const key = checkpoint === 1 ? 'd1' : checkpoint === 7 ? 'd7' : 'd30';
      if (nowDayIndex - history.firstDayIndex < checkpoint) continue;
      acc[key].eligible += 1;
      if (history.completionDayIndexes.has(history.firstDayIndex + checkpoint)) {
        acc[key].retained += 1;
      }
    }
  }

  const retentionByCohort: AdminDashboardData['retentionByCohort'] = {
    anchor: 'first_reading_completion',
    cohorts: Array.from(retentionAccumulator.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([cohort, acc]) => ({
        cohort,
        students: acc.students,
        activatedStudents: acc.activatedStudents,
        d1: {
          eligible: acc.d1.eligible,
          retained: acc.d1.retained,
          rate: acc.d1.eligible > 0 ? round((acc.d1.retained / acc.d1.eligible) * 100, 1) : null,
        },
        d7: {
          eligible: acc.d7.eligible,
          retained: acc.d7.retained,
          rate: acc.d7.eligible > 0 ? round((acc.d7.retained / acc.d7.eligible) * 100, 1) : null,
        },
        d30: {
          eligible: acc.d30.eligible,
          retained: acc.d30.retained,
          rate: acc.d30.eligible > 0 ? round((acc.d30.retained / acc.d30.eligible) * 100, 1) : null,
        },
      })),
  };

  const cohortBucket = new Map<string, { sum: number; count: number; students: Set<string> }>();
  const cohortActivity = new Map<string, number>();

  for (const row of sessionStatsRows) {
    const completedAt = resolveReadingCompletionDate({
      metadata: row.metadata,
      sessionCompleted: row.sessionCompleted,
      iniciadaEn: row.iniciadaEn,
      finalizadaEn: row.finalizadaEn ?? null,
    });
    if (!completedAt) continue;
    if (!(typeof row.comprehension === 'number' && Number.isFinite(row.comprehension))) continue;
    if (completedAt < cohortWindowStart) continue;

    const cohort = studentCohort.get(row.studentId);
    if (!cohort) continue;

    const week = toDateKey(startOfUtcWeekMonday(completedAt));
    const key = `${cohort}::${week}`;
    const bucket = cohortBucket.get(key) ?? { sum: 0, count: 0, students: new Set<string>() };
    bucket.sum += row.comprehension;
    bucket.count += 1;
    bucket.students.add(row.studentId);
    cohortBucket.set(key, bucket);
    cohortActivity.set(cohort, (cohortActivity.get(cohort) ?? 0) + 1);
  }

  const selectedCohorts = Array.from(cohortActivity.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (cohortStudentCount.get(b[0]) ?? 0) - (cohortStudentCount.get(a[0]) ?? 0);
    })
    .slice(0, MAX_COHORT_SERIES)
    .map(([cohort]) => cohort);

  const cohortWeeks = Array.from({ length: COHORT_WINDOW_WEEKS }, (_, idx) =>
    toDateKey(addUtcDays(cohortWindowStart, idx * 7)),
  );

  const comprehensionByCohort: AdminDashboardData['comprehensionByCohort'] = {
    weeks: cohortWeeks,
    cohorts: selectedCohorts.map((cohort) => {
      const points: CohortSeriesPoint[] = cohortWeeks.map((week) => {
        const bucket = cohortBucket.get(`${cohort}::${week}`);
        return {
          week,
          avgComprehension: bucket ? round(bucket.sum / bucket.count, 1) : null,
          sessions: bucket?.count ?? 0,
          students: bucket?.students.size ?? 0,
        };
      });

      return {
        cohort,
        students: cohortStudentCount.get(cohort) ?? 0,
        points,
      };
    }),
  };

  const estimatedCostUsd = hasStoryCost || hasQuestionCost
    ? round(totalStoryCost + totalQuestionCost, 6)
    : null;

  return {
    generatedAt: now.toISOString(),
    totals: {
      students: totalStudents,
      stories: totalStories,
      readingSessions: totalReadingSessions,
      avgCompletionRate30d,
      totalStoryTokens,
      totalQuestionTokens: totalQuestionUsage.totalTokens,
      totalTokens: totalStoryTokens + totalQuestionUsage.totalTokens,
      estimatedCostUsd,
      pricingConfigured: rates.configured,
    },
    storiesByDay,
    completionByDay,
    readingsByStudent,
    engagement: {
      dau: engagementToday.dau,
      wau: engagementToday.wau,
      dauWauRatio: engagementToday.dauWauRatio,
      series: engagementSeries,
    },
    comprehensionByCohort,
    retentionByCohort,
  };
}
