import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { ConfigProvider } from "antd";

export const ACCENTS = [
  { key: "sky", label: "Sky", accent: "#38bdf8", soft: "#7dd3fc", deep: "#0284c7", rgb: "56, 189, 248", softRgb: "125, 211, 252" },
  { key: "violet", label: "Violet", accent: "#a78bfa", soft: "#c4b5fd", deep: "#7c3aed", rgb: "167, 139, 250", softRgb: "196, 181, 253" },
  { key: "emerald", label: "Emerald", accent: "#34d399", soft: "#6ee7b7", deep: "#059669", rgb: "52, 211, 153", softRgb: "110, 231, 183" },
  { key: "rose", label: "Rose", accent: "#fb7185", soft: "#fda4af", deep: "#e11d48", rgb: "251, 113, 133", softRgb: "253, 164, 175" },
  { key: "amber", label: "Amber", accent: "#fbbf24", soft: "#fcd34d", deep: "#d97706", rgb: "251, 191, 36", softRgb: "252, 211, 77" },
];

const STORAGE_KEY = "axs.nav.accent";

type ThemeContextValue = {
  accentKey: string;
  setAccentKey: (key: string) => void;
};

const ThemeContext = createContext<ThemeContextValue>({ accentKey: "sky", setAccentKey: () => {} });

const readStoredKey = (): string => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : "sky";
  } catch {
    return "sky";
  }
};

const findAccent = (key: string) => ACCENTS.find((item) => item.key === key) || ACCENTS[0];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accentKey, setAccentKey] = useState<string>(readStoredKey);
  const accent = findAccent(accentKey);

  // Runs before paint, so there is no flash of the default colour.
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--accent", accent.accent);
    root.setProperty("--accent-soft", accent.soft);
    root.setProperty("--accent-deep", accent.deep);
    root.setProperty("--accent-rgb", accent.rgb);
    root.setProperty("--accent-soft-rgb", accent.softRgb);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accent.key));
    } catch {
      // storage unavailable
    }
  }, [accent]);

  const value = useMemo(() => ({ accentKey, setAccentKey }), [accentKey]);

  return (
    <ThemeContext.Provider value={value}>
      {/* Recolours Ant Design buttons, inputs, switches, etc. Remove if you don't use antd. */}
      <ConfigProvider theme={{ token: { colorPrimary: accent.accent } }}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
}

export const useAccent = () => useContext(ThemeContext);