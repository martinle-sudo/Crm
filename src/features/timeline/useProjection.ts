import { useMemo } from 'react';
import { useStore, selectAppState } from '@/store/useStore';
import { projectSeries } from '@/domain/projection';
import type { DayProjection, Scenario } from '@/domain/types';

interface Options {
  /** Inclusive end date (ISO). */
  to: string;
  /** Inclusive start date (defaults to opening date). */
  from?: string;
  /** Override scenarios — if undefined, uses all active scenarios in store. */
  scenarios?: Scenario[];
}

export function useProjection(opts: Options): DayProjection[] {
  const state = useStore(selectAppState);
  const storeScenarios = useStore((s) => s.scenarios);

  return useMemo(() => {
    const scenarios = opts.scenarios ?? Object.values(storeScenarios);
    return projectSeries(
      { state, scenarios },
      { from: opts.from, to: opts.to },
    );
  }, [state, storeScenarios, opts.from, opts.to, opts.scenarios]);
}
