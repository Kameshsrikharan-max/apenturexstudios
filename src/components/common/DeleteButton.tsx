import {useState,useRef,useCallback,useEffect,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import "./DeleteButton.css";

interface DeleteButtonProps {
  onDelete: () => void | Promise<void>;
  itemName?: string;
  title?: string;
  label?: string;
  description?: string;
  icon?: ReactNode;
  iconOnly?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  mode?: "modal" | "popover";
  confirmMethod?: "click" | "hold" | "type";
  holdDuration?: number;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

const POPOVER_WIDTH = 240;
const GAP = 10;
const VIEWPORT_PADDING = 10;

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const WarningIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
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

const DeleteButton: React.FC<DeleteButtonProps> = ({
  onDelete,
  itemName = "this item",
  title,
  label,
  description,
  icon,
  iconOnly = true,
  disabled = false,
  className = "",
  style,
  mode = "modal",
  confirmMethod = mode === "popover" ? "hold" : "click",
  holdDuration = 650,
  onSuccess,
  onError,
}) => {

  const resolvedTitle = title ?? label ?? "Delete";

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [holding, setHolding] = useState(false);
  const [justOpened, setJustOpened] = useState(false);
  const [typedValue, setTypedValue] = useState("");

  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const holdTimerRef = useRef<number | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; flip: boolean } | null>(null);

  const canConfirmTyped = confirmMethod !== "type" || typedValue.trim() === itemName.trim();

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
    if (mode !== "popover" || !open) {
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
  }, [mode, open, recalcPosition]);

  useEffect(() => {
    if (mode !== "popover" || !open) return undefined;
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
  }, [mode, open]);

  useEffect(() => {
    if (mode === "modal" && open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [mode, open]);

  useEffect(() => {
    if (mode === "modal" && open && confirmMethod === "type") {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [mode, open, confirmMethod]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    };
  }, []);

  const closeModal = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setTypedValue("");
    }, 180);
  };

  const runDelete = useCallback(async () => {
    try {
      setLoading(true);
      await onDelete();
      onSuccess?.(`${itemName} deleted`);
      if (mode === "modal") {
        closeModal();
      } else {
        setOpen(false);
      }
    } catch {
      onError?.(`Failed to delete ${itemName}`);
    } finally {
      setLoading(false);
      setHolding(false);
    }
    
  }, [onDelete, onSuccess, onError, itemName, mode]);

  const handleModalConfirm = async () => {
    if (!canConfirmTyped) {
      setShake(true);
      setTimeout(() => setShake(false), 420);
      return;
    }
    await runDelete();
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") closeModal();
    if (e.key === "Enter" && canConfirmTyped) handleModalConfirm();
  };

  const startHold = () => {
    if (loading) return;
    if (confirmMethod !== "hold" || holdDuration <= 0) {
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

  const renderedIcon = icon ?? <TrashIcon />;

  const modal =
    mode === "modal" && open
      ? createPortal(
          <div
            className={`delete-modal-overlay ${closing ? "is-closing" : ""}`}
            onClick={closeModal}
            onKeyDown={handleModalKeyDown}
            role="presentation"
          >
            <div
              className={`delete-modal-panel ${closing ? "is-closing" : ""} ${
                shake ? "is-shaking" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
            >
              <div className="delete-modal-glow" />

              <div className="delete-modal-icon-ring">
                <span className="delete-modal-ring-pulse" />
                <span className="delete-modal-ring-pulse delay" />
                <span className="delete-modal-icon">
                  <WarningIcon size={26} />
                </span>
              </div>

              <h3 id="delete-modal-title" className="delete-modal-title">
                {resolvedTitle}
              </h3>
              <p className="delete-modal-description">
                {description || (
                  <>
                    Delete <strong>{itemName}</strong>? This can&apos;t be undone.
                  </>
                )}
              </p>

              {confirmMethod === "type" && (
                <div className="delete-modal-confirm-field">
                  <label htmlFor="delete-confirm-input">
                    Type <span className="delete-modal-target">{itemName}</span> to confirm
                  </label>
                  <input
                    id="delete-confirm-input"
                    ref={inputRef}
                    type="text"
                    autoComplete="off"
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    placeholder={itemName}
                  />
                </div>
              )}

              <div className="delete-modal-actions">
                <button
                  className="delete-modal-btn cancel"
                  onClick={closeModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className={`delete-modal-btn confirm ${!canConfirmTyped ? "is-disabled" : ""}`}
                  onClick={handleModalConfirm}
                  disabled={loading}
                >
                  {loading ? <span className="delete-modal-spinner" /> : "Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  const popover =
    mode === "popover" && open && coords
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
                <WarningIcon size={18} />
              </span>
              <p>
                Delete <strong>{itemName}</strong>?
                <br />
                <small>This can&apos;t be undone.</small>
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
                style={{ "--hold-ms": `${holdDuration}ms` } as CSSProperties}
              >
                <span className="cdb-btn__fill" aria-hidden="true" />
                <span className="cdb-btn__label">
                  {loading
                    ? "Deleting…"
                    : holding
                    ? "Keep holding…"
                    : confirmMethod === "hold"
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
        aria-label={resolvedTitle}
        title={resolvedTitle}
        onClick={(e) => {
          e.stopPropagation();
          if (mode === "popover") {
            setOpen((v) => !v);
          } else {
            setOpen(true);
          }
        }}
      >
        <span className="cdb-trigger__icon">{renderedIcon}</span>
        {!iconOnly && <span className="cdb-trigger__label">{resolvedTitle}</span>}
      </button>
      {modal}
      {popover}
    </>
  );
};

export default DeleteButton;