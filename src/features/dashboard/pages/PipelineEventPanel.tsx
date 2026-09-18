import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Tooltip, Typography, message } from "antd";
import {
  CloseOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  UserOutlined,
  CopyOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  FileSearchOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  CompassOutlined,
  HourglassOutlined,
} from "@ant-design/icons";
import type dayjs from "dayjs";
import "./PipelineEventPanel.css";

const { Text, Title } = Typography;

const PANEL_STAGES = ["Proposal", "Booked", "Live", "Done"] as const;
type PanelStage = (typeof PANEL_STAGES)[number];

const STAGE_META: Record<PanelStage, { icon: React.ReactNode; label: string }> = {
  Proposal: { icon: <FileSearchOutlined />, label: "Proposal" },
  Booked: { icon: <CheckCircleOutlined />, label: "Booked" },
  Live: { icon: <ThunderboltOutlined />, label: "Live" },
  Done: { icon: <TrophyOutlined />, label: "Done" },
};

const normalizeStage = (pipeline: string): PanelStage => {
  if (pipeline === "Converted") return "Booked";
  return (PANEL_STAGES as readonly string[]).includes(pipeline) ? (pipeline as PanelStage) : "Proposal";
};

const parseBudgetToNumber = (budget?: string): number => {
  if (!budget) return 0;
  const cleaned = budget.replace(/INR/i, "").trim();
  const match = cleaned.match(/([\d,.]+)\s*([LlKk]?)/);
  if (!match) return 0;
  const numeric = parseFloat(match[1].replace(/,/g, ""));
  if (Number.isNaN(numeric)) return 0;
  const suffix = match[2].toUpperCase();
  if (suffix === "L") return numeric * 100000;
  if (suffix === "K") return numeric * 1000;
  return numeric;
};

const formatCompactINR = (value: number): string => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
};

const statusColor: Record<string, string> = {
  DRAFT: "#94a3b8",
  PLANNED: "#60a5fa",
  LIVE: "#4ade80",
  DONE: "#c4b5fd",
};

export interface PipelineEventPanelEvent {
  id: string;
  name: string;
  type: string;
  date: string;
  time: string;
  city: string;
  customer: string;
  status: string;
  pipeline: string;
  members: number;
  budget: string;
  image?: string;
  location?: { lat: number; lng: number } | null;
  dateObj: dayjs.Dayjs;
}

interface PipelineEventPanelProps {
  event: PipelineEventPanelEvent | null;
  totalBudget: number;
  onClose: () => void;
  onAdvanceStage: (eventId: string, stage: string) => void;
  onDelete: (eventId: string, eventName: string) => void;
  onViewFull: (id: string) => void;
}

type PanelTab = "overview" | "stage";

const PipelineEventPanel = ({
  event,
  totalBudget,
  onClose,
  onAdvanceStage,
  onDelete,
  onViewFull,
}: PipelineEventPanelProps) => {
  const [tab, setTab] = useState<PanelTab>("overview");
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headerMouseX = useMotionValue(0.5);
  const headerMouseY = useMotionValue(0.5);
  const glowX = useTransform(headerMouseX, (v) => `${v * 100}%`);
  const glowY = useTransform(headerMouseY, (v) => `${v * 100}%`);

  const budgetMotion = useMotionValue(0);
  const [budgetDisplay, setBudgetDisplay] = useState(0);

  useEffect(() => {
    setTab("overview");
    setDeleteArmed(false);
  }, [event?.id]);

  useEffect(() => {
    const budgetValue = event ? parseBudgetToNumber(event.budget) : 0;
    const controls = animate(budgetMotion, budgetValue, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, event?.budget]);

  useEffect(() => budgetMotion.on("change", (v) => setBudgetDisplay(v)), [budgetMotion]);

  useEffect(() => {
    if (!event) return;
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [event]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!event) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (["1", "2", "3", "4"].includes(e.key)) {
        const stage = PANEL_STAGES[Number(e.key) - 1];
        if (stage) onAdvanceStage(event.id, stage);
      }
      if (e.key.toLowerCase() === "c") handleCopy();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  useEffect(
    () => () => {
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
    },
    []
  );

  const currentStage = event ? normalizeStage(event.pipeline) : "Proposal";
  const currentStageIndex = PANEL_STAGES.indexOf(currentStage);

  const budgetValue = event ? parseBudgetToNumber(event.budget) : 0;
  const budgetShare = event && totalBudget > 0 ? Math.round((budgetValue / totalBudget) * 100) : 0;
  const ringCircumference = 2 * Math.PI * 52;

  const countdown = useMemo(() => {
    if (!event) return null;
    const diffMs = event.dateObj.valueOf() - now.valueOf();
    if (diffMs <= 0) return null;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    return { days: Math.floor(totalMinutes / (60 * 24)), hours: Math.floor((totalMinutes % (60 * 24)) / 60) };
  }, [event, now]);

  const handleHeaderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    headerMouseX.set((e.clientX - bounds.left) / bounds.width);
    headerMouseY.set((e.clientY - bounds.top) / bounds.height);
  };

  const handleCopy = async () => {
    if (!event) return;
    const summary = `${event.name}\n${event.type} · ${event.date} at ${event.time}\n${event.city}\nCustomer: ${event.customer}\nBudget: ${event.budget}\nStage: ${currentStage}`;
    try {
      await navigator.clipboard.writeText(summary);
      message.success("Copied to clipboard");
    } catch {
      message.error("Clipboard access blocked");
    }
  };

  const handleDeleteClick = () => {
    if (!event) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      armTimerRef.current = setTimeout(() => setDeleteArmed(false), 4000);
      return;
    }
    if (armTimerRef.current) clearTimeout(armTimerRef.current);
    setDeleteArmed(false);
    onDelete(event.id, event.name);
  };

  return createPortal(
    <AnimatePresence>
      {event ? (
        <>
          <motion.div
            key="pep-backdrop"
            className="pep-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            key="pep-panel"
            className="pep-panel"
            initial={{ x: "100%", opacity: 0.4 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.4 }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
          >
            <div
              className="pep-header"
              onMouseMove={handleHeaderMouseMove}
              style={
                event.image
                  ? { backgroundImage: `linear-gradient(180deg, rgba(4,8,20,0.35), rgba(4,8,20,0.92)), url(${event.image})` }
                  : undefined
              }
            >
              <motion.div className="pep-header-glow" style={{ left: glowX, top: glowY }} />

              <button className="pep-close" onClick={onClose} aria-label="Close panel">
                <CloseOutlined />
              </button>

              <div className="pep-header-content">
                <span
                  className="pep-status-pill"
                  style={{ "--pep-status-color": statusColor[event.status] || "#94a3b8" } as React.CSSProperties}
                >
                  <span className="pep-status-dot" />
                  {event.status}
                </span>

                <Title level={3} className="pep-title">{event.name}</Title>
                <Text className="pep-subtitle">{event.type} · {event.customer}</Text>

                {countdown ? (
                  <div className="pep-countdown-chip">
                    <HourglassOutlined />
                    <span>{countdown.days}d {countdown.hours}h to shoot</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="pep-tabbar">
              <button className={tab === "overview" ? "pep-tab pep-tab-active" : "pep-tab"} onClick={() => setTab("overview")}>
                {tab === "overview" ? (
                  <motion.span layoutId="pep-tab-pill" className="pep-tab-pill" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                ) : null}
                <span className="pep-tab-label">Overview</span>
              </button>
              <button className={tab === "stage" ? "pep-tab pep-tab-active" : "pep-tab"} onClick={() => setTab("stage")}>
                {tab === "stage" ? (
                  <motion.span layoutId="pep-tab-pill" className="pep-tab-pill" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                ) : null}
                <span className="pep-tab-label">Pipeline Stage</span>
              </button>
            </div>

            <div className="pep-body">
              <AnimatePresence mode="wait">
                {tab === "overview" ? (
                  <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                    <div className="pep-meta-grid">
                      <div className="pep-meta-chip">
                        <CalendarOutlined />
                        <div><span>Date</span><strong>{event.date}</strong></div>
                      </div>
                      <div className="pep-meta-chip">
                        <ClockCircleOutlined />
                        <div><span>Time</span><strong>{event.time}</strong></div>
                      </div>
                      <div className="pep-meta-chip">
                        <EnvironmentOutlined />
                        <div><span>City</span><strong>{event.city}</strong></div>
                      </div>
                      <div className="pep-meta-chip">
                        <TeamOutlined />
                        <div><span>Team</span><strong>{event.members}</strong></div>
                      </div>
                    </div>

                    <div className="pep-budget-card">
                      <div className="pep-budget-ring-wrap">
                        <svg viewBox="0 0 120 120" className="pep-budget-ring">
                          <circle cx="60" cy="60" r="52" className="pep-ring-track" />
                          <motion.circle
                            cx="60" cy="60" r="52"
                            className="pep-ring-fill"
                            strokeDasharray={ringCircumference}
                            initial={{ strokeDashoffset: ringCircumference }}
                            animate={{ strokeDashoffset: ringCircumference * (1 - budgetShare / 100) }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </svg>
                        <div className="pep-ring-label">
                          <strong>{budgetShare}%</strong>
                          <span>of pipeline</span>
                        </div>
                      </div>

                      <div className="pep-budget-details">
                        <Text className="pep-budget-caption">Shoot budget</Text>
                        <div className="pep-budget-value">{formatCompactINR(budgetDisplay)}</div>
                        <Text className="pep-budget-caption">Share of total booked pipeline value</Text>
                      </div>
                    </div>

                    <div className="pep-contact-row">
                      <div className="pep-contact-avatar"><UserOutlined /></div>
                      <div>
                        <Text strong className="pep-contact-name">{event.customer}</Text>
                        <Text className="pep-contact-sub">Client contact</Text>
                      </div>
                      {event.location ? (
                        <Tooltip title="Open venue in Maps">
                          <a
                            className="pep-location-btn"
                            href={`https://www.google.com/maps?q=${event.location.lat},${event.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <CompassOutlined />
                          </a>
                        </Tooltip>
                      ) : null}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="stage" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                    <div className="pep-stage-rail">
                      <div className="pep-stage-track">
                        <motion.div
                          className="pep-stage-track-fill"
                          initial={{ height: 0 }}
                          animate={{ height: `${(currentStageIndex / (PANEL_STAGES.length - 1)) * 100}%` }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>

                      {PANEL_STAGES.map((stage, index) => {
                        const done = index < currentStageIndex;
                        const active = index === currentStageIndex;
                        return (
                          <button
                            key={stage}
                            className={active ? "pep-stage-node pep-stage-active" : done ? "pep-stage-node pep-stage-done" : "pep-stage-node"}
                            onClick={() => onAdvanceStage(event.id, stage)}
                          >
                            <span className="pep-stage-icon">
                              {STAGE_META[stage].icon}
                              {active ? <span className="pep-stage-pulse" /> : null}
                            </span>
                            <span className="pep-stage-label">{STAGE_META[stage].label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <Text className="pep-stage-hint">Press 1–4 to jump stages instantly</Text>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pep-footer">
              <button className="pep-action-primary" onClick={() => onViewFull(event.id)}>
                View Full Details <ArrowRightOutlined />
              </button>

              <div className="pep-footer-row">
                <Tooltip title="Copy summary (C)">
                  <button className="pep-action-ghost" onClick={handleCopy}>
                    <CopyOutlined />
                  </button>
                </Tooltip>

                <button
                  className={deleteArmed ? "pep-action-delete pep-action-delete-armed" : "pep-action-delete"}
                  onClick={handleDeleteClick}
                >
                  <DeleteOutlined />
                  {deleteArmed ? "Confirm delete" : "Delete"}
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};

export default PipelineEventPanel;