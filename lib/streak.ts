import { daysBetween, shiftDateId, todayDateId } from "@/lib/date";
import type { StreakSummary } from "@/lib/types";

export function calculateStreak(checkIns: Record<string, unknown>): StreakSummary {
  const dates = Object.keys(checkIns).sort();
  if (!dates.length) {
    return { current: 0, longest: 0, lastCheckInDate: null };
  }

  let longest = 0;
  let run = 0;
  let prev: string | null = null;

  for (const date of dates) {
    if (!prev) {
      run = 1;
    } else {
      const diff = daysBetween(date, prev);
      run = diff === 1 ? run + 1 : 1;
    }
    if (run > longest) longest = run;
    prev = date;
  }

  const latest = dates[dates.length - 1];
  const today = todayDateId();
  const hasToday = Boolean(checkIns[today]);
  const hasYesterday = Boolean(checkIns[shiftDateId(today, -1)]);

  if (!hasToday && !hasYesterday) {
    return { current: 0, longest, lastCheckInDate: latest };
  }

  const anchor = hasToday ? today : shiftDateId(today, -1);
  let current = 0;
  let cursor = anchor;

  while (checkIns[cursor]) {
    current += 1;
    cursor = shiftDateId(cursor, -1);
  }

  return { current, longest, lastCheckInDate: latest };
}
