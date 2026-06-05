import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarOutlined, CheckCircleOutlined,ClockCircleOutlined, DollarOutlined, DoubleLeftOutlined, CameraOutlined, PictureOutlined, PlusOutlined,TeamOutlined, ReloadOutlined, ArrowRightOutlined, ArrowLeftOutlined, EditOutlined, DeleteOutlined, PlusCircleOutlined, CreditCardOutlined, BankOutlined, WalletOutlined,FileTextOutlined,BarChartOutlined, BellOutlined, CloseOutlined, UploadOutlined, UserOutlined, InboxOutlined, WarningOutlined,} from "@ant-design/icons";
import "./PaymentPage.css";


const STEPS = [
  { label: "Event Details",   icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment",         icon: <DollarOutlined /> },
  { label: "Attendance",      icon: <ClockCircleOutlined /> },
  { label: "Media",           icon: <CameraOutlined /> },
  { label: "Album",           icon: <PictureOutlined /> },
  { label: "Closure",         icon: <CheckCircleOutlined /> },
];

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"];
const EMPTY_PAYMENT = { description: "", amount: "", mode: "UPI", date: "", notes: "" };


function EmptyState({ message }) {
  return (
    <div className="pp-empty-state">
      <div className="pp-empty-icon">
        <InboxOutlined />
      </div>
      <p>{message}</p>
    </div>
  );
}


function StatCard({ label, value, color }) {
  return (
    <div className="pp-stat-card">
      <span className="pp-stat-label">{label}</span>
      <span className={`pp-stat-val ${color || ""}`}>{value}</span>
    </div>
  );
}


function RecordPaymentModal({ onClose, onSave }) {
  const [form, setForm] = useState({ amount: "", date: "", notes: "" });
  return (
    <div className="pp-modal-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pp-modal-head">
          <h3>Record Customer Payment</h3>
          <button className="pp-modal-close" onClick={onClose}><CloseOutlined /></button>
        </div>
        <div className="pp-modal-body">
          <div className="pp-modal-field">
            <label><span className="pp-required">*</span> Payment Amount</label>
            <div className="pp-modal-input-wrap">
              <span className="pp-modal-prefix">₹</span>
              <input
                type="number"
                placeholder="Enter payment amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>
          <div className="pp-modal-field">
            <label><span className="pp-required">*</span> Payment Date</label>
            <div className="pp-modal-input-wrap">
              <input
                type="date"
                placeholder="Select payment date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <span className="pp-modal-suffix"><CalendarOutlined /></span>
            </div>
          </div>
          <div className="pp-modal-field">
            <label>Comments</label>
            <textarea
              placeholder="Enter notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
            />
          </div>
          <div className="pp-modal-field">
            <label>Receipt</label>
            <button className="pp-upload-btn"><UploadOutlined /> Upload Receipt</button>
            <span className="pp-upload-hint">Upload a copy of the receipt (JPG, PNG, or PDF)</span>
          </div>
        </div>
        <div className="pp-modal-footer">
          <button className="pp-secondary" onClick={onClose}>Cancel</button>
          <button
            className="pp-primary"
            onClick={() => {
              if (form.amount && form.date) {
                onSave({ ...form, id: Date.now(), status: "Received" });
                onClose();
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}


function FinancialOverviewTab({ payments, expenses }) {
  const totalReceived = payments.filter(p => p.status === "Received").reduce((s, p) => s + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balanceToBePaid = 0;
  const amountRemaining = totalReceived - totalExpenses - balanceToBePaid;

  const payoutsPayable = 0;
  const paidOut = 0;
  const payoutsRemaining = payoutsPayable - paidOut;
  const addExpPayable = 0;
  const addExpPaid = 0;
  const addExpRemaining = addExpPayable - addExpPaid;

  return (
    <div className="pp-tab-content">
      {/* stat row */}
      <div className="pp-stat-row">
        <StatCard label="TOTAL AMOUNT RECEIVED" value={`₹${totalReceived.toLocaleString()}`} color="pp-green" />
        <StatCard label="TOTAL EXPENSES"         value={`₹${totalExpenses.toLocaleString()}`} />
        <StatCard label="BALANCE TO BE PAID"     value={`₹${balanceToBePaid.toLocaleString()}`} color="pp-green" />
        <StatCard label="AMOUNT REMAINING"       value={`₹${amountRemaining.toLocaleString()}`} color="pp-green"
          sub="Received minus expenses and pending balance" />
      </div>

      {/* Customer Payment Receipts */}
      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Customer Payment Receipts</span>
          <span className="pp-section-count">{payments.length}</span>
        </div>
        <div className="pp-section-body">
          {payments.length === 0
            ? <EmptyState message="No customer payments have been recorded for this event yet." />
            : (
              <table className="pp-table">
                <thead><tr>
                  <th>Description</th><th>Amount</th><th>Date</th><th>Status</th><th>Notes</th>
                </tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>{p.description || "Payment"}</td>
                      <td><strong>₹{Number(p.amount).toLocaleString()}</strong></td>
                      <td>{p.date}</td>
                      <td><span className={`pp-badge ${p.status === "Received" ? "pp-confirmed" : "pp-pending"}`}>{p.status}</span></td>
                      <td className="pp-notes">{p.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      
      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Photographer Payouts Summary</span>
          <span className="pp-section-count">0</span>
          <div className="pp-section-meta">
            <span>Payable: <strong>₹{payoutsPayable}</strong></span>
            <span className="pp-green">Paid: ₹{paidOut}</span>
            <span className="pp-red">Remaining: ₹{payoutsRemaining}</span>
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
            <span>Payable: <strong>₹{addExpPayable}</strong></span>
            <span className="pp-green">Paid: ₹{addExpPaid}</span>
            <span className="pp-red">Remaining: ₹{addExpRemaining}</span>
          </div>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No additional expenses have been recorded for this event yet." />
        </div>
      </div>
    </div>
  );
}


function CustomerPaymentsTab({ payments, setPayments, eventAmount = 100000 }) {
  const [showModal, setShowModal] = useState(false);
  const totalReceived = payments.filter(p => p.status === "Received").reduce((s, p) => s + Number(p.amount), 0);
  const balance = eventAmount - totalReceived;

  const handleSave = (p) => {
    setPayments(prev => [...prev, { ...p, description: "Customer Payment" }]);
  };

  return (
    <div className="pp-tab-content">
      
      <div className="pp-stat-row pp-stat-row-3">
        <StatCard label="EVENT AMOUNT"   value={`₹${eventAmount.toLocaleString()}`} />
        <StatCard label="TOTAL RECEIVED" value={`₹${totalReceived.toLocaleString()}`} color="pp-green" />
        <StatCard label="BALANCE DUE"    value={`₹${balance.toLocaleString()}`}    color={balance > 0 ? "pp-red" : "pp-green"} />
      </div>

    
      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Customer Payments</span>
          <span className="pp-section-count">{payments.length}</span>
          <button className="pp-primary pp-add-action" onClick={() => setShowModal(true)}>
            <PlusOutlined /> Record Payment
          </button>
        </div>
        <div className="pp-section-body">
          {payments.length === 0 ? (
            <div className="pp-empty-state">
              <div className="pp-empty-icon"><InboxOutlined /></div>
              <p>No customer payments have been recorded for this event yet. Record the first payment to begin tracking balances.</p>
              <button className="pp-primary" onClick={() => setShowModal(true)}>
                <PlusOutlined /> Record First Payment
              </button>
            </div>
          ) : (
            <table className="pp-table">
              <thead><tr>
                <th>Amount</th><th>Date</th><th>Notes</th><th>Status</th>
              </tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td><strong>₹{Number(p.amount).toLocaleString()}</strong></td>
                    <td>{p.date}</td>
                    <td className="pp-notes">{p.notes || "—"}</td>
                    <td><span className={`pp-badge ${p.status === "Received" ? "pp-confirmed" : "pp-pending"}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    
      <div className="pp-section">
        <div className="pp-section-head">
          <BellOutlined className="pp-section-icon" />
          <span className="pp-section-title">Payment Reminders</span>
          <span className="pp-section-count">0</span>
          <button className="pp-outline-btn pp-add-action"><PlusOutlined /> Create Reminder</button>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No payment reminders have been created yet. Create a reminder to track upcoming customer payments." />
        </div>
      </div>

      {showModal && <RecordPaymentModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  );
}


function ExpensesPayoutsTab() {
  return (
    <div className="pp-tab-content">
      {/* 3 stat cards */}
      <div className="pp-stat-row pp-stat-row-3">
        <StatCard label="TOTAL PAYABLE" value="₹0" />
        <StatCard label="TOTAL PAID"    value="₹0" color="pp-green" />
        <StatCard label="ALL CLEARED"   value="₹0" color="pp-green" />
      </div>

      {/* Photographer Payment Reminders */}
      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Photographer Payment Reminders</span>
          <span className="pp-section-count">0</span>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No photographers have been assigned to this event yet. Assign photographers before managing payouts and reminders." />
        </div>
      </div>

      
      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Additional Expense Reminders</span>
          <span className="pp-section-count">0</span>
          <button className="pp-primary pp-add-action"><PlusOutlined /> Add Reminder Contact</button>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No reminder contacts have been added yet. Add a contact to schedule expense reminders for vendors or partners." />
        </div>
      </div>

      
      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Photographer Payouts</span>
          <span className="pp-section-count">0</span>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No photographers have been assigned to this event yet. Assign photographers before managing payouts." />
        </div>
      </div>

    
      <div className="pp-section">
        <div className="pp-section-head">
          <span className="pp-section-title">Additional Expenses & Payouts</span>
          <span className="pp-section-count">0</span>
          <button className="pp-primary pp-add-action"><PlusOutlined /> Record Additional Expense</button>
        </div>
        <div className="pp-section-body">
          <EmptyState message="No additional expenses have been recorded for this event. Add expenses to track vendor and operational costs." />
        </div>
      </div>
    </div>
  );
}


export default function PaymentPage() {
  const navigate   = useNavigate();
  const [activeStep, setActiveStep] = useState(2);
  const [activeTab, setActiveTab]   = useState(0);
  const [payments, setPayments]     = useState([]);

  const TABS = [
    { label: "Financial Overview",  icon: <BarChartOutlined /> },
    { label: "Customer Payments",   icon: <DollarOutlined /> },
    { label: "Expenses & Payouts",  icon: <FileTextOutlined /> },
  ];

  return (
    <main className="pp-page">
      <section className="pp-stage">

      
        <header className="pp-topbar">
          <button className="pp-back" type="button" onClick={() => navigate(-1)}>
            <DoubleLeftOutlined /> Back
          </button>

          <div className="pp-title-wrap">
            <span className="pp-title-icon"><DollarOutlined /></span>
            <div>
              <p className="pp-subtitle">Step 3 of 7 · Payment</p>
              <h1 className="pp-heading">Payment Details</h1>
            </div>
          </div>

          <div className="pp-progress" aria-label="Event progress">
            {[1, 2, 3, 4, 5].map((s) => (
              <span className={s <= 3 ? "done" : ""} key={s}>
                {s <= 3 ? <CheckCircleOutlined /> : s}
              </span>
            ))}
            <button type="button" aria-label="Refresh"><ReloadOutlined /></button>
          </div>
        </header>

        
        <div className="pp-body">

        
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

          
          <div className="pp-content">

          
            <div className="pp-progress-bar">
              <div className="pp-progress-fill" style={{ width: "29%" }} />
              <span className="pp-progress-pct">29%</span>
            </div>

            
            <div className="pp-hero-card">
              <div className="pp-hero-left">
                <DollarOutlined className="pp-hero-icon" />
                <div>
                  <h2>Financial Management</h2>
                  <p>Track customer payments, photographer payouts, and event expenses.</p>
                </div>
              </div>
              <button className="pp-refresh-btn" type="button">
                <ReloadOutlined /> Refresh
              </button>
            </div>

            
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

              
              {activeTab === 0 && <FinancialOverviewTab payments={payments} expenses={[]} />}
              {activeTab === 1 && <CustomerPaymentsTab payments={payments} setPayments={setPayments} />}
              {activeTab === 2 && <ExpensesPayoutsTab />}
            </div>

            
            <footer className="pp-actions">
              <button className="pp-secondary" type="button" onClick={() => navigate(-1)}>
                <ArrowLeftOutlined /> Previous Step
              </button>
              <button className="pp-primary" type="button" onClick={() => navigate("/events/create/attendance")}>
                Next Step <ArrowRightOutlined />
              </button>
            </footer>

          </div>
        </div>
      </section>
    </main>
  );
}