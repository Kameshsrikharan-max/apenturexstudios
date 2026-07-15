import React, { useMemo, useState } from "react";
import {
  StarOutlined,
  CheckOutlined,
  LeftOutlined,
  RightOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
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
    id: "standard-p4p",name: "Standard-p4p",
    description: "Professional photography delivery tools for your business.",price: 300,billingCycle: "monthly",
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



const StatusBadge: React.FC<{ status?: SubscriptionPlan["status"] }> = ({ status }) => {
  if (!status) {
    return <span className="sub-badge sub-badge--not-started">Available</span>;
  }
  if (status === "current") {
    return <span className="sub-badge sub-badge--current">Current Plan</span>;
  }
  return <span className="sub-badge sub-badge--recommended">Recommended</span>;
};

const PlanCard: React.FC<{
  plan: SubscriptionPlan;
  onSubscribe?: (plan: SubscriptionPlan) => void;
}> = ({ plan, onSubscribe }) => {
  const symbol = plan.currencySymbol ?? "₹";

  return (
    <div className={`sub-plan-card${plan.highlighted ? " sub-plan-card--highlighted" : ""}`}>
      <div className="sub-plan-card__header">
        <div className="sub-plan-card__title-row">
          <h3 className="sub-plan-card__name">{plan.name}</h3>
          <StatusBadge status={plan.status} />
        </div>
        <p className="sub-plan-card__description">{plan.description}</p>
      </div>

      <div className="sub-plan-card__body">
        <div className="sub-plan-card__price">
          <span className="sub-plan-card__price-amount">
            {symbol}
            {plan.price.toLocaleString("en-IN")}
          </span>
          <span className="sub-plan-card__price-cycle">/ {plan.billingCycle}</span>
        </div>

        <div className="sub-plan-card__divider" />

        <p className="sub-plan-card__included-label">What&apos;s included</p>

        <ul className="sub-plan-card__features">
          {plan.features.map((feature) => (
            <li key={feature} className="sub-plan-card__feature">
              <span className="sub-plan-card__check">
                <CheckOutlined />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sub-plan-card__footer">
        <button
          type="button"
          className={
            plan.status === "current"
              ? "sub-btn-outline sub-btn-full"
              : "sub-btn-primary sub-btn-full"
          }
          onClick={() => onSubscribe?.(plan)}
          disabled={plan.status === "current"}
        >
          {plan.status === "current" ? "Current Plan" : "Subscribe Now"}
        </button>
      </div>
    </div>
  );
};

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
}> = ({ currentPage, totalPages, totalItems, onPrev, onNext }) => (
  <div className="sub-pagination">
    <p className="sub-pagination__label">
      Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>{" "}
      <span className="sub-pagination__muted">({totalItems} Plans total)</span>
    </p>

    <div className="sub-pagination__controls">
      <button
        type="button"
        className="sub-pagination__btn"
        onClick={onPrev}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <LeftOutlined />
      </button>

      <button
        type="button"
        className="sub-pagination__btn"
        onClick={onNext}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <RightOutlined />
      </button>
    </div>
  </div>
);

// ---------- Main component ----------

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  plans = DEFAULT_PLANS,
  plansPerPage = 3,
  onBack,
  onSubscribe,
  onContactSales,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(plans.length / plansPerPage));

  const visiblePlans = useMemo(() => {
    const start = (currentPage - 1) * plansPerPage;
    return plans.slice(start, start + plansPerPage);
  }, [plans, currentPage, plansPerPage]);

  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="sub-page">
      <div className="sub-stage">
        {/* Top bar */}
        <div className="sub-topbar">
          {onBack && (
            <button type="button" className="sub-back" onClick={onBack}>
              <LeftOutlined /> Back
            </button>
          )}

          <div className="sub-title-wrap">
            <div className="sub-title-icon">
              <StarOutlined />
            </div>
            <div>
              <p className="sub-subtitle">Premium Access</p>
              <h1 className="sub-heading">Choose the perfect plan for your studio</h1>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="sub-body">
          {/* Plan cards */}
          <section className="sub-plan-grid">
            {visiblePlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onSubscribe={onSubscribe} />
            ))}
          </section>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={plans.length}
            onPrev={goPrev}
            onNext={goNext}
          />

          {/* Contact sales */}
          <section className="sub-contact">
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

         
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;