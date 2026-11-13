"use client";

import { useCallback, useEffect, useState } from "react";
import type { CabinetItem, Household } from "./types";

/**
 * Everything the family enters stays in this browser (localStorage): no accounts, no server
 * copy. `ready` is false until the stored value has been read, so pages can avoid a flash.
 */
function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* storage unavailable or corrupt: fall back to the initial value */
    }
    setReady(true);
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* ignore quota / private-mode errors */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update, ready] as const;
}

export const useHousehold = () => usePersistent<Household | null>("hr.household.v1", null);
export const useCabinet = () => usePersistent<CabinetItem[]>("hr.cabinet.v1", []);

export const DAYS_PER_MONTH = 30;

export function cabinetTotals(items: CabinetItem[]) {
  let brandMonthly = 0;
  let genericMonthly = 0;
  for (const { match, perDay } of items) {
    const brandUnit = match.brand?.perUnit ?? match.generic.brandMedianPerUnit ?? match.generic.perUnit;
    brandMonthly += brandUnit * perDay * DAYS_PER_MONTH;
    genericMonthly += match.generic.perUnit * perDay * DAYS_PER_MONTH;
  }
  return { brandMonthly, genericMonthly, savingsMonthly: Math.max(0, brandMonthly - genericMonthly) };
}
