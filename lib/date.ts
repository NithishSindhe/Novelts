const DAY_MS = 24 * 60 * 60 * 1000;

export function dateIdFromLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateId(dateId: string): Date {
  const [y, m, d] = dateId.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function shiftDateId(dateId: string, deltaDays: number): string {
  const base = parseDateId(dateId);
  base.setDate(base.getDate() + deltaDays);
  return dateIdFromLocal(base);
}

export function todayDateId(): string {
  return dateIdFromLocal(new Date());
}

export function allowedCheckInDates(now = new Date()): string[] {
  const today = dateIdFromLocal(now);
  return [today, shiftDateId(today, -1), shiftDateId(today, -2)];
}

export function isDateAllowedForCheckIn(dateId: string, now = new Date()): boolean {
  return allowedCheckInDates(now).includes(dateId);
}

export function formatDateLabel(dateId: string): string {
  const date = parseDateId(dateId);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function daysBetween(a: string, b: string): number {
  const aDate = parseDateId(a);
  const bDate = parseDateId(b);
  return Math.round((aDate.getTime() - bDate.getTime()) / DAY_MS);
}
