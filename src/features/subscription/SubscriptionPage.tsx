import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, Variants } from "framer-motion";
import { CheckOutlined, LeftOutlined, PhoneOutlined } from "@ant-design/icons";
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

interface SubscriptionPageProps {
  user?: any;
  plans?: SubscriptionPlan[];
  plansPerPage?: number;
  onBack?: () => void;
  onSubscribe?: (plan: SubscriptionPlan) => void;
  onContactSales?: () => void;
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

// ---------- Header mark: orbiting satellite ring ----------
// A quiet ambient piece for the header — a ring with a dot in continuous
// orbit, in the spirit of a viewfinder/radar readout rather than a static icon.

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
// A real camera-adjacent instrument — the arc sweeps further round as you
// move up the plan lineup, easing to its new reading whenever the
// selection changes, like a meter needle settling on a value.

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

const useCountUp = (target: number, duration = 750) => {
  const [value, setValue] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
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
  }, [target, duration, reduceMotion]);

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
            ref={(el) => (itemRefs.current[i] = el)}
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
  onSubscribe?: (plan: SubscriptionPlan) => void;
}> = ({ plan, index, total, onSubscribe }) => {
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
            onClick={() => onSubscribe?.(plan)}
            disabled={plan.status === "current"}
          >
            {plan.status === "current" ? "Current Plan" : "Subscribe Now"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ---------- Main component ----------

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  plans = DEFAULT_PLANS,
  onBack,
  onSubscribe,
  onContactSales,
}) => {
  const initialIndex = Math.max(
    0,
    plans.findIndex((p) => p.status === "current" || p.status === "recommended")
  );
  const [selectedIndex, setSelectedIndex] = useState(initialIndex === -1 ? 0 : initialIndex);
  const selectedPlan = plans[selectedIndex] ?? plans[0];

  return (
    <div className="sub-page">
      <div className="sub-stage">
        <div className="sub-hud-bg" aria-hidden="true" />
        <div className="sub-scanline" aria-hidden="true" />

        {/* Header */}
        <div className="sub-header">
          {onBack && (
            <button type="button" className="sub-back" onClick={onBack}>
              <LeftOutlined /> Back
            </button>
          )}

          <div className="sub-title-wrap">
            <div className="sub-title-icon">
              <OrbitMark size={30} />
            </div>
            <div>
              <p className="sub-subtitle">Premium Access</p>
              <h1 className="sub-heading">Choose the perfect plan for your studio</h1>
              <p className="sub-readout">
                {plans.length} tiers available · viewing{" "}
                <span className="sub-readout__accent">{selectedPlan.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Console: rail + detail */}
        <div className="sub-body">
          <div className="sub-console">
            <PlanRail plans={plans} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
            <div className="sub-detail">
              <PlanDetail
                plan={selectedPlan}
                index={selectedIndex}
                total={plans.length}
                onSubscribe={onSubscribe}
              />
            </div>
          </div>

          {/* Contact sales */}
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
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;