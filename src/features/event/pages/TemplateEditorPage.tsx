import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {ArrowLeftOutlined,UndoOutlined,RedoOutlined,SettingOutlined,SaveOutlined,ShareAltOutlined,PlusOutlined,DeleteOutlined,PictureOutlined,MoreOutlined,UploadOutlined,CloseOutlined,CopyOutlined,RotateRightOutlined,SwapOutlined,CheckOutlined,SendOutlined,AppstoreOutlined,HistoryOutlined,MessageOutlined,VerticalAlignTopOutlined,ReadOutlined,LeftOutlined,RightOutlined,BookOutlined,} from "@ant-design/icons";
import "./TemplateEditorPage.css";

/* Types */

interface EditorContext {templateId: number;templateName: string;sheetsCount: number;canvasSize: string;photosRequired: number;versionNum: number;isLatest: boolean;status: string;}

interface Slot {id: string;image: string | null;fileName?: string;caption?: string;rotateExtra?: number;flip?: boolean;front?: boolean;}

type LayoutId =| "full"| "split2h"| "split2v"| "three"| "grid4"| "grid6"| "collage"| "hero"| "beforeAfter"| "timeline"| "magazine"| "panoramic"| "minimal"| "asymmetrical"| "polaroid";

interface Sheet {
  id: string;
  name: string;
  layout: LayoutId;
  slots: Slot[];
  bgColor: string;
  bgImage: string | null;
  title?: string;
  subtitle?: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  rotate?: number;
  z?: number;
}

interface LayoutMeta {
  id: LayoutId;
  label: string;
  blurb: string;
  rects: Rect[];
  captions?: boolean;
  captionStyle?: "before-after" | "timeline";
  style?: "collage" | "polaroid";
  decorative?: "vs" | "timeline" | "spine";
  textRect?: Rect;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  time: string;
}

interface VersionEntry {
  id: string;
  label: string;
  time: string;
  sheetCount: number;
  snapshot: Sheet[];
}

type FlipDir = "forward" | "backward";
interface TurnState {
  from: number;
  to: number;
  dir: FlipDir;
  committing: boolean;
}

const LAYOUTS: LayoutMeta[] = [
  {
    id: "full",
    label: "Full-Page",
    blurb: "One large photo covering the entire page",
    rects: [{ top: 0, left: 0, width: 100, height: 100 }],
  },
  {
    id: "split2h",
    label: "2-Photo Split",
    blurb: "Two photos side-by-side",
    rects: [
      { top: 0, left: 0, width: 50, height: 100 },
      { top: 0, left: 50, width: 50, height: 100 },
    ],
  },
  {
    id: "split2v",
    label: "2-Photo Stack",
    blurb: "Two photos, top and bottom",
    rects: [
      { top: 0, left: 0, width: 100, height: 50 },
      { top: 50, left: 0, width: 100, height: 50 },
    ],
  },
  {
    id: "three",
    label: "3-Photo Layout",
    blurb: "One large image + two smaller images",
    rects: [
      { top: 0, left: 0, width: 66.66, height: 100 },
      { top: 0, left: 66.66, width: 33.34, height: 50 },
      { top: 50, left: 66.66, width: 33.34, height: 50 },
    ],
  },
  {
    id: "grid4",
    label: "4-Grid Layout",
    blurb: "Four equal photos in a clean grid",
    rects: [
      { top: 0, left: 0, width: 50, height: 50 },
      { top: 0, left: 50, width: 50, height: 50 },
      { top: 50, left: 0, width: 50, height: 50 },
      { top: 50, left: 50, width: 50, height: 50 },
    ],
  },
  {
    id: "grid6",
    label: "6-Grid Layout",
    blurb: "Six photos arranged evenly",
    rects: [
      { top: 0, left: 0, width: 33.33, height: 50 },
      { top: 0, left: 33.33, width: 33.33, height: 50 },
      { top: 0, left: 66.66, width: 33.34, height: 50 },
      { top: 50, left: 0, width: 33.33, height: 50 },
      { top: 50, left: 33.33, width: 33.33, height: 50 },
      { top: 50, left: 66.66, width: 33.34, height: 50 },
    ],
  },
  {
    id: "collage",
    label: "Collage Layout",
    blurb: "Overlapping photos with creative positioning",
    style: "collage",
    rects: [
      { top: 2, left: 4, width: 46, height: 50, rotate: -4, z: 2 },
      { top: 6, left: 46, width: 34, height: 30, rotate: 5, z: 4 },
      { top: 40, left: 50, width: 38, height: 42, rotate: -3, z: 3 },
      { top: 52, left: 6, width: 32, height: 34, rotate: 6, z: 1 },
      { top: 4, left: 70, width: 24, height: 24, rotate: -8, z: 5 },
    ],
  },
  {
    id: "hero",
    label: "Hero + Supporting",
    blurb: "One main photo with supporting images",
    rects: [
      { top: 0, left: 0, width: 64, height: 100 },
      { top: 0, left: 66, width: 34, height: 23.5 },
      { top: 25.5, left: 66, width: 34, height: 23.5 },
      { top: 51, left: 66, width: 34, height: 23.5 },
      { top: 76.5, left: 66, width: 34, height: 23.5 },
    ],
  },
  {
    id: "beforeAfter",
    label: "Before & After",
    blurb: "Two photos with a clear comparison",
    captions: true,
    captionStyle: "before-after",
    decorative: "vs",
    rects: [
      { top: 0, left: 0, width: 50, height: 100 },
      { top: 0, left: 50, width: 50, height: 100 },
    ],
  },
  {
    id: "timeline",
    label: "Story / Timeline",
    blurb: "Photos arranged chronologically",
    captions: true,
    captionStyle: "timeline",
    decorative: "timeline",
    rects: [
      { top: 0, left: 0, width: 25, height: 100 },
      { top: 0, left: 25, width: 25, height: 100 },
      { top: 0, left: 50, width: 25, height: 100 },
      { top: 0, left: 75, width: 25, height: 100 },
    ],
  },
  {
    id: "magazine",
    label: "Magazine Layout",
    blurb: "Large photo + typography + supporting images",
    textRect: { top: 0, left: 60, width: 40, height: 46 },
    rects: [
      { top: 0, left: 0, width: 58, height: 100 },
      { top: 48, left: 60, width: 40, height: 25 },
      { top: 75, left: 60, width: 40, height: 25 },
    ],
  },
  {
    id: "panoramic",
    label: "Panoramic Spread",
    blurb: "One image spanning both pages",
    decorative: "spine",
    rects: [{ top: 0, left: 0, width: 100, height: 100 }],
  },
  {
    id: "minimal",
    label: "Minimal Layout",
    blurb: "Lots of whitespace, 1–2 carefully placed photos",
    rects: [
      { top: 14, left: 10, width: 32, height: 32 },
      { top: 56, left: 56, width: 32, height: 32 },
    ],
  },
  {
    id: "asymmetrical",
    label: "Asymmetrical Layout",
    blurb: "Different sizes, unconventional positioning",
    rects: [
      { top: 0, left: 0, width: 62, height: 58 },
      { top: 0, left: 64, width: 36, height: 27 },
      { top: 29, left: 64, width: 36, height: 71 },
      { top: 60, left: 0, width: 62, height: 40 },
    ],
  },
  {
    id: "polaroid",
    label: "Polaroid Layout",
    blurb: "Photos styled like printed polaroid pictures",
    style: "polaroid",
    rects: [
      { top: 4, left: 6, width: 40, height: 44, rotate: -6 },
      { top: 2, left: 52, width: 40, height: 40, rotate: 4 },
      { top: 52, left: 4, width: 40, height: 44, rotate: 5 },
      { top: 50, left: 52, width: 40, height: 44, rotate: -4 },
    ],
  },
];

const layoutMap = new Map(LAYOUTS.map((l) => [l.id, l]));
const getLayout = (id: LayoutId) => layoutMap.get(id) ?? LAYOUTS[0];

const CANVAS_W = 2540;
const CANVAS_H = 2032;
const BASE_CANVAS_PX = 900;
const FLIP_MS = 640;

/* ══════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════ */

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function loadContext(): EditorContext {
  try {
    const raw = sessionStorage.getItem("currentTemplateEditor");
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    templateId: 0,
    templateName: "Untitled Album",
    sheetsCount: 14,
    canvasSize: "10x8",
    photosRequired: 0,
    versionNum: 1,
    isLatest: true,
    status: "Draft",
  };
}

function makeSlot(): Slot {
  return { id: `slot_${uid()}`, image: null };
}

function makeSheet(index: number, layout: LayoutId = "full"): Sheet {
  const meta = getLayout(layout);
  return {
    id: `sheet_${uid()}`,
    name: `Page ${index}`,
    layout,
    slots: Array.from({ length: meta.rects.length }, makeSlot),
    bgColor: "#ffffff",
    bgImage: null,
  };
}

function buildInitialSheets(count: number): Sheet[] {
  const defaults: LayoutId[] = ["hero", "full", "grid4", "three"];
  return Array.from({ length: Math.max(count, 1) }, (_, i) => {
    const sheet = makeSheet(i + 1, defaults[i % defaults.length]);
    if (i === 0) {
      sheet.bgColor = "#7a1f2f";
    }
    return sheet;
  });
}

function cloneSheets(sheets: Sheet[]): Sheet[] {
  return typeof structuredClone === "function"
    ? structuredClone(sheets)
    : JSON.parse(JSON.stringify(sheets));
}

function rectStyle(r: Rect, gap: number, radius: number): React.CSSProperties {
  return {
    top: `calc(${r.top}% + ${gap}px)`,
    left: `calc(${r.left}% + ${gap}px)`,
    width: `calc(${r.width}% - ${gap * 2}px)`,
    height: `calc(${r.height}% - ${gap * 2}px)`,
    borderRadius: `${radius}px`,
    zIndex: r.z ?? 1,
  };
}

/* ══════════════════════════════════════════════════════════════
   Small presentational bits
   ══════════════════════════════════════════════════════════════ */

function LayoutThumb({ rects }: { rects: Rect[] }) {
  return (
    <span className="tp-thumb">
      {rects.map((r, i) => (
        <span
          key={i}
          className="tp-thumb-rect"
          style={{
            top: `${r.top}%`,
            left: `${r.left}%`,
            width: `${r.width}%`,
            height: `${r.height}%`,
            transform: r.rotate ? `rotate(${r.rotate}deg)` : undefined,
            zIndex: r.z ?? 1,
          }}
        />
      ))}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════════════════ */

export default function TemplateEditorPage() {
  const navigate = useNavigate();
  const ctx = useMemo(loadContext, []);

  const [sheets, setSheets] = useState<Sheet[]>(() => buildInitialSheets(ctx.sheetsCount || 14));
  const [activeSheetId, setActiveSheetId] = useState<string>(sheets[0]?.id ?? "");
  const [rightTab, setRightTab] = useState<"layout" | "comments" | "history">("layout");
  const [zoom, setZoom] = useState(55);
  const [previewMode, setPreviewMode] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ gap: 6, radius: 10, showGuides: false });

  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [dragSheetId, setDragSheetId] = useState<string | null>(null);
  const [menuSlotId, setMenuSlotId] = useState<string | null>(null);

  const [undoStack, setUndoStack] = useState<Sheet[][]>([]);
  const [redoStack, setRedoStack] = useState<Sheet[][]>([]);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [versions, setVersions] = useState<VersionEntry[]>([]);

  /* ── Save toast ── */
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  /* ── Review Album (real page-turning flip-book, cover + spreads) ──
     reviewIndex is a SPREAD index:
       0            → the single front-cover page (sheets[0]), shown alone
                       on the right-hand side of the book.
       1..n         → real two-page spreads built from the remaining
                       sheets, two per spread:
                         spread i → left  = sheets[1 + (i-1)*2]
                                    right = sheets[1 + (i-1)*2 + 1]
     See spreadLeft / spreadRight below. */
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [turn, setTurn] = useState<TurnState | null>(null);
  const flipTimerRef = useRef<number | null>(null);
  const turnRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const dragMeta = useRef<{ dir: FlipDir; startX: number; width: number; progress: number } | null>(null);
  const bookRef = useRef<HTMLDivElement | null>(null);

  const slotFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const activeSlotIdForUpload = useRef<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0];
  const layoutMeta = getLayout(activeSheet?.layout ?? "full");
  const totalSpreads = sheets.length <= 1 ? 1 : 1 + Math.ceil((sheets.length - 1) / 2);
  const spreadLeft = (i: number): Sheet | undefined =>
    i === 0 ? undefined : sheets[1 + (i - 1) * 2];
  const spreadRight = (i: number): Sheet | undefined =>
    i === 0 ? sheets[0] : sheets[1 + (i - 1) * 2 + 1];

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
    };
  }, []);

  const commitSheets = (updater: (prev: Sheet[]) => Sheet[]) => {
    setSheets((prev) => {
      const next = updater(prev);
      setUndoStack((u) => [...u.slice(-49), prev]);
      setRedoStack([]);
      return next;
    });
  };

  const handleUndo = () => {
    setUndoStack((u) => {
      if (!u.length) return u;
      const prevSnapshot = u[u.length - 1];
      setRedoStack((r) => [...r, sheets]);
      setSheets(prevSnapshot);
      return u.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((r) => {
      if (!r.length) return r;
      const nextSnapshot = r[r.length - 1];
      setUndoStack((u) => [...u, sheets]);
      setSheets(nextSnapshot);
      return r.slice(0, -1);
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheets, undoStack, redoStack]);

  /* ── Sheet operations ── */
  const addSheet = () => {
    const newSheet = makeSheet(sheets.length + 1, "full");
    commitSheets((prev) => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
  };

  const duplicateSheet = (id: string) => {
    const source = sheets.find((s) => s.id === id);
    if (!source) return;
    const copy: Sheet = {
      ...cloneSheets([source])[0],
      id: `sheet_${uid()}`,
      name: `${source.name} Copy`,
      slots: source.slots.map((sl) => ({ ...sl, id: `slot_${uid()}` })),
    };
    commitSheets((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setActiveSheetId(copy.id);
  };

  const deleteSheet = (id: string) => {
    commitSheets((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === activeSheetId && next.length) setActiveSheetId(next[0].id);
      return next.length ? next : prev;
    });
  };

  const commitRename = () => {
    if (renamingId) {
      const name = renameDraft.trim() || "Untitled Page";
      commitSheets((prev) => prev.map((s) => (s.id === renamingId ? { ...s, name } : s)));
    }
    setRenamingId(null);
  };

  /* ── Sheet reordering ── */
  const handleSheetDrop = (targetId: string) => {
    if (!dragSheetId || dragSheetId === targetId) {
      setDragSheetId(null);
      return;
    }
    commitSheets((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((s) => s.id === dragSheetId);
      const toIdx = next.findIndex((s) => s.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDragSheetId(null);
  };

  /* ── Layout ── */
  const applyLayout = (layoutId: LayoutId) => {
    if (!activeSheet) return;
    const meta = getLayout(layoutId);
    commitSheets((prev) =>
      prev.map((s) => {
        if (s.id !== activeSheet.id) return s;
        const needed = meta.rects.length;
        const newSlots: Slot[] = Array.from({ length: needed }, (_, i) =>
          s.slots[i] ? { ...s.slots[i] } : makeSlot()
        );
        if (meta.captions) {
          newSlots.forEach((sl, i) => {
            if (!sl.caption) {
              sl.caption =
                meta.captionStyle === "before-after"
                  ? i === 0
                    ? "Before"
                    : "After"
                  : `Moment ${i + 1}`;
            }
          });
        }
        return {
          ...s,
          layout: layoutId,
          slots: newSlots,
          title: layoutId === "magazine" ? s.title || "Your Story" : s.title,
          subtitle:
            layoutId === "magazine" ? s.subtitle || "A moment worth remembering" : s.subtitle,
        };
      })
    );
  };

  /* ── Slot image handling ── */
  const applyImageToSlot = (slotId: string, file: File) => {
    if (!activeSheet) return;
    const url = URL.createObjectURL(file);
    commitSheets((prev) =>
      prev.map((s) =>
        s.id !== activeSheet.id
          ? s
          : {
              ...s,
              slots: s.slots.map((sl) =>
                sl.id === slotId ? { ...sl, image: url, fileName: file.name } : sl
              ),
            }
      )
    );
  };

  const removeSlotImage = (slotId: string) => {
    if (!activeSheet) return;
    commitSheets((prev) =>
      prev.map((s) =>
        s.id !== activeSheet.id
          ? s
          : {
              ...s,
              slots: s.slots.map((sl) =>
                sl.id === slotId ? { ...sl, image: null, fileName: undefined } : sl
              ),
            }
      )
    );
  };

  const openSlotUpload = (slotId: string) => {
    if (previewMode) return;
    activeSlotIdForUpload.current = slotId;
    slotFileRef.current?.click();
  };

  const handleSlotFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotId = activeSlotIdForUpload.current;
    if (file && slotId) applyImageToSlot(slotId, file);
    e.target.value = "";
  };

  const updateSlotCaption = (slotId: string, caption: string) => {
    if (!activeSheet) return;
    commitSheets((prev) =>
      prev.map((s) =>
        s.id !== activeSheet.id
          ? s
          : { ...s, slots: s.slots.map((sl) => (sl.id === slotId ? { ...sl, caption } : sl)) }
      )
    );
  };

  const rotateSlot = (slotId: string) => {
    if (!activeSheet) return;
    commitSheets((prev) =>
      prev.map((s) =>
        s.id !== activeSheet.id
          ? s
          : {
              ...s,
              slots: s.slots.map((sl) =>
                sl.id === slotId ? { ...sl, rotateExtra: ((sl.rotateExtra ?? 0) + 90) % 360 } : sl
              ),
            }
      )
    );
  };

  const flipSlot = (slotId: string) => {
    if (!activeSheet) return;
    commitSheets((prev) =>
      prev.map((s) =>
        s.id !== activeSheet.id
          ? s
          : {
              ...s,
              slots: s.slots.map((sl) => (sl.id === slotId ? { ...sl, flip: !sl.flip } : sl)),
            }
      )
    );
  };

  const bringToFront = (slotId: string) => {
    if (!activeSheet) return;
    commitSheets((prev) =>
      prev.map((s) =>
        s.id !== activeSheet.id
          ? s
          : {
              ...s,
              slots: s.slots.map((sl) => ({ ...sl, front: sl.id === slotId })),
            }
      )
    );
  };

  const handleSlotDragStart = (slotId: string) => setDragSlotId(slotId);

  const handleSlotDrop = (targetSlotId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlotId(null);
    if (!activeSheet) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      applyImageToSlot(targetSlotId, droppedFile);
      setDragSlotId(null);
      return;
    }

    if (!dragSlotId || dragSlotId === targetSlotId) return;
    commitSheets((prev) =>
      prev.map((s) => {
        if (s.id !== activeSheet.id) return s;
        const slots = [...s.slots];
        const fromIdx = slots.findIndex((sl) => sl.id === dragSlotId);
        const toIdx = slots.findIndex((sl) => sl.id === targetSlotId);
        if (fromIdx === -1 || toIdx === -1) return s;
        const [moved] = slots.splice(fromIdx, 1);
        slots.splice(toIdx, 0, moved);
        return { ...s, slots };
      })
    );
    setDragSlotId(null);
  };

  /* ── Background (per-sheet) ── */
  const setSheetBg = (patch: Partial<Pick<Sheet, "bgColor" | "bgImage">>) => {
    if (!activeSheet) return;
    commitSheets((prev) =>
      prev.map((s) => (s.id === activeSheet.id ? { ...s, ...patch } : s))
    );
  };

  const handleBgImageChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSheetBg({ bgImage: URL.createObjectURL(file) });
    e.target.value = "";
  };

  /* ── Magazine text ── */
  const updateSheetText = (field: "title" | "subtitle", value: string) => {
    if (!activeSheet) return;
    commitSheets((prev) =>
      prev.map((s) => (s.id === activeSheet.id ? { ...s, [field]: value } : s))
    );
  };

  /* ── Toast helper ── */
  const showToast = (message: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2400);
  };

  /* ── Save / Share / Versions ── */
  const handleSave = () => {
    const payload = { ...ctx, sheets };
    sessionStorage.setItem(`albumTemplate_${ctx.templateId}_v${ctx.versionNum}`, JSON.stringify(payload));
    setVersions((v) => [
      ...v,
      {
        id: uid(),
        label: `Save ${v.length + 1}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sheetCount: sheets.length,
        snapshot: cloneSheets(sheets),
      },
    ]);
    setSaved(true);
    setPreviewMode(true);
    setMenuSlotId(null);
    showToast("✓ Album saved");
    window.setTimeout(() => setSaved(false), 1800);
  };

  const restoreVersion = (entry: VersionEntry) => {
    commitSheets(() => cloneSheets(entry.snapshot));
    setActiveSheetId((prev) =>
      entry.snapshot.some((s) => s.id === prev) ? prev : entry.snapshot[0]?.id ?? prev
    );
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/events/create/album/template-editor?template=${ctx.templateId}&v=${ctx.versionNum}`;
    try {
      await navigator.clipboard.writeText(link);
      alert("Share link copied to clipboard.");
    } catch {
      alert(link);
    }
  };

  /* ── Comments ── */
  const postComment = () => {
    if (!commentDraft.trim()) return;
    setComments((c) => [
      ...c,
      {
        id: uid(),
        text: commentDraft.trim(),
        author: "You",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setCommentDraft("");
  };
  const deleteComment = (id: string) => setComments((c) => c.filter((x) => x.id !== id));

  /* ══════════════════════════════════════════════════════════════
     Review Album — cover + real two-page-spread page-turning flip-book
     ══════════════════════════════════════════════════════════════ */

  const clearTurnTimer = () => {
    if (flipTimerRef.current) {
      window.clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }
  };

  const openReview = () => {
    const sheetIdx = sheets.findIndex((s) => s.id === activeSheetId);
    let spreadIdx = 0;
    if (sheetIdx > 0) spreadIdx = 1 + Math.floor((sheetIdx - 1) / 2);
    setReviewIndex(Math.min(Math.max(spreadIdx, 0), totalSpreads - 1));
    clearTurnTimer();
    setTurn(null);
    setReviewOpen(true);
  };

  const closeReview = () => {
    clearTurnTimer();
    setTurn(null);
    dragMeta.current = null;
    setReviewOpen(false);
  };

  const setTurnVisual = (angleDeg: number, withTransition: boolean, durationMs: number = FLIP_MS) => {
    const el = turnRef.current;
    if (el) {
      el.style.transition = withTransition
        ? `transform ${durationMs}ms cubic-bezier(0.45,0,0.2,1)`
        : "none";
      el.style.transform = `rotateY(${angleDeg}deg)`;
    }
    const shadowEl = shadowRef.current;
    if (shadowEl) {
      const norm = Math.min(Math.abs(angleDeg) / 180, 1);
      const opacity = Math.sin(norm * Math.PI) * 0.6;
      shadowEl.style.transition = withTransition ? `opacity ${durationMs}ms ease` : "none";
      shadowEl.style.opacity = String(opacity);
    }
  };

  const startCommittedFlip = (nextIndex: number, dir: FlipDir, fromAngle = 0, duration = FLIP_MS) => {
    if (turn || nextIndex < 0 || nextIndex >= totalSpreads) return;
    clearTurnTimer();
    setTurn({ from: reviewIndex, to: nextIndex, dir, committing: true });
    requestAnimationFrame(() => {
      setTurnVisual(fromAngle, false);
      requestAnimationFrame(() => {
        setTurnVisual(dir === "forward" ? -180 : 180, true, duration);
      });
    });
    flipTimerRef.current = window.setTimeout(() => {
      setReviewIndex(nextIndex);
      setTurn(null);
      flipTimerRef.current = null;
    }, duration);
  };

  const goToPage = (dir: FlipDir) => {
    if (turn) return;
    const nextIndex = dir === "forward" ? reviewIndex + 1 : reviewIndex - 1;
    startCommittedFlip(nextIndex, dir);
  };

  const jumpToPage = (index: number) => {
    if (turn || index === reviewIndex) return;
    startCommittedFlip(index, index > reviewIndex ? "forward" : "backward");
  };

  useEffect(() => {
    if (!reviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToPage("forward");
      else if (e.key === "ArrowLeft") goToPage("backward");
      else if (e.key === "Escape") closeReview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewOpen, reviewIndex, turn]);

  const onBookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (turn) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const dir: FlipDir = relX > rect.width / 2 ? "forward" : "backward";
    const targetIndex = dir === "forward" ? reviewIndex + 1 : reviewIndex - 1;
    if (targetIndex < 0 || targetIndex >= totalSpreads) return;
    dragMeta.current = { dir, startX: e.clientX, width: rect.width / 2, progress: 0 };
    setTurn({ from: reviewIndex, to: targetIndex, dir, committing: false });
    requestAnimationFrame(() => setTurnVisual(0, false));
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {

    }
  };

  const onBookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const meta = dragMeta.current;
    if (!meta || !turn || turn.committing) return;
    const deltaX = e.clientX - meta.startX;
    const raw = meta.dir === "forward" ? -deltaX : deltaX;
    const progress = Math.min(Math.max(raw / (meta.width * 0.92), 0), 1);
    meta.progress = progress;
    const angle = meta.dir === "forward" ? -progress * 178 : progress * 178;
    setTurnVisual(angle, false);
  };

  const finishDrag = () => {
    const meta = dragMeta.current;
    dragMeta.current = null;
    if (!meta || !turn || turn.committing) return;
    const targetIndex = turn.to;
    const dir = turn.dir;
    if (meta.progress > 0.32) {
      const duration = Math.max(180, Math.round(FLIP_MS * (1 - meta.progress) + 120));
      setTurn((t) => (t ? { ...t, committing: true } : t));
      clearTurnTimer();
      requestAnimationFrame(() => setTurnVisual(dir === "forward" ? -180 : 180, true, duration));
      flipTimerRef.current = window.setTimeout(() => {
        setReviewIndex(targetIndex);
        setTurn(null);
        flipTimerRef.current = null;
      }, duration);
    } else {
      const duration = Math.max(160, Math.round(FLIP_MS * meta.progress * 0.5 + 160));
      setTurn((t) => (t ? { ...t, committing: true } : t));
      clearTurnTimer();
      requestAnimationFrame(() => setTurnVisual(0, true, duration));
      flipTimerRef.current = window.setTimeout(() => {
        setTurn(null);
        flipTimerRef.current = null;
      }, duration);
    }
  };

  const renderAlbumPage = (sheet?: Sheet) => {
    if (!sheet) {
      return <div className="ab-blank-leaf" />;
    }
    const meta = getLayout(sheet.layout);
    return (
      <div
        className="ab-page-surface"
        style={{
          background: sheet.bgImage ? `url(${sheet.bgImage}) center/cover` : sheet.bgColor,
        }}
      >
        {meta.id === "magazine" && meta.textRect && (
          <div className="ab-magazine-text" style={rectStyle(meta.textRect, settings.gap, 0)}>
            <div className="ab-magazine-title">{sheet.title || "Your Story"}</div>
            <div className="ab-magazine-subtitle">{sheet.subtitle || "A moment worth remembering"}</div>
          </div>
        )}

        {meta.decorative === "vs" && <div className="ab-vs-badge">VS</div>}
        {meta.decorative === "spine" && <div className="ab-panoramic-spine" />}
        {meta.decorative === "timeline" && <div className="ab-timeline-line" />}

        {sheet.slots.map((slot, i) => {
          const rect = meta.rects[i] ?? meta.rects[meta.rects.length - 1];
          const rotate = (rect.rotate ?? 0) + (slot.rotateExtra ?? 0);
          const transform = `rotate(${rotate}deg) scaleX(${slot.flip ? -1 : 1})`;
          return (
            <div
              key={slot.id}
              className={`ab-slot ${meta.style === "polaroid" ? "ab-slot-polaroid" : ""} ${
                meta.style === "collage" ? "ab-slot-collage" : ""
              }`}
              style={{
                ...rectStyle(rect, settings.gap, meta.style === "polaroid" ? 2 : settings.radius),
                transform,
                zIndex: slot.front ? 50 : rect.z ?? 1,
              }}
            >
              <div className="ab-slot-media">
                {slot.image ? (
                  <img src={slot.image} alt={slot.fileName ?? "photo"} />
                ) : (
                  <div className="ab-slot-empty">
                    <PictureOutlined />
                    <span>No photo</span>
                  </div>
                )}
              </div>
              {meta.decorative === "timeline" && <span className="ab-timeline-step">{i + 1}</span>}
              {meta.captions && <div className="ab-slot-caption">{slot.caption}</div>}
            </div>
          );
        })}
      </div>
    );
  };

  /* Page 1 is a single rigid cardboard cover, never a two-page spread. */
  const renderHardCover = () => {
    const cover = sheets[0];
    return (
      <div className="ab-hard-cover">
        <div className="ab-cover-board" />
        {renderAlbumPage(cover)}
        <div className="ab-cover-gloss" />
        <div className="ab-cover-spine" />
      </div>
    );
  };

  if (!activeSheet) {
    return (
      <main className="tp-page">
        <p style={{ color: "#cbd8e7", padding: 40 }}>No sheets available.</p>
      </main>
    );
  }

  const canvasPx = Math.round(BASE_CANVAS_PX * (zoom / 100));

  const currentLeft = spreadLeft(reviewIndex);
  const currentRight = spreadRight(reviewIndex);
  /* During a turn, paint the destination spread beneath the moving leaf.
     This keeps both images alive for the entire animation and removes flicker. */
  const visibleIndex = turn?.to ?? reviewIndex;
  const visibleLeft = spreadLeft(visibleIndex);
  const visibleRight = spreadRight(visibleIndex);
  const showingCover = visibleIndex === 0;
  const firstPageNum = reviewIndex === 0 ? 1 : 2 + (reviewIndex - 1) * 2;
  const lastPageNum = reviewIndex === 0 ? 1 : currentRight ? firstPageNum + 1 : firstPageNum;

  return (
    <main className="tp-page">
      {/* ── Save toast (shows at the top of the screen) ── */}
      {toast && (
        <div className="tp-toast" role="status">
          <CheckOutlined /> {toast}
        </div>
      )}

      <section className="tp-stage">
        {/* ── Top bar ── */}
        <header className="tp-topbar">
          <div className="tp-topbar-left">
            <button className="tp-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeftOutlined />
            </button>
            <div className="tp-breadcrumb">
              <span>{sheets.length} sheets</span>
              <span className="tp-dot">·</span>
              <span>{activeSheet.name}</span>
              <span className="tp-dot">·</span>
              <span>{layoutMeta.label}</span>
            </div>
          </div>

          <div className="tp-topbar-right">
            <button
              className="tp-icon-btn ghost"
              aria-label="Undo"
              disabled={!undoStack.length}
              onClick={handleUndo}
            >
              <UndoOutlined />
            </button>
            <button
              className="tp-icon-btn ghost"
              aria-label="Redo"
              disabled={!redoStack.length}
              onClick={handleRedo}
            >
              <RedoOutlined />
            </button>

            <label className="tp-toggle" title="Preview mode">
              <input
                type="checkbox"
                checked={previewMode}
                onChange={(e) => setPreviewMode(e.target.checked)}
              />
              <span className="tp-toggle-track">
                <span className="tp-toggle-thumb" />
              </span>
            </label>

            <button className="tp-btn-ghost" onClick={() => setSettingsOpen(true)}>
              <SettingOutlined /> Preview setting
            </button>
            <button className="tp-btn-outline" onClick={openReview}>
              <ReadOutlined /> Review Album
            </button>
            <button className="tp-btn-outline" onClick={handleSave}>
              {saved ? <CheckOutlined /> : <SaveOutlined />} {saved ? "Saved!" : "Save Album"}
            </button>
            <span className="tp-size-pill">{ctx.canvasSize}</span>
            <button className="tp-btn-primary" onClick={handleShare}>
              <ShareAltOutlined /> Share
            </button>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="tp-body">
          {/* Left: Sheets panel */}
          <aside className="tp-sheets-panel">
            <div className="tp-panel-label">Sheets</div>
            <button className="tp-add-sheet" onClick={addSheet}>
              <PlusOutlined /> Add sheet
            </button>

            <div className="tp-sheets-list">
              {sheets.map((sheet) => {
                const meta = getLayout(sheet.layout);
                return (
                  <div
                    key={sheet.id}
                    className={`tp-sheet-item ${sheet.id === activeSheetId ? "active" : ""} ${
                      dragSheetId === sheet.id ? "dragging" : ""
                    }`}
                    draggable
                    onClick={() => setActiveSheetId(sheet.id)}
                    onDragStart={() => setDragSheetId(sheet.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleSheetDrop(sheet.id)}
                    onDragEnd={() => setDragSheetId(null)}
                  >
                    <span className="tp-sheet-thumb">
                      <LayoutThumb rects={meta.rects} />
                    </span>

                    {renamingId === sheet.id ? (
                      <input
                        ref={renameInputRef}
                        className="tp-sheet-rename-input"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => e.key === "Enter" && commitRename()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="tp-sheet-name"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenameDraft(sheet.name);
                          setRenamingId(sheet.id);
                        }}
                      >
                        {sheet.name}
                      </span>
                    )}

                    <button
                      className="tp-sheet-dup"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateSheet(sheet.id);
                      }}
                      aria-label="Duplicate sheet"
                      title="Duplicate sheet"
                    >
                      <CopyOutlined />
                    </button>

                    {sheets.length > 1 && (
                      <button
                        className="tp-sheet-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSheet(sheet.id);
                        }}
                        aria-label="Delete sheet"
                        title="Delete sheet"
                      >
                        <DeleteOutlined />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="tp-panel-label" style={{ marginTop: 18 }}>
              Slots
            </div>
            <div className="tp-slots-list">
              {activeSheet.slots.map((slot, i) => (
                <div
                  key={slot.id}
                  className="tp-slot-row"
                  draggable
                  onDragStart={() => handleSlotDragStart(slot.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleSlotDrop(slot.id, e)}
                >
                  <span className="tp-slot-handle">⋮⋮</span>
                  <span className="tp-slot-name">
                    {layoutMeta.captionStyle === "before-after"
                      ? slot.caption ?? `Slot ${i + 1}`
                      : `Slot ${i + 1}`}
                  </span>
                  {slot.image && <span className="tp-slot-dot" />}
                </div>
              ))}
            </div>
          </aside>

          {/* Center: Canvas */}
          <div className="tp-canvas-wrap">
            <input
              ref={slotFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleSlotFileChosen}
            />

            <div
              className={`tp-canvas ${previewMode ? "is-preview" : ""}`}
              style={{
                width: `${canvasPx}px`,
                aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
                background: activeSheet.bgImage
                  ? `url(${activeSheet.bgImage}) center/cover`
                  : activeSheet.bgColor,
              }}
            >
              {settings.showGuides && !previewMode && (
                <div className="tp-guides">
                  <span className="tp-guide-v" style={{ left: "33.33%" }} />
                  <span className="tp-guide-v" style={{ left: "66.66%" }} />
                  <span className="tp-guide-h" style={{ top: "33.33%" }} />
                  <span className="tp-guide-h" style={{ top: "66.66%" }} />
                </div>
              )}

              {layoutMeta.id === "magazine" && layoutMeta.textRect && (
                <div className="tp-magazine-text" style={rectStyle(layoutMeta.textRect, settings.gap, 0)}>
                  <div
                    className="tp-magazine-title"
                    contentEditable={!previewMode}
                    suppressContentEditableWarning
                    onBlur={(e) => updateSheetText("title", e.currentTarget.textContent || "")}
                  >
                    {activeSheet.title || "Your Story"}
                  </div>
                  <div
                    className="tp-magazine-subtitle"
                    contentEditable={!previewMode}
                    suppressContentEditableWarning
                    onBlur={(e) => updateSheetText("subtitle", e.currentTarget.textContent || "")}
                  >
                    {activeSheet.subtitle || "A moment worth remembering"}
                  </div>
                </div>
              )}

              {layoutMeta.decorative === "vs" && (
                <div className="tp-vs-badge" style={{ zIndex: 20 }}>
                  VS
                </div>
              )}
              {layoutMeta.decorative === "spine" && <div className="tp-panoramic-spine" />}
              {layoutMeta.decorative === "timeline" && <div className="tp-timeline-line" />}

              {activeSheet.slots.map((slot, i) => {
                const rect = layoutMeta.rects[i] ?? layoutMeta.rects[layoutMeta.rects.length - 1];
                const rotate = (rect.rotate ?? 0) + (slot.rotateExtra ?? 0);
                const transform = `rotate(${rotate}deg) scaleX(${slot.flip ? -1 : 1})`;
                return (
                  <div
                    key={slot.id}
                    className={`tp-slot ${layoutMeta.style === "polaroid" ? "tp-slot-polaroid" : ""} ${
                      layoutMeta.style === "collage" ? "tp-slot-collage" : ""
                    } ${dragOverSlotId === slot.id ? "drag-over" : ""}`}
                    style={{ ...rectStyle(rect, settings.gap, layoutMeta.style === "polaroid" ? 2 : settings.radius), transform, zIndex: slot.front ? 50 : rect.z ?? 1 }}
                    onClick={() => (slot.image ? undefined : openSlotUpload(slot.id))}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverSlotId(slot.id);
                    }}
                    onDragLeave={() => setDragOverSlotId((cur) => (cur === slot.id ? null : cur))}
                    onDrop={(e) => handleSlotDrop(slot.id, e)}
                  >
                    <div className="tp-slot-media">
                      {slot.image ? (
                        <img src={slot.image} alt={slot.fileName ?? "slot"} />
                      ) : (
                        <div className="tp-slot-empty">
                          <UploadOutlined />
                          <span>{previewMode ? "" : "Click or drop a photo"}</span>
                        </div>
                      )}
                    </div>

                    {layoutMeta.decorative === "timeline" && (
                      <span className="tp-timeline-step">{i + 1}</span>
                    )}

                    {layoutMeta.captions && (
                      <div
                        className="tp-slot-caption"
                        contentEditable={!previewMode}
                        suppressContentEditableWarning
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => updateSlotCaption(slot.id, e.currentTarget.textContent || "")}
                      >
                        {slot.caption}
                      </div>
                    )}

                    {!previewMode && (
                      <>
                        <button
                          className="tp-slot-menu"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuSlotId((cur) => (cur === slot.id ? null : slot.id));
                          }}
                          aria-label="Slot options"
                        >
                          <MoreOutlined />
                        </button>

                        {menuSlotId === slot.id && (
                          <>
                            <div
                              className="tp-slot-menu-backdrop"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuSlotId(null);
                              }}
                            />
                            <div className="tp-slot-dropdown" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  openSlotUpload(slot.id);
                                  setMenuSlotId(null);
                                }}
                              >
                                <UploadOutlined /> {slot.image ? "Replace photo" : "Add photo"}
                              </button>
                              <button
                                onClick={() => {
                                  rotateSlot(slot.id);
                                  setMenuSlotId(null);
                                }}
                              >
                                <RotateRightOutlined /> Rotate 90°
                              </button>
                              <button
                                onClick={() => {
                                  flipSlot(slot.id);
                                  setMenuSlotId(null);
                                }}
                              >
                                <SwapOutlined /> Flip horizontal
                              </button>
                              {(layoutMeta.style === "collage" || layoutMeta.style === "polaroid") && (
                                <button
                                  onClick={() => {
                                    bringToFront(slot.id);
                                    setMenuSlotId(null);
                                  }}
                                >
                                  <VerticalAlignTopOutlined /> Bring to front
                                </button>
                              )}
                              {slot.image && (
                                <button
                                  className="danger"
                                  onClick={() => {
                                    removeSlotImage(slot.id);
                                    setMenuSlotId(null);
                                  }}
                                >
                                  <CloseOutlined /> Remove photo
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Properties panel */}
          <aside className="tp-props-panel">
            <div className="tp-tabs">
              <button
                className={`tp-tab ${rightTab === "layout" ? "active" : ""}`}
                onClick={() => setRightTab("layout")}
              >
                <AppstoreOutlined /> Layout
              </button>
              <button
                className={`tp-tab ${rightTab === "comments" ? "active" : ""}`}
                onClick={() => setRightTab("comments")}
              >
                <MessageOutlined /> Comments{comments.length ? ` (${comments.length})` : ""}
              </button>
              <button
                className={`tp-tab ${rightTab === "history" ? "active" : ""}`}
                onClick={() => setRightTab("history")}
              >
                <HistoryOutlined /> History
              </button>
            </div>

            {rightTab === "layout" && (
              <div className="tp-props-body">
                <div className="tp-props-label">Choose a layout</div>
                <div className="tp-layout-grid">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      className={`tp-layout-card ${activeSheet.layout === l.id ? "active" : ""}`}
                      onClick={() => applyLayout(l.id)}
                      title={l.blurb}
                    >
                      <LayoutThumb rects={l.rects} />
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>

                <div className="tp-props-label">Background Color</div>
                <div className="tp-color-row">
                  <input
                    type="color"
                    className="tp-color-swatch"
                    value={activeSheet.bgColor}
                    onChange={(e) => setSheetBg({ bgColor: e.target.value, bgImage: null })}
                  />
                  <span className="tp-color-hex">{activeSheet.bgColor}</span>
                </div>

                <div className="tp-props-label">Background Image</div>
                <input
                  ref={bgFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleBgImageChosen}
                />
                <button className="tp-add-grid-btn" onClick={() => bgFileRef.current?.click()}>
                  <PictureOutlined /> Add background image
                </button>
                {activeSheet.bgImage && (
                  <button className="tp-clear-bg" onClick={() => setSheetBg({ bgImage: null })}>
                    Remove background image
                  </button>
                )}

                <div className="tp-props-meta">
                  <div className="tp-meta-row">
                    <span>Canvas</span>
                    <span>
                      {CANVAS_W}×{CANVAS_H}
                    </span>
                  </div>
                  <div className="tp-meta-row">
                    <span>Layout</span>
                    <span>{layoutMeta.label}</span>
                  </div>
                  <div className="tp-meta-row">
                    <span>Slots</span>
                    <span>{activeSheet.slots.length}</span>
                  </div>
                  <div className="tp-meta-row">
                    <span>Version</span>
                    <span>v{ctx.versionNum}</span>
                  </div>
                  <div className="tp-meta-hint">Double-click a sheet name to rename it.</div>
                </div>
              </div>
            )}

            {rightTab === "comments" && (
              <div className="tp-props-body">
                {comments.length === 0 ? (
                  <div className="tp-empty-tab">No comments yet on this version.</div>
                ) : (
                  <div className="tp-comment-list">
                    {comments.map((c) => (
                      <div key={c.id} className="tp-comment">
                        <div className="tp-comment-head">
                          <span className="tp-comment-author">{c.author}</span>
                          <span className="tp-comment-time">{c.time}</span>
                          <button className="tp-comment-del" onClick={() => deleteComment(c.id)}>
                            <CloseOutlined />
                          </button>
                        </div>
                        <div className="tp-comment-text">{c.text}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="tp-comment-composer">
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Leave a comment on this album…"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) postComment();
                    }}
                  />
                  <button className="tp-add-grid-btn" onClick={postComment}>
                    <SendOutlined /> Post comment
                  </button>
                </div>
              </div>
            )}

            {rightTab === "history" && (
              <div className="tp-props-body">
                {versions.length === 0 ? (
                  <div className="tp-empty-tab">
                    Version history for “{ctx.templateName}” will appear here once you save.
                  </div>
                ) : (
                  <div className="tp-version-list">
                    {[...versions].reverse().map((v) => (
                      <div key={v.id} className="tp-version">
                        <div className="tp-version-info">
                          <span className="tp-version-label">{v.label}</span>
                          <span className="tp-version-time">
                            {v.time} · {v.sheetCount} sheets
                          </span>
                        </div>
                        <button className="tp-version-restore" onClick={() => restoreVersion(v)}>
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* ── Bottom status bar ── */}
        <footer className="tp-statusbar">
          <span>
            {CANVAS_W} × {CANVAS_H} px &nbsp;·&nbsp; {activeSheet.slots.length} slots &nbsp;·&nbsp;{" "}
            {layoutMeta.label}
          </span>
          <div className="tp-zoom">
            <input
              type="range"
              min={20}
              max={150}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <span>{zoom}%</span>
          </div>
        </footer>
      </section>

      {/* ── Settings modal ── */}
      {settingsOpen && (
        <div className="tp-modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="tp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tp-modal-head">
              <h3>Preview settings</h3>
              <button className="tp-icon-btn ghost" onClick={() => setSettingsOpen(false)}>
                <CloseOutlined />
              </button>
            </div>

            <div className="tp-modal-body">
              <label className="tp-modal-field">
                <span>Photo spacing ({settings.gap}px)</span>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={settings.gap}
                  onChange={(e) => setSettings((s) => ({ ...s, gap: Number(e.target.value) }))}
                />
              </label>

              <label className="tp-modal-field">
                <span>Corner rounding ({settings.radius}px)</span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={settings.radius}
                  onChange={(e) => setSettings((s) => ({ ...s, radius: Number(e.target.value) }))}
                />
              </label>

              <label className="tp-modal-toggle-row">
                <span>Show alignment guides</span>
                <span className="tp-toggle">
                  <input
                    type="checkbox"
                    checked={settings.showGuides}
                    onChange={(e) => setSettings((s) => ({ ...s, showGuides: e.target.checked }))}
                  />
                  <span className="tp-toggle-track">
                    <span className="tp-toggle-thumb" />
                  </span>
                </span>
              </label>

              <label className="tp-modal-toggle-row">
                <span>Preview mode (hide edit controls)</span>
                <span className="tp-toggle">
                  <input
                    type="checkbox"
                    checked={previewMode}
                    onChange={(e) => setPreviewMode(e.target.checked)}
                  />
                  <span className="tp-toggle-track">
                    <span className="tp-toggle-thumb" />
                  </span>
                </span>
              </label>
            </div>

            <div className="tp-modal-foot">
              <button className="tp-btn-primary" onClick={() => setSettingsOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          Review Album — cover page + real two-page-spread flip-book
          ══════════════════════════════════════════════════════════════ */}
      {reviewOpen && (
        <div className="ab-overlay" onClick={closeReview}>
          <div className="ab-shell" onClick={(e) => e.stopPropagation()}>
            <div className="ab-shell-head">
              <div className="ab-shell-title">
                <BookOutlined /> {ctx.templateName}
              </div>
              <button className="tp-icon-btn ghost" onClick={closeReview} aria-label="Close review">
                <CloseOutlined />
              </button>
            </div>

            <div className="ab-book-stage">
              <button
                className="ab-nav ab-nav-left"
                onClick={() => goToPage("backward")}
                disabled={reviewIndex === 0 || !!turn}
                aria-label="Previous page"
              >
                <LeftOutlined />
              </button>

              <div
                className={`ab-book ${showingCover ? "ab-book-cover" : ""} ${turn && !turn.committing ? "is-dragging" : ""}`}
                style={{ aspectRatio: showingCover ? `${CANVAS_W} / ${CANVAS_H}` : `${CANVAS_W * 2} / ${CANVAS_H}` }}
                ref={bookRef}
                onPointerDown={onBookPointerDown}
                onPointerMove={onBookPointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                onPointerLeave={(e) => {
                  // only cancel if the pointer isn't captured (i.e. we're not mid-drag)
                  if (dragMeta.current && e.buttons === 0) finishDrag();
                }}
              >
                {/* Resting layer: the settled, current spread (or the cover) */}
                {showingCover ? (
                  renderHardCover()
                ) : (
                  <div className="ab-spread ab-spread-base">
                    <div className="ab-leaf ab-leaf-left">{renderAlbumPage(visibleLeft)}</div>
                    <div className="ab-leaf ab-leaf-right">{renderAlbumPage(visibleRight)}</div>
                  </div>
                )}

                {/* Permanent binding shadow along the gutter — sits under the
                    turning leaf when a page is flat, and shows through the
                    gap while a page is mid-turn, like a real bound book. */}
                {!showingCover && <div className="ab-gutter" />}

                {/* The single turning leaf — shared by both the live drag
                    preview and the committed/settling animation. */}
                {turn && (
                  <div
                    ref={turnRef}
                    className={`ab-turn ${turn.dir === "forward" ? "turn-from-right" : "turn-from-left"}`}
                    style={{ transformOrigin: turn.dir === "forward" ? "left center" : "right center" }}
                  >
                    <div className="ab-flip-face ab-flip-front">
                      {turn.from === 0
                        ? renderHardCover()
                        : turn.dir === "forward"
                        ? renderAlbumPage(spreadRight(turn.from))
                        : renderAlbumPage(spreadLeft(turn.from))}
                    </div>
                    <div className="ab-flip-face ab-flip-back">
                      {turn.to === 0
                        ? renderHardCover()
                        : turn.dir === "forward"
                        ? renderAlbumPage(spreadLeft(turn.to))
                        : renderAlbumPage(spreadRight(turn.to))}
                    </div>
                    <div ref={shadowRef} className="ab-flip-shadow" />
                  </div>
                )}

                <div className="ab-page-shine" />
              </div>

              <button
                className="ab-nav ab-nav-right"
                onClick={() => goToPage("forward")}
                disabled={reviewIndex === totalSpreads - 1 || !!turn}
                aria-label="Next page"
              >
                <RightOutlined />
              </button>
            </div>

            <div className="ab-shell-foot">
              <span className="ab-page-count">
                {reviewIndex === 0
                  ? `Cover — Page 1 of ${sheets.length}`
                  : firstPageNum === lastPageNum
                  ? `Page ${firstPageNum} of ${sheets.length}`
                  : `Pages ${firstPageNum}–${lastPageNum} of ${sheets.length}`}
                {" — "}
                {reviewIndex === 0 ? currentRight?.name : currentLeft?.name}
                {reviewIndex !== 0 && currentRight ? ` · ${currentRight.name}` : ""}
              </span>
              <div className="ab-dots">
                {Array.from({ length: totalSpreads }, (_, i) => (
                  <button
                    key={i}
                    className={`ab-dot ${i === reviewIndex ? "active" : ""}`}
                    onClick={() => jumpToPage(i)}
                    title={
                      i === 0
                        ? spreadRight(0)?.name ?? "Cover"
                        : `${spreadLeft(i)?.name ?? ""}${spreadRight(i) ? ` · ${spreadRight(i)!.name}` : ""}`
                    }
                    aria-label={i === 0 ? "Go to cover" : `Go to spread ${i}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
