import { useState, useRef, useCallback, useEffect, type ReactNode, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import "./ConfirmDeleteButton.css";

interface ConfirmDeleteButtonProps {
  onDelete: () => void | Promise<void>;
  itemName?: string;
  label?: string;
  icon: ReactNode;
  iconOnly?: boolean;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  /** Hold-duration in ms required to confirm delete. Set to 0 for instant click-confirm. */
  holdDuration?: number;
}

const POPOVER_WIDTH = 240;
const GAP = 10;
const VIEWPORT_PADDING = 10;

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <path
      d="M12 3.5 21.5 20h-19L12 3.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M12 9.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="17.2" r="1" fill="currentColor" />
  </svg>
);

export default function ConfirmDeleteButton({
  onDelete,
  itemName = "this item",
  label = "Delete",
  icon,
  iconOnly = true,
  className = "",
  style,
  disabled = false,
  holdDuration = 650,
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [holding, setHolding] = useState(false);
  const [justOpened, setJustOpened] = useState(false);

  const btnRef = useRef<HTMLButtonElement>(null);
  const holdTimerRef = useRef<number | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; flip: boolean } | null>(null);

  const recalcPosition = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let left = rect.right - POPOVER_WIDTH;
    left = Math.min(
      Math.max(left, VIEWPORT_PADDING),
      window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING
    );

    let top = rect.bottom + GAP;
    let flip = false;
    const estHeight = 150;
    if (top + estHeight > window.innerHeight - VIEWPORT_PADDING) {
      top = rect.top - estHeight - GAP;
      flip = true;
    }

    setCoords({ top, left, flip });
  }, []);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }
    recalcPosition();
    setJustOpened(true);
    const t = window.setTimeout(() => setJustOpened(false), 260);
    window.addEventListener("resize", recalcPosition);
    window.addEventListener("scroll", recalcPosition, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", recalcPosition);
      window.removeEventListener("scroll", recalcPosition, true);
    };
  }, [open, recalcPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const runDelete = useCallback(async () => {
    try {
      setLoading(true);
      await onDelete();
      setOpen(false);
    } finally {
      setLoading(false);
      setHolding(false);
    }
  }, [onDelete]);

  const startHold = () => {
    if (loading) return;
    if (holdDuration <= 0) {
      runDelete();
      return;
    }
    setHolding(true);
    holdTimerRef.current = window.setTimeout(() => {
      runDelete();
    }, holdDuration);
  };

  const cancelHold = () => {
    setHolding(false);
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    };
  }, []);

  const popover =
    open && coords
      ? createPortal(
          <div
            className={`cdb-popover ${coords.flip ? "cdb-popover--up" : "cdb-popover--down"} ${
              justOpened ? "cdb-popover--enter" : ""
            }`}
            role="dialog"
            aria-label={`Confirm delete ${itemName}`}
            style={{ top: coords.top, left: coords.left, width: POPOVER_WIDTH }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="cdb-popover__glow" aria-hidden="true" />
            <div className="cdb-popover__head">
              <span className="cdb-popover__warn-icon">
                <WarningIcon />
              </span>
              <p>
                Delete <strong>{itemName}</strong>?
                <br />
                <small>This can't be undone.</small>
              </p>
            </div>

            <div className="cdb-popover__actions">
              <button
                type="button"
                className="cdb-btn cdb-btn--ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={`cdb-btn cdb-btn--danger ${holding ? "is-holding" : ""} ${
                  loading ? "is-loading" : ""
                }`}
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                disabled={loading}
                style={
                  {
                    "--hold-ms": `${holdDuration}ms`,
                  } as CSSProperties
                }
              >
                <span className="cdb-btn__fill" aria-hidden="true" />
                <span className="cdb-btn__label">
                  {loading
                    ? "Deleting…"
                    : holding
                    ? "Keep holding…"
                    : holdDuration > 0
                    ? "Hold to delete"
                    : "Delete"}
                </span>
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        className={`cdb-trigger ${iconOnly ? "cdb-trigger--icon" : "cdb-trigger--full"} ${
          open ? "is-open" : ""
        } ${className}`}
        style={style}
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="cdb-trigger__icon">{icon}</span>
        {!iconOnly && <span className="cdb-trigger__label">{label}</span>}
      </button>
      {popover}
    </>
  );
}