import { useState, useCallback, useEffect, useRef, useId } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarOutlined,
  DoubleLeftOutlined, CameraOutlined, PictureOutlined, PlusOutlined, TeamOutlined,
  ReloadOutlined, ArrowRightOutlined, ArrowLeftOutlined, FileTextOutlined,
  BarChartOutlined, BellOutlined, CloseOutlined, UploadOutlined, InboxOutlined,
  EditOutlined, DeleteOutlined, ExclamationCircleOutlined,
  MobileOutlined, CreditCardOutlined, GlobalOutlined, WalletOutlined, SwapOutlined,
  DownOutlined,
} from "@ant-design/icons";
import "./PaymentPage.css";
import {
  upsertTransaction,
  type PaymentMethod,
  type StoredTransaction,
} from "../../../utils/transactionStore";
import {
  notifyPaymentReceived,
  notifyPaymentPending,
  notifyPaymentCompleted,
} from "../../../components/UI/notificationTriggers"; 

// ─── Constants ───

const STEPS = [
  { label: "Event Details",   icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment",         icon: <DollarOutlined /> },
  { label: "Attendance",      icon: <ClockCircleOutlined /> },
  { label: "Media",           icon: <CameraOutlined /> },
  { label: "Album",           icon: <PictureOutlined /> },
  { label: "Closure",         icon: <CheckCircleOutlined /> },
];

const PAYMENT_METHODS: PaymentMethod[] = ["UPI", "Card", "Net Banking", "Cash", "Bank Transfer"];

// Icon + short description shown per option in the custom payment-method dropdown.
const PAYMENT_METHOD_META: Record<PaymentMethod, { icon: React.ReactNode; sub: string }> = {
  "UPI":            { icon: <MobileOutlined />,     sub: "Instant transfer via UPI app" },
  "Card":           { icon: <CreditCardOutlined />, sub: "Credit or debit card" },
  "Net Banking":    { icon: <GlobalOutlined />,      sub: "Pay directly from your bank" },
  "Cash":           { icon: <WalletOutlined />,      sub: "Paid in person" },
  "Bank Transfer":  { icon: <SwapOutlined />,        sub: "NEFT / RTGS / IMPS" },
};

// ─── sessionStorage helpers ──────

function loadEvent() {
  try {
    const raw = sessionStorage.getItem("currentEvent");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}


function getPaymentKey(event) {
  return `eventPayments__${event?._createdAt || event?.eventName || "default"}`;
}

function savePayments(payments, event) {
  try {
    sessionStorage.setItem(getPaymentKey(event), JSON.stringify(payments));
  } catch(error){
   console.error(error);
}
}


function loadPayments(event) {
  try {
    const raw = sessionStorage.getItem(getPaymentKey(event));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── Amount formatting helpers ───

function formatIndianAmount(value) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN");
}

function stripCommas(value) {
  return String(value).replace(/,/g, "");
}

// ─── Shared UI atoms ───

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="pp-empty-state">
      <div className="pp-empty-icon"><InboxOutlined /></div>
      <p>{message}</p>
      {action}
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="pp-stat-card">
      <span className="pp-stat-label">{label}</span>
      <span className={`pp-stat-val ${color || ""}`}>{value}</span>
      {sub && <span className="pp-stat-sub">{sub}</span>}
    </div>
  );
}

function PaymentMethodSelect({
  id,
  value,
  onChange,
  onBlur,
  hasError,
}: {
  id: string;
  value: PaymentMethod | "";
  onChange: (val: PaymentMethod) => void;
  onBlur?: () => void;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  const meta = value ? PAYMENT_METHOD_META[value] : null;

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const menuMaxH = 320;
    const openUpward = rect.bottom + menuMaxH > viewportH - 16 && rect.top > menuMaxH;

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      ...(openUpward
        ? { bottom: viewportH - rect.top + 8 }
        : { top: rect.bottom + 8 }),
      maxHeight: menuMaxH,
    });
  }, []);

  const openMenu = useCallback(() => {
    const idx = value ? PAYMENT_METHODS.indexOf(value) : 0;
    setActiveIndex(idx === -1 ? 0 : idx);
    positionMenu();
    setOpen(true);
  }, [positionMenu, value]);

  const closeMenu = useCallback((refocus = true) => {
    setOpen(false);
    onBlur?.();
    if (refocus) triggerRef.current?.focus();
  }, [onBlur]);

  useEffect(() => {
    if (!open) return;
    const handleReposition = () => positionMenu();
    const handleOutside = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      closeMenu(false);
    };
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    document.addEventListener("mousedown", handleOutside);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [open, positionMenu, closeMenu]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      if (!open) openMenu();
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, PAYMENT_METHODS.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onChange(PAYMENT_METHODS[activeIndex]);
        closeMenu();
        break;
      case "Escape":
        e.preventDefault();
        closeMenu();
        break;
      case "Tab":
        setOpen(false);
        onBlur?.();
        break;
    }
  };

  return (
    <div className="pms-wrap">
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`pms-trigger ${open ? "pms-open" : ""} ${hasError ? "pms-error" : ""}`}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-listbox`}
      >
        <span className={`pms-trigger-icon ${!meta ? "pms-icon-empty" : ""}`}>
          {meta ? meta.icon : <MobileOutlined />}
        </span>
        <span className={`pms-trigger-label ${!value ? "pms-placeholder" : ""}`}>
          {value || "Select a method"}
        </span>
        <span className="pms-chevron-wrap"><DownOutlined /></span>
      </button>

      {open &&
        createPortal(
          <div
            id={`${uid}-listbox`}
            ref={menuRef}
            role="listbox"
            className="pms-menu"
            style={menuStyle}
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            aria-activedescendant={`${uid}-opt-${activeIndex}`}
          >
            {PAYMENT_METHODS.map((m, idx) => {
              const optMeta = PAYMENT_METHOD_META[m];
              const isSelected = m === value;
              const isActive = idx === activeIndex;
              return (
                <div
                  key={m}
                  id={`${uid}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`pms-option ${isSelected ? "pms-selected" : ""} ${isActive ? "pms-active" : ""}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onChange(m);
                    closeMenu();
                  }}
                >
                  <span className="pms-option-icon">{optMeta.icon}</span>
                  <span className="pms-option-text">
                    <span className="pms-option-label">{m}</span>
                    <span className="pms-option-sub">{optMeta.sub}</span>
                  </span>
                  {isSelected && (
                    <span className="pms-option-check"><CheckCircleOutlined /></span>
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

// ─── Delete Confirm Modal ────

function DeleteConfirmModal({ payment, onConfirm, onCancel }) {
  return (
    <div className="pp-modal-overlay" onClick={onCancel}>
      <div className="pp-modal pp-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="pp-modal-head pp-modal-head-danger">
          <div className="pp-delete-icon-wrap">
            <ExclamationCircleOutlined />
          </div>
          <h3>Delete Payment</h3>
          <button className="pp-modal-close" onClick={onCancel}><CloseOutlined /></button>
        </div>
        <div className="pp-modal-body pp-delete-body">
          <p>Are you sure you want to delete this payment?</p>
          <div className="pp-delete-summary">
            <span className="pp-delete-amount">
              ₹{Number(stripCommas(String(payment.amount))).toLocaleString("en-IN")}
            </span>
            <span className="pp-delete-date">{payment.date}</span>
          </div>
          <p className="pp-delete-warn">This action cannot be undone.</p>
        </div>
        <div className="pp-modal-footer">
          <button className="pp-secondary" type="button" onClick={onCancel}>Cancel</button>
          <button className="pp-danger" type="button" onClick={onConfirm}>
            <DeleteOutlined /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function validatePaymentForm(form, eventAmount, alreadyPaid, editingId, allPayments) {
  const errors: any = {};

  const rawAmount = stripCommas(String(form.amount || "")).trim();
  if (!rawAmount) {
    errors.amount = "Payment amount is required.";
  } else {
    const num = Number(rawAmount);
    if (isNaN(num) || num <= 0) {
      errors.amount = "Enter a valid amount greater than ₹0.";
    } else if (!Number.isInteger(num)) {
      errors.amount = "Amount must be a whole number (no decimals).";
    } else if (eventAmount > 0) {
      const editingOriginal = editingId
        ? allPayments
            .filter(p => p.id === editingId && p.status === "Received")
            .reduce((s, p) => s + Number(stripCommas(String(p.amount))), 0)
        : 0;
      const paidExcludingCurrent = alreadyPaid - editingOriginal;
      if (num > eventAmount - paidExcludingCurrent) {
        const remaining = (eventAmount - paidExcludingCurrent).toLocaleString("en-IN");
        errors.amount = `Amount exceeds the remaining balance of ₹${remaining}.`;
      }
    }
  }

  if (!form.date) {
    errors.date = "Payment date is required.";
  } else {
    const selected = new Date(form.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    if (selected < today) {
      errors.date = "Payment date cannot be in the past.";
    }
  }

  if (!form.method) {
    errors.method = "Payment method is required.";
  }

  return errors;
}

function RecordPaymentModal({
  onClose,
  onSave,
  eventAmount = 0,
  alreadyPaid = 0,
  allPayments = [],
  editingPayment = null,
}) {
  const isEdit = !!editingPayment;

  const [form, setForm] = useState(() => {
    if (isEdit) {
      return {
        amount: formatIndianAmount(String(editingPayment.amount)),
        date:   editingPayment.date,
        notes:  editingPayment.notes || "",
        method: editingPayment.method || "UPI",
      };
    }

    return { amount: "", date: "", notes: "", method: "" };
  });

  const [errors, setErrors]             = useState<any>({});
  const [touched, setTouched]           = useState<any>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const touch = (field) => setTouched(t => ({ ...t, [field]: true }));

  const handleChange = (field, value) => {
    let updated;
    if (field === "amount") {
      updated = { ...form, [field]: formatIndianAmount(value) };
    } else {
      updated = { ...form, [field]: value };
    }
    setForm(updated);
    if (touched[field] || submitAttempted) {
      setErrors(validatePaymentForm(
        updated, eventAmount, alreadyPaid,
        isEdit ? editingPayment.id : null, allPayments
      ));
    }
  };

  const handleBlur = (field) => {
    touch(field);
    setErrors(validatePaymentForm(
      form, eventAmount, alreadyPaid,
      isEdit ? editingPayment.id : null, allPayments
    ));
  };

  const handleSave = () => {
    setSubmitAttempted(true);
    const errs = validatePaymentForm(
      form, eventAmount, alreadyPaid,
      isEdit ? editingPayment.id : null, allPayments
    );
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSave({
      id:          isEdit ? editingPayment.id : Date.now(),
      description: "Customer Payment",
      amount:      stripCommas(form.amount),
      date:        form.date,
      notes:       form.notes.trim(),
      method:      form.method,
      status:      "Received",
    });
    onClose();
  };

  const showError = (field) =>
    (touched[field] || submitAttempted) && errors[field]
      ? <span className="pp-field-error">{errors[field]}</span>
      : null;

  const hasErrors = Object.keys(
    validatePaymentForm(
      form, eventAmount, alreadyPaid,
      isEdit ? editingPayment.id : null, allPayments
    )
  ).length > 0;

  const todayStr = new Date().toISOString().split("T")[0];

  const editingOriginal = isEdit
    ? allPayments
        .filter(p => p.id === editingPayment.id && p.status === "Received")
        .reduce((s, p) => s + Number(stripCommas(String(p.amount))), 0)
    : 0;
  const remainingBalance = Math.max(0, eventAmount - (alreadyPaid - editingOriginal));

  return (
    <div className="pp-modal-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pp-modal-head">
          <h3>{isEdit ? "Edit Customer Payment" : "Record Customer Payment"}</h3>
          <button className="pp-modal-close" onClick={onClose}><CloseOutlined /></button>
        </div>

        <div className="pp-modal-body">

          {/* ── Amount ── */}
          <div className={`pp-modal-field${(touched.amount || submitAttempted) && errors.amount ? " pp-field-has-error" : ""}`}>
            <label htmlFor="pm-amount">
              <span className="pp-required">*</span> Payment Amount
            </label>
            <div className="pp-modal-input-wrap">
              <span className="pp-modal-prefix">₹</span>
              <input
                id="pm-amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={form.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                onBlur={() => handleBlur("amount")}
                className={(touched.amount || submitAttempted) && errors.amount ? "inp-error" : ""}
                autoComplete="off"
              />
            </div>
            {showError("amount")}
            {eventAmount > 0 && !errors.amount && (
              <span className="pp-field-hint">
                Remaining balance: ₹{remainingBalance.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          {/* ── Payment Method ── */}
          <div className={`pp-modal-field pms-field${(touched.method || submitAttempted) && errors.method ? " pp-field-has-error" : ""}`}>
            <label htmlFor="pm-method">
              <span className="pp-required">*</span> Payment Method
            </label>
            <PaymentMethodSelect
              id="pm-method"
              value={form.method}
              onChange={(m) => handleChange("method", m)}
              onBlur={() => handleBlur("method")}
              hasError={!!((touched.method || submitAttempted) && errors.method)}
            />
            {showError("method")}
          </div>

          {/* ── Date ── */}
          <div className={`pp-modal-field${(touched.date || submitAttempted) && errors.date ? " pp-field-has-error" : ""}`}>
            <label htmlFor="pm-date">
              <span className="pp-required">*</span> Payment Date
            </label>
            <div className="pp-modal-input-wrap">
              <input
                id="pm-date"
                type="date"
                value={form.date}
                min={todayStr}
                onChange={(e) => handleChange("date", e.target.value)}
                onBlur={() => handleBlur("date")}
                className={(touched.date || submitAttempted) && errors.date ? "inp-error" : ""}
                autoComplete="off"
              />
              <span className="pp-modal-suffix"><CalendarOutlined /></span>
            </div>
            {showError("date")}
            <span className="pp-field-hint">Only today or a future date is allowed.</span>
          </div>

          {/* ── Notes ── */}
          <div className="pp-modal-field">
            <label htmlFor="pm-notes">Comments</label>
            <textarea
              id="pm-notes"
              placeholder="Enter notes (optional)"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={4}
              autoComplete="off"
            />
          </div>

          {/* ── Receipt upload (UI only) ── */}
          <div className="pp-modal-field">
            <label>Receipt</label>
            <button type="button" className="pp-upload-btn">
              <UploadOutlined /> Upload Receipt
            </button>
            <span className="pp-upload-hint">JPG, PNG, or PDF</span>
          </div>

        </div>

        <div className="pp-modal-footer">
          <button className="pp-secondary" type="button" onClick={onClose}>Cancel</button>
          <button
            className="pp-primary"
            type="button"
            onClick={handleSave}
            style={hasErrors && submitAttempted ? { opacity: 0.6 } : {}}
          >
            {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}


function FinancialOverviewTab({ payments, expenses, eventAmount }) {
  const totalReceived = payments
    .filter(p => p.status === "Received")
    .reduce((s, p) => s + Number(stripCommas(String(p.amount))), 0);
  const totalExpenses   = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balanceDue      = Math.max(0, eventAmount - totalReceived);
  const amountRemaining = totalReceived - totalExpenses;

  return (
    <div className="pp-tab-content">
      <div className="pp-stat-row">
        <StatCard
          label="EVENT AMOUNT"
          value={`₹${eventAmount.toLocaleString("en-IN")}`}
        />
        <StatCard
          label="TOTAL RECEIVED"
          value={`₹${totalReceived.toLocaleString("en-IN")}`}
          color="pp-green"
        />
        <StatCard
          label="BALANCE DUE"
          value={`₹${balanceDue.toLocaleString("en-IN")}`}
          color={balanceDue > 0 ? "pp-red" : "pp-green"}
        />
        <StatCard
          label="AMOUNT REMAINING"
          value={`₹${amountRemaining.toLocaleString("en-IN")}`}
          color={amountRemaining >= 0 ? "pp-green" : "pp-red"}
          sub="Received minus expenses"
        />
      </div>

      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Customer Payment Receipts</span>
          <span className="pp-section-count">{payments.length}</span>
        </div>
        <div className="pp-section-body">
          {payments.length === 0 ? (
            <EmptyState message="No customer payments have been recorded for this event yet." />
          ) : (
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{p.description || "Payment"}</td>
                    <td>
                      <strong>₹{Number(stripCommas(String(p.amount))).toLocaleString("en-IN")}</strong>
                    </td>
                    <td>{p.date}</td>
                    <td>
                      <span className={`pp-badge ${p.status === "Received" ? "pp-confirmed" : "pp-pending"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="pp-notes">{p.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Photographer Payouts Summary</span>
          <span className="pp-section-count">0</span>
          <div className="pp-section-meta">
            <span>Payable: <strong>₹0</strong></span>
            <span className="pp-green">Paid: ₹0</span>
            <span className="pp-red">Remaining: ₹0</span>
          </div>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No photographers have been assigned to this event yet." />
        </div>
      </div>

      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Additional Expenses Summary</span>
          <span className="pp-section-count">0</span>
          <div className="pp-section-meta">
            <span>Payable: <strong>₹0</strong></span>
            <span className="pp-green">Paid: ₹0</span>
            <span className="pp-red">Remaining: ₹0</span>
          </div>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No additional expenses have been recorded for this event yet." />
        </div>
      </div>
    </div>
  );
}

// ─── Customer Payments Tab ───

function CustomerPaymentsTab({
  payments,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  eventAmount,
}) {
  const [showModal,    setShowModal]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const totalReceived = payments
    .filter(p => p.status === "Received")
    .reduce((s, p) => s + Number(stripCommas(String(p.amount))), 0);
  const balance = Math.max(0, eventAmount - totalReceived);

  const handleEditClick = (payment) => {
    setEditTarget(payment);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditTarget(null);
  };

  const handleSave = (p) => {
    if (editTarget) {
      onEditPayment(p);
    } else {
      onAddPayment(p);
    }
    handleModalClose();
  };

  const handleDeleteClick  = (payment) => setDeleteTarget(payment);
  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDeletePayment((deleteTarget as any).id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="pp-tab-content">
      {/* Stats — update only after a payment is recorded */}
      <div className="pp-stat-row pp-stat-row-3">
        <StatCard
          label="EVENT AMOUNT"
          value={`₹${eventAmount.toLocaleString("en-IN")}`}
        />
        <StatCard
          label="TOTAL RECEIVED"
          value={`₹${totalReceived.toLocaleString("en-IN")}`}
          color="pp-green"
        />
        <StatCard
          label="BALANCE DUE"
          value={`₹${balance.toLocaleString("en-IN")}`}
          color={balance > 0 ? "pp-red" : "pp-green"}
        />
      </div>

      {/* Payments list */}
      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Customer Payments</span>
          <span className="pp-section-count">{payments.length}</span>
          <button
            className="pp-primary pp-add-action"
            onClick={() => { setEditTarget(null); setShowModal(true); }}
          >
            <PlusOutlined /> Record Payment
          </button>
        </div>
        <div className="pp-section-body">
          {payments.length === 0 ? (
            <EmptyState
              message="No customer payments have been recorded yet. Record the first payment to begin tracking balances."
              action={
                <button
                  className="pp-primary"
                  onClick={() => { setEditTarget(null); setShowModal(true); }}
                >
                  <PlusOutlined /> Record First Payment
                </button>
              }
            />
          ) : (
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th className="pp-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>
                      <strong>₹{Number(stripCommas(String(p.amount))).toLocaleString("en-IN")}</strong>
                    </td>
                    <td>{p.method || "—"}</td>
                    <td>{p.date}</td>
                    <td className="pp-notes">{p.notes || "—"}</td>
                    <td>
                      <span className={`pp-badge ${p.status === "Received" ? "pp-confirmed" : "pp-pending"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="pp-row-actions">
                      <button
                        className="pp-icon-btn pp-icon-edit"
                        type="button"
                        title="Edit payment"
                        onClick={() => handleEditClick(p)}
                      >
                        <EditOutlined />
                      </button>
                      <button
                        className="pp-icon-btn pp-icon-delete"
                        type="button"
                        title="Delete payment"
                        onClick={() => handleDeleteClick(p)}
                      >
                        <DeleteOutlined />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payment Reminders */}
      <div className="pp-section">
        <div className="pp-section-head">
          <BellOutlined className="pp-section-icon" />
          <span className="pp-section-title">Payment Reminders</span>
          <span className="pp-section-count">0</span>
          <button className="pp-outline-btn pp-add-action">
            <PlusOutlined /> Create Reminder
          </button>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No payment reminders have been created yet." />
        </div>
      </div>

      {/* Record / Edit modal */}
      {showModal && (
        <RecordPaymentModal
          onClose={handleModalClose}
          onSave={handleSave}
          eventAmount={eventAmount}
          alreadyPaid={totalReceived}
          allPayments={payments}
          editingPayment={editTarget}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          payment={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Expenses & Payouts Tab ────

function ExpensesPayoutsTab() {
  return (
    <div className="pp-tab-content">
      <div className="pp-stat-row pp-stat-row-3">
        <StatCard label="TOTAL PAYABLE" value="₹0" />
        <StatCard label="TOTAL PAID"    value="₹0" color="pp-green" />
        <StatCard label="ALL CLEARED"   value="₹0" color="pp-green" />
      </div>

      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Photographer Payment Reminders</span>
          <span className="pp-section-count">0</span>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No photographers have been assigned to this event yet." />
        </div>
      </div>

      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Additional Expense Reminders</span>
          <span className="pp-section-count">0</span>
          <button className="pp-primary pp-add-action">
            <PlusOutlined /> Add Reminder Contact
          </button>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No reminder contacts have been added yet." />
        </div>
      </div>

      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Photographer Payouts</span>
          <span className="pp-section-count">0</span>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No photographers have been assigned to this event yet." />
        </div>
      </div>

      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Additional Expenses & Payouts</span>
          <span className="pp-section-count">0</span>
          <button className="pp-primary pp-add-action">
            <PlusOutlined /> Record Additional Expense
          </button>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No additional expenses have been recorded for this event." />
        </div>
      </div>
    </div>
  );
}



export default function PaymentPage() {
  const navigate = useNavigate();

  const [event] = useState(() => loadEvent());
  const eventAmount = event?.eventAmountNumeric ?? 0;

  const [payments, setPaymentsState] = useState(() => loadPayments(event));

  const setPayments = useCallback((updater) => {
    setPaymentsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      savePayments(next, event);
      return next;
    });
  }, [event]);

  const handleAddPayment = useCallback((payment) => {
    setPayments(prev => [...prev, payment]);
  }, [setPayments]);

  const handleEditPayment = useCallback((updated) => {
    setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, [setPayments]);

  const handleDeletePayment = useCallback((id) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  }, [setPayments]);

  // Tracks the transaction status from the previous run of the effect below,
  // so we only fire a notification on a genuine status transition rather than
  // on every re-render (this effect re-runs whenever `payments` changes).
  const prevStatusRef = useRef<StoredTransaction["status"] | null>(null);

  // ── Push a computed transaction record into the shared store used by TransactionPage ──
  useEffect(() => {
    if (!event) return;

    const totalReceived = payments
      .filter((p: any) => p.status === "Received")
      .reduce((s, p: any) => s + Number(stripCommas(String(p.amount))), 0);
    const balance = Math.max(0, eventAmount - totalReceived);

    const status: StoredTransaction["status"] =
      eventAmount > 0 && totalReceived >= eventAmount
        ? "Paid"
        : totalReceived > 0
        ? "Partial"
        : "Pending";

    const lastPayment = [...payments].sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0] as any;

    upsertTransaction({
      id: String(event._createdAt || event.eventName || "default"),
      eventName: event.eventName || "Untitled Event",
      clientName: event.clientName || "—",
      date: lastPayment?.date || event.eventDate || new Date().toISOString().split("T")[0],
      totalAmount: eventAmount,
      amountPaid: totalReceived,
      balanceAmount: balance,
      status,
      method: (lastPayment?.method as PaymentMethod) || "UPI",
    });

    // Fire a notification only on a genuine status transition (Pending ->
    // Partial -> Paid), not on every render this effect happens to run on.
    if (prevStatusRef.current !== status && lastPayment) {
      const notifParams = {
        amount: Number(stripCommas(String(lastPayment.amount))),
        clientName: event.clientName || "—",
        transactionId: String(event._createdAt || event.eventName || "default"),
        totalAmount: eventAmount,
        amountPaid: totalReceived,
        balanceAmount: balance,
      };

      if (status === "Paid") {
        notifyPaymentCompleted(notifParams);
      } else if (status === "Partial" && prevStatusRef.current !== "Paid") {
        notifyPaymentReceived(notifParams);
      } else if (status === "Pending" && prevStatusRef.current !== null) {
        // A payment was removed and the event dropped back to Pending —
        // surface it as a pending notification rather than staying silent.
        notifyPaymentPending(notifParams);
      }
      // status === "Pending" && prevStatusRef.current === null: initial
      // mount with no payments recorded yet — nothing worth notifying.
    }
    prevStatusRef.current = status;
  }, [payments, event, eventAmount]);

  const [activeStep, setActiveStep] = useState(2);
  const [activeTab,  setActiveTab]  = useState(0);

  const TABS = [
    { label: "Financial Overview", icon: <BarChartOutlined /> },
    { label: "Customer Payments",  icon: <DollarOutlined /> },
    { label: "Expenses & Payouts", icon: <FileTextOutlined /> },
  ];

  return (
    <main className="pp-page">
      <section className="pp-stage">

        {/* ── Top bar ── */}
        <header className="pp-topbar">
          <button className="pp-back" type="button" onClick={() => navigate(-1)}>
            <DoubleLeftOutlined /> Back
          </button>
          <div className="pp-title-wrap">
            <span className="pp-title-icon"><DollarOutlined /></span>
            <div>
              <p className="pp-subtitle">Step 3 of 7 · Payment</p>
              <h1 className="pp-heading">
                Payment Details
                {event?.eventName && (
                  <span className="pp-heading-sub"> — {event.eventName}</span>
                )}
              </h1>
            </div>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="pp-body">

          {/* Side rail */}
          <aside className="pp-rail">
            {STEPS.map((step, i) => (
              <div className="pp-step-wrap" key={step.label}>
                <button
                  className={`pp-step ${i === activeStep ? "active" : ""} ${i < activeStep ? "done" : ""}`}
                  type="button"
                  onClick={() => setActiveStep(i)}
                  aria-label={step.label}
                >
                  {i < activeStep ? <CheckCircleOutlined /> : step.icon}
                  {i === activeStep && <span className="pp-step-dot" />}
                </button>
                <span className="pp-tooltip">{step.label}</span>
              </div>
            ))}
          </aside>

          {/* Main content */}
          <div className="pp-content">

            {/* Progress bar */}
            <div className="pp-progress-bar">
              <div className="pp-progress-fill" style={{ width: "29%" }} />
              <span className="pp-progress-pct">29%</span>
            </div>

            {/* Hero card */}
            <div className="pp-hero-card">
              <div className="pp-hero-left">
                <DollarOutlined className="pp-hero-icon" />
                <div>
                  <h2>Financial Management</h2>
                  <p>
                    Track customer payments, photographer payouts, and event expenses.
                    {eventAmount > 0 && (
                      <> Event total: <strong>₹{eventAmount.toLocaleString("en-IN")}</strong></>
                    )}
                    {eventAmount === 0 && !event && (
                      <> (No event amount found — go back and fill in Event Details.)</>
                    )}
                  </p>
                </div>
              </div>
              <button
                className="pp-refresh-btn"
                type="button"
                onClick={() => window.location.reload()}
              >
                <ReloadOutlined /> Refresh
              </button>
            </div>

            {/* Tabs panel */}
            <div className="pp-panel">
              <div className="pp-tabs">
                {TABS.map((tab, i) => (
                  <button
                    key={tab.label}
                    className={`pp-tab ${activeTab === i ? "active" : ""}`}
                    onClick={() => setActiveTab(i)}
                    type="button"
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 0 && (
                <FinancialOverviewTab
                  payments={payments}
                  expenses={[]}
                  eventAmount={eventAmount}
                />
              )}
              {activeTab === 1 && (
                <CustomerPaymentsTab
                  payments={payments}
                  onAddPayment={handleAddPayment}
                  onEditPayment={handleEditPayment}
                  onDeletePayment={handleDeletePayment}
                  eventAmount={eventAmount}
                />
              )}
              {activeTab === 2 && <ExpensesPayoutsTab />}
            </div>

            {/* Footer navigation */}
            <footer className="pp-actions">
              <button
                className="pp-secondary"
                type="button"
                onClick={() => navigate(-1)}
              >
                <ArrowLeftOutlined /> Previous Step
              </button>
              <button
                className="pp-primary"
                type="button"
                onClick={() => navigate("/events/create/attendance")}
              >
                Next Step <ArrowRightOutlined />
              </button>
            </footer>

          </div>
        </div>
      </section>
    </main>
  );
}