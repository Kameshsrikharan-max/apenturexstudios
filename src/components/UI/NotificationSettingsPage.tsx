import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LeftOutlined,
  CheckOutlined,
  BellOutlined,
  FileSearchOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  DollarOutlined,
  PictureOutlined,
  SaveOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import "./NotificationSettingsPage.css";

type Channel = "inApp" | "email";

type CategoryPref = {
  inApp: boolean;
  email: boolean;
};

type NotificationCategory = {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
};

const CATEGORIES: NotificationCategory[] = [
  {
    key: "reviewEndorsement",
    title: "Review Endorsement and Approval",
    description: "Referral, endorsement, and approval decisions.",
    icon: <FileSearchOutlined />,
    accent: "#38bdf8",
  },
  {
    key: "changeRequest",
    title: "Change Request",
    description: "Profile and studio update request notifications.",
    icon: <EditOutlined />,
    accent: "#22c55e",
  },
  {
    key: "deleteRequest",
    title: "Delete Request",
    description: "Delete request submissions and decisions.",
    icon: <DeleteOutlined />,
    accent: "#f87171",
  },
  {
    key: "eventAssignment",
    title: "Event Assignment",
    description: "New assignments and assignment responses.",
    icon: <TeamOutlined />,
    accent: "#60a5fa",
  },
  {
    key: "paymentExpenses",
    title: "Payment and Expenses Alert",
    description: "Payment reminders and expense alerts.",
    icon: <DollarOutlined />,
    accent: "#fbbf24",
  },
  {
    key: "mediaNotifications",
    title: "Media Notifications",
    description: "Media submission, acknowledgement, and upload summary updates.",
    icon: <PictureOutlined />,
    accent: "#06b6d4",
  },
];

const STORAGE_KEY = "notificationPreferencesByCategory";

const DEFAULT_PREFS: Record<string, CategoryPref> = CATEGORIES.reduce(
  (acc, category) => {
    acc[category.key] = { inApp: true, email: false };
    return acc;
  },
  {} as Record<string, CategoryPref>
);

const loadPrefs = (): Record<string, CategoryPref> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_PREFS;

    const parsed = JSON.parse(saved);
    const merged: Record<string, CategoryPref> = {};

    CATEGORIES.forEach((category) => {
      merged[category.key] = {
        inApp: parsed?.[category.key]?.inApp ?? true,
        email: parsed?.[category.key]?.email ?? false,
      };
    });

    return merged;
  } catch {
    return DEFAULT_PREFS;
  }
};

const countActive = (prefs: Record<string, CategoryPref>) => {
  return Object.values(prefs).filter((p) => p.inApp || p.email).length;
};

function NotificationSettingsPage() {
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState<Record<string, CategoryPref>>(loadPrefs);
  const [initialPrefs, setInitialPrefs] = useState<Record<string, CategoryPref>>(loadPrefs);
  const [saved, setSaved] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(initialPrefs),
    [prefs, initialPrefs]
  );

  const activeCount = useMemo(() => countActive(prefs), [prefs]);

  const toggleChannel = (categoryKey: string, channel: Channel) => {
    setSaved(false);
    setPrefs((current) => ({
      ...current,
      [categoryKey]: {
        ...current[categoryKey],
        [channel]: !current[categoryKey][channel],
      },
    }));
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setInitialPrefs(prefs);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  };

  return (
    <div className="ns-page">
      <div className="ns-orb ns-orb-1" />
      <div className="ns-orb ns-orb-2" />

      <div className="ns-scroll-area">
        <motion.button
          type="button"
          className="ns-back-button"
          onClick={handleGoBack}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.96 }}
        >
          <LeftOutlined />
          <span>Go Back</span>
        </motion.button>

        <motion.div
          className="ns-hero"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <div className="ns-hero-glow" />

          <div className="ns-hero-top">
            <div className="ns-hero-icon">
              <BellOutlined />
            </div>

            <div>
              <span className="ns-hero-tag">
                <ThunderboltFilled /> Preferences
              </span>
              <h1>Notification Settings</h1>
              <p>
                Choose how you want to receive notifications for each service. Leave all
                channels unchecked for a service to opt out of that category.
              </p>
            </div>
          </div>

          <div className="ns-hero-stat">
            <div className="ns-hero-stat-ring">
              <svg viewBox="0 0 60 60">
                <circle className="ns-ring-track" cx="30" cy="30" r="26" />
                <circle
                  className="ns-ring-progress"
                  cx="30"
                  cy="30"
                  r="26"
                  style={{
                    strokeDasharray: 163.4,
                    strokeDashoffset: 163.4 - (163.4 * activeCount) / CATEGORIES.length,
                  }}
                />
              </svg>
              <span>{activeCount}/{CATEGORIES.length}</span>
            </div>
            <p>Active categories</p>
          </div>
        </motion.div>

        <div className="ns-grid">
          {CATEGORIES.map((category, index) => {
            const pref = prefs[category.key];
            const isActive = pref.inApp || pref.email;

            return (
              <motion.div
                className={`ns-card ${isActive ? "ns-card-active" : ""}`}
                key={category.key}
                initial={{ opacity: 0, y: 22, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.08 + index * 0.06 }}
                whileHover={{ y: -5 }}
                style={{ "--card-accent": category.accent } as React.CSSProperties}
              >
                <div className="ns-card-shine" />

                <div className="ns-card-head">
                  <div className="ns-card-icon">{category.icon}</div>

                  <div className="ns-card-heading">
                    <h3>{category.title}</h3>
                    <p>{category.description}</p>
                  </div>
                </div>

                <div className="ns-switch-row">
                  <button
                    type="button"
                    className={`ns-switch ${pref.inApp ? "on" : ""}`}
                    onClick={() => toggleChannel(category.key, "inApp")}
                    aria-pressed={pref.inApp}
                  >
                    <span className="ns-switch-track">
                      <span className="ns-switch-knob">
                        <AnimatePresence>
                          {pref.inApp && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                            >
                              <CheckOutlined />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                    </span>
                    <span className="ns-switch-label">In App</span>
                  </button>

                  <button
                    type="button"
                    className={`ns-switch ${pref.email ? "on" : ""}`}
                    onClick={() => toggleChannel(category.key, "email")}
                    aria-pressed={pref.email}
                  >
                    <span className="ns-switch-track">
                      <span className="ns-switch-knob">
                        <AnimatePresence>
                          {pref.email && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                            >
                              <CheckOutlined />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                    </span>
                    <span className="ns-switch-label">Email</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer now lives in normal document flow, right after the grid */}
        <motion.div
          className="ns-footer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <span className="ns-footer-hint">
            <AnimatePresence mode="wait">
              {saved ? (
                <motion.span
                  key="saved"
                  className="ns-saved-pill"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <CheckOutlined /> Settings saved
                </motion.span>
              ) : (
                <motion.span
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Changes apply to future notifications only.
                </motion.span>
              )}
            </AnimatePresence>
          </span>

          <motion.button
            type="button"
            className="ns-save-button"
            onClick={handleSave}
            disabled={!isDirty}
            whileHover={isDirty ? { scale: 1.03 } : {}}
            whileTap={isDirty ? { scale: 0.97 } : {}}
          >
            <SaveOutlined />
            Save Settings
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

export default NotificationSettingsPage;