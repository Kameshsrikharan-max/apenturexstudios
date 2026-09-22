import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  PlusOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import "./EquipmentChecklistModal.css";
import {
  fetchChecklistRequest,
  addChecklistItemRequest,
  removeChecklistItemRequest,
  toggleChecklistItemRequest,
} from "../../redux/actions/equipmentChecklistActions";

// Reads the same "Jun 16, 2026" / "12:00 AM" strings EventPage's own
// records use (see CreateEventPage's formatBoardDate/formatBoardTime).
function parseEventDateTime(event: any): Date | null {
  if (!event?.date) return null;
  const combined = `${event.date} ${event.time || ""}`.trim();
  const parsed = new Date(combined);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function hoursUntil(event: any): number | null {
  const eventDate = parseEventDateTime(event);
  if (!eventDate) return null;
  return (eventDate.getTime() - Date.now()) / (1000 * 60 * 60);
}

// Each category gets a consistent, distinct accent color, derived from its
// name rather than hardcoded per category — new custom categories the user
// types in still get a sensible color instead of falling back to gray.
const CATEGORY_PALETTE = [
  { text: "#38d5ff", bg: "rgba(56,213,255,0.14)", border: "rgba(56,213,255,0.4)" },
  { text: "#4ade80", bg: "rgba(74,222,128,0.14)", border: "rgba(74,222,128,0.4)" },
  { text: "#fac775", bg: "rgba(250,199,117,0.14)", border: "rgba(250,199,117,0.4)" },
  { text: "#c084fc", bg: "rgba(192,132,252,0.14)", border: "rgba(192,132,252,0.4)" },
  { text: "#f472b6", bg: "rgba(244,114,182,0.14)", border: "rgba(244,114,182,0.4)" },
  { text: "#60a5fa", bg: "rgba(96,165,250,0.14)", border: "rgba(96,165,250,0.4)" },
  { text: "#fb923c", bg: "rgba(251,146,60,0.14)", border: "rgba(251,146,60,0.4)" },
  { text: "#2dd4bf", bg: "rgba(45,212,191,0.14)", border: "rgba(45,212,191,0.4)" },
];

function categoryColor(category: string) {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function EquipmentChecklistModal({
  event,
  onClose,
}: {
  event: any;
  onClose: () => void;
}) {
  const dispatch = useDispatch();
  const { checklist, loading, error } = useSelector((state: any) => state.equipmentChecklist);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("General");

  useEffect(() => {
    if (event?.id) dispatch(fetchChecklistRequest(event.id));
  }, [event?.id, dispatch]);

  // Escape closes, same as clicking the backdrop.
  useEffect(() => {
    if (!event) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [event, onClose]);

  const grouped = useMemo(() => {
    const items = checklist?.items || [];
    const map: Record<string, any[]> = {};
    items.forEach((item: any) => {
      const cat = item.category || "General";
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }, [checklist]);

  const totalCount = checklist?.items?.length || 0;
  const checkedCount = (checklist?.items || []).filter((i: any) => i.checked).length;
  const percent = totalCount ? (checkedCount / totalCount) * 100 : 0;
  const ringOffset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
  const hrsLeft = event ? hoursUntil(event) : null;
  const isUrgent = hrsLeft !== null && hrsLeft > 0 && hrsLeft <= 2;
  const allPacked = totalCount > 0 && checkedCount === totalCount;

  const handleToggle = (itemId: string, checked: boolean) => {
    if (!event?.id) return;
    dispatch(toggleChecklistItemRequest(event.id, itemId, checked));
  };

  const handleAddItem = () => {
    const name = newItemName.trim();
    if (!name || !event?.id) return;
    dispatch(addChecklistItemRequest(event.id, name, newItemCategory.trim() || "General"));
    setNewItemName("");
  };

  const handleRemoveItem = (itemId: string) => {
    if (!event?.id) return;
    dispatch(removeChecklistItemRequest(event.id, itemId));
  };

  if (!event) return null;

  return (
    <div className="eqcm-overlay" onClick={onClose}>
      <div className="eqcm-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="eqcm-close" onClick={onClose} aria-label="Close">
          <CloseOutlined />
        </button>

        <div className="eqcm-head">
          <span className="eqcm-head-icon">
            <ToolOutlined />
          </span>
          <div>
            <h2>Equipment Checklist</h2>
            <p>{event.name}</p>
          </div>
        </div>

        {isUrgent && (
          <div className="eqcm-urgent-banner">
            <ClockCircleOutlined />
            {hrsLeft !== null
              ? `Event starts in about ${Math.max(1, Math.round(hrsLeft * 60))} min — confirm what's packed`
              : "Event starting soon — confirm what's packed"}
          </div>
        )}

        <div className="eqcm-progress-row">
          <svg className="eqcm-ring" width="64" height="64" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="eqcmRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38d5ff" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r={RING_RADIUS} className="eqcm-ring-track" fill="none" />
            <circle
              cx="32"
              cy="32"
              r={RING_RADIUS}
              fill="none"
              stroke="url(#eqcmRingGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              transform="rotate(-90 32 32)"
              className="eqcm-ring-fill"
            />
            <text x="32" y="37" textAnchor="middle" className="eqcm-ring-label">
              {Math.round(percent)}%
            </text>
          </svg>

          <div className="eqcm-progress-copy">
            <strong className={allPacked ? "all-packed" : ""}>
              {checkedCount} / {totalCount} packed
            </strong>
            <span>{allPacked ? "Everything's in the bag ✓" : "Tap items as you load the gear"}</span>
          </div>
        </div>

        {error && <div className="eqcm-error">{error}</div>}

        <div className="eqcm-items-scroll">
          {loading && !checklist ? (
            <p className="eqcm-loading">Loading checklist...</p>
          ) : totalCount === 0 ? (
            <p className="eqcm-loading">No items yet — add your first one below.</p>
          ) : (
            Object.keys(grouped).map((category) => {
              const color = categoryColor(category);
              const catChecked = grouped[category].filter((i) => i.checked).length;
              return (
                <div
                  className="eqcm-category"
                  key={category}
                  style={{ borderLeftColor: color.border }}
                >
                  <div className="eqcm-category-head">
                    <span
                      className="eqcm-category-label"
                      style={{ color: color.text, background: color.bg, borderColor: color.border }}
                    >
                      {category}
                    </span>
                    <span className="eqcm-category-count">
                      {catChecked}/{grouped[category].length}
                    </span>
                  </div>
                  {grouped[category].map((item: any) => (
                    <label className={`eqcm-item${item.checked ? " checked" : ""}`} key={item._id}>
                      <span className="eqcm-item-check">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => handleToggle(item._id, e.target.checked)}
                        />
                        <span className="eqcm-item-box">{item.checked && <CheckOutlined />}</span>
                        <span className="eqcm-item-name">{item.name}</span>
                      </span>
                      <button
                        type="button"
                        className="eqcm-item-remove"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveItem(item._id);
                        }}
                        aria-label={`Remove ${item.name}`}
                      >
                        <CloseOutlined />
                      </button>
                    </label>
                  ))}
                </div>
              );
            })
          )}
        </div>

        <div className="eqcm-add-row">
          <input
            className="eqcm-add-input"
            placeholder="Add item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
          />
          <input
            className="eqcm-add-input eqcm-add-category"
            placeholder="Category"
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
          />
          <button type="button" className="eqcm-add-btn" onClick={handleAddItem} aria-label="Add item">
            <PlusOutlined />
          </button>
        </div>
      </div>
    </div>
  );
}