import { CATEGORIES } from "../../components/UI/notificationCategories";
import { NotificationPrefsMap } from "../types/notificationTypes";

const STORAGE_KEY = "notificationPreferencesByCategory";
const SIMULATED_LATENCY_MS = 350;

const buildDefaultPrefs = (): NotificationPrefsMap =>
  CATEGORIES.reduce((acc, category) => {
    acc[category.key] = { inApp: true, email: false };
    return acc;
  }, {} as NotificationPrefsMap);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchNotificationPrefsApi = async (): Promise<NotificationPrefsMap> => {
  await delay(SIMULATED_LATENCY_MS);

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const defaults = buildDefaultPrefs();
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    const merged: NotificationPrefsMap = {};

    CATEGORIES.forEach((category) => {
      merged[category.key] = {
        inApp: parsed?.[category.key]?.inApp ?? true,
        email: parsed?.[category.key]?.email ?? false,
      };
    });

    return merged;
  } catch {
    throw new Error("Unable to load notification preferences.");
  }
};

export const saveNotificationPrefsApi = async (
  prefs: NotificationPrefsMap
): Promise<NotificationPrefsMap> => {
  await delay(SIMULATED_LATENCY_MS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return prefs;
  } catch {
    throw new Error("Unable to save notification preferences.");
  }
};