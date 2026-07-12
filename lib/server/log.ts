// Server-only error logging.
//
// This module lives under lib/server/ so it is only ever imported by
// server-side code (route handlers, repos) and never bundled for the browser.
// As a belt-and-suspenders guard we also bail out if a `window` global is
// present, so a stray import can never emit console noise in the browser.

export function logServerError(context: string, error: unknown): void {
  if (typeof window !== "undefined") return;
  console.error(`[${context}]`, error);
}
