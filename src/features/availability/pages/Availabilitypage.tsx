import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {LeftOutlined,RightOutlined,CloseOutlined,ClockCircleOutlined,CompassOutlined,HomeOutlined,CameraOutlined,CoffeeOutlined,TagOutlined,ThunderboltOutlined,DownloadOutlined,UndoOutlined,FireOutlined,CalendarOutlined,AppstoreOutlined,DragOutlined,SearchOutlined,RedoOutlined,LoadingOutlined,} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import "./AvailabilityPage.css";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";

type DayStatus = "available" | "unavailable";
type ReasonCategory = "travel" | "personal" | "booked" | "rest" | "other";

type AvailabilityEntry = {
  status: DayStatus;
  note: string;
  category?: ReasonCategory;
};

type AvailabilityMap = Record<string, AvailabilityEntry>;

type AvailabilityPageProps = {
  user?: { role?: string; email?: string; identifier?: string };
};

type WeekdayFilter = "all" | "weekdays" | "weekends";

type ReasonModalState = {
  mode: "bulk";
  dateKeys: string[];
  status: DayStatus;
  category: ReasonCategory;
  note: string;
  weekdayFilter: WeekdayFilter;
};

type UndoEntry = { map: AvailabilityMap; label: string };

type CategoryMeta = { label: string; color: string; icon: React.ReactElement };

const CATEGORY_META: Record<ReasonCategory, CategoryMeta> = {
  travel: { label: "Travel", color: "var(--avl-purple)", icon: <CompassOutlined /> },
  personal: { label: "Personal", color: "var(--avl-blue)", icon: <HomeOutlined /> },
  booked: { label: "Booked Elsewhere", color: "var(--avl-danger)", icon: <CameraOutlined /> },
  rest: { label: "Rest Day", color: "var(--avl-rest)", icon: <CoffeeOutlined /> },
  other: { label: "Other", color: "var(--avl-amber)", icon: <TagOutlined /> },
};

const CATEGORY_ORDER: ReasonCategory[] = ["travel", "personal", "booked", "rest", "other"];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const RECURRING_WEEK_OPTIONS = [4, 8, 12];

const datesBetween = (a: string, b: string) => {
  const [start, end] = dayjs(a).isBefore(dayjs(b)) ? [a, b] : [b, a];
  const dates: string[] = [];
  let cursor = dayjs(start);
  const last = dayjs(end);
  while (cursor.isBefore(last) || cursor.isSame(last, "day")) {
    dates.push(cursor.format("YYYY-MM-DD"));
    cursor = cursor.add(1, "day");
  }
  return dates;
};

const buildICS = (entries: [string, AvailabilityEntry][]) => {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AXS//Availability//EN", "CALSCALE:GREGORIAN"];
  entries.forEach(([date, entry], index) => {
    const start = date.replace(/-/g, "");
    const end = dayjs(date).add(1, "day").format("YYYYMMDD");
    const summary = `Unavailable${entry.category ? ` - ${CATEGORY_META[entry.category].label}` : ""}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:axs-availability-${date}-${index}@aperturex`,
      `DTSTAMP:${dayjs().format("YYYYMMDDTHHmmss")}Z`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${summary}`
    );
    if (entry.note) lines.push(`DESCRIPTION:${entry.note.replace(/\n/g, "\\n")}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
};

const downloadTextFile = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

/* ---------- Backend sync: availability now lives server-side so studio
   admins on a different machine/browser can see it (this replaces the old
   localStorage-per-browser approach, which admins could never actually read). ---------- */

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function fetchMyAvailability(): Promise<AvailabilityMap> {
  try {
    const res = await fetch(`${API_BASE}/studio/availability/me`, { headers: authHeaders() });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) return {};
    const map: AvailabilityMap = {};
    (body.entries || []).forEach((e: any) => {
      map[e.date] = { status: e.status, note: e.note || "", category: e.category };
    });
    return map;
  } catch {
    return {};
  }
}

// changedKeys tells us exactly which dates to sync: present in `map` -> upsert, absent -> delete
async function syncAvailabilityChanges(
  map: AvailabilityMap,
  changedKeys: string[]
): Promise<{ ok: boolean; message?: string }> {
  const upserts = changedKeys
    .filter((k) => map[k])
    .map((k) => ({ date: k, status: map[k].status, category: map[k].category || "other", note: map[k].note || "" }));
  const deletes = changedKeys.filter((k) => !map[k]);

  try {
    if (upserts.length > 0) {
      const res = await fetch(`${API_BASE}/studio/availability/me/bulk`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ entries: upserts }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) return { ok: false, message: body?.message || "Failed to save availability." };
    }
    for (const date of deletes) {
      const res = await fetch(`${API_BASE}/studio/availability/me/${date}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) return { ok: false, message: body?.message || "Failed to clear date." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error — check your connection." };
  }
}

function AvailabilityPage({ user }: AvailabilityPageProps) {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  const [noteTarget, setNoteTarget] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteCategory, setNoteCategory] = useState<ReasonCategory>("other");

  const [rangeMode, setRangeMode] = useState(false);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  const [reasonModal, setReasonModal] = useState<ReasonModalState | null>(null);

  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringWeekdays, setRecurringWeekdays] = useState<number[]>([]);
  const [recurringWeeks, setRecurringWeeks] = useState(4);
  const [recurringStatus, setRecurringStatus] = useState<DayStatus>("unavailable");
  const [recurringCategory, setRecurringCategory] = useState<ReasonCategory>("other");
  const [recurringNote, setRecurringNote] = useState("");

  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement | null>(null);

  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [toast, setToast] = useState<{ label: string; error?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<ReasonCategory[]>([]);
  const [jumpDate, setJumpDate] = useState("");
  const [highlightDate, setHighlightDate] = useState<string | null>(null);

  const loadFromServer = useCallback(async () => {
    setIsLoading(true);
    const map = await fetchMyAvailability();
    setAvailability(map);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer, user?.email]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setQuickActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const today = dayjs().format("YYYY-MM-DD");

  const showToast = (label: string, error = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ label, error });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  /* Optimistically applies `next`, then syncs only `changedKeys` to the
     backend. On failure, rolls back to `baseline` so the UI never lies
     about what's actually saved server-side. */
  const commit = (next: AvailabilityMap, label: string, baseline: AvailabilityMap, changedKeys: string[]) => {
    setUndoStack((stack) => [...stack.slice(-9), { map: baseline, label }]);
    setAvailability(next);
    setIsSyncing(true);
    syncAvailabilityChanges(next, changedKeys).then(({ ok, message }) => {
      setIsSyncing(false);
      if (!ok) {
        setAvailability(baseline);
        setUndoStack((stack) => stack.slice(0, -1));
        showToast(message || "Couldn't save that change.", true);
        return;
      }
      showToast(label);
    });
  };

  const handleUndo = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const last = stack[stack.length - 1];
      const current = availability;
      const changedKeys = Array.from(new Set([...Object.keys(current), ...Object.keys(last.map)])).filter(
        (k) => JSON.stringify(current[k]) !== JSON.stringify(last.map[k])
      );
      setAvailability(last.map);
      setIsSyncing(true);
      syncAvailabilityChanges(last.map, changedKeys).then(({ ok, message }) => {
        setIsSyncing(false);
        if (!ok) {
          setAvailability(current);
          showToast(message || "Undo failed to save.", true);
          return;
        }
        showToast(`Undid: ${last.label}`);
      });
      return stack.slice(0, -1);
    });
  };

  useEffect(() => {
    const endDrag = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setDragStart((startValue) => {
        setDragEnd((endValue) => {
          if (startValue && endValue) {
            const range = datesBetween(startValue, endValue);
            setReasonModal({
              mode: "bulk",
              dateKeys: range,
              status: "unavailable",
              category: "other",
              note: "",
              weekdayFilter: "all",
            });
          }
          return null;
        });
        return null;
      });
    };
    window.addEventListener("mouseup", endDrag);
    return () => window.removeEventListener("mouseup", endDrag);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (viewMode === "month" && !reasonModal && !recurringOpen && !noteTarget) {
        if (event.key === "ArrowLeft") setMonth((current) => current.subtract(1, "month"));
        if (event.key === "ArrowRight") setMonth((current) => current.add(1, "month"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, reasonModal, recurringOpen, noteTarget]);

  const calendarDates = useMemo(() => {
    const list: (number | null)[] = [];
    const startDay = month.startOf("month").day();
    const daysInMonth = month.daysInMonth();
    for (let i = 0; i < startDay; i++) list.push(null);
    for (let day = 1; day <= daysInMonth; day++) list.push(day);
    return list;
  }, [month]);

  const getDateKey = (day: number) => month.date(day).format("YYYY-MM-DD");

  const handleDayClick = (day: number) => {
    if (rangeMode) return;
    const dateKey = getDateKey(day);
    const current = availability[dateKey];

    if (!current) {
      const next = { ...availability, [dateKey]: { status: "available" as DayStatus, note: "" } };
      commit(next, `Marked ${dayjs(dateKey).format("D MMM")} available`, availability, [dateKey]);
      return;
    }

    if (current.status === "available") {
      setNoteTarget(dateKey);
      setNoteDraft(current.note || "");
      setNoteCategory(current.category || "other");
      return;
    }

    const next = { ...availability };
    delete next[dateKey];
    commit(next, `Cleared ${dayjs(dateKey).format("D MMM")}`, availability, [dateKey]);
  };

  const handleDayMouseDown = (day: number) => {
    if (!rangeMode) return;
    const dateKey = getDateKey(day);
    isDraggingRef.current = true;
    setDragStart(dateKey);
    setDragEnd(dateKey);
  };

  const handleDayMouseEnter = (day: number) => {
    if (!rangeMode || !isDraggingRef.current) return;
    setDragEnd(getDateKey(day));
  };

  const dragRangeSet = useMemo(() => {
    if (!dragStart || !dragEnd) return new Set<string>();
    return new Set(datesBetween(dragStart, dragEnd));
  }, [dragStart, dragEnd]);

  const saveNote = () => {
    if (!noteTarget) return;
    const next: AvailabilityMap = {
      ...availability,
      [noteTarget]: { status: "unavailable", note: noteDraft.trim(), category: noteCategory },
    };
    commit(next, `Marked ${dayjs(noteTarget).format("D MMM")} unavailable`, availability, [noteTarget]);
    setNoteTarget(null);
    setNoteDraft("");
    setNoteCategory("other");
  };

  const clearDay = (dateKey: string) => {
    const next = { ...availability };
    delete next[dateKey];
    commit(next, `Cleared ${dayjs(dateKey).format("D MMM")}`, availability, [dateKey]);
  };

  const reasonModalTargets = useMemo(() => {
    if (!reasonModal) return [];
    if (reasonModal.weekdayFilter === "weekdays") return reasonModal.dateKeys.filter((d) => ![0, 6].includes(dayjs(d).day()));
    if (reasonModal.weekdayFilter === "weekends") return reasonModal.dateKeys.filter((d) => [0, 6].includes(dayjs(d).day()));
    return reasonModal.dateKeys;
  }, [reasonModal]);

  const applyReasonModal = () => {
    if (!reasonModal) return;
    const targets = reasonModalTargets;
    if (targets.length === 0) return;

    const next = { ...availability };
    targets.forEach((dateKey) => {
      next[dateKey] =
        reasonModal.status === "available"
          ? { status: "available", note: "" }
          : { status: "unavailable", note: reasonModal.note.trim(), category: reasonModal.category };
    });

    const label =
      targets.length === 1
        ? `Marked ${dayjs(targets[0]).format("D MMM")} ${reasonModal.status}`
        : `Marked ${targets.length} days ${reasonModal.status}`;
    commit(next, label, availability, targets);
    setReasonModal(null);
  };

  const markWeekendsUnavailable = () => {
    const next = { ...availability };
    const changed: string[] = [];
    calendarDates.forEach((day) => {
      if (!day) return;
      const dateKey = getDateKey(day);
      if ([0, 6].includes(month.date(day).day())) {
        next[dateKey] = { status: "unavailable", note: "Weekend", category: "rest" };
        changed.push(dateKey);
      }
    });
    commit(next, `Marked ${changed.length} weekends unavailable`, availability, changed);
    setQuickActionsOpen(false);
  };

  const markWeekdaysAvailable = () => {
    const next = { ...availability };
    const changed: string[] = [];
    calendarDates.forEach((day) => {
      if (!day) return;
      const dateKey = getDateKey(day);
      if (![0, 6].includes(month.date(day).day())) {
        next[dateKey] = { status: "available", note: "" };
        changed.push(dateKey);
      }
    });
    commit(next, `Marked ${changed.length} weekdays available`, availability, changed);
    setQuickActionsOpen(false);
  };

  const clearMonth = () => {
    const prefix = month.format("YYYY-MM");
    const next = { ...availability };
    const changed: string[] = [];
    Object.keys(next).forEach((dateKey) => {
      if (dateKey.startsWith(prefix)) {
        delete next[dateKey];
        changed.push(dateKey);
      }
    });
    commit(next, `Cleared ${changed.length} days this month`, availability, changed);
    setQuickActionsOpen(false);
  };

  const copyPreviousMonthPattern = () => {
    const prevMonth = month.subtract(1, "month");
    const prevPrefix = prevMonth.format("YYYY-MM");
    const next = { ...availability };
    const changed: string[] = [];
    Object.entries(availability).forEach(([dateKey, entry]) => {
      if (!dateKey.startsWith(prevPrefix)) return;
      const dayOfMonth = dayjs(dateKey).date();
      if (dayOfMonth > month.daysInMonth()) return;
      const mappedKey = month.date(dayOfMonth).format("YYYY-MM-DD");
      next[mappedKey] = { ...entry };
      changed.push(mappedKey);
    });
    commit(next, `Copied ${changed.length} days from ${prevMonth.format("MMMM")}`, availability, changed);
    setQuickActionsOpen(false);
  };

  const exportICS = () => {
    const unavailableEntries = Object.entries(availability).filter(([, entry]) => entry.status === "unavailable");
    if (unavailableEntries.length === 0) {
      showToast("No unavailable days to export");
      setQuickActionsOpen(false);
      return;
    }
    downloadTextFile(`axs-availability-${dayjs().format("YYYYMMDD")}.ics`, buildICS(unavailableEntries), "text/calendar");
    showToast(`Exported ${unavailableEntries.length} dates`);
    setQuickActionsOpen(false);
  };

  const toggleRecurringWeekday = (weekday: number) => {
    setRecurringWeekdays((current) =>
      current.includes(weekday) ? current.filter((day) => day !== weekday) : [...current, weekday]
    );
  };

  const applyRecurringRule = () => {
    if (recurringWeekdays.length === 0) return;
    const next = { ...availability };
    const changed: string[] = [];
    let cursor = dayjs();
    const end = dayjs().add(recurringWeeks, "week");
    while (cursor.isBefore(end)) {
      if (recurringWeekdays.includes(cursor.day())) {
        const dateKey = cursor.format("YYYY-MM-DD");
        next[dateKey] =
          recurringStatus === "available"
            ? { status: "available", note: "" }
            : { status: "unavailable", note: recurringNote.trim(), category: recurringCategory };
        changed.push(dateKey);
      }
      cursor = cursor.add(1, "day");
    }
    commit(next, `Applied recurring rule to ${changed.length} days`, availability, changed);
    setRecurringOpen(false);
    setRecurringWeekdays([]);
    setRecurringNote("");
  };

  const handleJump = () => {
    if (!jumpDate) return;
    const target = dayjs(jumpDate);
    if (!target.isValid()) return;
    setMonth(target);
    setViewMode("month");
    const key = target.format("YYYY-MM-DD");
    setHighlightDate(key);
    setTimeout(() => setHighlightDate((current) => (current === key ? null : current)), 2200);
  };

  const toggleCategoryFilter = (category: ReasonCategory) => {
    setCategoryFilter((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  };

  const upcomingUnavailable = useMemo(() => {
    return Object.entries(availability)
      .filter(([date, entry]) => entry.status === "unavailable" && date >= today)
      .filter(([, entry]) => categoryFilter.length === 0 || (!!entry.category && categoryFilter.includes(entry.category)))
      .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
      .slice(0, 8);
  }, [availability, today, categoryFilter]);

  const monthSummary = useMemo(() => {
    const monthPrefix = month.format("YYYY-MM");
    let availableCount = 0;
    let unavailableCount = 0;
    Object.entries(availability).forEach(([date, entry]) => {
      if (!date.startsWith(monthPrefix)) return;
      if (entry.status === "available") availableCount += 1;
      if (entry.status === "unavailable") unavailableCount += 1;
    });
    const marked = availableCount + unavailableCount;
    const rate = marked > 0 ? Math.round((availableCount / marked) * 100) : 0;
    return { availableCount, unavailableCount, rate };
  }, [availability, month]);

  const availableStreak = useMemo(() => {
    let streak = 0;
    let cursor = dayjs();
    for (let i = 0; i < 90; i++) {
      const dateKey = cursor.format("YYYY-MM-DD");
      if (availability[dateKey]?.status === "available") {
        streak += 1;
        cursor = cursor.add(1, "day");
      } else {
        break;
      }
    }
    return streak;
  }, [availability]);

  const yearWeeks = useMemo(() => {
    if (viewMode !== "year") return [] as Dayjs[][];
    const yearStart = dayjs(`${month.year()}-01-01`);
    const yearEnd = dayjs(`${month.year()}-12-31`);
    const gridStart = yearStart.startOf("week");
    const weeks: Dayjs[][] = [];
    let cursor = gridStart;
    while (cursor.isBefore(yearEnd) || cursor.isSame(yearEnd, "day")) {
      const week: Dayjs[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(cursor);
        cursor = cursor.add(1, "day");
      }
      weeks.push(week);
    }
    return weeks;
  }, [viewMode, month]);

  const monthLabelPositions = useMemo(() => {
    const positions: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    yearWeeks.forEach((week, weekIndex) => {
      const firstOfMonthDay = week.find((date) => date.date() <= 7 && date.year() === month.year());
      if (firstOfMonthDay && firstOfMonthDay.month() !== lastMonth) {
        positions.push({ label: firstOfMonthDay.format("MMM"), weekIndex });
        lastMonth = firstOfMonthDay.month();
      }
    });
    return positions;
  }, [yearWeeks, month]);

  const ringStyle = {
    background: `conic-gradient(var(--avl-green) ${monthSummary.rate * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
  };

  return (
    <div className="availability-page">
      <div className="availability-header">
        <div className="availability-header-text">
          <span className="availability-eyebrow">Your Schedule</span>
          <h1>Availability {isSyncing ? <LoadingOutlined spin style={{ fontSize: 14, marginLeft: 8 }} /> : null}</h1>
          <p>Mark the days you're open for bookings so studio admins can plan around you.</p>
        </div>

        <div className="availability-legend">
          <span className="legend-item">
            <em className="legend-dot legend-available" />
            Available
          </span>
          <span className="legend-item">
            <em className="legend-dot legend-unavailable" />
            Unavailable
          </span>
          <span className="legend-item">
            <em className="legend-dot legend-today" />
            Today
          </span>
        </div>
      </div>

      <div className="availability-toolbar">
        <div className="availability-view-toggle">
          <button
            type="button"
            className={viewMode === "month" ? "is-active" : ""}
            onClick={() => setViewMode("month")}
          >
            <AppstoreOutlined /> Month
          </button>
          <button
            type="button"
            className={viewMode === "year" ? "is-active" : ""}
            onClick={() => setViewMode("year")}
          >
            <CalendarOutlined /> Year
          </button>
        </div>

        <button
          type="button"
          className={`availability-range-toggle ${rangeMode ? "is-active" : ""}`}
          onClick={() => setRangeMode((current) => !current)}
          title="Drag across days to bulk-apply a status"
        >
          <DragOutlined /> {rangeMode ? "Range select on" : "Range select"}
        </button>

        <div className="availability-jump">
          <SearchOutlined />
          <input
            type="date"
            value={jumpDate}
            onChange={(event) => setJumpDate(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleJump()}
          />
          <button type="button" onClick={handleJump}>
            Go
          </button>
        </div>

        <button
          type="button"
          className="availability-undo-button"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          title="Undo last change (Ctrl/Cmd+Z)"
        >
          <UndoOutlined /> Undo{undoStack.length > 0 ? ` (${undoStack.length})` : ""}
        </button>

        <div className="availability-quick-actions" ref={quickActionsRef}>
          <button type="button" onClick={() => setQuickActionsOpen((current) => !current)}>
            <ThunderboltOutlined /> Quick actions
          </button>

          {quickActionsOpen && (
            <div className="availability-quick-menu">
              <button type="button" onClick={markWeekendsUnavailable}>
                Mark weekends unavailable
              </button>
              <button type="button" onClick={markWeekdaysAvailable}>
                Mark weekdays available
              </button>
              <button type="button" onClick={copyPreviousMonthPattern}>
                Copy previous month's pattern
              </button>
              <button type="button" onClick={clearMonth}>
                Clear this month
              </button>
              <div className="availability-quick-divider" />
              <button
                type="button"
                onClick={() => {
                  setRecurringOpen(true);
                  setQuickActionsOpen(false);
                }}
              >
                Set a recurring rule…
              </button>
              <button type="button" onClick={exportICS}>
                <DownloadOutlined /> Export unavailable dates (.ics)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="availability-layout">
        {isLoading ? (
          <div className="availability-calendar-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
            <LoadingOutlined spin style={{ fontSize: 24 }} />
          </div>
        ) : viewMode === "month" ? (
          <div className="availability-calendar-card">
            <div className="availability-calendar-head">
              <button type="button" onClick={() => setMonth((current) => current.subtract(1, "month"))}>
                <LeftOutlined />
              </button>

              <div>
                <strong>{month.format("MMMM")}</strong>
                <span>{month.format("YYYY")}</span>
              </div>

              <button type="button" onClick={() => setMonth((current) => current.add(1, "month"))}>
                <RightOutlined />
              </button>
            </div>

            <div className="availability-calendar-weekdays">
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>

            <div className="availability-calendar-grid" onMouseLeave={() => {}}>
              {calendarDates.map((day, index) => {
                if (!day) return <span key={`empty-${index}`} className="availability-cell empty" />;

                const dateKey = getDateKey(day);
                const entry = availability[dateKey];
                const isToday = dateKey === today;
                const inDrag = dragRangeSet.has(dateKey);
                const isHighlighted = highlightDate === dateKey;
                const categoryColor = entry?.category ? CATEGORY_META[entry.category].color : undefined;

                return (
                  <button
                    type="button"
                    key={dateKey}
                    className={`availability-cell ${entry ? `status-${entry.status}` : ""} ${
                      isToday ? "is-today" : ""
                    } ${inDrag ? "is-drag-selected" : ""} ${isHighlighted ? "is-highlighted" : ""} ${
                      rangeMode ? "is-range-mode" : ""
                    }`}
                    style={categoryColor ? ({ ["--avl-cell-accent" as string]: categoryColor } as React.CSSProperties) : undefined}
                    onClick={() => handleDayClick(day)}
                    onMouseDown={() => handleDayMouseDown(day)}
                    onMouseEnter={() => handleDayMouseEnter(day)}
                    title={entry?.note || undefined}
                  >
                    <span className="availability-cell-number">{day}</span>
                    {entry?.status === "unavailable" && (
                      <span className="availability-cell-note-dot" style={{ background: categoryColor }} />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="availability-hint">
              {rangeMode
                ? "Drag across days to select a range, then choose how to mark them."
                : "Tap a day to cycle it: open → available → unavailable → open again."}
            </p>
          </div>
        ) : (
          <div className="availability-calendar-card availability-year-card">
            <div className="availability-calendar-head">
              <button type="button" onClick={() => setMonth((current) => current.subtract(1, "year"))}>
                <LeftOutlined />
              </button>
              <div>
                <strong>{month.format("YYYY")}</strong>
                <span>Full year overview</span>
              </div>
              <button type="button" onClick={() => setMonth((current) => current.add(1, "year"))}>
                <RightOutlined />
              </button>
            </div>

            <div className="availability-heatmap-scroll">
              <div className="availability-heatmap">
                <div className="availability-heatmap-months">
                  {monthLabelPositions.map((position) => (
                    <span
                      key={`${position.label}-${position.weekIndex}`}
                      style={{ gridColumnStart: position.weekIndex + 1 }}
                    >
                      {position.label}
                    </span>
                  ))}
                </div>

                <div className="availability-heatmap-grid">
                  {yearWeeks.map((week, weekIndex) => (
                    <div className="availability-heatmap-column" key={weekIndex}>
                      {week.map((date) => {
                        const dateKey = date.format("YYYY-MM-DD");
                        const entry = availability[dateKey];
                        const outOfYear = date.year() !== month.year();
                        const isToday = dateKey === today;
                        return (
                          <button
                            type="button"
                            key={dateKey}
                            className={`availability-heatmap-cell ${entry ? `status-${entry.status}` : ""} ${
                              outOfYear ? "is-outside" : ""
                            } ${isToday ? "is-today" : ""}`}
                            title={`${date.format("D MMM YYYY")}${entry ? ` — ${entry.status}` : ""}`}
                            onClick={() => {
                              if (outOfYear) return;
                              setMonth(date);
                              setViewMode("month");
                            }}
                            disabled={outOfYear}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="availability-hint">Click any square to jump to that month.</p>
          </div>
        )}

        <div className="availability-side">
          <div className="availability-summary-card">
            <h3>This month</h3>
            <div className="availability-stats-row">
              <div className="availability-ring" style={ringStyle}>
                <div className="availability-ring-inner">
                  <strong>{monthSummary.rate}%</strong>
                  <span>available</span>
                </div>
              </div>

              <div className="availability-stats-text">
                <div className="availability-summary-row">
                  <span>Available days</span>
                  <strong className="summary-available">{monthSummary.availableCount}</strong>
                </div>
                <div className="availability-summary-row">
                  <span>Unavailable days</span>
                  <strong className="summary-unavailable">{monthSummary.unavailableCount}</strong>
                </div>
              </div>
            </div>

            {availableStreak > 0 && (
              <div className="availability-streak-badge">
                <FireOutlined /> {availableStreak}-day available streak
              </div>
            )}
          </div>

          <div className="availability-upcoming-card">
            <h3>
              <ClockCircleOutlined /> Upcoming unavailable
            </h3>

            <div className="availability-category-filters">
              {CATEGORY_ORDER.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={`availability-category-chip ${categoryFilter.includes(category) ? "is-active" : ""}`}
                  style={{ ["--avl-chip-color" as string]: CATEGORY_META[category].color } as React.CSSProperties}
                  onClick={() => toggleCategoryFilter(category)}
                >
                  {CATEGORY_META[category].icon}
                  {CATEGORY_META[category].label}
                </button>
              ))}
            </div>

            {upcomingUnavailable.length > 0 ? (
              <div className="availability-upcoming-list">
                {upcomingUnavailable.map(([date, entry]) => (
                  <div className="availability-upcoming-item" key={date}>
                    <div>
                      <div className="availability-upcoming-heading">
                        <strong>{dayjs(date).format("DD MMM YYYY")}</strong>
                        {entry.category && (
                          <span
                            className="availability-upcoming-category"
                            style={{ ["--avl-chip-color" as string]: CATEGORY_META[entry.category].color } as React.CSSProperties}
                          >
                            {CATEGORY_META[entry.category].icon}
                            {CATEGORY_META[entry.category].label}
                          </span>
                        )}
                      </div>
                      {entry.note && <p>{entry.note}</p>}
                    </div>

                    <button type="button" onClick={() => clearDay(date)} aria-label="Clear date">
                      <CloseOutlined />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="availability-upcoming-empty">No upcoming unavailable dates marked.</p>
            )}
          </div>
        </div>
      </div>

      {noteTarget && (
        <div className="availability-panel-overlay" onMouseDown={() => setNoteTarget(null)}>
          <div className="availability-panel" onMouseDown={(event) => event.stopPropagation()}>
            <div className="availability-panel-head">
              <h3>Mark {dayjs(noteTarget).format("DD MMM YYYY")} unavailable</h3>
              <button type="button" onClick={() => setNoteTarget(null)} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>

            <label className="availability-field">
              <span>Reason</span>
              <div className="availability-category-picker">
                {CATEGORY_ORDER.map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={`availability-category-option ${noteCategory === category ? "is-active" : ""}`}
                    style={{ ["--avl-chip-color" as string]: CATEGORY_META[category].color } as React.CSSProperties}
                    onClick={() => setNoteCategory(category)}
                  >
                    {CATEGORY_META[category].icon}
                    {CATEGORY_META[category].label}
                  </button>
                ))}
              </div>
            </label>

            <label className="availability-field">
              <span>Note (optional)</span>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="e.g. Booked with another studio, personal leave…"
                rows={3}
                autoFocus
              />
            </label>

            <div className="availability-panel-footer">
              <button type="button" className="availability-secondary-button" onClick={() => setNoteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="availability-primary-button" onClick={saveNote}>
                Mark Unavailable
              </button>
            </div>
          </div>
        </div>
      )}

      {reasonModal && (
        <div className="availability-panel-overlay" onMouseDown={() => setReasonModal(null)}>
          <div className="availability-panel" onMouseDown={(event) => event.stopPropagation()}>
            <div className="availability-panel-head">
              <h3>
                Apply to {reasonModal.dateKeys.length} day{reasonModal.dateKeys.length > 1 ? "s" : ""}
              </h3>
              <button type="button" onClick={() => setReasonModal(null)} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>

            <p className="availability-range-summary">
              {dayjs(reasonModal.dateKeys[0]).format("D MMM")} –{" "}
              {dayjs(reasonModal.dateKeys[reasonModal.dateKeys.length - 1]).format("D MMM YYYY")} ·{" "}
              {reasonModalTargets.length} day{reasonModalTargets.length === 1 ? "" : "s"} will change
            </p>

            <label className="availability-field">
              <span>Apply to</span>
              <div className="availability-status-toggle">
                {(["all", "weekdays", "weekends"] as WeekdayFilter[]).map((filter) => (
                  <button
                    type="button"
                    key={filter}
                    className={reasonModal.weekdayFilter === filter ? "is-active" : ""}
                    onClick={() => setReasonModal({ ...reasonModal, weekdayFilter: filter })}
                  >
                    {filter === "all" ? "All days" : filter === "weekdays" ? "Weekdays only" : "Weekends only"}
                  </button>
                ))}
              </div>
            </label>

            <label className="availability-field">
              <span>Status</span>
              <div className="availability-status-toggle">
                <button
                  type="button"
                  className={reasonModal.status === "available" ? "is-active status-pill-available" : ""}
                  onClick={() => setReasonModal({ ...reasonModal, status: "available" })}
                >
                  Available
                </button>
                <button
                  type="button"
                  className={reasonModal.status === "unavailable" ? "is-active status-pill-unavailable" : ""}
                  onClick={() => setReasonModal({ ...reasonModal, status: "unavailable" })}
                >
                  Unavailable
                </button>
              </div>
            </label>

            {reasonModal.status === "unavailable" && (
              <>
                <label className="availability-field">
                  <span>Reason</span>
                  <div className="availability-category-picker">
                    {CATEGORY_ORDER.map((category) => (
                      <button
                        type="button"
                        key={category}
                        className={`availability-category-option ${reasonModal.category === category ? "is-active" : ""}`}
                        style={{ ["--avl-chip-color" as string]: CATEGORY_META[category].color } as React.CSSProperties}
                        onClick={() => setReasonModal({ ...reasonModal, category })}
                      >
                        {CATEGORY_META[category].icon}
                        {CATEGORY_META[category].label}
                      </button>
                    ))}
                  </div>
                </label>

                <label className="availability-field">
                  <span>Note (optional)</span>
                  <textarea
                    value={reasonModal.note}
                    onChange={(event) => setReasonModal({ ...reasonModal, note: event.target.value })}
                    placeholder="e.g. Travelling for a destination shoot"
                    rows={3}
                  />
                </label>
              </>
            )}

            <div className="availability-panel-footer">
              <button type="button" className="availability-secondary-button" onClick={() => setReasonModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="availability-primary-button"
                onClick={applyReasonModal}
                disabled={reasonModalTargets.length === 0}
              >
                Apply to {reasonModalTargets.length} day{reasonModalTargets.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      )}

      {recurringOpen && (
        <div className="availability-panel-overlay" onMouseDown={() => setRecurringOpen(false)}>
          <div className="availability-panel" onMouseDown={(event) => event.stopPropagation()}>
            <div className="availability-panel-head">
              <h3>Set a recurring rule</h3>
              <button type="button" onClick={() => setRecurringOpen(false)} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>

            <label className="availability-field">
              <span>Repeat on</span>
              <div className="availability-weekday-picker">
                {WEEKDAY_LABELS.map((label, index) => (
                  <button
                    type="button"
                    key={index}
                    className={recurringWeekdays.includes(index) ? "is-active" : ""}
                    onClick={() => toggleRecurringWeekday(index)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </label>

            <label className="availability-field">
              <span>For the next</span>
              <div className="availability-status-toggle">
                {RECURRING_WEEK_OPTIONS.map((weeks) => (
                  <button
                    type="button"
                    key={weeks}
                    className={recurringWeeks === weeks ? "is-active" : ""}
                    onClick={() => setRecurringWeeks(weeks)}
                  >
                    {weeks} weeks
                  </button>
                ))}
              </div>
            </label>

            <label className="availability-field">
              <span>Status</span>
              <div className="availability-status-toggle">
                <button
                  type="button"
                  className={recurringStatus === "available" ? "is-active status-pill-available" : ""}
                  onClick={() => setRecurringStatus("available")}
                >
                  Available
                </button>
                <button
                  type="button"
                  className={recurringStatus === "unavailable" ? "is-active status-pill-unavailable" : ""}
                  onClick={() => setRecurringStatus("unavailable")}
                >
                  Unavailable
                </button>
              </div>
            </label>

            {recurringStatus === "unavailable" && (
              <>
                <label className="availability-field">
                  <span>Reason</span>
                  <div className="availability-category-picker">
                    {CATEGORY_ORDER.map((category) => (
                      <button
                        type="button"
                        key={category}
                        className={`availability-category-option ${recurringCategory === category ? "is-active" : ""}`}
                        style={{ ["--avl-chip-color" as string]: CATEGORY_META[category].color } as React.CSSProperties}
                        onClick={() => setRecurringCategory(category)}
                      >
                        {CATEGORY_META[category].icon}
                        {CATEGORY_META[category].label}
                      </button>
                    ))}
                  </div>
                </label>

                <label className="availability-field">
                  <span>Note (optional)</span>
                  <textarea
                    value={recurringNote}
                    onChange={(event) => setRecurringNote(event.target.value)}
                    placeholder="e.g. Weekly rest day"
                    rows={2}
                  />
                </label>
              </>
            )}

            <div className="availability-panel-footer">
              <button type="button" className="availability-secondary-button" onClick={() => setRecurringOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="availability-primary-button"
                onClick={applyRecurringRule}
                disabled={recurringWeekdays.length === 0}
              >
                Apply rule
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`availability-toast ${toast.error ? "is-error" : ""}`}>
          <span>{toast.label}</span>
          {!toast.error ? (
            <button type="button" onClick={handleUndo}>
              <RedoOutlined style={{ transform: "scaleX(-1)" }} /> Undo
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default AvailabilityPage;