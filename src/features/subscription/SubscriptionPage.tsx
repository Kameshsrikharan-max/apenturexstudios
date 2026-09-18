import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, Variants } from "framer-motion";
import {
  CheckOutlined,
  LeftOutlined,
  PhoneOutlined,
  CloseOutlined,
  DownloadOutlined,
  MailOutlined,
  LoadingOutlined,
  RedoOutlined,
  SyncOutlined,
  CreditCardOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import "./SubscriptionPage.css";

// ---------- Types ----------

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currencySymbol?: string;
  billingCycle: "monthly" | "yearly";
  features: string[];
  highlighted?: boolean;
  status?: "not-started" | "current" | "recommended";
}

export interface PaidReceipt {
  transactionId: string;
  plan: SubscriptionPlan;
  amount: number;
  currencySymbol: string;
  paidAt: string; // ISO timestamp
  userName?: string;
  userEmail?: string;
}

export type SubscriptionStatus = "active" | "cancelled";

type CheckoutStage = "review" | "scanning" | "verifying" | "success";
type EmailStatus = "idle" | "sending" | "sent" | "error";

interface SubscriptionPageProps {
  user?: { name?: string; email?: string } & Record<string, any>;
  plans?: SubscriptionPlan[];
  plansPerPage?: number;
  onBack?: () => void;
  /** Fired the moment a user opens checkout for a plan (before payment). */
  onSubscribe?: (plan: SubscriptionPlan) => void;
  onContactSales?: () => void;
  onPaymentSuccess?: (receipt: PaidReceipt) => void;
  onSendReceiptEmail?: (receipt: PaidReceipt) => Promise<void>;
  /** Fired when the user confirms cancellation of their active subscription. */
  onCancelSubscription?: (receipt: PaidReceipt) => void;
  /** Fired when the user reactivates a previously cancelled subscription. */
  onReactivateSubscription?: (receipt: PaidReceipt) => void;
  merchantVpa?: string;
  merchantName?: string;
}

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "standard-p4p",
    name: "Standard-p4p",
    description: "Professional photography delivery tools for your business.",
    price: 300,
    billingCycle: "monthly",
    features: [
      "Create Events from enquiries",
      "Manage Users in your studio",
      "Review new users",
      "View Dashboard analytics",
    ],
  },
  {
    id: "starter-p4p",
    name: "Starter-p4p",
    description: "Professional photography delivery tools for your business.",
    price: 499,
    billingCycle: "monthly",

    features: [
      "Up to 2 team members",
      "10 GB storage",
      "5 active events",
      "Email support",
    ],
  },
  {
    id: "pro-p4p",
    name: "Pro-p4p",
    description: "Advanced tools for growing studios.",
    price: 999,
    billingCycle: "monthly",
    highlighted: true,
    status: "recommended",
    features: [
      "Up to 5 team members",
      "50 GB storage",
      "20 active events",
      "Priority support",
    ],
  },
  {
    id: "business-p4p",
    name: "Business-p4p",
    description: "For studios managing multiple photographers.",
    price: 1499,
    billingCycle: "monthly",
    features: [
      "Up to 10 team members",
      "200 GB storage",
      "Unlimited events",
      "Priority support",
    ],
  },
  {
    id: "elite-p4p",
    name: "Elite-p4p",
    description: "Premium tools with client-facing galleries.",
    price: 1999,
    billingCycle: "monthly",
    features: [
      "Up to 15 team members",
      "500 GB storage",
      "Unlimited events",
      "Client gallery branding",
    ],
  },
  {
    id: "studio-p4p",
    name: "Studio-p4p",
    description: "Full studio suite with automation.",
    price: 2499,
    billingCycle: "monthly",
    features: [
      "Up to 25 team members",
      "1 TB storage",
      "Unlimited events",
      "Workflow automation",
    ],
  },
  {
    id: "agency-p4p",
    name: "Agency-p4p",
    description: "Multi-brand support for photography agencies.",
    price: 3499,
    billingCycle: "monthly",
    features: [
      "Unlimited team members",
      "5 TB storage",
      "Unlimited events",
      "Dedicated account manager",
    ],
  },
];

// ---------- Small utils ----------

const generateTransactionId = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AXS-${stamp}-${rand}`;
};

const buildUpiString = (
  vpa: string,
  merchant: string,
  amount: number,
  note: string,
  txnId: string
) =>
  `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(
    merchant
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}&tr=${txnId}`;

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Adds one billing cycle (month or year) to an ISO timestamp. */
const addCycle = (iso: string, cycle: "monthly" | "yearly") => {
  const d = new Date(iso);
  if (cycle === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
};

const daysBetween = (fromMs: number, toMs: number) =>
  Math.round((toMs - fromMs) / 86_400_000);

// ---------- Subscription persistence (localStorage, matches the rest of AXS Studio) ----------

const SUBSCRIPTION_STORAGE_KEY = "axs_subscription_v1";
const SUBSCRIPTION_UPDATED_EVENT = "axsSubscriptionUpdated";

interface StoredSubscriptionState {
  flowStage: "browsing" | "paid";
  receipt: PaidReceipt | null;
  paymentHistory: PaidReceipt[];
  subStatus: SubscriptionStatus;
  autoRenewal: boolean;
  cycleStart: string;
  cycleEnd: string;
}

/** Reads the persisted subscription, if any. Never throws. */
const loadStoredSubscription = (): StoredSubscriptionState | null => {
  try {
    const raw = window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSubscriptionState;
    if (!parsed || !parsed.receipt) return null;
    return parsed;
  } catch {
    return null;
  }
};

/** Writes the subscription and notifies the rest of the app (same-tab reactivity). */
const persistSubscription = (state: StoredSubscriptionState) => {
  try {
    window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(SUBSCRIPTION_UPDATED_EVENT, { detail: state }));
  } catch {
    // Storage disabled/full — subscription still works for this session.
  }
};

const clearStoredSubscription = () => {
  try {
    window.localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(SUBSCRIPTION_UPDATED_EVENT, { detail: null }));
  } catch {
    // ignore
  }
};

// ---------- Header mark: orbiting satellite ring ----------

const OrbitMark: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className="orbit-mark" aria-hidden="true">
    <circle cx="50" cy="50" r="44" className="orbit-mark__track" />
    <circle cx="50" cy="50" r="34" className="orbit-mark__track orbit-mark__track--dashed" />
    <g className="orbit-mark__satellite-group">
      <circle cx="50" cy="6" r="4" className="orbit-mark__satellite" />
    </g>
    <circle cx="50" cy="50" r="8" className="orbit-mark__core" />
  </svg>
);

// ---------- Signature element: tier light-meter gauge ----------

const GAUGE_RADIUS = 56;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

const TierGauge: React.FC<{
  tierIndex: number;
  total: number;
  highlighted?: boolean;
}> = ({ tierIndex, total, highlighted }) => {
  const progress = total > 0 ? (tierIndex + 1) / total : 0;
  const offset = GAUGE_CIRCUMFERENCE * (1 - progress);
  const markerRotation = progress * 360;
  const ticks = Array.from({ length: total });
  const tickOuter = 66;
  const tickInner = 60;

  return (
    <svg
      viewBox="0 0 160 160"
      className={`tier-gauge${highlighted ? " tier-gauge--highlighted" : ""}`}
      aria-hidden="true"
    >
      <circle cx="80" cy="80" r={GAUGE_RADIUS} className="tier-gauge__track" />

      {ticks.map((_, i) => {
        const angle = (360 / total) * i - 90;
        const rad = (angle * Math.PI) / 180;
        const x1 = 80 + tickInner * Math.cos(rad);
        const y1 = 80 + tickInner * Math.sin(rad);
        const x2 = 80 + tickOuter * Math.cos(rad);
        const y2 = 80 + tickOuter * Math.sin(rad);
        const active = i === tierIndex;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className={`tier-gauge__tick${active ? " is-active" : ""}`}
          />
        );
      })}

      <circle
        cx="80"
        cy="80"
        r={GAUGE_RADIUS}
        className="tier-gauge__arc"
        style={{
          strokeDasharray: GAUGE_CIRCUMFERENCE,
          strokeDashoffset: offset,
        }}
      />

      <g
        className="tier-gauge__marker-group"
        style={{ transform: `rotate(${markerRotation}deg)`, transformOrigin: "80px 80px" }}
      >
        <circle cx="80" cy="24" r="5" className="tier-gauge__marker" />
      </g>

      <circle cx="80" cy="80" r="32" className="tier-gauge__core" />
      <text x="80" y="78" textAnchor="middle" className="tier-gauge__value">
        {tierIndex + 1}
      </text>
      <text x="80" y="94" textAnchor="middle" className="tier-gauge__total">
        of {total}
      </text>
    </svg>
  );
};

// ---------- Signature element: billing-cycle countdown ring ----------

const CYCLE_RADIUS = 70;
const CYCLE_CIRCUMFERENCE = 2 * Math.PI * CYCLE_RADIUS;

const CycleRing: React.FC<{
  startISO: string;
  endISO: string;
  status: SubscriptionStatus;
}> = ({ startISO, endISO, status }) => {
  const reduceMotion = useReducedMotion();
  const now = Date.now();
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const span = Math.max(1, end - start);
  const progress =
    status === "cancelled" ? 1 : Math.min(1, Math.max(0, (now - start) / span));
  const offset = CYCLE_CIRCUMFERENCE * (1 - progress);
  const daysLeft = Math.max(0, daysBetween(now, end));

  return (
    <svg
      viewBox="0 0 180 180"
      className={`cycle-ring${status === "cancelled" ? " cycle-ring--cancelled" : ""}`}
      aria-hidden="true"
    >
      <circle cx="90" cy="90" r={CYCLE_RADIUS} className="cycle-ring__track" />
      <circle
        cx="90"
        cy="90"
        r={CYCLE_RADIUS}
        className="cycle-ring__arc"
        style={{
          strokeDasharray: CYCLE_CIRCUMFERENCE,
          strokeDashoffset: offset,
          transition: reduceMotion ? "none" : undefined,
        }}
      />
      <text x="90" y="86" textAnchor="middle" className="cycle-ring__value">
        {status === "cancelled" ? "\u2014" : daysLeft}
      </text>
      <text x="90" y="107" textAnchor="middle" className="cycle-ring__label">
        {status === "cancelled" ? "access ends" : daysLeft === 1 ? "day left" : "days left"}
      </text>
    </svg>
  );
};

// ---------- Count-up hook ----------

const useCountUp = (target: number, duration = 750, active = true) => {
  const [value, setValue] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduceMotion, active]);

  return value;
};

// ---------- Status badge ----------

const StatusBadge: React.FC<{ status?: SubscriptionPlan["status"] }> = ({ status }) => {
  if (!status) return <span className="sub-badge sub-badge--not-started">Available</span>;
  if (status === "current") return <span className="sub-badge sub-badge--current">Current Plan</span>;
  return <span className="sub-badge sub-badge--recommended">Recommended</span>;
};

// ---------- Rail (plan selector) ----------

const PlanRail: React.FC<{
  plans: SubscriptionPlan[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}> = ({ plans, selectedIndex, onSelect }) => {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const last = plans.length - 1;
    let next = selectedIndex;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        next = selectedIndex === last ? 0 : selectedIndex + 1;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        next = selectedIndex === 0 ? last : selectedIndex - 1;
        break;
      case "Home":
        e.preventDefault();
        next = 0;
        break;
      case "End":
        e.preventDefault();
        next = last;
        break;
      default:
        return;
    }
    onSelect(next);
    itemRefs.current[next]?.focus();
  };

  return (
    <div
      className="sub-rail"
      role="listbox"
      aria-label="Subscription plans"
      onKeyDown={handleKeyDown}
    >
      <div className="sub-rail__line" aria-hidden="true" />
      {plans.map((plan, i) => {
        const active = i === selectedIndex;
        const symbol = plan.currencySymbol ?? "\u20b9";
        return (
          <button
            key={plan.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            role="option"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`sub-rail__item${active ? " is-active" : ""}${
              plan.status === "recommended" ? " is-recommended" : ""
            }`}
            onClick={() => onSelect(i)}
          >
            {active && (
              <motion.span
                className="sub-rail__highlight"
                layoutId="railHighlight"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className="sub-rail__marker">
              <span className="sub-rail__marker-dot" />
            </span>
            <span className="sub-rail__meta">
              <span className="sub-rail__name">{plan.name}</span>
              <span className="sub-rail__price">
                {symbol}
                {plan.price.toLocaleString("en-IN")}
                <span className="sub-rail__cycle">
                  /{plan.billingCycle === "monthly" ? "mo" : "yr"}
                </span>
              </span>
            </span>
            {plan.status && (
              <span
                className={`sub-rail__flag sub-rail__flag--${plan.status}`}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ---------- Detail panel ----------

const detailVariants: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -16, transition: { duration: 0.2, ease: "easeIn" } },
};

const PlanDetail: React.FC<{
  plan: SubscriptionPlan;
  index: number;
  total: number;
  onCheckout: (plan: SubscriptionPlan) => void;
}> = ({ plan, index, total, onCheckout }) => {
  const symbol = plan.currencySymbol ?? "\u20b9";
  const animatedPrice = useCountUp(plan.price);
  const reduceMotion = useReducedMotion();

  const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--spot-x", `${x}%`);
    el.style.setProperty("--spot-y", `${y}%`);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={plan.id}
        className={`sub-detail__panel${plan.highlighted ? " sub-detail__panel--highlighted" : ""}`}
        onMouseMove={handleSpotlight}
        initial={reduceMotion ? undefined : "hidden"}
        animate="show"
        exit={reduceMotion ? undefined : "exit"}
        variants={detailVariants}
      >
        <div className="sub-detail__spotlight" />

        <div className="sub-detail__head">
          <div className="sub-detail__head-text">
            <p className="sub-detail__eyebrow">
              Plan {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </p>
            <div className="sub-detail__title-row">
              <h2 className="sub-detail__name">{plan.name}</h2>
              <StatusBadge status={plan.status} />
            </div>
            <p className="sub-detail__description">{plan.description}</p>
          </div>
          <TierGauge tierIndex={index} total={total} highlighted={plan.highlighted} />
        </div>

        <div className="sub-detail__price-row">
          <span className="sub-detail__price">
            {symbol}
            {animatedPrice.toLocaleString("en-IN")}
          </span>
          <span className="sub-detail__cycle">/ {plan.billingCycle}</span>
        </div>

        <div className="sub-detail__divider" />

        <p className="sub-detail__included-label">What&apos;s included</p>

        <ul className="sub-detail__features">
          {plan.features.map((feature, i) => (
            <li key={feature} className="sub-detail__feature" style={{ ["--fi" as any]: i }}>
              <span className="sub-detail__check">
                <CheckOutlined />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="sub-detail__footer">
          <button
            type="button"
            className={
              plan.status === "current" ? "sub-btn-outline sub-btn-full" : "sub-btn-primary sub-btn-full"
            }
            onClick={() => onCheckout(plan)}
            disabled={plan.status === "current"}
          >
            {plan.status === "current" ? "Current Plan" : "Subscribe Now"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ---------- Payment modal: QR review -> scanning -> verifying -> success ----------

const PaymentModal: React.FC<{
  plan: SubscriptionPlan;
  transactionId: string;
  merchantVpa: string;
  merchantName: string;
  userName?: string;
  userEmail?: string;
  onClose: () => void;
  onComplete: (receipt: PaidReceipt) => void;
}> = ({ plan, transactionId, merchantVpa, merchantName, userName, userEmail, onClose, onComplete }) => {
  const [stage, setStage] = useState<CheckoutStage>("review");
  const reduceMotion = useReducedMotion();
  const symbol = plan.currencySymbol ?? "\u20b9";
  const upiString = buildUpiString(
    merchantVpa,
    merchantName,
    plan.price,
    `${plan.name} Subscription`,
    transactionId
  );

  const verifyProgress = useCountUp(100, 1100, stage === "verifying");

  // Escape key closes only while it's safe to abandon the payment.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (stage === "review" || stage === "success")) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [stage, onClose]);

  const handleQrActivate = useCallback(() => {
    if (stage !== "review") return;
    setStage("scanning");
  }, [stage]);

  // Scanning -> verifying -> success timed sequence.
  useEffect(() => {
    if (stage === "scanning") {
      const t = setTimeout(() => setStage("verifying"), 1500);
      return () => clearTimeout(t);
    }
    if (stage === "verifying") {
      const t = setTimeout(() => setStage("success"), 1300);
      return () => clearTimeout(t);
    }
    if (stage === "success") {
      const t = setTimeout(() => {
        onComplete({
          transactionId,
          plan,
          amount: plan.price,
          currencySymbol: symbol,
          paidAt: new Date().toISOString(),
          userName,
          userEmail,
        });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [stage, onComplete, transactionId, plan, symbol, userName, userEmail]);

  const canClose = stage === "review" || stage === "success";

  return (
    <motion.div
      className="pay-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && canClose) onClose();
      }}
    >
      <motion.div
        className="pay-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Pay for ${plan.name}`}
        initial={reduceMotion ? undefined : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
      >
        {canClose && (
          <button type="button" className="pay-modal__close" onClick={onClose} aria-label="Close payment dialog">
            <CloseOutlined />
          </button>
        )}

        <div className="pay-modal__head">
          <span className="pay-modal__eyebrow">Secure Checkout</span>
          <h3 className="pay-modal__plan-name">{plan.name}</h3>
          <div className="pay-amount">
            <span className="pay-amount__symbol">{symbol}</span>
            <span className="pay-amount__value">{plan.price.toLocaleString("en-IN")}</span>
            <span className="pay-amount__cycle">/ {plan.billingCycle}</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {(stage === "review" || stage === "scanning") && (
            <motion.div
              key="qr-stage"
              className="pay-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className={`pay-qr${stage === "scanning" ? " is-scanning" : ""}`}
                role="button"
                tabIndex={0}
                aria-label="Tap the QR code once you have completed the payment in your UPI app"
                onClick={handleQrActivate}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleQrActivate();
                  }
                }}
              >
                <span className="pay-qr__corner pay-qr__corner--tl" />
                <span className="pay-qr__corner pay-qr__corner--tr" />
                <span className="pay-qr__corner pay-qr__corner--bl" />
                <span className="pay-qr__corner pay-qr__corner--br" />
                <div className="pay-qr__frame">
                  <QRCodeSVG value={upiString} size={168} level="M" includeMargin={false} />
                </div>
                {stage === "scanning" && <span className="pay-qr__laser" aria-hidden="true" />}
              </div>

              <p className="pay-qr__hint">
                {stage === "review"
                  ? "Scan with any UPI app, then tap this QR to confirm"
                  : "Confirming your scan\u2026"}
              </p>
              <p className="pay-qr__txn">
                Ref ID <span>{transactionId}</span>
              </p>
            </motion.div>
          )}

          {stage === "verifying" && (
            <motion.div
              key="verify-stage"
              className="pay-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="pay-verify">
                <svg viewBox="0 0 120 120" className="pay-verify__ring" aria-hidden="true">
                  <circle cx="60" cy="60" r="52" className="pay-verify__track" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    className="pay-verify__arc"
                    style={{
                      strokeDasharray: 2 * Math.PI * 52,
                      strokeDashoffset: 2 * Math.PI * 52 * (1 - verifyProgress / 100),
                    }}
                  />
                </svg>
                <span className="pay-verify__pct">{verifyProgress}%</span>
              </div>
              <p className="pay-verify__label">
                <LoadingOutlined spin /> Verifying payment securely\u2026
              </p>
            </motion.div>
          )}

          {stage === "success" && (
            <motion.div
              key="success-stage"
              className="pay-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="pay-success">
                <span className="pay-success__ring pay-success__ring--1" aria-hidden="true" />
                <span className="pay-success__ring pay-success__ring--2" aria-hidden="true" />
                <span className="pay-success__ring pay-success__ring--3" aria-hidden="true" />
                <svg viewBox="0 0 80 80" className="pay-success__check" aria-hidden="true">
                  <circle cx="40" cy="40" r="36" className="pay-success__circle" />
                  <path
                    d="M24 41 L35 52 L57 28"
                    className="pay-success__tick"
                    pathLength={1}
                  />
                </svg>
              </div>
              <p className="pay-success__title">Payment Successful</p>
              <p className="pay-success__sub">
                {symbol}
                {plan.price.toLocaleString("en-IN")} paid for {plan.name}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// ---------- Auto-renewal toggle ----------

const AutoRenewToggle: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}> = ({ checked, disabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label="Toggle auto renewal"
    disabled={disabled}
    className={`renew-switch${checked ? " is-on" : ""}`}
    onClick={() => onChange(!checked)}
  >
    <span className="renew-switch__knob" />
  </button>
);

// ---------- Cancel confirmation modal ----------

const CancelSubscriptionModal: React.FC<{
  plan: SubscriptionPlan;
  accessUntil: string;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ plan, accessUntil, onClose, onConfirm }) => {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <motion.div
      className="pay-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="cancel-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={`Cancel ${plan.name} subscription`}
        initial={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 14, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
      >
        <button type="button" className="pay-modal__close" onClick={onClose} aria-label="Close dialog">
          <CloseOutlined />
        </button>

        <div className="cancel-modal__icon" aria-hidden="true">
          <ExclamationCircleOutlined />
        </div>
        <h3 className="cancel-modal__title">Cancel {plan.name}?</h3>
        <p className="cancel-modal__body">
          You&apos;ll keep full access to every feature until{" "}
          <strong>{formatDate(accessUntil)}</strong>. After that, auto-renewal stops
          and your studio drops back to the free tier.
        </p>

        <div className="cancel-modal__actions">
          <button type="button" className="sub-btn-outline sub-btn-full" onClick={onClose}>
            Keep Subscription
          </button>
          <button type="button" className="cancel-modal__confirm sub-btn-full" onClick={onConfirm}>
            Cancel Subscription
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ---------- Manage Subscription view (post-payment, plan-driven) ----------

const ManageSubscriptionView: React.FC<{
  plan: SubscriptionPlan;
  latestReceipt: PaidReceipt;
  history: PaidReceipt[];
  status: SubscriptionStatus;
  autoRenewal: boolean;
  cycleStart: string;
  cycleEnd: string;
  emailStatus: EmailStatus;
  merchantName: string;
  onToggleAutoRenewal: (next: boolean) => void;
  onRequestCancel: () => void;
  onReactivate: () => void;
  onResendEmail: () => void;
  onDownloadReceipt: (receipt: PaidReceipt) => void;
  onBack: () => void;
  onContactSales?: () => void;
}> = ({
  plan,
  latestReceipt,
  history,
  status,
  autoRenewal,
  cycleStart,
  cycleEnd,
  emailStatus,
  merchantName,
  onToggleAutoRenewal,
  onRequestCancel,
  onReactivate,
  onResendEmail,
  onDownloadReceipt,
  onBack,
  onContactSales,
}) => {
  const symbol = latestReceipt.currencySymbol;
  const isCancelled = status === "cancelled";

  return (
    <motion.div
      className="manage-page"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="manage-status-row">
        <span className="manage-pill manage-pill--premium">
          <SafetyCertificateOutlined /> Premium Subscription
        </span>
        <span className={`manage-pill manage-pill--status${isCancelled ? " is-cancelled" : " is-active"}`}>
          <span className="manage-pill__dot" />
          {isCancelled ? "Cancelled" : "Active Plan"}
        </span>
      </div>

      <div className="manage-hero">
        <div className="manage-hero__info">
          <p className="manage-hero__eyebrow">Subscription Price</p>
          <h2 className="manage-hero__plan-name">{plan.name}</h2>
          <div className="manage-hero__price-row">
            <span className="manage-hero__price">
              {symbol}
              {latestReceipt.amount.toLocaleString("en-IN")}
            </span>
            <span className="manage-hero__cycle">/ {plan.billingCycle}</span>
          </div>
          <p className="manage-hero__note">
            {isCancelled
              ? `Access remains open until ${formatDate(cycleEnd)}.`
              : autoRenewal
              ? `Renews automatically on ${formatDate(cycleEnd)}.`
              : `Auto-renewal is off \u2014 access ends ${formatDate(cycleEnd)}.`}
          </p>
        </div>
        <CycleRing startISO={cycleStart} endISO={cycleEnd} status={status} />
      </div>

      <div className="manage-grid">
        <div className="manage-tile">
          <span className="manage-tile__icon">
            <SyncOutlined />
          </span>
          <div className="manage-tile__body">
            <p className="manage-tile__label">Billing Mode</p>
            <p className="manage-tile__value">Automatic Autopay</p>
          </div>
        </div>

        <div className="manage-tile">
          <span className="manage-tile__icon">
            <CreditCardOutlined />
          </span>
          <div className="manage-tile__body">
            <p className="manage-tile__label">Payment Merchant</p>
            <p className="manage-tile__value">{merchantName}</p>
          </div>
        </div>

        <div className="manage-tile">
          <span className="manage-tile__icon">
            <SafetyCertificateOutlined />
          </span>
          <div className="manage-tile__body">
            <p className="manage-tile__label">Payment Status</p>
            <span className={`manage-status-chip${isCancelled ? " is-cancelled" : " is-paid"}`}>
              {isCancelled ? "Cancelled" : "Paid"}
            </span>
          </div>
        </div>

        <div className="manage-tile">
          <span className="manage-tile__icon">
            <CalendarOutlined />
          </span>
          <div className="manage-tile__body">
            <p className="manage-tile__label">Duration</p>
            <p className="manage-tile__value">
              {formatDate(cycleStart)} \u2013 {formatDate(cycleEnd)}
            </p>
          </div>
        </div>

        <div className="manage-tile manage-tile--switch">
          <span className="manage-tile__icon">
            <RedoOutlined />
          </span>
          <div className="manage-tile__body">
            <p className="manage-tile__label">Auto Renewal</p>
            <p className="manage-tile__value">{autoRenewal && !isCancelled ? "On" : "Off"}</p>
          </div>
          <AutoRenewToggle
            checked={autoRenewal && !isCancelled}
            disabled={isCancelled}
            onChange={onToggleAutoRenewal}
          />
        </div>
      </div>

      <div className="manage-inclusions">
        <p className="manage-inclusions__label">Plan Inclusions &amp; Permissions</p>
        <ul className="manage-inclusions__list">
          {plan.features.map((feature) => (
            <li key={feature}>
              <CheckOutlined />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="manage-email-status">
        <MailOutlined />
        {emailStatus === "sending" && (
          <span>Sending receipt{latestReceipt.userEmail ? ` to ${latestReceipt.userEmail}` : ""}\u2026</span>
        )}
        {emailStatus === "sent" && (
          <span>Receipt sent{latestReceipt.userEmail ? ` to ${latestReceipt.userEmail}` : ""}</span>
        )}
        {emailStatus === "error" && <span>Couldn&apos;t send the email automatically.</span>}
        {emailStatus === "idle" && <span>Preparing your receipt email\u2026</span>}
        {(emailStatus === "sent" || emailStatus === "error") && (
          <button type="button" className="receipt-card__resend" onClick={onResendEmail}>
            <RedoOutlined /> Resend
          </button>
        )}
      </div>

      <div className="manage-actions">
        <button type="button" className="sub-btn-primary" onClick={() => onDownloadReceipt(latestReceipt)}>
          <DownloadOutlined /> Download Receipt
        </button>
        {isCancelled ? (
          <button type="button" className="sub-btn-outline" onClick={onReactivate}>
            <UndoOutlined /> Reactivate
          </button>
        ) : (
          <button type="button" className="manage-cancel-btn" onClick={onRequestCancel}>
            Cancel Subscription
          </button>
        )}
        <button type="button" className="sub-btn-outline" onClick={onBack}>
          Back to Plans
        </button>
      </div>

      <section className="manage-history">
        <div className="manage-history__head">
          <span className="manage-history__icon" aria-hidden="true">
            <CalendarOutlined />
          </span>
          <h3>Payment History</h3>
        </div>

        <div className="manage-history__table-wrap">
          <table className="manage-history__table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Plan Name</th>
                <th>Payment Date</th>
                <th>Amount Paid</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.transactionId}>
                  <td>INV-{r.transactionId.slice(-8)}</td>
                  <td>{r.plan.name}</td>
                  <td>{formatDate(r.paidAt)}</td>
                  <td>
                    {r.currencySymbol}
                    {r.amount.toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span className="manage-status-chip is-paid">Paid</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="manage-history__dl"
                      onClick={() => onDownloadReceipt(r)}
                      aria-label={`Download receipt ${r.transactionId}`}
                    >
                      <DownloadOutlined />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sub-contact">
        <div className="sub-contact__radar" aria-hidden="true" />
        <div className="sub-contact__glow" />
        <h2 className="sub-contact__title">
          Need a tailored solution for your photography enterprise?
        </h2>
        <p className="sub-contact__subtitle">
          Get in touch with our studio team for custom storage capacity exceeding
          10 TB, multi-brand dashboard support, custom routing, and unified
          billing.
        </p>

        <button type="button" className="sub-btn-primary sub-contact__btn" onClick={onContactSales}>
          <PhoneOutlined /> Contact Sales
        </button>
      </section>
    </motion.div>
  );
};

// ---------- Main component ----------

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  user,
  plans = DEFAULT_PLANS,
  onBack,
  onSubscribe,
  onContactSales,
  onPaymentSuccess,
  onSendReceiptEmail,
  onCancelSubscription,
  onReactivateSubscription,
  merchantVpa = "axsstudio@okhdfcbank",
  merchantName = "AXS Studio",
}) => {
  const initialIndex = Math.max(
    0,
    plans.findIndex((p) => p.status === "current" || p.status === "recommended")
  );
  const [selectedIndex, setSelectedIndex] = useState(initialIndex === -1 ? 0 : initialIndex);
  const selectedPlan = plans[selectedIndex] ?? plans[0];

  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutTxnId, setCheckoutTxnId] = useState<string>("");

  // Rehydrate any existing subscription from localStorage exactly once, on
  // first mount, so refreshing the page or navigating away and back doesn't
  // reset an already-paid plan back to "no plan chosen".
  const [initialSub] = useState<StoredSubscriptionState | null>(() => loadStoredSubscription());

  const [flowStage, setFlowStage] = useState<"browsing" | "paid">(initialSub?.flowStage ?? "browsing");
  const [receipt, setReceipt] = useState<PaidReceipt | null>(initialSub?.receipt ?? null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>(initialSub?.receipt ? "sent" : "idle");

  // Subscription lifecycle state — driven entirely by the plan that was paid for.
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>(initialSub?.subStatus ?? "active");
  const [autoRenewal, setAutoRenewal] = useState(initialSub?.autoRenewal ?? true);
  const [paymentHistory, setPaymentHistory] = useState<PaidReceipt[]>(initialSub?.paymentHistory ?? []);
  const [cycleStart, setCycleStart] = useState<string>(initialSub?.cycleStart ?? "");
  const [cycleEnd, setCycleEnd] = useState<string>(initialSub?.cycleEnd ?? "");
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Keep localStorage (and any other part of the app listening for
  // SUBSCRIPTION_UPDATED_EVENT) in sync with the live subscription state.
  useEffect(() => {
    if (!receipt) {
      clearStoredSubscription();
      return;
    }
    persistSubscription({
      flowStage,
      receipt,
      paymentHistory,
      subStatus,
      autoRenewal,
      cycleStart,
      cycleEnd,
    });
  }, [flowStage, receipt, paymentHistory, subStatus, autoRenewal, cycleStart, cycleEnd]);

  // Lock background scroll while any modal is open.
  useEffect(() => {
    if (!checkoutPlan && !showCancelModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [checkoutPlan, showCancelModal]);

  const openCheckout = useCallback(
    (plan: SubscriptionPlan) => {
      onSubscribe?.(plan);
      setCheckoutTxnId(generateTransactionId());
      setCheckoutPlan(plan);
    },
    [onSubscribe]
  );

  const closeCheckout = useCallback(() => {
    setCheckoutPlan(null);
  }, []);

  const dispatchReceiptEmail = useCallback(
    async (paidReceipt: PaidReceipt) => {
      setEmailStatus("sending");
      try {
        if (onSendReceiptEmail) {
          await onSendReceiptEmail(paidReceipt);
        } else {
          // Demo fallback so the flow completes during development.
          // Replace by wiring onSendReceiptEmail to a POST on your
          // axs-api-node backend that reuses mailer.js, e.g.:
          //   POST http://localhost:4000/send-receipt-email
          //   body: { to: paidReceipt.userEmail, receipt: paidReceipt }
          await new Promise((resolve) => setTimeout(resolve, 1300));
        }
        setEmailStatus("sent");
      } catch (err) {
        setEmailStatus("error");
      }
    },
    [onSendReceiptEmail]
  );

  // The plan just paid for immediately becomes the new subscription: cycle
  // dates, auto-renewal, and status are all (re)computed from it here, and
  // the receipt is prepended to the running payment history.
  const handlePaymentComplete = useCallback(
    (paidReceipt: PaidReceipt) => {
      setReceipt(paidReceipt);
      setPaymentHistory((prev) => [paidReceipt, ...prev]);
      setCycleStart(paidReceipt.paidAt);
      setCycleEnd(addCycle(paidReceipt.paidAt, paidReceipt.plan.billingCycle));
      setSubStatus("active");
      setAutoRenewal(true);
      setCheckoutPlan(null);
      setFlowStage("paid");
      onPaymentSuccess?.(paidReceipt);
      dispatchReceiptEmail(paidReceipt);
    },
    [onPaymentSuccess, dispatchReceiptEmail]
  );

  const handleBackToPlans = useCallback(() => {
    setFlowStage("browsing");
  }, []);

  const requestCancel = useCallback(() => setShowCancelModal(true), []);
  const closeCancelModal = useCallback(() => setShowCancelModal(false), []);

  const confirmCancel = useCallback(() => {
    setSubStatus("cancelled");
    setAutoRenewal(false);
    setShowCancelModal(false);
    if (receipt) onCancelSubscription?.(receipt);
  }, [receipt, onCancelSubscription]);

  const reactivate = useCallback(() => {
    setSubStatus("active");
    setAutoRenewal(true);
    setCycleEnd((prevEnd) => {
      const now = Date.now();
      if (receipt && new Date(prevEnd).getTime() < now) {
        return addCycle(new Date().toISOString(), receipt.plan.billingCycle);
      }
      return prevEnd;
    });
    if (receipt) onReactivateSubscription?.(receipt);
  }, [receipt, onReactivateSubscription]);

  const generateReceiptPdf = useCallback((r: PaidReceipt) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(9, 20, 37);
    doc.rect(0, 0, pageWidth, 96, "F");
    doc.setTextColor(56, 213, 255);
    doc.setFontSize(11);
    doc.text("AXS STUDIO", 48, 40);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("Payment Receipt", 48, 66);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    let y = 130;
    const line = (label: string, value: string) => {
      doc.setTextColor(100, 116, 139);
      doc.text(label, 48, y);
      doc.setTextColor(15, 23, 42);
      doc.text(value, 220, y);
      y += 24;
    };

    line("Transaction ID", r.transactionId);
    line("Plan", r.plan.name);
    line("Billing Cycle", r.plan.billingCycle);
    line("Amount Paid", `${r.currencySymbol}${r.amount.toLocaleString("en-IN")}`);
    line("Paid On", formatDateTime(r.paidAt));
    line("Status", "PAID");
    if (r.userEmail) line("Billed To", r.userEmail);

    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(48, y, pageWidth - 48, y);
    y += 28;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text("Plan Includes", 48, y);
    y += 20;
    doc.setFontSize(10.5);
    r.plan.features.forEach((feature) => {
      doc.setTextColor(71, 85, 105);
      doc.text(`\u2022  ${feature}`, 56, y);
      y += 18;
    });

    y += 20;
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.text("This is a system-generated receipt from AXS Studio.", 48, y);

    doc.save(`AXS-Studio-Receipt-${r.transactionId}.pdf`);
  }, []);

  return (
    <div className="sub-page">
      <div className="sub-stage">
        <div className="sub-hud-bg" aria-hidden="true" />
        <div className="sub-scanline" aria-hidden="true" />

        {/* Header */}
        <div className="sub-header">
          {onBack && flowStage === "browsing" && (
            <button type="button" className="sub-back" onClick={onBack}>
              <LeftOutlined /> Back
            </button>
          )}
          {flowStage === "paid" && (
            <button type="button" className="sub-back" onClick={handleBackToPlans}>
              <LeftOutlined /> Plans
            </button>
          )}

          <div className="sub-title-wrap">
            <div className="sub-title-icon">
              <OrbitMark size={30} />
            </div>
            <div>
              <p className="sub-subtitle">
                {flowStage === "paid"
                  ? subStatus === "cancelled"
                    ? "Subscription Cancelled"
                    : "Subscription Active"
                  : "Premium Access"}
              </p>
              <h1 className="sub-heading">
                {flowStage === "paid"
                  ? "Manage your studio subscription"
                  : "Choose the perfect plan for your studio"}
              </h1>
              {flowStage === "browsing" && (
                <p className="sub-readout">
                  {plans.length} tiers available \u00b7 viewing{" "}
                  <span className="sub-readout__accent">{selectedPlan.name}</span>
                </p>
              )}
            </div>
          </div>

          {flowStage === "browsing" && receipt && (
            <button type="button" className="sub-manage-link" onClick={() => setFlowStage("paid")}>
              <SafetyCertificateOutlined /> Manage Subscription
            </button>
          )}
        </div>

        {/* Body */}
        <div className="sub-body">
          {flowStage === "browsing" ? (
            <>
              <div className="sub-console">
                <PlanRail plans={plans} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
                <div className="sub-detail">
                  <PlanDetail
                    plan={selectedPlan}
                    index={selectedIndex}
                    total={plans.length}
                    onCheckout={openCheckout}
                  />
                </div>
              </div>

              <section className="sub-contact">
                <div className="sub-contact__radar" aria-hidden="true" />
                <div className="sub-contact__glow" />
                <h2 className="sub-contact__title">
                  Need a tailored solution for your photography enterprise?
                </h2>
                <p className="sub-contact__subtitle">
                  Get in touch with our studio team for custom storage capacity exceeding
                  10 TB, multi-brand dashboard support, custom routing, and unified
                  billing.
                </p>

                <button
                  type="button"
                  className="sub-btn-primary sub-contact__btn"
                  onClick={onContactSales}
                >
                  <PhoneOutlined /> Contact Sales
                </button>
              </section>
            </>
          ) : (
            receipt && (
              <ManageSubscriptionView
                plan={receipt.plan}
                latestReceipt={receipt}
                history={paymentHistory}
                status={subStatus}
                autoRenewal={autoRenewal}
                cycleStart={cycleStart}
                cycleEnd={cycleEnd}
                emailStatus={emailStatus}
                merchantName={merchantName}
                onToggleAutoRenewal={setAutoRenewal}
                onRequestCancel={requestCancel}
                onReactivate={reactivate}
                onResendEmail={() => dispatchReceiptEmail(receipt)}
                onDownloadReceipt={generateReceiptPdf}
                onBack={handleBackToPlans}
                onContactSales={onContactSales}
              />
            )
          )}
        </div>
      </div>

      <AnimatePresence>
        {checkoutPlan && (
          <PaymentModal
            plan={checkoutPlan}
            transactionId={checkoutTxnId}
            merchantVpa={merchantVpa}
            merchantName={merchantName}
            userName={user?.name}
            userEmail={user?.email}
            onClose={closeCheckout}
            onComplete={handlePaymentComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCancelModal && receipt && (
          <CancelSubscriptionModal
            plan={receipt.plan}
            accessUntil={cycleEnd}
            onClose={closeCancelModal}
            onConfirm={confirmCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubscriptionPage;