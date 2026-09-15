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
  /** Fired once the simulated/real payment completes successfully. Wire this to
   *  your transactionStore / axs_transactions localStorage writer or backend call. */
  onPaymentSuccess?: (receipt: PaidReceipt) => void;
  /** Wire this to a POST against your axs-api-node backend (reusing mailer.js)
   *  to actually deliver the receipt email. If omitted, the flow simulates
   *  a send so the UI still completes end-to-end during development. */
  onSendReceiptEmail?: (receipt: PaidReceipt) => Promise<void>;
  /** Studio's UPI VPA the QR should encode. Replace with your real collect ID
   *  or your gateway's dynamic QR string in production. */
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
    status: "current",
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
        const symbol = plan.currencySymbol ?? "₹";
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
  const symbol = plan.currencySymbol ?? "₹";
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
  const symbol = plan.currencySymbol ?? "₹";
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
                  : "Confirming your scan…"}
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
                <LoadingOutlined spin /> Verifying payment securely…
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

// ---------- Receipt view (post-payment, plan-only) ----------

const ReceiptView: React.FC<{
  receipt: PaidReceipt;
  emailStatus: EmailStatus;
  onResendEmail: () => void;
  onBack: () => void;
}> = ({ receipt, emailStatus, onResendEmail, onBack }) => {
  const { plan, transactionId, amount, currencySymbol, paidAt, userEmail } = receipt;

  const handleDownloadPdf = () => {
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

    line("Transaction ID", transactionId);
    line("Plan", plan.name);
    line("Billing Cycle", plan.billingCycle);
    line("Amount Paid", `${currencySymbol}${amount.toLocaleString("en-IN")}`);
    line("Paid On", formatDateTime(paidAt));
    line("Status", "PAID");
    if (userEmail) line("Billed To", userEmail);

    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(48, y, pageWidth - 48, y);
    y += 28;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text("Plan Includes", 48, y);
    y += 20;
    doc.setFontSize(10.5);
    plan.features.forEach((feature) => {
      doc.setTextColor(71, 85, 105);
      doc.text(`•  ${feature}`, 56, y);
      y += 18;
    });

    y += 20;
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.text("This is a system-generated receipt from AXS Studio.", 48, y);

    doc.save(`AXS-Studio-Receipt-${transactionId}.pdf`);
  };

  return (
    <motion.div
      className="receipt-page"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="receipt-page__intro">
        <span className="receipt-page__badge">
          <CheckOutlined /> Payment Confirmed
        </span>
        <h2 className="receipt-page__title">You&apos;re on {plan.name}</h2>
        <p className="receipt-page__sub">
          Your subscription is active. A copy of this receipt has been emailed to you.
        </p>
      </div>

      <div className="receipt-card">
        <div className="receipt-card__top">
          <div>
            <p className="receipt-card__eyebrow">Transaction</p>
            <p className="receipt-card__txn">{transactionId}</p>
          </div>
          <span className="receipt-card__status">PAID</span>
        </div>

        <div className="receipt-card__amount-row">
          <span className="receipt-card__amount">
            {currencySymbol}
            {amount.toLocaleString("en-IN")}
          </span>
          <span className="receipt-card__cycle">/ {plan.billingCycle}</span>
        </div>
        <p className="receipt-card__date">Paid on {formatDateTime(paidAt)}</p>

        <div className="receipt-card__divider" />

        <p className="receipt-card__included-label">What&apos;s included</p>
        <ul className="receipt-card__features">
          {plan.features.map((feature) => (
            <li key={feature}>
              <CheckOutlined /> <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="receipt-card__email-status">
          <MailOutlined />
          {emailStatus === "sending" && <span>Sending receipt{userEmail ? ` to ${userEmail}` : ""}…</span>}
          {emailStatus === "sent" && <span>Receipt sent{userEmail ? ` to ${userEmail}` : ""}</span>}
          {emailStatus === "error" && <span>Couldn&apos;t send the email automatically.</span>}
          {emailStatus === "idle" && <span>Preparing your receipt email…</span>}
          {(emailStatus === "sent" || emailStatus === "error") && (
            <button type="button" className="receipt-card__resend" onClick={onResendEmail}>
              <RedoOutlined /> Resend
            </button>
          )}
        </div>

        <div className="receipt-card__actions">
          <button type="button" className="sub-btn-primary" onClick={handleDownloadPdf}>
            <DownloadOutlined /> Download PDF
          </button>
          <button type="button" className="sub-btn-outline" onClick={onBack}>
            Back to Plans
          </button>
        </div>
      </div>
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
  const [flowStage, setFlowStage] = useState<"browsing" | "paid">("browsing");
  const [receipt, setReceipt] = useState<PaidReceipt | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");

  // Lock background scroll while the payment modal is open.
  useEffect(() => {
    if (!checkoutPlan) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [checkoutPlan]);

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

  const handlePaymentComplete = useCallback(
    (paidReceipt: PaidReceipt) => {
      setReceipt(paidReceipt);
      setCheckoutPlan(null);
      setFlowStage("paid");
      onPaymentSuccess?.(paidReceipt);
      dispatchReceiptEmail(paidReceipt);
    },
    [onPaymentSuccess, dispatchReceiptEmail]
  );

  const handleBackToPlans = useCallback(() => {
    setFlowStage("browsing");
    setReceipt(null);
    setEmailStatus("idle");
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
              <p className="sub-subtitle">{flowStage === "paid" ? "Order Confirmed" : "Premium Access"}</p>
              <h1 className="sub-heading">
                {flowStage === "paid"
                  ? "Your subscription receipt"
                  : "Choose the perfect plan for your studio"}
              </h1>
              {flowStage === "browsing" && (
                <p className="sub-readout">
                  {plans.length} tiers available · viewing{" "}
                  <span className="sub-readout__accent">{selectedPlan.name}</span>
                </p>
              )}
            </div>
          </div>
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
              <ReceiptView
                receipt={receipt}
                emailStatus={emailStatus}
                onResendEmail={() => dispatchReceiptEmail(receipt)}
                onBack={handleBackToPlans}
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
    </div>
  );
};

export default SubscriptionPage;