export interface TrainingModule {
  id: string;
  category: string;
  title: string;
  description: string;
  durationMins: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  check: (stats: { completedCount: number; totalCount: number; streak: number; categoryStats: Record<string, { total: number; done: number }> }) => boolean;
}

// moduleId -> ISO completion timestamp
export type CompletionMap = Record<string, string>;

const PROGRESS_KEY = "axs_training_progress";
export const TRAINING_UPDATED_EVENT = "axs-training-updated";

const XP_PER_MINUTE = 10;
const XP_PER_LEVEL = 300;

export const TRAINING_MODULES: TrainingModule[] = [
  { id: "ob-1", category: "Onboarding", title: "Studio Workflow Overview", description: "How an event moves from enquiry to closure inside AXS.", durationMins: 12 },
  { id: "ob-2", category: "Onboarding", title: "Using the Command Palette", description: "Navigate AXS fast with ⌘K / Ctrl+K shortcuts.", durationMins: 5 },
  { id: "pt-1", category: "Photography Techniques", title: "Golden Hour Shooting", description: "Reading the Golden Hour panel to time outdoor shoots.", durationMins: 15 },
  { id: "pt-2", category: "Photography Techniques", title: "Wedding Coverage Checklist", description: "Must-get shots for Indian wedding ceremonies.", durationMins: 20 },
  { id: "sw-1", category: "Software & Tools", title: "Template Editor Basics", description: "Building an album layout with drag/resize/rotate text boxes.", durationMins: 18 },
  { id: "sw-2", category: "Software & Tools", title: "Media Library & Culling", description: "Uploading, tagging, and organizing shoot media.", durationMins: 10 },
  { id: "cl-1", category: "Client Handling", title: "Handling Payment Conversations", description: "Recording payments and communicating balances clearly.", durationMins: 8 },
  { id: "cl-2", category: "Client Handling", title: "Enquiry to Booking", description: "Converting an enquiry into a confirmed event.", durationMins: 10 },
  { id: "so-1", category: "Studio SOPs", title: "Event Closure Checklist", description: "What must be completed before marking an event closed.", durationMins: 7 },
  { id: "so-2", category: "Studio SOPs", title: "Delete & Registration Requests", description: "How approval workflows work for sensitive actions.", durationMins: 9 },
];

export const BADGES: Badge[] = [
  {
    id: "first-step",
    title: "First Steps",
    description: "Complete your first training module",
    check: (s) => s.completedCount >= 1,
  },
  {
    id: "halfway",
    title: "Halfway There",
    description: "Complete 50% of all modules",
    check: (s) => s.completedCount / s.totalCount >= 0.5,
  },
  {
    id: "champion",
    title: "Training Champion",
    description: "Complete every module in the hub",
    check: (s) => s.completedCount === s.totalCount,
  },
  {
    id: "streak-3",
    title: "On a Roll",
    description: "Maintain a 3-day learning streak",
    check: (s) => s.streak >= 3,
  },
  {
    id: "category-master",
    title: "Category Master",
    description: "Finish every module in at least one category",
    check: (s) => Object.values(s.categoryStats).some((c) => c.total > 0 && c.done === c.total),
  },
];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T/;

// Older builds of this store (and any hand-edited/corrupted localStorage)
// could have non-string or non-ISO values sitting under a module id. Rather
// than let every consumer defend against that individually, normalize once
// here: valid ISO strings pass through untouched, anything else (booleans,
// numbers, malformed strings) is treated as "completed just now" so it
// still counts toward progress/XP without crashing downstream date logic.
function sanitizeProgress(raw: unknown): CompletionMap {
  if (!raw || typeof raw !== "object") return {};
  const clean: CompletionMap = {};
  let needsRewrite = false;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && ISO_DATE_RE.test(value)) {
      clean[id] = value;
    } else if (value) {
      clean[id] = new Date().toISOString();
      needsRewrite = true;
    }
  }
  if (needsRewrite) writeProgress(clean);
  return clean;
}

function readProgress(): CompletionMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : {};
  } catch (err) {
    console.error("trainingStore: failed to read localStorage", err);
    return {};
  }
}

function writeProgress(progress: CompletionMap) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent(TRAINING_UPDATED_EVENT, { detail: progress }));
  } catch (err) {
    console.error("trainingStore: failed to write localStorage", err);
  }
}

export function getProgress(): CompletionMap {
  return readProgress();
}

export function isModuleDone(progress: CompletionMap, moduleId: string): boolean {
  return !!progress[moduleId];
}

// Toggles completion; returns the updated map
export function toggleModuleComplete(moduleId: string): CompletionMap {
  const progress = readProgress();
  if (progress[moduleId]) {
    delete progress[moduleId];
  } else {
    progress[moduleId] = new Date().toISOString();
  }
  writeProgress(progress);
  return progress;
}

export function getCompletedCount(progress: CompletionMap): number {
  return TRAINING_MODULES.filter((m) => progress[m.id]).length;
}

export function getXP(progress: CompletionMap): number {
  return TRAINING_MODULES.reduce(
    (sum, m) => (progress[m.id] ? sum + m.durationMins * XP_PER_MINUTE : sum),
    0
  );
}

export function getLevelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;
  const pct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100);
  return { level, xpIntoLevel, xpForNextLevel: XP_PER_LEVEL, pct };
}

// Consecutive-day streak, counting back from today (or yesterday if nothing done today yet)
export function getStreak(progress: CompletionMap): number {
  const days = Array.from(
    new Set(
      Object.values(progress)
        .filter((iso): iso is string => typeof iso === "string" && ISO_DATE_RE.test(iso))
        .map((iso) => iso.split("T")[0])
    )
  ).sort((a, b) => (a < b ? 1 : -1)); // descending

  if (days.length === 0) return 0;

  const toDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let cursor = new Date(today);

  // allow the streak to still count if today has no entry yet but yesterday does
  if (days[0] !== today.toISOString().split("T")[0]) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (days[0] !== yesterday.toISOString().split("T")[0]) {
      return 0;
    }
    cursor = yesterday;
  }

  for (const day of days) {
    const dayDate = toDate(day);
    if (dayDate.getTime() === cursor.getTime()) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (dayDate.getTime() < cursor.getTime()) {
      break;
    }
  }

  return streak;
}

export function getCategoryStats(progress: CompletionMap): Record<string, { total: number; done: number }> {
  const stats: Record<string, { total: number; done: number }> = {};
  TRAINING_MODULES.forEach((m) => {
    stats[m.category] = stats[m.category] || { total: 0, done: 0 };
    stats[m.category].total += 1;
    if (progress[m.id]) stats[m.category].done += 1;
  });
  return stats;
}

export function getEarnedBadges(progress: CompletionMap): Badge[] {
  const completedCount = getCompletedCount(progress);
  const stats = {
    completedCount,
    totalCount: TRAINING_MODULES.length,
    streak: getStreak(progress),
    categoryStats: getCategoryStats(progress),
  };
  return BADGES.filter((b) => b.check(stats));
}

export function getNextRecommendedModule(progress: CompletionMap): TrainingModule | null {
  return TRAINING_MODULES.find((m) => !progress[m.id]) || null;
}