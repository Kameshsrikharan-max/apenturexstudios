import { TRAINING_MODULES, type TrainingModule } from "./trainingStore";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string; // shown to the user whether they got it right or wrong
}

export interface QuizAnswerRecord {
  questionId: string;
  question: string;
  selectedOptionId: string | null;
  selectedText: string;
  correctOptionId: string;
  correctText: string;
  correct: boolean;
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  moduleId: string;
  date: string; // ISO timestamp
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  answers: QuizAnswerRecord[];
}

export const PASS_PERCENTAGE = 70;
export const QUESTIONS_PER_MODULE = 10;
export const QUIZ_UPDATED_EVENT = "axs-training-quiz-updated";

const ATTEMPTS_KEY = "axs_training_quiz_attempts_v1";

/* ------------------------------------------------------------------ */
/* Manual overrides (optional)                                         */
/* ------------------------------------------------------------------ */

/**
 * Keyed by TrainingModule.id. If you write real, hand-crafted questions
 * for a module here, they are used INSTEAD of the auto-generated quiz
 * below. Anything not listed here still gets a working 10-question quiz
 * automatically — you don't have to fill this in for the app to work.
 */
export const QUIZ_BANK: Record<string, QuizQuestion[]> = {
  "onboarding-1": [
    {
      id: "q1",
      question: "What is the main goal of the onboarding module?",
      options: [
        { id: "a", text: "To sell more camera gear" },
        { id: "b", text: "To get new team members comfortable with AXS basics" },
        { id: "c", text: "To edit client photos" },
        { id: "d", text: "To manage studio finances" },
      ],
      correctOptionId: "b",
      explanation:
        "Onboarding exists to get new team members comfortable with the core AXS workflow before they touch real client work.",
    },
    // 
  ],
};

/* ------------------------------------------------------------------ */
/* Auto-generated quiz engine                                          */
/* ------------------------------------------------------------------ */

function splitDescription(desc: string): string[] {
  const bySentence = desc
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (bySentence.length >= 2) return bySentence;

  const byComma = desc
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (byComma.length >= 2) return byComma;

  return [desc];
}

// Deterministic per-module "randomness" so the same module always gets the
// same generated quiz across sessions/retakes, but different modules differ.
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function mulberry32(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORY_SCENARIOS: Record<string, { scenario: string; audience: string }> = {
  Onboarding: {
    scenario: "orienting a brand-new team member during their first week",
    audience: "New hires joining the studio",
  },
  "Photography Techniques": {
    scenario: "improving shot composition and lighting on a live shoot",
    audience: "Photographers who want sharper technical skills",
  },
  "Software & Tools": {
    scenario: "working more efficiently inside AXS during day-to-day operations",
    audience: "Anyone who uses the AXS dashboard daily",
  },
  "Client Handling": {
    scenario: "communicating clearly with a client during a booking or shoot",
    audience: "Front-desk staff and client-facing team members",
  },
  "Studio SOPs": {
    scenario: "following the studio's standard procedures correctly and consistently",
    audience: "Everyone responsible for maintaining studio standards",
  },
};
const DEFAULT_SCENARIO = {
  scenario: "applying what was covered to everyday studio work",
  audience: "Team members working in this area of the studio",
};

function generateModuleQuiz(mod: TrainingModule): QuizQuestion[] {
  const rng = mulberry32(hashString(mod.id));
  const shuffleSeeded = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const otherModules = TRAINING_MODULES.filter((m) => m.id !== mod.id);
  const allCategories = Array.from(new Set(TRAINING_MODULES.map((m) => m.category)));
  const points = splitDescription(mod.description).slice(0, 6);

  let qn = 0;
  const nextId = () => `auto-${mod.id}-q${++qn}`;

  const makeMCQ = (
    question: string,
    correctText: string,
    distractors: string[],
    explanation: string
  ): QuizQuestion => {
    const uniqueDistractors = Array.from(new Set(distractors.filter((d) => d && d !== correctText)));
    const optionTexts = shuffleSeeded([correctText, ...uniqueDistractors.slice(0, 3)]);
    const ids = ["a", "b", "c", "d"];
    const options = optionTexts.map((text, i) => ({ id: ids[i], text }));
    const correctOptionId = options.find((o) => o.text === correctText)!.id;
    return { id: nextId(), question, options, correctOptionId, explanation };
  };

  const questions: QuizQuestion[] = [];

  // Q1 — category
  questions.push(
    makeMCQ(
      `Which category does the "${mod.title}" module belong to?`,
      mod.category,
      shuffleSeeded(allCategories.filter((c) => c !== mod.category)).slice(0, 3),
      `"${mod.title}" is filed under ${mod.category} — knowing the category helps you find related modules later.`
    )
  );

  // Q2 — duration
  questions.push(
    makeMCQ(
      `About how long does "${mod.title}" take to complete?`,
      `${mod.durationMins} min`,
      [mod.durationMins + 5, Math.max(1, mod.durationMins - 5), mod.durationMins + 10].map(
        (d) => `${d} min`
      ),
      `This module is designed to take roughly ${mod.durationMins} minutes.`
    )
  );

  // Q3–Q7 — up to 5 questions drawn from the module's own description
  points.slice(0, 5).forEach((point) => {
    const distractorPool = shuffleSeeded(otherModules)
      .slice(0, 6)
      .flatMap((m) => splitDescription(m.description))
      .filter((p) => p && p !== point);
    questions.push(
      makeMCQ(
        `Which of these is covered in "${mod.title}"?`,
        point,
        shuffleSeeded(distractorPool).slice(0, 3),
        `"${mod.title}" covers: ${point}`
      )
    );
  });

  // Fill remaining slots with category-aware questions so every module
  // reaches exactly QUESTIONS_PER_MODULE questions.
  const scenario = CATEGORY_SCENARIOS[mod.category] ?? DEFAULT_SCENARIO;
  const otherScenarios = Object.values(CATEGORY_SCENARIOS).filter(
    (s) => s.scenario !== scenario.scenario
  );

  const fillerBank: { q: string; correct: string; distractors: string[]; explanation: string }[] = [
    {
      q: `What real-world situation does "${mod.title}" best prepare you for?`,
      correct: scenario.scenario,
      distractors: otherScenarios.map((s) => s.scenario),
      explanation: `As a ${mod.category} module, "${mod.title}" is most useful when ${scenario.scenario}.`,
    },
    {
      q: `Who benefits most from completing "${mod.title}"?`,
      correct: scenario.audience,
      distractors: otherScenarios.map((s) => s.audience),
      explanation: `${scenario.audience} get the most direct value from this module.`,
    },
    {
      q: `What's the best next step right after finishing "${mod.title}"?`,
      correct: "Mark it complete and apply what you learned on a real task",
      distractors: [
        "Immediately forget about it",
        "Skip straight to an unrelated module",
        "Wait a few months before using it",
      ],
      explanation: "Training sticks best when you apply it soon after finishing the module.",
    },
    {
      q: `Why does "${mod.title}" matter for the studio as a whole?`,
      correct: `It keeps everyone consistent in how ${mod.category.toLowerCase()} is handled`,
      distractors: [
        "It has no real impact on daily operations",
        "It only matters for management, not the team",
        "It replaces the need for any other training",
      ],
      explanation: `Consistency across the team in ${mod.category.toLowerCase()} is exactly what this module supports.`,
    },
    {
      q: `If you were teaching "${mod.title}" to a teammate, what would you emphasize first?`,
      correct: points[0] ?? mod.description,
      distractors: shuffleSeeded(otherModules)
        .slice(0, 3)
        .map((m) => splitDescription(m.description)[0] ?? m.title),
      explanation: `The clearest starting point for "${mod.title}" is: ${points[0] ?? mod.description}`,
    },
  ];

  let fillerIndex = 0;
  while (questions.length < QUESTIONS_PER_MODULE && fillerIndex < fillerBank.length) {
    const f = fillerBank[fillerIndex++];
    questions.push(makeMCQ(f.q, f.correct, f.distractors, f.explanation));
  }

  return questions.slice(0, QUESTIONS_PER_MODULE);
}

/* ------------------------------------------------------------------ */
/* Local storage helpers                                               */
/* ------------------------------------------------------------------ */

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(QUIZ_UPDATED_EVENT));
  } catch {
    /* storage unavailable — fail silently */
  }
}

type AttemptStore = Record<string, QuizAttempt[]>;

function getStore(): AttemptStore {
  return loadJSON<AttemptStore>(ATTEMPTS_KEY, {});
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/** True whenever the module exists — every real module now gets a quiz. */
export function hasQuiz(moduleId: string): boolean {
  return TRAINING_MODULES.some((m) => m.id === moduleId);
}

/** Manual QUIZ_BANK entry wins if present; otherwise auto-generate one. */
export function getModuleQuiz(moduleId: string): QuizQuestion[] {
  if (QUIZ_BANK[moduleId]?.length) return QUIZ_BANK[moduleId];
  const mod = TRAINING_MODULES.find((m) => m.id === moduleId);
  return mod ? generateModuleQuiz(mod) : [];
}

export function getAttempts(moduleId: string): QuizAttempt[] {
  return getStore()[moduleId] ?? [];
}

export function getAllAttempts(): AttemptStore {
  return getStore();
}

export function getBestAttempt(moduleId: string): QuizAttempt | null {
  const attempts = getAttempts(moduleId);
  if (!attempts.length) return null;
  return attempts.reduce((best, a) => (a.percentage > best.percentage ? a : best), attempts[0]);
}

export function getLatestAttempt(moduleId: string): QuizAttempt | null {
  const attempts = getAttempts(moduleId);
  return attempts.length ? attempts[attempts.length - 1] : null;
}

let attemptSeq = 0;

/** Scores the quiz, saves the attempt to history, and returns it. */
export function recordAttempt(
  moduleId: string,
  selections: Record<string, string | null>
): QuizAttempt {
  const questions = getModuleQuiz(moduleId);

  const answers: QuizAnswerRecord[] = questions.map((q) => {
    const selectedOptionId = selections[q.id] ?? null;
    const selectedOption = q.options.find((o) => o.id === selectedOptionId);
    const correctOption = q.options.find((o) => o.id === q.correctOptionId);
    return {
      questionId: q.id,
      question: q.question,
      selectedOptionId,
      selectedText: selectedOption?.text ?? "Not answered",
      correctOptionId: q.correctOptionId,
      correctText: correctOption?.text ?? "",
      correct: selectedOptionId === q.correctOptionId,
      explanation: q.explanation,
    };
  });

  const score = answers.filter((a) => a.correct).length;
  const total = questions.length || QUESTIONS_PER_MODULE;
  const percentage = total ? Math.round((score / total) * 100) : 0;

  const attempt: QuizAttempt = {
    id: `${moduleId}-${Date.now()}-${++attemptSeq}`,
    moduleId,
    date: new Date().toISOString(),
    score,
    total,
    percentage,
    passed: percentage >= PASS_PERCENTAGE,
    answers,
  };

  const store = getStore();
  store[moduleId] = [...(store[moduleId] ?? []), attempt];
  saveJSON(ATTEMPTS_KEY, store);
  return attempt;
}

export function clearModuleAttempts(moduleId: string) {
  const store = getStore();
  delete store[moduleId];
  saveJSON(ATTEMPTS_KEY, store);
}

/* ------------------------------------------------------------------ */
/* Overall / cross-module reporting                                    */
/* ------------------------------------------------------------------ */

export interface ModuleQuizStat {
  moduleId: string;
  title: string;
  category: string;
  attempted: boolean;
  bestPercentage: number;
  latestPercentage: number;
  passed: boolean;
  attemptsCount: number;
  weakPoints: string[]; // explanations for the most recent attempt's wrong answers
}

export interface OverallQuizStats {
  totalModulesWithQuiz: number;
  attemptedModules: number;
  averagePercentage: number;
  overallScore: number;
  overallTotal: number;
  passedModules: number;
  moduleStats: ModuleQuizStat[];
  weakModules: ModuleQuizStat[];
}

export function getOverallStats(): OverallQuizStats {
  // Every module now has a quiz (manual or auto-generated).
  const moduleStats: ModuleQuizStat[] = TRAINING_MODULES.map((mod) => {
    const attempts = getAttempts(mod.id);
    const best = getBestAttempt(mod.id);
    const latest = getLatestAttempt(mod.id);
    const weakPoints = latest ? latest.answers.filter((a) => !a.correct).map((a) => a.explanation) : [];

    return {
      moduleId: mod.id,
      title: mod.title,
      category: mod.category,
      attempted: attempts.length > 0,
      bestPercentage: best?.percentage ?? 0,
      latestPercentage: latest?.percentage ?? 0,
      passed: !!latest?.passed,
      attemptsCount: attempts.length,
      weakPoints,
    };
  });

  const attempted = moduleStats.filter((m) => m.attempted);

  const overallScore = attempted.reduce((sum, m) => sum + (getLatestAttempt(m.moduleId)?.score ?? 0), 0);
  const overallTotal = attempted.reduce((sum, m) => sum + (getLatestAttempt(m.moduleId)?.total ?? 0), 0);
  const averagePercentage = attempted.length
    ? Math.round(attempted.reduce((s, m) => s + m.latestPercentage, 0) / attempted.length)
    : 0;

  return {
    totalModulesWithQuiz: moduleStats.length,
    attemptedModules: attempted.length,
    averagePercentage,
    overallScore,
    overallTotal,
    passedModules: attempted.filter((m) => m.passed).length,
    moduleStats,
    weakModules: attempted.filter((m) => !m.passed),
  };
}