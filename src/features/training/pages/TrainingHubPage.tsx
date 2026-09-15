import { useEffect, useMemo, useState } from "react";
import { Layout } from "antd";
import {
  SearchOutlined,
  FireOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  LockOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  RocketOutlined,
  BookOutlined,
  ToolOutlined,
  TeamOutlined,
  SafetyOutlined,
  CloseOutlined,
  RightOutlined,
} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
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

export default function TrainingHubPage() {
  const [progress, setProgress] = useState(() => getProgress());
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setProgress(getProgress());
    window.addEventListener(TRAINING_UPDATED_EVENT, sync);
    return () => window.removeEventListener(TRAINING_UPDATED_EVENT, sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
  const earnedIds = useMemo(
    () => new Set(getEarnedBadges(progress).map((b) => b.id)),
    [progress]
  );
  const nextModule = useMemo(() => getNextRecommendedModule(progress), [progress]);

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

  const detailModule: TrainingModule | null = detailId
    ? TRAINING_MODULES.find((m) => m.id === detailId) ?? null
    : null;
  const detailDone = detailModule ? !!progress[detailModule.id] : false;

  const ringStyle = {
    background: `conic-gradient(var(--th-cyan) ${overallPct * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
  };
  const xpBarPct = Math.round((levelInfo.xpIntoLevel / levelInfo.xpForNextLevel) * 100);

  const handleToggle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleModuleComplete(id);
  };

  return (
    <Layout className="dashboard-page dashboard-dark th-page">
      <div className="dashboard-frame">
        <Sidebar dark />
        <Layout className="dashboard-shell th-shell">
          <Content className="dashboard-content th-content">
            <div className="training-hub-page">
              <div className="th-header">
                <div className="th-header-text">
                  <span className="th-eyebrow">Team Growth</span>
                  <h1>Training Hub</h1>
                  <p>
                    Work through modules at your own pace — every completed one adds to your
                    level and keeps your streak alive.
                  </p>
                </div>

                <div className="th-stat-pills">
                  <span className="th-stat-pill">
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
                    type="text"
                    placeholder="Search modules..."
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

                {nextModule ? (
                  <button
                    type="button"
                    className="th-continue-btn"
                    onClick={() => setDetailId(nextModule.id)}
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

                  {filtered.length === 0 ? (
                    <p className="th-empty">No modules match your search.</p>
                  ) : (
                    <div className="th-module-list">
                      {filtered.map((mod) => {
                        const done = !!progress[mod.id];
                        const meta = CATEGORY_META[mod.category];
                        return (
                          <button
                            type="button"
                            key={mod.id}
                            className={`th-module-row ${done ? "is-done" : ""}`}
                            style={{ ["--th-chip-color" as string]: meta?.color }}
                            onClick={() => setDetailId(mod.id)}
                          >
                            <span className="th-module-icon">{meta?.icon}</span>
                            <span className="th-module-info">
                              <span className="th-module-title">{mod.title}</span>
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
        <div className="th-panel-overlay" onMouseDown={() => setDetailId(null)}>
          <div className="th-panel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="th-panel-head">
              <span
                className="th-panel-category"
                style={{ color: CATEGORY_META[detailModule.category]?.color }}
              >
                {CATEGORY_META[detailModule.category]?.icon} {detailModule.category}
              </span>
              <button type="button" onClick={() => setDetailId(null)} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>

            <h3>{detailModule.title}</h3>
            <p>{detailModule.description}</p>
            <span className="th-panel-duration">
              <ClockCircleOutlined /> {detailModule.durationMins} min
            </span>

            <div className="th-panel-footer">
              <button type="button" className="th-secondary-button" onClick={() => setDetailId(null)}>
                Close
              </button>
              <button
                type="button"
                className={`th-primary-button ${detailDone ? "is-done" : ""}`}
                onClick={() => toggleModuleComplete(detailModule.id)}
              >
                {detailDone ? <CheckCircleFilled /> : null}
                {detailDone ? "Completed" : "Mark complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}