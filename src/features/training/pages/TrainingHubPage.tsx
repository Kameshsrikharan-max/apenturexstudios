import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "antd";
import {
  SearchOutlined,
  FireOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  LockOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  BookOutlined,
  ToolOutlined,
  TeamOutlined,
  SafetyOutlined,
  CloseOutlined,
  RightOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  BulbOutlined,
  EditOutlined,
  StarOutlined,
  GiftOutlined,
  ArrowLeftOutlined,
  FileDoneOutlined,
} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import QuizPanel from "../../../components/UI/QuizPanel";
import OverallReportModal from "../../../components/UI/OverallReportModal";
import {
  TRAINING_MODULES,
  BADGES,
  getProgress,
  toggleModuleComplete,
  getXP,
  getLevelInfo,
  getStreak,
  getCategoryStats,
  getEarnedBadges,
  getNextRecommendedModule,
  TRAINING_UPDATED_EVENT,
  type TrainingModule,
} from "../../../utils/trainingStore";
import { getOverallStats, QUIZ_UPDATED_EVENT } from "../../../utils/trainingQuizStore";
import "./TrainingHubPage.css";

const { Content } = Layout;

type CategoryMeta = { color: string; icon: React.ReactNode };

const CATEGORY_META: Record<string, CategoryMeta> = {
  Onboarding: { color: "var(--th-cyan)", icon: <RocketOutlined /> },
  "Photography Techniques": { color: "var(--th-amber)", icon: <BookOutlined /> },
  "Software & Tools": { color: "var(--th-purple)", icon: <ToolOutlined /> },
  "Client Handling": { color: "var(--th-blue)", icon: <TeamOutlined /> },
  "Studio SOPs": { color: "var(--th-teal)", icon: <SafetyOutlined /> },
};

type ExtendedModule = TrainingModule & {
  keyPoints?: string[];
  resources?: { label: string; url: string }[];
};

type ToastItem = {
  id: number;
  kind: "xp" | "level" | "badge" | "complete";
  title: string;
  subtitle?: string;
};

type DrawerTab = "overview" | "keypoints" | "skills" | "notes" | "quiz";

const NOTES_KEY = "axs_training_notes_v1";
const SKILLS_KEY = "axs_training_skillcheck_v1";

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
  } catch {
    /* storage unavailable — fail silently */
  }
}

function generateKeyPoints(mod: TrainingModule): string[] {
  const extended = mod as ExtendedModule;
  if (extended.keyPoints && extended.keyPoints.length) return extended.keyPoints;

  const bySentence = mod.description
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (bySentence.length >= 2) return bySentence.slice(0, 4);

  const byComma = mod.description
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (byComma.length >= 2) return byComma.slice(0, 4);

  return [
    `Understand the core idea behind "${mod.title}".`,
    `Apply it inside real ${mod.category.toLowerCase()} workflows.`,
    `Walk away confident enough to teach it to a teammate.`,
  ];
}

let toastSeq = 0;

export default function TrainingHubPage() {
  const [progress, setProgress] = useState(() => getProgress());
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "path">("list");
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("overview");
  const [scrolled, setScrolled] = useState(false);
  const [showOverallReport, setShowOverallReport] = useState(false);

  const [notes, setNotes] = useState<Record<string, string>>(() => loadJSON(NOTES_KEY, {}));
  const [skillChecks, setSkillChecks] = useState<Record<string, boolean[]>>(() =>
    loadJSON(SKILLS_KEY, {})
  );

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confettiKey, setConfettiKey] = useState(0);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const prevStateRef = useRef<{ xp: number; level: number; badges: number } | null>(null);

  const searchInputRefCallback = (el: HTMLInputElement | null) => {
    searchInputRef.current = el;
  };

  useEffect(() => {
    const sync = () => setProgress(getProgress());
    window.addEventListener(TRAINING_UPDATED_EVENT, sync);
    return () => window.removeEventListener(TRAINING_UPDATED_EVENT, sync);
  }, []);

  // Re-render when a quiz attempt is recorded so the sidebar card / intro
  // screen reflect the latest score right away.
  useEffect(() => {
    const sync = () => setProgress((p) => ({ ...p }));
    window.addEventListener(QUIZ_UPDATED_EVENT, sync);
    return () => window.removeEventListener(QUIZ_UPDATED_EVENT, sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailId(null);
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(TRAINING_MODULES.map((m) => m.category)))],
    []
  );

  const categoryStats = useMemo(() => getCategoryStats(progress), [progress]);
  const completedCount = useMemo(
    () => TRAINING_MODULES.filter((m) => progress[m.id]).length,
    [progress]
  );
  const totalCount = TRAINING_MODULES.length;
  const overallPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const xp = useMemo(() => getXP(progress), [progress]);
  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);
  const streak = useMemo(() => getStreak(progress), [progress]);
  const earnedBadges = useMemo(() => getEarnedBadges(progress), [progress]);
  const earnedIds = useMemo(() => new Set(earnedBadges.map((b) => b.id)), [earnedBadges]);
  const nextModule = useMemo(() => getNextRecommendedModule(progress), [progress]);
  const quizStats = useMemo(() => getOverallStats(), [progress]);

  // Detect XP / level / badge changes to fire toasts + confetti.
  useEffect(() => {
    const prev = prevStateRef.current;
    if (prev) {
      const newToasts: ToastItem[] = [];
      if (levelInfo.level > prev.level) {
        newToasts.push({
          id: ++toastSeq,
          kind: "level",
          title: `Level ${levelInfo.level} reached!`,
          subtitle: "Keep the momentum going.",
        });
        setConfettiKey((k) => k + 1);
      } else if (xp > prev.xp) {
        newToasts.push({
          id: ++toastSeq,
          kind: "xp",
          title: `+${xp - prev.xp} XP`,
        });
      }
      if (earnedBadges.length > prev.badges) {
        const newest = earnedBadges[earnedBadges.length - 1];
        newToasts.push({
          id: ++toastSeq,
          kind: "badge",
          title: "Badge unlocked",
          subtitle: newest?.title,
        });
        setConfettiKey((k) => k + 1);
      }
      if (newToasts.length) {
        setToasts((t) => [...t, ...newToasts]);
        newToasts.forEach((t) => {
          setTimeout(() => {
            setToasts((cur) => cur.filter((c) => c.id !== t.id));
          }, 3800);
        });
      }
    }
    prevStateRef.current = { xp, level: levelInfo.level, badges: earnedBadges.length };
  }, [xp, levelInfo.level, earnedBadges]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return TRAINING_MODULES.filter((m) => {
      const matchesCategory = activeCategory === "All" || m.category === activeCategory;
      const matchesSearch =
        !term ||
        m.title.toLowerCase().includes(term) ||
        m.description.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, activeCategory]);

  const modulesByCategory = useMemo(() => {
    const map: Record<string, TrainingModule[]> = {};
    TRAINING_MODULES.forEach((m) => {
      if (!map[m.category]) map[m.category] = [];
      map[m.category].push(m);
    });
    return map;
  }, []);

  const detailModule: ExtendedModule | null = detailId
    ? (TRAINING_MODULES.find((m) => m.id === detailId) as ExtendedModule) ?? null
    : null;
  const detailDone = detailModule ? !!progress[detailModule.id] : false;
  const detailKeyPoints = useMemo(
    () => (detailModule ? generateKeyPoints(detailModule) : []),
    [detailModule]
  );
  const detailChecks = detailModule ? skillChecks[detailModule.id] ?? [] : [];
  const detailChecksDone = detailChecks.filter(Boolean).length;
  const detailNote = detailModule ? notes[detailModule.id] ?? "" : "";

  const ringStyle = {
    background: `conic-gradient(var(--th-cyan) ${overallPct * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
  };
  const xpBarPct = Math.round((levelInfo.xpIntoLevel / levelInfo.xpForNextLevel) * 100);

  const handleToggle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const wasDone = !!progress[id];
    toggleModuleComplete(id);
    if (!wasDone) setConfettiKey((k) => k + 1);
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    setDrawerTab("overview");
  };

  const toggleSkillCheck = (moduleId: string, index: number, total: number) => {
    setSkillChecks((prev) => {
      const current = prev[moduleId] ? [...prev[moduleId]] : new Array(total).fill(false);
      current[index] = !current[index];
      const next = { ...prev, [moduleId]: current };
      saveJSON(SKILLS_KEY, next);
      return next;
    });
  };

  const updateNote = (moduleId: string, value: string) => {
    setNotes((prev) => {
      const next = { ...prev, [moduleId]: value };
      saveJSON(NOTES_KEY, next);
      return next;
    });
  };

  return (
    <Layout className="dashboard-page dashboard-dark th-page">
      <div className="dashboard-frame">
        <Sidebar dark />
        <Layout className="dashboard-shell th-shell">
          <Content className="dashboard-content th-content">
            <div className="training-hub-page">
              <ConfettiBurst trigger={confettiKey} />
              <ToastStack toasts={toasts} />

              <div className={`th-header ${scrolled ? "is-compact" : ""}`}>
                <div className="th-header-text">
                  <span className="th-eyebrow">Team Growth</span>
                  <h1>Training Hub</h1>
                  <p>
                    Work through modules at your own pace — every completed one adds to your
                    level and keeps your streak alive.
                  </p>
                </div>

                <div className="th-stat-pills">
                  <span className="th-stat-pill th-stat-pill-level">
                    <TrophyOutlined /> Level {levelInfo.level}
                  </span>
                  <span className="th-stat-pill">
                    <ThunderboltOutlined /> {xp} XP
                  </span>
                  {streak > 0 && (
                    <span className="th-stat-pill th-stat-pill-streak">
                      <FireOutlined /> {streak}-day streak
                    </span>
                  )}
                </div>
              </div>

              <div className="th-toolbar">
                <div className="th-search">
                  <SearchOutlined />
                  <input
                    ref={searchInputRefCallback}
                    type="text"
                    placeholder="Search modules... (press /)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="th-category-filters">
                  {categories.map((cat) => {
                    const stat = cat === "All" ? null : categoryStats[cat];
                    const color = cat === "All" ? "var(--th-cyan)" : CATEGORY_META[cat]?.color;
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`th-category-chip ${activeCategory === cat ? "is-active" : ""}`}
                        style={{ ["--th-chip-color" as string]: color }}
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat !== "All" ? CATEGORY_META[cat]?.icon : <RocketOutlined />}
                        {cat}
                        {stat && <em>{stat.done}/{stat.total}</em>}
                      </button>
                    );
                  })}
                </div>

                <div className="th-view-toggle" role="tablist" aria-label="View mode">
                  <button
                    type="button"
                    className={viewMode === "list" ? "is-active" : ""}
                    onClick={() => setViewMode("list")}
                  >
                    <AppstoreOutlined /> List
                  </button>
                  <button
                    type="button"
                    className={viewMode === "path" ? "is-active" : ""}
                    onClick={() => setViewMode("path")}
                  >
                    <BranchesOutlined /> Path
                  </button>
                </div>

                {nextModule ? (
                  <button
                    type="button"
                    className="th-continue-btn"
                    onClick={() => openDetail(nextModule.id)}
                  >
                    Continue: {nextModule.title} <RightOutlined />
                  </button>
                ) : (
                  <span className="th-all-done-pill">
                    <CheckCircleFilled /> All modules complete
                  </span>
                )}
              </div>

              <div className="th-layout">
                <div className="th-main-card">
                  <div className="th-main-head">
                    <h3>Modules</h3>
                    <span>
                      {completedCount}/{totalCount} complete
                    </span>
                  </div>

                  {viewMode === "list" ? (
                    filtered.length === 0 ? (
                      <p className="th-empty">No modules match your search.</p>
                    ) : (
                      <div className="th-module-list">
                        {filtered.map((mod, i) => {
                          const done = !!progress[mod.id];
                          const meta = CATEGORY_META[mod.category];
                          const isNext = nextModule?.id === mod.id;
                          return (
                            <button
                              type="button"
                              key={mod.id}
                              className={`th-module-row ${done ? "is-done" : ""} ${
                                isNext ? "is-next" : ""
                              }`}
                              style={{
                                ["--th-chip-color" as string]: meta?.color,
                                animationDelay: `${Math.min(i, 12) * 35}ms`,
                              }}
                              onClick={() => openDetail(mod.id)}
                            >
                              <span className="th-module-icon">{meta?.icon}</span>
                              <span className="th-module-info">
                                <span className="th-module-title">
                                  {mod.title}
                                  {isNext && !done && <span className="th-next-tag">Up next</span>}
                                </span>
                                <span className="th-module-meta">
                                  {mod.category} · <ClockCircleOutlined /> {mod.durationMins} min
                                </span>
                              </span>
                              <span
                                className={`th-module-toggle ${done ? "is-done" : ""}`}
                                onClick={(e) => handleToggle(e, mod.id)}
                                role="button"
                                aria-label={done ? "Mark incomplete" : "Mark complete"}
                              >
                                <CheckCircleFilled />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <PathView
                      modulesByCategory={modulesByCategory}
                      progress={progress}
                      nextModuleId={nextModule?.id ?? null}
                      onOpen={openDetail}
                      onToggle={handleToggle}
                    />
                  )}
                </div>

                <div className="th-side">
                  <div className="th-progress-card">
                    <h3>Overall progress</h3>
                    <div className="th-stats-row">
                      <div className="th-ring" style={ringStyle}>
                        <div className="th-ring-inner">
                          <strong>{overallPct}%</strong>
                          <span>complete</span>
                        </div>
                      </div>
                      <div className="th-progress-text">
                        <div className="th-summary-row">
                          <span>Modules done</span>
                          <strong>{completedCount}/{totalCount}</strong>
                        </div>
                        <div className="th-summary-row">
                          <span>Level {levelInfo.level}</span>
                          <strong>{levelInfo.xpIntoLevel}/{levelInfo.xpForNextLevel} XP</strong>
                        </div>
                      </div>
                    </div>
                    <div className="th-xp-bar">
                      <div className="th-xp-bar-fill" style={{ width: `${xpBarPct}%` }} />
                    </div>
                  </div>

                  <div className="th-category-card">
                    <h3>
                      <FileDoneOutlined /> Quiz Performance
                    </h3>
                    <div className="th-summary-row">
                      <span>Attempted</span>
                      <strong>
                        {quizStats.attemptedModules}/{quizStats.totalModulesWithQuiz}
                      </strong>
                    </div>
                    <div className="th-summary-row">
                      <span>Average score</span>
                      <strong>{quizStats.averagePercentage}%</strong>
                    </div>
                    <div className="th-summary-row">
                      <span>Passed</span>
                      <strong>{quizStats.passedModules}</strong>
                    </div>
                    <button
                      type="button"
                      className="th-continue-btn"
                      style={{ marginTop: 12, marginLeft: 0, width: "100%", justifyContent: "center" }}
                      onClick={() => setShowOverallReport(true)}
                    >
                      View full report <RightOutlined />
                    </button>
                  </div>

                  <div className="th-badges-card">
                    <h3>
                      <TrophyOutlined /> Badges
                    </h3>
                    <div className="th-badges-list">
                      {BADGES.map((badge) => {
                        const earned = earnedIds.has(badge.id);
                        return (
                          <div
                            key={badge.id}
                            className={`th-badge-item ${earned ? "is-earned" : "is-locked"}`}
                          >
                            <span className="th-badge-icon">
                              {earned ? <TrophyOutlined /> : <LockOutlined />}
                            </span>
                            <span className="th-badge-text">
                              <strong>{badge.title}</strong>
                              <small>{badge.description}</small>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="th-category-card">
                    <h3>By category</h3>
                    <div className="th-category-bars">
                      {Object.entries(categoryStats).map(([cat, stat]) => {
                        const pct = stat.total ? Math.round((stat.done / stat.total) * 100) : 0;
                        const color = CATEGORY_META[cat]?.color ?? "var(--th-cyan)";
                        return (
                          <div className="th-category-bar-row" key={cat}>
                            <div className="th-category-bar-label">
                              <span>{cat}</span>
                              <span>{stat.done}/{stat.total}</span>
                            </div>
                            <div className="th-category-bar-track">
                              <div
                                className="th-category-bar-fill"
                                style={{ width: `${pct}%`, background: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Content>
        </Layout>
      </div>

      {detailModule && (
        <div className="th-drawer-overlay" onMouseDown={() => setDetailId(null)}>
          <div className="th-drawer" onMouseDown={(e) => e.stopPropagation()}>
            <div className="th-drawer-head">
              <button
                type="button"
                className="th-drawer-back"
                onClick={() => setDetailId(null)}
                aria-label="Close"
              >
                <ArrowLeftOutlined />
              </button>
              <span
                className="th-drawer-category"
                style={{ color: CATEGORY_META[detailModule.category]?.color }}
              >
                {CATEGORY_META[detailModule.category]?.icon} {detailModule.category}
              </span>
              <button type="button" className="th-drawer-close" onClick={() => setDetailId(null)} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>

            <h2 className="th-drawer-title">{detailModule.title}</h2>
            <div className="th-drawer-meta-row">
              <span><ClockCircleOutlined /> {detailModule.durationMins} min</span>
              <span><StarOutlined /> ~{Math.max(10, detailModule.durationMins * 2)} XP</span>
              {detailDone && (
                <span className="th-drawer-done-tag">
                  <CheckCircleFilled /> Completed
                </span>
              )}
            </div>

            <div className="th-drawer-tabs" role="tablist">
              {(
                [
                  { key: "overview", label: "Overview", icon: <BulbOutlined /> },
                  { key: "keypoints", label: "Key points", icon: <BookOutlined /> },
                  { key: "skills", label: "Skill check", icon: <CheckCircleOutlined /> },
                  { key: "quiz", label: "Quiz", icon: <FileDoneOutlined /> },
                  { key: "notes", label: "My notes", icon: <EditOutlined /> },
                ] as { key: DrawerTab; label: string; icon: React.ReactNode }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={drawerTab === tab.key ? "is-active" : ""}
                  onClick={() => setDrawerTab(tab.key)}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="th-drawer-body">
              {drawerTab === "overview" && (
                <div className="th-drawer-pane">
                  <p>{detailModule.description}</p>
                  <div className="th-drawer-callout">
                    <BulbOutlined />
                    <span>
                      This module is part of <strong>{detailModule.category}</strong>. Finishing
                      it moves you closer to the next badge and keeps your streak alive.
                    </span>
                  </div>
                </div>
              )}

              {drawerTab === "keypoints" && (
                <div className="th-drawer-pane">
                  <ol className="th-keypoints-list">
                    {detailKeyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ol>
                </div>
              )}

              {drawerTab === "skills" && (
                <div className="th-drawer-pane">
                  <p className="th-skills-intro">
                    Check off what you can confidently do after this module.
                  </p>
                  <div className="th-skills-progress">
                    <div className="th-skills-progress-track">
                      <div
                        className="th-skills-progress-fill"
                        style={{
                          width: `${
                            detailKeyPoints.length
                              ? Math.round((detailChecksDone / detailKeyPoints.length) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span>
                      {detailChecksDone}/{detailKeyPoints.length}
                    </span>
                  </div>
                  <div className="th-skills-list">
                    {detailKeyPoints.map((point, i) => {
                      const checked = !!detailChecks[i];
                      return (
                        <label key={i} className={`th-skill-item ${checked ? "is-checked" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleSkillCheck(detailModule.id, i, detailKeyPoints.length)
                            }
                          />
                          <span className="th-skill-box">
                            {checked && <CheckCircleFilled />}
                          </span>
                          <span>{point}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {drawerTab === "quiz" && (
                <div className="th-drawer-pane">
                  <QuizPanel moduleId={detailModule.id} moduleTitle={detailModule.title} />
                </div>
              )}

              {drawerTab === "notes" && (
                <div className="th-drawer-pane">
                  <textarea
                    className="th-notes-area"
                    placeholder="Jot down anything worth remembering from this module..."
                    value={detailNote}
                    onChange={(e) => updateNote(detailModule.id, e.target.value)}
                    rows={8}
                  />
                  <span className="th-notes-hint">Saved automatically on this device.</span>
                </div>
              )}
            </div>

            <div className="th-drawer-footer">
              <button type="button" className="th-secondary-button" onClick={() => setDetailId(null)}>
                Close
              </button>
              <button
                type="button"
                className={`th-primary-button ${detailDone ? "is-done" : ""}`}
                onClick={(e) => handleToggle(e as unknown as React.MouseEvent, detailModule.id)}
              >
                {detailDone ? <CheckCircleFilled /> : null}
                {detailDone ? "Completed" : "Mark complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOverallReport && (
        <OverallReportModal onClose={() => setShowOverallReport(false)} />
      )}
    </Layout>
  );
}

function PathView({
  modulesByCategory,
  progress,
  nextModuleId,
  onOpen,
  onToggle,
}: {
  modulesByCategory: Record<string, TrainingModule[]>;
  progress: Record<string, boolean>;
  nextModuleId: string | null;
  onOpen: (id: string) => void;
  onToggle: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <div className="th-path-view">
      {Object.entries(modulesByCategory).map(([cat, mods]) => {
        const meta = CATEGORY_META[cat];
        return (
          <div className="th-path-lane" key={cat}>
            <div className="th-path-lane-label" style={{ color: meta?.color }}>
              {meta?.icon} {cat}
            </div>
            <div className="th-path-track">
              {mods.map((mod, i) => {
                const done = !!progress[mod.id];
                const isNext = mod.id === nextModuleId;
                return (
                  <div className="th-path-node-wrap" key={mod.id}>
                    {i > 0 && (
                      <span
                        className={`th-path-connector ${
                          done || !!progress[mods[i - 1].id] ? "is-lit" : ""
                        }`}
                      />
                    )}
                    <button
                      type="button"
                      className={`th-path-node ${done ? "is-done" : ""} ${
                        isNext ? "is-next" : ""
                      }`}
                      style={{ ["--th-chip-color" as string]: meta?.color }}
                      onClick={() => onOpen(mod.id)}
                      title={mod.title}
                    >
                      {done ? (
                        <CheckCircleFilled />
                      ) : (
                        <span className="th-path-node-index">{i + 1}</span>
                      )}
                    </button>
                    <div className="th-path-node-caption">
                      <span className="th-path-node-title">{mod.title}</span>
                      <span
                        className="th-path-node-toggle"
                        onClick={(e) => onToggle(e, mod.id)}
                        role="button"
                        aria-label={done ? "Mark incomplete" : "Mark complete"}
                      >
                        {done ? "Undo" : "Complete"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConfettiBurst({ trigger }: { trigger: number }) {
  const colors = ["#38d5ff", "#4ade80", "#fac775", "#a78bfa", "#60a5fa", "#2dd4bf"];
  const pieces = useMemo(() => {
    if (!trigger) return [];
    return Array.from({ length: 26 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      duration: 1.5 + Math.random() * 0.9,
      color: colors[i % colors.length],
      rotate: Math.round(Math.random() * 360),
      drift: Math.round((Math.random() - 0.5) * 180),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (!trigger || pieces.length === 0) return null;

  return (
    <div className="th-confetti-layer" key={trigger} aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="th-confetti-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: p.color,
            ["--th-confetti-rotate" as string]: `${p.rotate}deg`,
            ["--th-confetti-drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (!toasts.length) return null;
  return (
    <div className="th-toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`th-toast th-toast-${t.kind}`}>
          <span className="th-toast-icon">
            {t.kind === "level" && <RocketOutlined />}
            {t.kind === "xp" && <ThunderboltOutlined />}
            {t.kind === "badge" && <GiftOutlined />}
            {t.kind === "complete" && <CheckCircleFilled />}
          </span>
          <span className="th-toast-text">
            <strong>{t.title}</strong>
            {t.subtitle && <small>{t.subtitle}</small>}
          </span>
        </div>
      ))}
    </div>
  );
}