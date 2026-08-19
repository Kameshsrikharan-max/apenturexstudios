import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {LeftOutlined,CheckOutlined,BellOutlined,SaveOutlined,ThunderboltFilled,LoadingOutlined,} from "@ant-design/icons";
import { CATEGORIES } from "./notificationCategories";
import { Channel, NotificationPrefsMap } from "../../redux/types/notificationTypes";
import {
  fetchNotificationPrefsRequest,toggleNotificationChannel,saveNotificationPrefsRequest,resetNotificationSavedFlag,} from "../../redux/actions/notificationActions";
import { pushNotification } from "../../utils/notificationStore";
import { NotificationCategoryKey, NotificationPayload } from "../../redux/types/notificationDetailTypes";
import "./NotificationSettingsPage.css";

interface RootState {
  notification: {
    prefs: NotificationPrefsMap;
    savedPrefs: NotificationPrefsMap;
    loading: boolean;
    saving: boolean;
    saved: boolean;
    error: string | null;
  };
}

const countActive = (prefs: NotificationPrefsMap) =>
  Object.values(prefs).filter((p) => p?.inApp || p?.email).length;

const channelSummary = (pref?: { inApp?: boolean; email?: boolean }) => {
  if (!pref || (!pref.inApp && !pref.email)) return "turned off";
  const parts: string[] = [];
  if (pref.inApp) parts.push("In App");
  if (pref.email) parts.push("Email");
  return `enabled for ${parts.join(" & ")}`;
};

const buildNotificationForCategory = (
  categoryKey: NotificationCategoryKey,
  categoryTitle: string,
  summary: string
): { title: string; description: string; payload: NotificationPayload } => {
  switch (categoryKey) {
    case "reviewEndorsement":
      return {
        title: "Review Endorsement preferences updated",
        description: `Alerts for referral, endorsement, and approval decisions are now ${summary}.`,
        payload: {
          referralName: categoryTitle,
          decisionType: "Preference Update",
          remarks: `Notifications ${summary}.`,
        },
      };
    case "changeRequest":
      return {
        title: "Change Request preferences updated",
        description: `Alerts for profile and studio update requests are now ${summary}.`,
        payload: {
          studioName: "Notification Settings",
          requestedField: categoryTitle,
          newValue: summary,
          requestedBy: "You",
        },
      };
    case "deleteRequest":
      return {
        title: "Delete Request preferences updated",
        description: `Alerts for delete request submissions and decisions are now ${summary}.`,
        payload: {
          targetType: categoryTitle,
          reason: `Notifications ${summary}.`,
          requestedBy: "You",
        },
      };
    case "eventAssignment":
      return {
        title: "Event Assignment preferences updated",
        description: `Alerts for new assignments and responses are now ${summary}.`,
        payload: {
          eventName: categoryTitle,
          role: "Preference Update",
          assignedBy: "You",
        },
      };
    case "paymentExpenses":
      return {
        title: "Payment & Expenses preferences updated",
        description: `Payment reminders and expense alerts are now ${summary}.`,
        payload: {
          expenseType: categoryTitle,
          invoiceId: "—",
        },
      };
    case "mediaNotifications":
      return {
        title: "Media Notifications preferences updated",
        description: `Media submission and upload alerts are now ${summary}.`,
        payload: {
          albumName: categoryTitle,
          uploadedBy: "You",
        },
      };
    default:
      return {
        title: `${categoryTitle} preferences updated`,
        description: `Notifications for ${categoryTitle} are now ${summary}.`,
        payload: {},
      };
  }
};

function NotificationSettingsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { prefs, savedPrefs, loading, saving, saved, error } = useSelector(
    (state: RootState) => state.notification
  );

  const pendingChangedKeysRef = useRef<string[]>([]);

  useEffect(() => {
    dispatch(fetchNotificationPrefsRequest() as any);
  }, [dispatch]);

  useEffect(() => {
    if (!saved) return;

    const changedKeys = pendingChangedKeysRef.current;

    changedKeys.forEach((key) => {
      const categoryMeta = CATEGORIES.find((c) => c.key === key);
      if (!categoryMeta) return;

      const pref = prefs[key] ?? { inApp: false, email: false };
      const summary = channelSummary(pref);
      const { title, description, payload } = buildNotificationForCategory(
        key as NotificationCategoryKey,
        categoryMeta.title,
        summary
      );

      pushNotification({
        title,
        notifCategory: key as NotificationCategoryKey,
        category: categoryMeta.title,
        description,
        triggeredBy: "You",
        priority: "low",
        isActionable: false,
        payload,
      });
    });

    pendingChangedKeysRef.current = [];

    const timer = window.setTimeout(() => dispatch(resetNotificationSavedFlag() as any), 2600);
    return () => window.clearTimeout(timer);
  }, [saved, dispatch]);

  const isDirty = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(savedPrefs),
    [prefs, savedPrefs]
  );

  const activeCount = useMemo(() => countActive(prefs), [prefs]);

  const toggleChannel = (categoryKey: string, channel: Channel) => {
    dispatch(toggleNotificationChannel(categoryKey, channel) as any);
  };

  const handleGoBack = () => navigate(-1);

  const handleSave = () => {
    const changed = CATEGORIES.filter((category) => {
      const before = savedPrefs[category.key] ?? { inApp: false, email: false };
      const after = prefs[category.key] ?? { inApp: false, email: false };
      return before.inApp !== after.inApp || before.email !== after.email;
    }).map((category) => category.key);

    pendingChangedKeysRef.current = changed;
    dispatch(saveNotificationPrefsRequest() as any);
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
              <span>
                {activeCount}/{CATEGORIES.length}
              </span>
            </div>
            <p>Active categories</p>
          </div>
        </motion.div>

        {loading ? (
          <div className="ns-loading-state">
            <LoadingOutlined spin /> Loading your preferences…
          </div>
        ) : (
          <div className="ns-grid">
            {CATEGORIES.map((category, index) => {
              const pref = prefs[category.key] ?? { inApp: false, email: false };
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
        )}

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
              ) : error ? (
                <motion.span
                  key="error"
                  className="ns-error-pill"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {error}
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
            disabled={!isDirty || saving}
            whileHover={isDirty && !saving ? { scale: 1.03 } : {}}
            whileTap={isDirty && !saving ? { scale: 0.97 } : {}}
          >
            {saving ? <LoadingOutlined spin /> : <SaveOutlined />}
            {saving ? "Saving…" : "Save Settings"}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

export default NotificationSettingsPage;