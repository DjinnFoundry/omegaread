import { describe, expect, it } from 'vitest';
import {
  fsrsInit,
  fsrsIntervalDays,
  fsrsRatingFromOutcome,
  fsrsRetrievability,
  fsrsReview,
  readFsrsState,
  type FsrsState,
} from '@/lib/actividades/fsrs';

describe('fsrs', () => {
  it('calcula retrievability en rango 0..1', () => {
    const r = fsrsRetrievability(3, 5);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(1);
  });

  it('intervalo siempre es >= 1 dia', () => {
    expect(fsrsIntervalDays(0.01)).toBeGreaterThanOrEqual(1);
  });

  it('inicializa estado y fecha de repaso', () => {
    const now = new Date('2026-02-20T10:00:00.000Z');
    const init = fsrsInit(now, 3);
    expect(init.state.repetitions).toBe(1);
    expect(init.intervalDays).toBeGreaterThanOrEqual(1);
    expect(new Date(init.dueAt).getTime()).toBeGreaterThan(now.getTime());
  });

  it('review con Again incrementa lapses', () => {
    const base: FsrsState = {
      difficulty: 5,
      stability: 2.5,
      repetitions: 3,
      lapses: 0,
      lastReviewAt: '2026-02-18T10:00:00.000Z',
    };
    const out = fsrsReview(base, new Date('2026-02-20T10:00:00.000Z'), 1);
    expect(out.state.lapses).toBe(1);
    expect(out.intervalDays).toBe(1);
  });

  it('review con Good aumenta estabilidad', () => {
    const base: FsrsState = {
      difficulty: 5.5,
      stability: 2.0,
      repetitions: 4,
      lapses: 1,
      lastReviewAt: '2026-02-19T10:00:00.000Z',
    };
    const out = fsrsReview(base, new Date('2026-02-20T10:00:00.000Z'), 3);
    expect(out.state.stability).toBeGreaterThan(base.stability);
    expect(out.state.repetitions).toBe(5);
  });

  it('rating desde outcome usa tiempo para hard/good/easy', () => {
    expect(fsrsRatingFromOutcome(false, 1500)).toBe(1);
    expect(fsrsRatingFromOutcome(true, 8000)).toBe(2);
    expect(fsrsRatingFromOutcome(true, 4500)).toBe(3);
    expect(fsrsRatingFromOutcome(true, 1200)).toBe(4);
  });

  it('lee estado valido desde metadata', () => {
    const meta = {
      fsrs: {
        difficulty: 5,
        stability: 3,
        repetitions: 4,
        lapses: 1,
        lastReviewAt: '2026-02-20T10:00:00.000Z',
      },
    };
    const state = readFsrsState(meta);
    expect(state?.stability).toBe(3);
  });
});

