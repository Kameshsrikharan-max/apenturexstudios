import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {ArrowLeftOutlined,UndoOutlined,RedoOutlined,SettingOutlined,SaveOutlined,ShareAltOutlined,PlusOutlined,DeleteOutlined,PictureOutlined,MoreOutlined,UploadOutlined,CloseOutlined,AppstoreAddOutlined,} from "@ant-design/icons";
import "./TemplateEditorPage.css";

/* ── Types ── */
interface EditorContext {
  templateId: number;
  templateName: string;
  sheetsCount: number;
  canvasSize: string;
  photosRequired: number;
  versionNum: number;
  isLatest: boolean;
  status: string;
}

interface Slot {
  id: string;
  image: string | null; 
  fileName?: string;
}

interface Sheet {
  id: string;
  name: string;
  slots: Slot[];
}

const CANVAS_W = 2540;
const CANVAS_H = 2032;
const GRID_STEPS = [1, 2, 3, 4]; 

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
  return { id: `slot_${Math.random().toString(36).slice(2, 9)}`, image: null };
}

function makeSheet(index: number, slotCount = 2): Sheet {
  return {
    id: `sheet_${Math.random().toString(36).slice(2, 9)}`,
    name: `Page ${index}`,
    slots: Array.from({ length: slotCount }, () => makeSlot()),
  };
}

function buildInitialSheets(count: number): Sheet[] {
  return Array.from({ length: Math.max(count, 1) }, (_, i) => makeSheet(i + 1, 2));
}

export default function TemplateEditorPage() {
  const navigate = useNavigate();
  const ctx = useMemo(loadContext, []);

  const [sheets, setSheets] = useState<Sheet[]>(() => buildInitialSheets(ctx.sheetsCount || 14));
  const [activeSheetId, setActiveSheetId] = useState<string>(sheets[0]?.id ?? "");
  const [rightTab, setRightTab] = useState<"sheet" | "comment" | "history">("sheet");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(37);
  const [previewMode, setPreviewMode] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const slotFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const activeSlotIdForUpload = useRef<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0];

  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingId]);

  /* ── Sheet operations ── */
  const addSheet = () => {
    const newSheet = makeSheet(sheets.length + 1, 2);
    setSheets((prev) => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
  };

  const deleteSheet = (id: string) => {
    setSheets((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === activeSheetId && next.length) setActiveSheetId(next[0].id);
      return next;
    });
  };

  const renameSheet = (id: string, name: string) => {
    setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  /* ── Grid / slots ── */
  const addGrid = () => {
    if (!activeSheet) return;
    const currentCount = activeSheet.slots.length;
    const idx = GRID_STEPS.indexOf(currentCount);
    const nextStepIdx = idx === -1 ? 0 : (idx + 1) % GRID_STEPS.length;
    const targetCount = GRID_STEPS[nextStepIdx];
    setSheets((prev) =>
      prev.map((s) => {
        if (s.id !== activeSheet.id) return s;
        let slots = [...s.slots];
        if (targetCount > slots.length) {
          slots = [...slots, ...Array.from({ length: targetCount - slots.length }, makeSlot)];
        } else {
          slots = slots.slice(0, targetCount);
        }
        return { ...s, slots };
      })
    );
  };

  const removeSlotImage = (slotId: string) => {
    setSheets((prev) =>
      prev.map((s) =>
        s.id !== activeSheet.id
          ? s
          : { ...s, slots: s.slots.map((sl) => (sl.id === slotId ? { ...sl, image: null, fileName: undefined } : sl)) }
      )
    );
  };

  const openSlotUpload = (slotId: string) => {
    activeSlotIdForUpload.current = slotId;
    slotFileRef.current?.click();
  };

  const handleSlotFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotId = activeSlotIdForUpload.current;
    if (!file || !slotId || !activeSheet) {
      e.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setSheets((prev) =>
      prev.map((s) =>
        s.id !== activeSheet.id
          ? s
          : { ...s, slots: s.slots.map((sl) => (sl.id === slotId ? { ...sl, image: url, fileName: file.name } : sl)) }
      )
    );
    e.target.value = "";
  };

  /* ── Slot reordering (drag & drop within active sheet) ── */
  const handleSlotDragStart = (slotId: string) => setDragSlotId(slotId);
  const handleSlotDrop = (targetSlotId: string) => {
    if (!activeSheet || !dragSlotId || dragSlotId === targetSlotId) return;
    setSheets((prev) =>
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

  /* ── Background ── */
  const handleBgImageChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgImage(URL.createObjectURL(file));
    e.target.value = "";
  };

  /* ── Save / Share ── */
  const handleSave = () => {
    const payload = { ...ctx, sheets, bgColor, bgImage };
    sessionStorage.setItem(`albumTemplate_${ctx.templateId}_v${ctx.versionNum}`, JSON.stringify(payload));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
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

  if (!activeSheet) {
    return (
      <main className="tp-page">
        <p style={{ color: "#cbd8e7", padding: 40 }}>No sheets available.</p>
      </main>
    );
  }

  return (
    <main className="tp-page">
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
              <span>{activeSheet.slots.length} slots</span>
            </div>
          </div>

          <div className="tp-topbar-right">
            <button className="tp-icon-btn ghost" aria-label="Undo">
              <UndoOutlined />
            </button>
            <button className="tp-icon-btn ghost" aria-label="Redo">
              <RedoOutlined />
            </button>

            <label className="tp-toggle">
              <input type="checkbox" checked={previewMode} onChange={(e) => setPreviewMode(e.target.checked)} />
              <span className="tp-toggle-track">
                <span className="tp-toggle-thumb" />
              </span>
            </label>

            <button className="tp-btn-ghost">
              <SettingOutlined /> Preview setting
            </button>
            <button className="tp-btn-outline" onClick={handleSave}>
              <SaveOutlined /> {saved ? "Saved!" : "Save Album"}
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
              {sheets.map((sheet, i) => (
                <div
                  key={sheet.id}
                  className={`tp-sheet-item ${sheet.id === activeSheetId ? "active" : ""}`}
                  onClick={() => setActiveSheetId(sheet.id)}
                >
                  <span className="tp-sheet-thumb">
                    <PictureOutlined />
                  </span>

                  {renamingId === sheet.id ? (
                    <input
                      ref={renameInputRef}
                      className="tp-sheet-rename-input"
                      value={sheet.name}
                      onChange={(e) => renameSheet(sheet.id, e.target.value)}
                      onBlur={() => setRenamingId(null)}
                      onKeyDown={(e) => e.key === "Enter" && setRenamingId(null)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="tp-sheet-name"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(sheet.id);
                      }}
                    >
                      {sheet.name}
                    </span>
                  )}

                  {sheets.length > 1 && (
                    <button
                      className="tp-sheet-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSheet(sheet.id);
                      }}
                      aria-label="Delete sheet"
                    >
                      <DeleteOutlined />
                    </button>
                  )}
                </div>
              ))}
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
                  onDrop={() => handleSlotDrop(slot.id)}
                >
                  <span className="tp-slot-handle">⋮⋮</span>
                  <span className="tp-slot-name">Slot {i + 1}</span>
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
              className="tp-canvas"
              style={{
                aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
                background: bgImage ? `url(${bgImage}) center/cover` : bgColor,
                gridTemplateRows: `repeat(${activeSheet.slots.length}, 1fr)`,
              }}
            >
              {activeSheet.slots.map((slot) => (
                <div
                  key={slot.id}
                  className="tp-slot"
                  onClick={() => openSlotUpload(slot.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleSlotDrop(slot.id)}
                >
                  <button
                    className="tp-slot-menu"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    aria-label="Slot options"
                  >
                    <MoreOutlined />
                  </button>

                  {slot.image ? (
                    <>
                      <img src={slot.image} alt={slot.fileName ?? "slot"} />
                      <button
                        className="tp-slot-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSlotImage(slot.id);
                        }}
                        aria-label="Remove image"
                      >
                        <CloseOutlined />
                      </button>
                    </>
                  ) : (
                    <div className="tp-slot-empty">
                      <UploadOutlined />
                      <span>Click to add photo</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Properties panel */}
          <aside className="tp-props-panel">
            <div className="tp-tabs">
              {(["sheet", "comment", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`tp-tab ${rightTab === tab ? "active" : ""}`}
                  onClick={() => setRightTab(tab)}
                >
                  {tab[0].toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {rightTab === "sheet" && (
              <div className="tp-props-body">
                <div className="tp-props-label">Grid Layout</div>
                <button className="tp-add-grid-btn" onClick={addGrid}>
                  <AppstoreAddOutlined /> Add Grid
                </button>

                <div className="tp-props-label">Background Color</div>
                <div className="tp-color-row">
                  <input
                    type="color"
                    className="tp-color-swatch"
                    value={bgColor}
                    onChange={(e) => {
                      setBgColor(e.target.value);
                      setBgImage(null);
                    }}
                  />
                  <span className="tp-color-hex">{bgColor}</span>
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
                {bgImage && (
                  <button className="tp-clear-bg" onClick={() => setBgImage(null)}>
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
                    <span>Slots</span>
                    <span>{activeSheet.slots.length}</span>
                  </div>
                  <div className="tp-meta-row">
                    <span>Version</span>
                    <span>v{ctx.versionNum}</span>
                  </div>
                  <div className="tp-meta-hint">Double-click sheet name to rename.</div>
                </div>
              </div>
            )}

            {rightTab === "comment" && (
              <div className="tp-props-body">
                <div className="tp-empty-tab">No comments yet on this version.</div>
              </div>
            )}

            {rightTab === "history" && (
              <div className="tp-props-body">
                <div className="tp-empty-tab">
                  Version history for “{ctx.templateName}” will appear here once more versions are saved.
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ── Bottom status bar ── */}
        <footer className="tp-statusbar">
          <span>
            {CANVAS_W} × {CANVAS_H} px &nbsp;·&nbsp; {activeSheet.slots.length} slots
          </span>
          <div className="tp-zoom">
            <input
              type="range"
              min={10}
              max={150}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <span>{zoom}%</span>
          </div>
        </footer>
      </section>
    </main>
  );
}