// src/components/common/DeleteButton.tsx
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button, message } from "antd";
import { DeleteOutlined, WarningFilled } from "@ant-design/icons";
import "./DeleteButton.css";

interface DeleteButtonProps {
  onDelete: () => void | Promise<void>;
  itemName?: string;
  title?: string;
  description?: string;
  iconOnly?: boolean;
  size?: "small" | "middle" | "large";
  disabled?: boolean;
  className?: string;
  requireTypeConfirm?: boolean;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({
  onDelete,
  itemName = "this item",
  title = "Delete",
  description,
  iconOnly = true,
  size = "small",
  disabled = false,
  className,
  requireTypeConfirm = false,
}) => {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const canConfirm = !requireTypeConfirm || typedValue.trim() === itemName.trim();

  useEffect(() => {
    if (open && requireTypeConfirm) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open, requireTypeConfirm]);


  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const closeModal = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setTypedValue("");
    }, 180);
  };

  const handleConfirm = async () => {
    if (!canConfirm) {
      setShake(true);
      setTimeout(() => setShake(false), 420);
      return;
    }
    try {
      setLoading(true);
      await onDelete();
      message.success(`${itemName} deleted`);
      closeModal();
    } catch {
      message.error(`Failed to delete ${itemName}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") closeModal();
    if (e.key === "Enter" && canConfirm) handleConfirm();
  };

  const modal = (
    <div
      className={`delete-modal-overlay ${closing ? "is-closing" : ""}`}
      onClick={closeModal}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        className={`delete-modal-panel ${closing ? "is-closing" : ""} ${shake ? "is-shaking" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div className="delete-modal-glow" />

        <div className="delete-modal-icon-ring">
          <span className="delete-modal-ring-pulse" />
          <span className="delete-modal-ring-pulse delay" />
          <WarningFilled className="delete-modal-icon" />
        </div>

        <h3 id="delete-modal-title" className="delete-modal-title">
          {title}
        </h3>
        <p className="delete-modal-description">
          {description || (
            <>
              Delete <strong>{itemName}</strong>? This can't be undone.
            </>
          )}
        </p>

        {requireTypeConfirm && (
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
          <button className="delete-modal-btn cancel" onClick={closeModal} disabled={loading}>
            Cancel
          </button>
          <button
            className={`delete-modal-btn confirm ${!canConfirm ? "is-disabled" : ""}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <span className="delete-modal-spinner" /> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {iconOnly ? (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          size={size}
          disabled={disabled}
          className={className || "action-icon-btn"}
          onClick={() => setOpen(true)}
        />
      ) : (
        <Button
          danger
          size={size}
          disabled={disabled}
          className={className}
          onClick={() => setOpen(true)}
        >
          Delete
        </Button>
      )}

      {open && createPortal(modal, document.body)}
    </>
  );
};

export default DeleteButton;