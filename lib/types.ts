export type CheckInSource = "manual" | "note";

export interface Novel {
  id: string;
  title: string;
  author: string;
  tags?: string[];
  createdAt: string;
}

export interface NovelNote {
  id: string;
  novelId: string;
  content: string;
  date: string;
  screenshotDataUrl?: string;
  pinned?: boolean;
  tags?: string[];
  createdAt: string;
}

export interface WordEntry {
  id: string;
  word: string;
  meaning: string;
  context: string;
  novelId?: string;
  date: string;
  createdAt: string;
}

export interface CharacterEntry {
  id: string;
  name: string;
  role: string;
  traits: string;
  novelId?: string;
  date: string;
  createdAt: string;
}

export interface CheckInRecord {
  date: string;
  sources: CheckInSource[];
  createdAt: string;
}

export interface TrackerState {
  novels: Novel[];
  notes: NovelNote[];
  words: WordEntry[];
  characters: CharacterEntry[];
  checkIns: Record<string, CheckInRecord>;
}

export interface StreakSummary {
  current: number;
  longest: number;
  lastCheckInDate: string | null;
}
