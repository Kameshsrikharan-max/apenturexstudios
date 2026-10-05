import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import {CheckOutlined,CloseCircleFilled,GlobalOutlined,HistoryOutlined,LoadingOutlined,SearchOutlined,SortAscendingOutlined,ThunderboltOutlined,UndoOutlined,} from "@ant-design/icons";
import "./LanguageSwitcher.css";

/* ---------------------------------------------------------------------------
   Whole-site language switcher (Google Translate engine).

   - Languages are grouped by CONTINENT → COUNTRY → language(s).
   - Two views: "By country" and "A–Z languages".
   - Translates the ENTIRE document: pages, modals, drawers, dynamic text.
   - Choice is stored in the `googtrans` cookie, so it persists across
     navigation and reloads.
   - Switching sets the cookie and reloads the page — the most reliable way
     to make Google Translate re-translate everything (including React
     content that mounts later).

   Extras in this version
   - "Suggested for you" (detected from the browser language)
   - Recently used languages
   - Search with match highlighting (country, language, native name, code)
   - Keyboard navigation: ↓ from search, arrow keys between chips,
     Enter in search picks the top result, Esc closes
   - Per-continent language counts on the tabs
   - "Show original (English)" reset + live result counter
   - Mobile bottom-sheet layout
   - "Translating…" feedback before the reload

   Place <LanguageSwitcher /> once in Navbar.tsx (or any always-mounted
   layout component).
--------------------------------------------------------------------------- */

interface Language {
  code: string;
  name: string;
  native: string;
}

interface Country {
  name: string;
  langs: string[]; // language codes — must exist in LANGUAGES
}

interface Continent {
  id: string;
  name: string;
  short: string;
  countries: Country[];
}

const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "as", name: "Assamese", native: "অসমীয়া" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "sa", name: "Sanskrit", native: "संस्कृतम्" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "ka", name: "Georgian", native: "ქართული" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "my", name: "Myanmar (Burmese)", native: "မြန်မာ" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "tl", name: "Filipino", native: "Filipino" },
  { code: "zh-CN", name: "Chinese Simplified", native: "简体中文" },
  { code: "zh-TW", name: "Chinese Traditional", native: "繁體中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "is", name: "Icelandic", native: "Íslenska" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "gl", name: "Galician", native: "Galego" },
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
];

const LANG_MAP: Record<string, Language> = LANGUAGES.reduce((acc, lang) => {
  acc[lang.code] = lang;
  return acc;
}, {} as Record<string, Language>);

const ARABIC_WORLD = ["ar"];

const CONTINENTS: Continent[] = [
  {
    id: "asia",
    name: "Asia",
    short: "Asia",
    countries: [
      { name: "India", langs: ["en", "hi", "ta", "te", "kn", "ml", "bn", "mr", "gu", "pa", "or", "as", "ur", "sa"] },
      { name: "Pakistan", langs: ["ur", "pa", "en"] },
      { name: "Bangladesh", langs: ["bn"] },
      { name: "Sri Lanka", langs: ["ta"] },
      { name: "Nepal", langs: ["ne"] },
      { name: "Afghanistan", langs: ["fa"] },
      { name: "Iran", langs: ["fa"] },
      { name: "Iraq", langs: ["ar"] },
      { name: "Saudi Arabia", langs: ARABIC_WORLD },
      { name: "United Arab Emirates", langs: ["ar", "en"] },
      { name: "Qatar", langs: ARABIC_WORLD },
      { name: "Kuwait", langs: ARABIC_WORLD },
      { name: "Oman", langs: ARABIC_WORLD },
      { name: "Yemen", langs: ARABIC_WORLD },
      { name: "Jordan", langs: ARABIC_WORLD },
      { name: "Lebanon", langs: ["ar", "fr"] },
      { name: "Syria", langs: ARABIC_WORLD },
      { name: "Israel", langs: ["ar"] },
      { name: "Turkey", langs: ["tr"] },
      { name: "Georgia", langs: ["ka"] },
      { name: "Kazakhstan", langs: ["ru"] },
      { name: "Kyrgyzstan", langs: ["ru"] },
      { name: "Mongolia", langs: ["mn"] },
      { name: "China", langs: ["zh-CN"] },
      { name: "Taiwan", langs: ["zh-TW"] },
      { name: "Hong Kong", langs: ["zh-TW", "en"] },
      { name: "Japan", langs: ["ja"] },
      { name: "South Korea", langs: ["ko"] },
      { name: "Thailand", langs: ["th"] },
      { name: "Myanmar", langs: ["my"] },
      { name: "Vietnam", langs: ["vi"] },
      { name: "Malaysia", langs: ["en", "zh-CN", "ta"] },
      { name: "Singapore", langs: ["en", "zh-CN", "ta"] },
      { name: "Indonesia", langs: ["id"] },
      { name: "Philippines", langs: ["tl", "en"] },
    ],
  },
  {
    id: "europe",
    name: "Europe",
    short: "Europe",
    countries: [
      { name: "United Kingdom", langs: ["en"] },
      { name: "Ireland", langs: ["en"] },
      { name: "France", langs: ["fr"] },
      { name: "Germany", langs: ["de"] },
      { name: "Austria", langs: ["de"] },
      { name: "Switzerland", langs: ["de", "fr", "it"] },
      { name: "Italy", langs: ["it"] },
      { name: "Spain", langs: ["es", "gl"] },
      { name: "Portugal", langs: ["pt"] },
      { name: "Netherlands", langs: ["nl"] },
      { name: "Belgium", langs: ["nl", "fr", "de"] },
      { name: "Luxembourg", langs: ["fr", "de"] },
      { name: "Sweden", langs: ["sv"] },
      { name: "Finland", langs: ["sv"] },
      { name: "Iceland", langs: ["is"] },
      { name: "Poland", langs: ["pl"] },
      { name: "Czech Republic", langs: ["cs"] },
      { name: "Slovenia", langs: ["sl"] },
      { name: "Romania", langs: ["ro"] },
      { name: "Moldova", langs: ["ro", "ru"] },
      { name: "Bulgaria", langs: ["bg"] },
      { name: "Serbia", langs: ["sr"] },
      { name: "Bosnia and Herzegovina", langs: ["sr"] },
      { name: "Greece", langs: ["el"] },
      { name: "Malta", langs: ["en"] },
      { name: "Ukraine", langs: ["uk", "ru"] },
      { name: "Russia", langs: ["ru"] },
      { name: "Belarus", langs: ["ru"] },
      { name: "Latvia", langs: ["lv"] },
    ],
  },
  {
    id: "africa",
    name: "Africa",
    short: "Africa",
    countries: [
      { name: "Egypt", langs: ARABIC_WORLD },
      { name: "Morocco", langs: ["ar", "fr"] },
      { name: "Algeria", langs: ["ar", "fr"] },
      { name: "Tunisia", langs: ["ar", "fr"] },
      { name: "Libya", langs: ARABIC_WORLD },
      { name: "Sudan", langs: ["ar", "en"] },
      { name: "Nigeria", langs: ["en"] },
      { name: "Ghana", langs: ["en"] },
      { name: "Senegal", langs: ["fr"] },
      { name: "Ivory Coast", langs: ["fr"] },
      { name: "Cameroon", langs: ["fr", "en"] },
      { name: "Kenya", langs: ["en"] },
      { name: "Tanzania", langs: ["en"] },
      { name: "Uganda", langs: ["en"] },
      { name: "Rwanda", langs: ["fr", "en"] },
      { name: "DR Congo", langs: ["fr"] },
      { name: "Somalia", langs: ["ar"] },
      { name: "South Africa", langs: ["en", "af"] },
      { name: "Namibia", langs: ["en", "af"] },
      { name: "Lesotho", langs: ["en"] },
      { name: "Zimbabwe", langs: ["en"] },
      { name: "Zambia", langs: ["en"] },
      { name: "Malawi", langs: ["en"] },
      { name: "Mozambique", langs: ["pt"] },
      { name: "Angola", langs: ["pt"] },
      { name: "Madagascar", langs: ["fr"] },
    ],
  },
  {
    id: "north-america",
    name: "North America",
    short: "N. America",
    countries: [
      { name: "United States", langs: ["en", "es"] },
      { name: "Canada", langs: ["en", "fr"] },
      { name: "Mexico", langs: ["es"] },
      { name: "Guatemala", langs: ["es"] },
      { name: "Cuba", langs: ["es"] },
      { name: "Dominican Republic", langs: ["es"] },
      { name: "Costa Rica", langs: ["es"] },
      { name: "Panama", langs: ["es"] },
      { name: "Haiti", langs: ["fr"] },
      { name: "Jamaica", langs: ["en"] },
    ],
  },
  {
    id: "south-america",
    name: "South America",
    short: "S. America",
    countries: [
      { name: "Brazil", langs: ["pt"] },
      { name: "Argentina", langs: ["es"] },
      { name: "Chile", langs: ["es"] },
      { name: "Colombia", langs: ["es"] },
      { name: "Peru", langs: ["es"] },
      { name: "Venezuela", langs: ["es"] },
      { name: "Ecuador", langs: ["es"] },
      { name: "Bolivia", langs: ["es"] },
      { name: "Paraguay", langs: ["es"] },
      { name: "Uruguay", langs: ["es"] },
      { name: "Guyana", langs: ["en"] },
      { name: "Suriname", langs: ["nl"] },
    ],
  },
  {
    id: "oceania",
    name: "Oceania",
    short: "Oceania",
    countries: [
      { name: "Australia", langs: ["en"] },
      { name: "New Zealand", langs: ["en"] },
      { name: "Papua New Guinea", langs: ["en"] },
      { name: "Fiji", langs: ["en"] },
      { name: "Samoa", langs: ["en"] },
    ],
  },
];

const STORAGE_KEY = "app-language";
const RECENT_KEY = "app-language-recent";
const RECENT_LIMIT = 4;
const ELEMENT_ID = "google_translate_element";
const RELOAD_DELAY = 450;

type ViewMode = "countries" | "languages";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

/* ---------- Static counts for the tabs ---------- */

const TAB_COUNTS: Record<string, number> = (() => {
  const all = new Set<string>();
  const out: Record<string, number> = {};
  CONTINENTS.forEach((continent) => {
    const set = new Set<string>();
    continent.countries.forEach((country) =>
      country.langs.forEach((code) => {
        if (!LANG_MAP[code]) return;
        set.add(code);
        all.add(code);
      })
    );
    out[continent.id] = set.size;
  });
  out.all = all.size;
  return out;
})();

/* ---------- Cookie helpers (Google Translate reads `googtrans`) ---------- */

const readCookieLang = (): string | null => {
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]*\/([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const writeCookieLang = (code: string | null) => {
  const host = window.location.hostname;
  const isLocalOrIp = host === "localhost" || /^[\d.]+$/.test(host) || host.includes(":");
  const value = code ? `/en/${code}` : "";
  const expires = code ? "" : "; expires=Thu, 01 Jan 1970 00:00:00 GMT";

  document.cookie = `googtrans=${value}; path=/${expires}`;

  if (!isLocalOrIp) {
    document.cookie = `googtrans=${value}; path=/; domain=${host}${expires}`;
    document.cookie = `googtrans=${value}; path=/; domain=.${host}${expires}`;
    const parts = host.split(".");
    if (parts.length > 2) {
      const root = parts.slice(-2).join(".");
      document.cookie = `googtrans=${value}; path=/; domain=.${root}${expires}`;
    }
  }
};

/* ---------- React-safe patch ---------- */

let domPatched = false;
const patchDomForTranslate = () => {
  if (domPatched || typeof Node !== "function" || !Node.prototype) return;
  domPatched = true;

  const originalRemoveChild = Node.prototype.removeChild;
  (Node.prototype as any).removeChild = function (this: Node, child: Node) {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  (Node.prototype as any).insertBefore = function (this: Node, newNode: Node, referenceNode: Node | null) {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return originalInsertBefore.call(this, newNode, referenceNode);
  };
};

/* ---------- Script loader (loads once) ---------- */

let loaderPromise: Promise<void> | null = null;

const loadGoogleTranslate = (): Promise<void> => {
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve) => {
    patchDomForTranslate();

    if (!document.getElementById(ELEMENT_ID)) {
      const holder = document.createElement("div");
      holder.id = ELEMENT_ID;
      holder.className = "notranslate";
      holder.style.cssText = "position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;";
      document.body.appendChild(holder);
    }

    window.googleTranslateElementInit = () => {
      try {
        new window.google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          ELEMENT_ID
        );
      } catch {
        /* widget unavailable */
      }
      resolve();
    };

    const script = document.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });

  return loaderPromise;
};

/* ---------- Initial state helpers ---------- */

const getInitialLanguage = (): string => {
  try {
    const fromCookie = readCookieLang();
    if (fromCookie) return fromCookie;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || "en";
  } catch {
    return "en";
  }
};

const getInitialRecent = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string" && LANG_MAP[c]).slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
};

/** Maps the browser's preferred language to one of our codes (or null). */
const detectBrowserLang = (): string | null => {
  if (typeof navigator === "undefined") return null;
  const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];

  for (const raw of list) {
    if (!raw) continue;
    const lower = raw.toLowerCase();
    if (lower.startsWith("zh")) return /tw|hk|hant/.test(lower) ? "zh-TW" : "zh-CN";

    const base = lower.split("-")[0];
    const mapped = base === "he" ? "iw" : base === "nb" || base === "nn" ? "no" : base === "fil" ? "tl" : base;
    if (LANG_MAP[mapped]) return mapped;
  }
  return null;
};

const getIsMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 520px)").matches;

/* ---------- Grouping / filtering ---------- */

interface CountryRow {
  name: string;
  langs: Language[];
}

interface ContinentGroup {
  id: string;
  name: string;
  countries: CountryRow[];
}

interface LangEntry {
  lang: Language;
  countries: string[];
}

interface LetterGroup {
  letter: string;
  entries: LangEntry[];
}

const langMatches = (l: Language, q: string) =>
  l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.toLowerCase().includes(q);

/** View 1 — Continent → Country → languages */
const buildGroups = (query: string, tab: string): ContinentGroup[] => {
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  return CONTINENTS.filter((continent) => searching || tab === "all" || continent.id === tab)
    .map((continent) => {
      const countries: CountryRow[] = continent.countries
        .map((country) => {
          const allLangs = country.langs.map((code) => LANG_MAP[code]).filter(Boolean) as Language[];
          if (!searching) return { name: country.name, langs: allLangs };

          const countryMatches = country.name.toLowerCase().includes(q) || continent.name.toLowerCase().includes(q);
          if (countryMatches) return { name: country.name, langs: allLangs };

          return { name: country.name, langs: allLangs.filter((l) => langMatches(l, q)) };
        })
        .filter((row) => row.langs.length > 0);

      return { id: continent.id, name: continent.name, countries };
    })
    .filter((group) => group.countries.length > 0);
};

/** View 2 — unique languages A–Z, with the countries that speak each one */
const buildAlpha = (query: string, tab: string): LetterGroup[] => {
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const map = new Map<string, LangEntry>();

  CONTINENTS.forEach((continent) => {
    if (!searching && tab !== "all" && continent.id !== tab) return;
    continent.countries.forEach((country) => {
      country.langs.forEach((code) => {
        const lang = LANG_MAP[code];
        if (!lang) return;
        let entry = map.get(code);
        if (!entry) {
          entry = { lang, countries: [] };
          map.set(code, entry);
        }
        if (!entry.countries.includes(country.name)) entry.countries.push(country.name);
      });
    });
  });

  const entries = Array.from(map.values())
    .filter(
      (e) => !searching || langMatches(e.lang, q) || e.countries.some((c) => c.toLowerCase().includes(q))
    )
    .sort((a, b) => a.lang.name.localeCompare(b.lang.name));

  const letters: LetterGroup[] = [];
  entries.forEach((entry) => {
    const letter = entry.lang.name.charAt(0).toUpperCase();
    const last = letters[letters.length - 1];
    if (last && last.letter === letter) last.entries.push(entry);
    else letters.push({ letter, entries: [entry] });
  });
  return letters;
};

/* ---------- Small presentational helpers ---------- */

const Highlight = ({ text, q }: { text: string; q: string }) => {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
};

interface QuickRowProps {
  icon: ReactNode;
  title: string;
  langs: Language[];
  current: string;
  onPick: (lang: Language) => void;
}

const QuickRow = ({ icon, title, langs, current, onPick }: QuickRowProps) => {
  if (!langs.length) return null;
  return (
    <div className="lang-quick">
      <span className="lang-quick-title">
        {icon}
        {title}
      </span>
      <div className="lang-pills">
        {langs.map((lang) => (
          <button
            key={lang.code}
            type="button"
            data-nav=""
            className={lang.code === current ? "lang-pill lang-pill-active" : "lang-pill"}
            onClick={() => onPick(lang)}
            title={lang.name}
          >
            <span dir="auto">{lang.native}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------- Component ---------- */

const LanguageSwitcher = () => {
  const [current, setCurrent] = useState<string>(getInitialLanguage);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("countries");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [recent, setRecent] = useState<string[]>(getInitialRecent);
  const [suggested] = useState<string | null>(detectBrowserLang);
  const [isMobile, setIsMobile] = useState<boolean>(getIsMobile);
  const [busy, setBusy] = useState<Language | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const currentLang = LANG_MAP[current] || LANGUAGES[0];
  const shortCode = currentLang.code === "iw" ? "HE" : currentLang.code.split("-")[0].toUpperCase();
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const panelReady = open && (isMobile || !!rect);

  
  
  useEffect(() => {
    if (current !== "en") {
      if (!readCookieLang()) writeCookieLang(current);
      loadGoogleTranslate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the mobile breakpoint (bottom sheet vs. anchored dropdown)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 520px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Lock page scroll behind the mobile sheet
  useEffect(() => {
    if (!(open && isMobile)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  // Keep the dropdown glued to the trigger + global close handlers
  useEffect(() => {
    if (!open) return;

    const updateRect = () => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);

    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // When the panel appears: focus search (desktop) and reveal the active language
  useEffect(() => {
    if (!panelReady) return;
    const id = window.requestAnimationFrame(() => {
      if (!isMobile) searchRef.current?.focus({ preventScroll: true });
      panelRef.current
        ?.querySelector<HTMLElement>(".lang-chip-active")
        ?.scrollIntoView({ block: "center" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [panelReady, isMobile]);

  const groups = useMemo(() => buildGroups(query, tab), [query, tab]);
  const letters = useMemo(() => buildAlpha(query, tab), [query, tab]);

  const stats = useMemo(() => {
    if (view === "countries") {
      const langSet = new Set<string>();
      let countries = 0;
      groups.forEach((g) =>
        g.countries.forEach((c) => {
          countries += 1;
          c.langs.forEach((l) => langSet.add(l.code));
        })
      );
      return { langs: langSet.size, countries };
    }
    const countrySet = new Set<string>();
    let langs = 0;
    letters.forEach((g) =>
      g.entries.forEach((e) => {
        langs += 1;
        e.countries.forEach((c) => countrySet.add(c));
      })
    );
    return { langs, countries: countrySet.size };
  }, [view, groups, letters]);

  const recentLangs = useMemo(
    () =>
      recent
        .filter((code) => code !== current)
        .map((code) => LANG_MAP[code])
        .filter(Boolean),
    [recent, current]
  );

  const suggestedLang = suggested && suggested !== current ? LANG_MAP[suggested] : null;

  const handleSelect = (lang: Language) => {
    if (busy) return;
    setOpen(false);
    setQuery("");
    if (lang.code === current) return;

    try {
      localStorage.setItem(STORAGE_KEY, lang.code);
      const nextRecent = [lang.code, ...recent.filter((c) => c !== lang.code)].slice(0, RECENT_LIMIT);
      localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent));
      setRecent(nextRecent);
    } catch {
      /* storage blocked — cookie still carries the choice */
    }

    // Clear first so stale cookies on other domains/paths can't win.
    writeCookieLang(null);
    if (lang.code !== "en") writeCookieLang(lang.code);

    setCurrent(lang.code);
    setBusy(lang);
    window.setTimeout(() => window.location.reload(), RELOAD_DELAY);
  };

  /* ---------- Keyboard navigation ---------- */

  const moveFocus = useCallback((dir: "up" | "down" | "left" | "right") => {
    const panel = panelRef.current;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>("[data-nav]"));
    if (!items.length) return;

    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (idx === -1) {
      if (dir === "down") items[0].focus();
      return;
    }

    if (dir === "left") {
      if (idx > 0) items[idx - 1].focus();
      return;
    }
    if (dir === "right") {
      if (idx < items.length - 1) items[idx + 1].focus();
      return;
    }

    // Up / down: nearest item in that direction by geometry
    const cur = items[idx].getBoundingClientRect();
    const cx = cur.left + cur.width / 2;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;

    items.forEach((el, i) => {
      if (i === idx) return;
      const r = el.getBoundingClientRect();
      const dy = dir === "down" ? r.top - cur.top : cur.top - r.top;
      if (dy <= 4) return;
      const score = dy * 3 + Math.abs(r.left + r.width / 2 - cx);
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    });

    if (best) (best as HTMLElement).focus();
    else if (dir === "up") searchRef.current?.focus();
  }, []);

  const onPanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (target === searchRef.current) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveFocus("down");
      } else if (e.key === "Enter" && searching) {
        e.preventDefault();
        panelRef.current?.querySelector<HTMLButtonElement>(".lang-chip")?.click();
      }
      return;
    }

    if (!target.hasAttribute("data-nav")) return;
    const map: Record<string, "up" | "down" | "left" | "right"> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };
    const dir = map[e.key];
    if (dir) {
      e.preventDefault();
      moveFocus(dir);
    }
  };

  /* ---------- Render helpers ---------- */

  const renderChip = (lang: Language, meta?: string) => {
    const active = lang.code === current;
    return (
      <button
        key={lang.code}
        type="button"
        role="option"
        data-nav=""
        aria-selected={active}
        className={active ? "lang-chip lang-chip-active" : "lang-chip"}
        onClick={() => handleSelect(lang)}
      >
        <strong dir="auto">
          <Highlight text={lang.native} q={q} />
        </strong>
        <em>
          <Highlight text={lang.name} q={q} />
        </em>
        {meta ? <small>{meta}</small> : null}
        {active ? <CheckOutlined /> : null}
      </button>
    );
  };

  const tabs = [{ id: "all", short: "All" }, ...CONTINENTS.map((c) => ({ id: c.id, short: c.short }))];
  const hasResults = view === "countries" ? groups.length > 0 : letters.length > 0;
  const showHeadings = searching || tab === "all";

  const panelProps = isMobile
    ? { className: "lang-panel lang-panel-sheet notranslate" }
    : {
        className: "lang-panel notranslate",
        style: rect
          ? { top: rect.bottom + 8, right: Math.max(12, window.innerWidth - rect.right) }
          : undefined,
      };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="lang-trigger notranslate"
        translate="no"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Change language"
        title={currentLang.native}
      >
        <span className="lang-orb">
          <GlobalOutlined />
        </span>
        <span className="lang-code">{shortCode}</span>
      </button>

      {panelReady
        ? createPortal(
            <>
              {isMobile ? <div className="lang-backdrop" aria-hidden="true" /> : null}

              <div
                ref={panelRef}
                role="dialog"
                aria-label="Choose language"
                translate="no"
                onKeyDown={onPanelKeyDown}
                {...panelProps}
              >
                {/* Search + view toggle */}
                <div className="lang-search-row">
                  <SearchOutlined />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search country or language…"
                    aria-label="Search country or language"
                  />
                  {query ? (
                    <button
                      type="button"
                      className="lang-clear"
                      aria-label="Clear search"
                      onClick={() => {
                        setQuery("");
                        searchRef.current?.focus();
                      }}
                    >
                      <CloseCircleFilled />
                    </button>
                  ) : null}

                  <div className="lang-view-toggle" role="group" aria-label="View">
                    <button
                      type="button"
                      className={view === "countries" ? "lang-view-btn lang-view-btn-active" : "lang-view-btn"}
                      aria-pressed={view === "countries"}
                      title="By country"
                      onClick={() => setView("countries")}
                    >
                      <GlobalOutlined />
                    </button>
                    <button
                      type="button"
                      className={view === "languages" ? "lang-view-btn lang-view-btn-active" : "lang-view-btn"}
                      aria-pressed={view === "languages"}
                      title="Languages A–Z"
                      onClick={() => setView("languages")}
                    >
                      <SortAscendingOutlined />
                    </button>
                  </div>
                </div>

                {/* Continent tabs */}
                <div className="lang-tabs" role="tablist" aria-label="Continents">
                  {tabs.map((t) => {
                    const active = !searching && tab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={active ? "lang-tab lang-tab-active" : "lang-tab"}
                        onClick={() => {
                          setQuery("");
                          setTab(t.id);
                        }}
                      >
                        {t.short}
                        <span className="lang-tab-count">{TAB_COUNTS[t.id]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable list */}
                <div className="lang-list" role="listbox">
                  {!searching ? (
                    <>
                      <QuickRow
                        icon={<ThunderboltOutlined />}
                        title="Suggested"
                        langs={suggestedLang ? [suggestedLang] : []}
                        current={current}
                        onPick={handleSelect}
                      />
                      <QuickRow
                        icon={<HistoryOutlined />}
                        title="Recent"
                        langs={recentLangs}
                        current={current}
                        onPick={handleSelect}
                      />
                    </>
                  ) : null}

                  {hasResults ? (
                    view === "countries" ? (
                      groups.map((group) => (
                        <div key={group.id} className="lang-group" data-continent={group.id}>
                          {showHeadings ? <div className="lang-continent">{group.name}</div> : null}

                          {group.countries.map((country) => (
                            <div key={`${group.id}-${country.name}`} className="lang-country">
                              <span className="lang-country-name">
                                <Highlight text={country.name} q={q} />
                              </span>
                              <div className="lang-chips">
                                {country.langs.map((lang) => renderChip(lang))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      letters.map((group) => (
                        <div key={group.letter} className="lang-group">
                          <div className="lang-continent lang-letter">{group.letter}</div>
                          <div className="lang-chips lang-chips-flat">
                            {group.entries.map((entry) =>
                              renderChip(
                                entry.lang,
                                `${entry.countries.length} ${entry.countries.length === 1 ? "country" : "countries"}`
                              )
                            )}
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    <div className="lang-empty">
                      <SearchOutlined />
                      <p>No match for “{query.trim()}”</p>
                      <span>Try a country, a language name, or a code like “ta”.</span>
                      <button type="button" className="lang-empty-btn" onClick={() => setQuery("")}>
                        Clear search
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="lang-foot">
                  <span className="lang-foot-count">
                    {stats.langs} {stats.langs === 1 ? "language" : "languages"}
                    {view === "countries" ? ` · ${stats.countries} countries` : ""}
                  </span>
                  {current !== "en" ? (
                    <button type="button" className="lang-reset" onClick={() => handleSelect(LANG_MAP.en)}>
                      <UndoOutlined />
                      Show original
                    </button>
                  ) : null}
                </div>
              </div>
            </>,
            document.body
          )
        : null}

      {busy
        ? createPortal(
            <div className="lang-busy notranslate" translate="no" role="status" aria-live="polite">
              <LoadingOutlined />
              <span>{busy.code === "en" ? "Restoring English…" : `Translating to ${busy.name}…`}</span>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default LanguageSwitcher;