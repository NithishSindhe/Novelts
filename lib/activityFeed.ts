// Shared, pure builder for the "Recent activity" feed. Given the full tracker
// and LeetCode state (from either the cloud repos or local storage), it derives
// a GitHub-style, newest-first list of things the user has recently done.
//
// Used by both:
//   - app/api/activity/route.ts (server, signed-in users) and
//   - components/HomeDashboard.tsx (client, anonymous/local users)
// so the two code paths always produce an identical feed.

import { LEETCODE_PATTERNS } from "@/lib/leetcodeData";
import type { LeetcodeState } from "@/lib/leetcodeStorage";
import type { TrackerState } from "@/lib/types";

const DELETED_TAG = "deleted";

export type ActivityKind =
  | "novel_added"
  | "novel_content"
  | "novel_note"
  | "leetcode_solved"
  | "leetcode_attempt"
  | "leetcode_problem_note"
  | "leetcode_pattern_note";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  /** ISO-8601 timestamp used for ordering and relative display. */
  timestamp: string;
  /** Full human-readable description, e.g. "Added 3 words and 2 characters from X". */
  text: string;
  /** Route to jump to the underlying activity. */
  href: string;
}

// Minimal, render-independent payload persisted per event (activity_events.metadata).
// Everything needed to rebuild `text`/`href` at read time lives here, so the
// feed copy has a single source of truth (renderEvent) shared by the server
// read path and the client/anonymous path.
export type ActivityMetadata = Record<string, unknown>;

// A derived event before rendering: stable id (-> event_key), kind, timestamp
// (-> ts) and the metadata needed to render it later.
export interface DerivedActivityEvent {
  id: string;
  kind: ActivityKind;
  timestamp: string;
  metadata: ActivityMetadata;
}

// ---------------------------------------------------------------------------
// LeetCode catalog lookups (built once from the in-code problem catalog).
// ---------------------------------------------------------------------------
interface ProblemInfo {
  title: string;
  patternSlug: string;
}

const PROBLEM_BY_KEY = new Map<string, ProblemInfo>();
const PATTERN_NAME_BY_SLUG = new Map<string, string>();

for (const pattern of LEETCODE_PATTERNS) {
  PATTERN_NAME_BY_SLUG.set(pattern.slug, pattern.name);
  for (const problem of pattern.problems) {
    PROBLEM_BY_KEY.set(problem.key, { title: problem.title, patternSlug: pattern.slug });
  }
}

function leetcodeProblemHref(patternSlug: string): string {
  return `/leetcode/${patternSlug}`;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------
// Derive the raw, render-independent event list from full state. Each event
// carries a stable `id` (persisted as activity_events.event_key), a `kind`, a
// `timestamp` (persisted as `ts`) and the minimal `metadata` needed to render
// it later via renderEvent. This is the single derivation used both to
// materialize the server-side feed at write time and to build the client feed
// for anonymous/local users.
export function deriveActivityEvents(
  tracker: TrackerState,
  leetcode: LeetcodeState
): DerivedActivityEvent[] {
  const events: DerivedActivityEvent[] = [];

  const activeNovels = tracker.novels.filter((novel) => !novel.tags?.includes(DELETED_TAG));
  const novelById = new Map(activeNovels.map((novel) => [novel.id, novel]));
  const isActiveNovel = (novelId?: string) => Boolean(novelId && novelById.has(novelId));

  // Added novel
  for (const novel of activeNovels) {
    events.push({
      id: `novel-added:${novel.id}`,
      kind: "novel_added",
      timestamp: novel.createdAt,
      metadata: { novelId: novel.id, title: novel.title }
    });
  }

  // Added words + characters, grouped per day + per novel.
  interface ContentBucket {
    novelId?: string;
    words: number;
    characters: number;
    latest: string;
  }
  const buckets = new Map<string, ContentBucket>();

  const bucketKey = (date: string, novelId?: string) => `${date}|${novelId ?? ""}`;

  const includeContent = (novelId?: string) => !novelId || isActiveNovel(novelId);

  for (const word of tracker.words) {
    if (!includeContent(word.novelId)) continue;
    const key = bucketKey(word.date, word.novelId);
    const bucket = buckets.get(key) ?? { novelId: word.novelId, words: 0, characters: 0, latest: word.createdAt };
    bucket.words += 1;
    if (Date.parse(word.createdAt) > Date.parse(bucket.latest)) bucket.latest = word.createdAt;
    buckets.set(key, bucket);
  }

  for (const character of tracker.characters) {
    if (!includeContent(character.novelId)) continue;
    const key = bucketKey(character.date, character.novelId);
    const bucket =
      buckets.get(key) ?? { novelId: character.novelId, words: 0, characters: 0, latest: character.createdAt };
    bucket.characters += 1;
    if (Date.parse(character.createdAt) > Date.parse(bucket.latest)) bucket.latest = character.createdAt;
    buckets.set(key, bucket);
  }

  for (const [key, bucket] of buckets) {
    if (bucket.words === 0 && bucket.characters === 0) continue;
    const novel = bucket.novelId ? novelById.get(bucket.novelId) : undefined;
    events.push({
      id: `novel-content:${key}`,
      kind: "novel_content",
      timestamp: bucket.latest,
      metadata: {
        novelId: novel?.id,
        title: novel?.title,
        words: bucket.words,
        characters: bucket.characters
      }
    });
  }

  // Saved a novel note
  for (const note of tracker.notes) {
    if (note.tags?.includes(DELETED_TAG)) continue;
    if (!isActiveNovel(note.novelId)) continue;
    const novel = novelById.get(note.novelId);
    events.push({
      id: `novel-note:${note.id}`,
      kind: "novel_note",
      timestamp: note.createdAt,
      metadata: { novelId: note.novelId, title: novel?.title }
    });
  }

  // Solved a LeetCode problem
  for (const [key, solvedAt] of Object.entries(leetcode.solvedAt)) {
    if (!PROBLEM_BY_KEY.has(key)) continue;
    events.push({
      id: `lc-solved:${key}`,
      kind: "leetcode_solved",
      timestamp: solvedAt,
      metadata: { problemKey: key }
    });
  }

  // Attempted a LeetCode problem (one event per recorded attempt)
  for (const [key, timestamps] of Object.entries(leetcode.attempts)) {
    if (!PROBLEM_BY_KEY.has(key)) continue;
    for (const attemptedAt of timestamps) {
      events.push({
        id: `lc-attempt:${key}:${attemptedAt}`,
        kind: "leetcode_attempt",
        timestamp: attemptedAt,
        metadata: { problemKey: key }
      });
    }
  }

  // Saved a LeetCode problem note
  for (const [key, updatedAt] of Object.entries(leetcode.problemNotesUpdatedAt)) {
    if (!PROBLEM_BY_KEY.has(key)) continue;
    events.push({
      id: `lc-problem-note:${key}`,
      kind: "leetcode_problem_note",
      timestamp: updatedAt,
      metadata: { problemKey: key }
    });
  }

  // Saved LeetCode pattern notes
  for (const [patternSlug, updatedAt] of Object.entries(leetcode.patternNotesUpdatedAt)) {
    if (!PATTERN_NAME_BY_SLUG.has(patternSlug)) continue;
    events.push({
      id: `lc-pattern-note:${patternSlug}`,
      kind: "leetcode_pattern_note",
      timestamp: updatedAt,
      metadata: { patternSlug }
    });
  }

  return events.filter((event) => event.timestamp && !Number.isNaN(Date.parse(event.timestamp)));
}

// Render a derived event into its final display shape. This is the single
// source of truth for feed copy/links, used by both the server read path
// (rebuilding from activity_events rows) and the client feed. Returns null if
// the event references a catalog entry that no longer exists.
export function renderEvent(event: DerivedActivityEvent): ActivityEvent | null {
  const m = event.metadata ?? {};
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const num = (v: unknown) => (typeof v === "number" ? v : 0);

  switch (event.kind) {
    case "novel_added": {
      const novelId = str(m.novelId);
      return {
        id: event.id,
        kind: event.kind,
        timestamp: event.timestamp,
        text: `Added novel ${str(m.title) ?? ""}`.trimEnd(),
        href: novelId ? `/novels/${novelId}` : "/"
      };
    }
    case "novel_content": {
      const words = num(m.words);
      const characters = num(m.characters);
      const parts: string[] = [];
      if (words > 0) parts.push(`${words} ${words === 1 ? "word" : "words"}`);
      if (characters > 0) parts.push(`${characters} ${characters === 1 ? "character" : "characters"}`);
      if (parts.length === 0) return null;
      const title = str(m.title);
      const novelId = str(m.novelId);
      return {
        id: event.id,
        kind: event.kind,
        timestamp: event.timestamp,
        text: `Added ${parts.join(" and ")}${title ? ` from ${title}` : ""}`,
        href: novelId ? `/novels/${novelId}` : "/"
      };
    }
    case "novel_note": {
      const novelId = str(m.novelId);
      return {
        id: event.id,
        kind: event.kind,
        timestamp: event.timestamp,
        text: `Saved a note in ${str(m.title) ?? "a novel"}`,
        href: novelId ? `/novels/${novelId}/notes` : "/"
      };
    }
    case "leetcode_solved": {
      const info = PROBLEM_BY_KEY.get(str(m.problemKey) ?? "");
      if (!info) return null;
      return {
        id: event.id,
        kind: event.kind,
        timestamp: event.timestamp,
        text: `Solved ${info.title}`,
        href: leetcodeProblemHref(info.patternSlug)
      };
    }
    case "leetcode_attempt": {
      const info = PROBLEM_BY_KEY.get(str(m.problemKey) ?? "");
      if (!info) return null;
      return {
        id: event.id,
        kind: event.kind,
        timestamp: event.timestamp,
        text: `Attempted ${info.title}`,
        href: leetcodeProblemHref(info.patternSlug)
      };
    }
    case "leetcode_problem_note": {
      const info = PROBLEM_BY_KEY.get(str(m.problemKey) ?? "");
      if (!info) return null;
      return {
        id: event.id,
        kind: event.kind,
        timestamp: event.timestamp,
        text: `Saved a note on ${info.title}`,
        href: leetcodeProblemHref(info.patternSlug)
      };
    }
    case "leetcode_pattern_note": {
      const patternSlug = str(m.patternSlug) ?? "";
      const name = PATTERN_NAME_BY_SLUG.get(patternSlug);
      if (!name) return null;
      return {
        id: event.id,
        kind: event.kind,
        timestamp: event.timestamp,
        text: `Saved pattern notes for ${name}`,
        href: leetcodeProblemHref(patternSlug)
      };
    }
    default:
      return null;
  }
}

// Sort newest-first, render, drop stale/unrenderable events, and cap. Shared by
// the client (from local state) and the server read path (from stored events).
export function renderActivityFeed(events: DerivedActivityEvent[], limit = 20): ActivityEvent[] {
  return events
    .slice()
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .map(renderEvent)
    .filter((event): event is ActivityEvent => event !== null)
    .slice(0, limit);
}

// Convenience end-to-end builder: derive from full state and render. Used by the
// client/anonymous path (components/HomeDashboard.tsx) so it matches the
// server-materialized feed exactly.
export function buildActivityFeed(
  tracker: TrackerState,
  leetcode: LeetcodeState,
  limit = 20
): ActivityEvent[] {
  return renderActivityFeed(deriveActivityEvents(tracker, leetcode), limit);
}

// Convenience: compact relative time like "just now", "5m", "3h", "2d", "4w".
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, now - then);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  return `${Math.floor(diff / week)}w ago`;
}
