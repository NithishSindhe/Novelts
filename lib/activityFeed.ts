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
export function buildActivityFeed(
  tracker: TrackerState,
  leetcode: LeetcodeState,
  limit = 20
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  const activeNovels = tracker.novels.filter((novel) => !novel.tags?.includes(DELETED_TAG));
  const novelById = new Map(activeNovels.map((novel) => [novel.id, novel]));
  const isActiveNovel = (novelId?: string) => Boolean(novelId && novelById.has(novelId));

  // Added novel
  for (const novel of activeNovels) {
    events.push({
      id: `novel-added:${novel.id}`,
      kind: "novel_added",
      timestamp: novel.createdAt,
      text: `Added novel ${novel.title}`,
      href: `/novels/${novel.id}`
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
    const parts: string[] = [];
    if (bucket.words > 0) parts.push(`${bucket.words} ${bucket.words === 1 ? "word" : "words"}`);
    if (bucket.characters > 0) {
      parts.push(`${bucket.characters} ${bucket.characters === 1 ? "character" : "characters"}`);
    }
    if (parts.length === 0) continue;

    const novel = bucket.novelId ? novelById.get(bucket.novelId) : undefined;
    const suffix = novel ? ` from ${novel.title}` : "";
    events.push({
      id: `novel-content:${key}`,
      kind: "novel_content",
      timestamp: bucket.latest,
      text: `Added ${parts.join(" and ")}${suffix}`,
      href: novel ? `/novels/${novel.id}` : "/"
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
      text: `Saved a note in ${novel?.title ?? "a novel"}`,
      href: `/novels/${note.novelId}/notes`
    });
  }

  // Solved a LeetCode problem
  for (const [key, solvedAt] of Object.entries(leetcode.solvedAt)) {
    const info = PROBLEM_BY_KEY.get(key);
    if (!info) continue;
    events.push({
      id: `lc-solved:${key}`,
      kind: "leetcode_solved",
      timestamp: solvedAt,
      text: `Solved ${info.title}`,
      href: leetcodeProblemHref(info.patternSlug)
    });
  }

  // Attempted a LeetCode problem (one event per recorded attempt)
  for (const [key, timestamps] of Object.entries(leetcode.attempts)) {
    const info = PROBLEM_BY_KEY.get(key);
    if (!info) continue;
    for (const attemptedAt of timestamps) {
      events.push({
        id: `lc-attempt:${key}:${attemptedAt}`,
        kind: "leetcode_attempt",
        timestamp: attemptedAt,
        text: `Attempted ${info.title}`,
        href: leetcodeProblemHref(info.patternSlug)
      });
    }
  }

  // Saved a LeetCode problem note
  for (const [key, updatedAt] of Object.entries(leetcode.problemNotesUpdatedAt)) {
    const info = PROBLEM_BY_KEY.get(key);
    if (!info) continue;
    events.push({
      id: `lc-problem-note:${key}`,
      kind: "leetcode_problem_note",
      timestamp: updatedAt,
      text: `Saved a note on ${info.title}`,
      href: leetcodeProblemHref(info.patternSlug)
    });
  }

  // Saved LeetCode pattern notes
  for (const [patternSlug, updatedAt] of Object.entries(leetcode.patternNotesUpdatedAt)) {
    const name = PATTERN_NAME_BY_SLUG.get(patternSlug);
    if (!name) continue;
    events.push({
      id: `lc-pattern-note:${patternSlug}`,
      kind: "leetcode_pattern_note",
      timestamp: updatedAt,
      text: `Saved pattern notes for ${name}`,
      href: leetcodeProblemHref(patternSlug)
    });
  }

  return events
    .filter((event) => event.timestamp && !Number.isNaN(Date.parse(event.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, limit);
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
