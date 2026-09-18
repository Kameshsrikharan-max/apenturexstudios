import { useEffect, useMemo, useState } from "react";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CloseOutlined,
  FileImageOutlined,
  StarOutlined,
  StarFilled,
  BulbOutlined,
  DownloadOutlined,
  UploadOutlined,
  AppstoreOutlined,
  BarsOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  FireOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import "./TemplatesPage.css";

const TEMPLATES_STORAGE_KEY = "axs_templates";
export const TEMPLATES_UPDATED_EVENT = "templatesUpdated";

type TemplateCategory = "Wedding" | "Portrait" | "Event" | "Corporate" | "Maternity" | "Custom";
type LayoutStyle = "Classic Grid" | "Cinematic Spread" | "Collage Mosaic" | "Minimal Frame" | "Storybook Flow";
type SortMode = "updated" | "name" | "pages" | "usage";
type ViewMode = "grid" | "list";

type StudioTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  accentColor: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  layoutStyle: LayoutStyle;
  isFavorite: boolean;
  usageCount: number;
};

type TemplatesPageProps = {
  user?: { role?: string; email?: string };
};

const CATEGORIES: TemplateCategory[] = [
  "Wedding",
  "Portrait",
  "Event",
  "Corporate",
  "Maternity",
  "Custom",
];

const LAYOUT_STYLES: LayoutStyle[] = [
  "Classic Grid",
  "Cinematic Spread",
  "Collage Mosaic",
  "Minimal Frame",
  "Storybook Flow",
];

const ACCENT_SWATCHES = [
  "#38d5ff",
  "#4ade80",
  "#fac775",
  "#c084fc",
  "#fb7185",
  "#38bdf8",
  "#f472b6",
  "#facc15",
];

const SORT_LABELS: Record<SortMode, string> = {
  updated: "Recently Updated",
  name: "Name (A–Z)",
  pages: "Most Pages",
  usage: "Most Used",
};

const createId = () =>
  `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const migrateTemplate = (raw: Partial<StudioTemplate> & { id: string }): StudioTemplate => ({
  id: raw.id,
  name: raw.name ?? "Untitled Template",
  category: (raw.category as TemplateCategory) ?? "Custom",
  description: raw.description ?? "",
  accentColor: raw.accentColor ?? ACCENT_SWATCHES[0],
  pageCount: raw.pageCount ?? 20,
  createdAt: raw.createdAt ?? new Date().toISOString(),
  updatedAt: raw.updatedAt ?? new Date().toISOString(),
  tags: Array.isArray(raw.tags) ? raw.tags : [],
  layoutStyle: (raw.layoutStyle as LayoutStyle) ?? "Classic Grid",
  isFavorite: Boolean(raw.isFavorite),
  usageCount: raw.usageCount ?? 0,
});

const readTemplates = (): StudioTemplate[] => {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(migrateTemplate) : [];
  } catch {
    return [];
  }
};

const writeTemplates = (templates: StudioTemplate[]) => {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  window.dispatchEvent(new CustomEvent(TEMPLATES_UPDATED_EVENT, { detail: templates }));
};

const emptyDraft = (): Omit<StudioTemplate, "id" | "createdAt" | "updatedAt" | "isFavorite" | "usageCount"> => ({
  name: "",
  category: "Wedding",
  description: "",
  accentColor: ACCENT_SWATCHES[0],
  pageCount: 20,
  tags: [],
  layoutStyle: "Classic Grid",
});

// ---------------------------------------------------------------------------
// Creative "Inspire Me" idea generator — produces category-aware concepts
// ---------------------------------------------------------------------------

type TemplateIdea = {
  name: string;
  description: string;
  category: TemplateCategory;
  layoutStyle: LayoutStyle;
  tags: string[];
  pageCount: number;
};

const IDEA_BANK: Record<TemplateCategory, { names: string[]; moods: string[]; tags: string[] }> = {
  Wedding: {
    names: ["Golden Hour Vows", "Ivory & Ember", "Confetti Skies", "Timeless Promise", "Moonlit Mandap", "Velvet Aisle"],
    moods: [
      "A warm, cinematic retelling of the day from first look to last dance.",
      "Soft ivory tones paired with dramatic full-bleed spreads for grand venues.",
      "A candid, joyful narrative built around laughter and unscripted moments.",
      "Rich jewel tones and ornate borders for a regal, traditional ceremony.",
    ],
    tags: ["romantic", "candid", "traditional", "destination"],
  },
  Portrait: {
    names: ["Studio Noir", "Golden Frame", "Quiet Light", "Editorial Edge", "Natural Bloom"],
    moods: [
      "High-contrast black and white spreads with generous negative space.",
      "Soft, editorial layouts that let a single portrait breathe on the page.",
      "Warm natural-light framing suited for outdoor family sessions.",
    ],
    tags: ["minimal", "editorial", "family", "studio"],
  },
  Event: {
    names: ["Neon Nightlife", "Grand Gala", "Backstage Pulse", "Festival Frame", "After Hours"],
    moods: [
      "Bold, high-energy grids built for fast-paced multi-camera coverage.",
      "Elegant spreads for galas and award nights with generous captions.",
      "A punchy mosaic layout that captures crowd energy and stage moments.",
    ],
    tags: ["energetic", "corporate-social", "nightlife", "bold"],
  },
  Corporate: {
    names: ["Boardroom Clarity", "Brandline", "The Keynote", "Quarterly Story", "Summit View"],
    moods: [
      "Clean, structured layouts with brand-color accents and clear hierarchy.",
      "A minimal, data-forward design built for leadership offsites and summits.",
      "Grid-first pages that pair headshots with milestone callouts.",
    ],
    tags: ["professional", "brand-forward", "minimal", "structured"],
  },
  Maternity: {
    names: ["Soft Bloom", "Waiting Light", "Gentle Horizon", "New Chapter", "Hushed Glow"],
    moods: [
      "Airy pastel spreads with soft vignettes for outdoor golden-hour sessions.",
      "Intimate close-crop layouts that focus on quiet, tender moments.",
      "A dreamy storybook flow that reads like a gentle letter to the child.",
    ],
    tags: ["dreamy", "pastel", "intimate", "storybook"],
  },
  Custom: {
    names: ["Blank Canvas Pro", "Freeform Studio", "Modular Story", "Open Frame", "The Sandbox"],
    moods: [
      "A fully modular layout system built to be reshaped for any brief.",
      "Flexible grid units that adapt to unusual aspect ratios and page counts.",
      "A neutral base template designed to be restyled per client.",
    ],
    tags: ["flexible", "modular", "experimental"],
  },
};

const pickRandom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const generateIdeas = (category: TemplateCategory | "All", count = 3): TemplateIdea[] => {
  const pool: TemplateCategory[] = category === "All" ? CATEGORIES : [category];
  const ideas: TemplateIdea[] = [];
  const usedNames = new Set<string>();

  while (ideas.length < count) {
    const cat = pickRandom(pool);
    const bank = IDEA_BANK[cat];
    const name = pickRandom(bank.names);
    if (usedNames.has(name) && bank.names.length > ideas.length) continue;
    usedNames.add(name);

    ideas.push({
      name,
      description: pickRandom(bank.moods),
      category: cat,
      layoutStyle: pickRandom(LAYOUT_STYLES),
      tags: [...bank.tags].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2)),
      pageCount: 12 + Math.floor(Math.random() * 5) * 8,
    });

    if (usedNames.size >= bank.names.length && pool.length === 1) break;
  }

  return ideas;
};

// ---------------------------------------------------------------------------
// Mini mock preview — renders a lightweight "spread" visual per layout style
// ---------------------------------------------------------------------------

function LayoutPreview({ accentColor, layoutStyle }: { accentColor: string; layoutStyle: LayoutStyle }) {
  const style = { "--preview-accent": accentColor } as React.CSSProperties;

  if (layoutStyle === "Cinematic Spread") {
    return (
      <div className="layout-preview layout-cinematic" style={style}>
        <div className="lp-block lp-wide" />
      </div>
    );
  }
  if (layoutStyle === "Collage Mosaic") {
    return (
      <div className="layout-preview layout-mosaic" style={style}>
        <div className="lp-block lp-tall" />
        <div className="lp-block" />
        <div className="lp-block" />
        <div className="lp-block lp-wide" />
      </div>
    );
  }
  if (layoutStyle === "Minimal Frame") {
    return (
      <div className="layout-preview layout-minimal" style={style}>
        <div className="lp-block lp-center" />
      </div>
    );
  }
  if (layoutStyle === "Storybook Flow") {
    return (
      <div className="layout-preview layout-storybook" style={style}>
        <div className="lp-block lp-row" />
        <div className="lp-block lp-row" />
        <div className="lp-block lp-row" />
      </div>
    );
  }
  return (
    <div className="layout-preview layout-classic" style={style}>
      <div className="lp-block" />
      <div className="lp-block" />
      <div className="lp-block" />
      <div className="lp-block" />
    </div>
  );
}

function TemplatesPage({ user }: TemplatesPageProps) {
  const [templates, setTemplates] = useState<StudioTemplate[]>(readTemplates);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "All">("All");
  const [activeTag, setActiveTag] = useState<string | "All">("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [tagInput, setTagInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StudioTemplate | null>(null);
  const [previewTarget, setPreviewTarget] = useState<StudioTemplate | null>(null);

  const [ideasOpen, setIdeasOpen] = useState(false);
  const [ideas, setIdeas] = useState<TemplateIdea[]>([]);

  const isReadOnlyRole = false; // studio_admin + studio_manager both have full CRUD on this page

  useEffect(() => {
    const syncFromStorage = () => setTemplates(readTemplates());
    window.addEventListener(TEMPLATES_UPDATED_EVENT, syncFromStorage);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(TEMPLATES_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach((template) => template.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [templates]);

  const stats = useMemo(() => {
    const total = templates.length;
    const favorites = templates.filter((template) => template.isFavorite).length;
    const totalUsage = templates.reduce((sum, template) => sum + template.usageCount, 0);

    const categoryCounts = new Map<string, number>();
    templates.forEach((template) => {
      categoryCounts.set(template.category, (categoryCounts.get(template.category) ?? 0) + 1);
    });
    let topCategory = "—";
    let topCount = 0;
    categoryCounts.forEach((count, category) => {
      if (count > topCount) {
        topCount = count;
        topCategory = category;
      }
    });

    return { total, favorites, totalUsage, topCategory };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = templates
      .filter((template) => activeCategory === "All" || template.category === activeCategory)
      .filter((template) => activeTag === "All" || template.tags.includes(activeTag))
      .filter((template) => !favoritesOnly || template.isFavorite)
      .filter((template) => {
        if (!normalizedQuery) return true;
        return (
          template.name.toLowerCase().includes(normalizedQuery) ||
          template.description.toLowerCase().includes(normalizedQuery) ||
          template.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
        );
      });

    const sorted = [...filtered].sort((first, second) => {
      switch (sortMode) {
        case "name":
          return first.name.localeCompare(second.name);
        case "pages":
          return second.pageCount - first.pageCount;
        case "usage":
          return second.usageCount - first.usageCount;
        case "updated":
        default:
          return second.updatedAt.localeCompare(first.updatedAt);
      }
    });

    // Favorites always float to the top within the sorted order
    return sorted.sort((first, second) => Number(second.isFavorite) - Number(first.isFavorite));
  }, [templates, query, activeCategory, activeTag, favoritesOnly, sortMode]);

  const openCreatePanel = (prefill?: TemplateIdea) => {
    setEditingId(null);
    setDraft(
      prefill
        ? {
            name: prefill.name,
            category: prefill.category,
            description: prefill.description,
            accentColor: pickRandom(ACCENT_SWATCHES),
            pageCount: prefill.pageCount,
            tags: prefill.tags,
            layoutStyle: prefill.layoutStyle,
          }
        : emptyDraft()
    );
    setTagInput("");
    setPanelOpen(true);
    setIdeasOpen(false);
  };

  const openEditPanel = (template: StudioTemplate) => {
    setEditingId(template.id);
    setDraft({
      name: template.name,
      category: template.category,
      description: template.description,
      accentColor: template.accentColor,
      pageCount: template.pageCount,
      tags: template.tags,
      layoutStyle: template.layoutStyle,
    });
    setTagInput("");
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingId(null);
    setDraft(emptyDraft());
    setTagInput("");
  };

  const addTagFromInput = () => {
    const cleaned = tagInput.trim().toLowerCase();
    if (!cleaned || draft.tags.includes(cleaned)) {
      setTagInput("");
      return;
    }
    setDraft((current) => ({ ...current, tags: [...current.tags, cleaned] }));
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setDraft((current) => ({ ...current, tags: current.tags.filter((existing) => existing !== tag) }));
  };

  const handleSave = () => {
    if (!draft.name.trim()) return;

    const now = new Date().toISOString();

    if (editingId) {
      const next = templates.map((template) =>
        template.id === editingId
          ? { ...template, ...draft, name: draft.name.trim(), updatedAt: now }
          : template
      );
      setTemplates(next);
      writeTemplates(next);
    } else {
      const newTemplate: StudioTemplate = {
        id: createId(),
        ...draft,
        name: draft.name.trim(),
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
        usageCount: 0,
      };
      const next = [newTemplate, ...templates];
      setTemplates(next);
      writeTemplates(next);
    }

    closePanel();
  };

  const handleDuplicate = (template: StudioTemplate) => {
    const now = new Date().toISOString();
    const duplicate: StudioTemplate = {
      ...template,
      id: createId(),
      name: `${template.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      usageCount: 0,
    };
    const next = [duplicate, ...templates];
    setTemplates(next);
    writeTemplates(next);
  };

  const toggleFavorite = (template: StudioTemplate) => {
    const next = templates.map((existing) =>
      existing.id === template.id ? { ...existing, isFavorite: !existing.isFavorite } : existing
    );
    setTemplates(next);
    writeTemplates(next);
  };

  const handleApply = (template: StudioTemplate) => {
    const next = templates.map((existing) =>
      existing.id === template.id
        ? { ...existing, usageCount: existing.usageCount + 1, updatedAt: new Date().toISOString() }
        : existing
    );
    setTemplates(next);
    writeTemplates(next);
  };

  const confirmDelete = (template: StudioTemplate) => setDeleteTarget(template);

  const handleDelete = () => {
    if (!deleteTarget) return;
    const next = templates.filter((template) => template.id !== deleteTarget.id);
    setTemplates(next);
    writeTemplates(next);
    setDeleteTarget(null);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(templates, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `axs-templates-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) return;
        const imported = parsed.map((item) => migrateTemplate({ ...item, id: createId() }));
        const next = [...imported, ...templates];
        setTemplates(next);
        writeTemplates(next);
      } catch {
        // Silently ignore malformed import files
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const openIdeas = () => {
    setIdeas(generateIdeas(activeCategory, 3));
    setIdeasOpen(true);
  };

  const reshuffleIdeas = () => setIdeas(generateIdeas(activeCategory, 3));

  return (
    <div className="templates-page">
      <div className="templates-header">
        <div className="templates-header-text">
          <span className="templates-eyebrow">Studio Assets</span>
          <h1>Template Library</h1>
          <p>Reusable album layouts your team can apply when building an event's album.</p>
        </div>

        <div className="templates-header-actions">
          <button type="button" className="templates-ghost-button" onClick={openIdeas}>
            <BulbOutlined />
            Inspire Me
          </button>
          <button type="button" className="templates-new-button" onClick={() => openCreatePanel()}>
            <PlusOutlined />
            New Template
          </button>
        </div>
      </div>

      <div className="templates-stats-row">
        <div className="templates-stat-card">
          <span className="stat-label">Total Templates</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="templates-stat-card">
          <span className="stat-label">Favorites</span>
          <span className="stat-value">
            <StarFilled style={{ color: "#fac775", fontSize: 14, marginRight: 6 }} />
            {stats.favorites}
          </span>
        </div>
        <div className="templates-stat-card">
          <span className="stat-label">Top Category</span>
          <span className="stat-value stat-value-text">{stats.topCategory}</span>
        </div>
        <div className="templates-stat-card">
          <span className="stat-label">Times Applied</span>
          <span className="stat-value">
            <RocketOutlined style={{ color: "#38d5ff", fontSize: 14, marginRight: 6 }} />
            {stats.totalUsage}
          </span>
        </div>
      </div>

      <div className="templates-toolbar">
        <div className="templates-search">
          <SearchOutlined />
          <input
            type="text"
            placeholder="Search templates, moods, tags…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="templates-toolbar-controls">
          <select
            className="templates-sort-select"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {SORT_LABELS[mode]}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`templates-toggle-fav ${favoritesOnly ? "active" : ""}`}
            onClick={() => setFavoritesOnly((current) => !current)}
          >
            {favoritesOnly ? <StarFilled /> : <StarOutlined />}
            Favorites
          </button>

          <div className="templates-view-switch">
            <button
              type="button"
              className={viewMode === "grid" ? "active" : ""}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <AppstoreOutlined />
            </button>
            <button
              type="button"
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <BarsOutlined />
            </button>
          </div>

          <button type="button" className="templates-icon-button" onClick={handleExport} title="Export as JSON">
            <DownloadOutlined />
          </button>
          <label className="templates-icon-button" title="Import from JSON">
            <UploadOutlined />
            <input type="file" accept="application/json" onChange={handleImport} hidden />
          </label>
        </div>
      </div>

      <div className="templates-filter-chips">
        <button
          type="button"
          className={`templates-chip ${activeCategory === "All" ? "active" : ""}`}
          onClick={() => setActiveCategory("All")}
        >
          All
        </button>
        {CATEGORIES.map((category) => (
          <button
            type="button"
            key={category}
            className={`templates-chip ${activeCategory === category ? "active" : ""}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {allTags.length > 0 && (
        <div className="templates-tag-row">
          <span className="templates-tag-row-label">Tags:</span>
          <button
            type="button"
            className={`templates-tag-chip ${activeTag === "All" ? "active" : ""}`}
            onClick={() => setActiveTag("All")}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              type="button"
              key={tag}
              className={`templates-tag-chip ${activeTag === tag ? "active" : ""}`}
              onClick={() => setActiveTag(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {filteredTemplates.length > 0 ? (
        <div className={viewMode === "grid" ? "templates-grid" : "templates-list"}>
          {filteredTemplates.map((template) => (
            <div className={`template-card ${viewMode === "list" ? "template-card-list" : ""}`} key={template.id}>
              <button
                type="button"
                className="template-fav-toggle"
                onClick={() => toggleFavorite(template)}
                aria-label={template.isFavorite ? "Unfavorite template" : "Favorite template"}
              >
                {template.isFavorite ? <StarFilled /> : <StarOutlined />}
              </button>

              <div
                className="template-card-swatch"
                style={{ "--swatch-color": template.accentColor } as React.CSSProperties}
                onClick={() => setPreviewTarget(template)}
                role="button"
                tabIndex={0}
              >
                <FileImageOutlined />
              </div>

              <div className="template-card-body">
                <div className="template-card-top">
                  <h3>{template.name}</h3>
                  <span className="template-card-category">{template.category}</span>
                </div>

                <p className="template-card-description">
                  {template.description || "No description added yet."}
                </p>

                {template.tags.length > 0 && (
                  <div className="template-card-tags">
                    {template.tags.map((tag) => (
                      <span className="template-card-tag" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="template-card-meta">
                  <span>{template.layoutStyle}</span>
                  <span>{template.pageCount} pages</span>
                  {template.usageCount > 0 && (
                    <span className="template-card-usage">
                      <FireOutlined /> {template.usageCount}
                    </span>
                  )}
                  <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="template-card-actions">
                <button
                  type="button"
                  className="template-action-button"
                  onClick={() => setPreviewTarget(template)}
                  aria-label="Preview template"
                >
                  <EyeOutlined />
                </button>
                <button
                  type="button"
                  className="template-action-button"
                  onClick={() => handleApply(template)}
                  aria-label="Apply template"
                  title="Apply to an event"
                >
                  <ThunderboltOutlined />
                </button>
                <button
                  type="button"
                  className="template-action-button"
                  onClick={() => openEditPanel(template)}
                  aria-label="Edit template"
                >
                  <EditOutlined />
                </button>
                <button
                  type="button"
                  className="template-action-button"
                  onClick={() => handleDuplicate(template)}
                  aria-label="Duplicate template"
                >
                  <CopyOutlined />
                </button>
                <button
                  type="button"
                  className="template-action-button template-action-danger"
                  onClick={() => confirmDelete(template)}
                  aria-label="Delete template"
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="templates-empty">
          <FileImageOutlined />
          <h3>No templates match this view</h3>
          <p>Try a different filter, or create a new reusable album template.</p>
          <div className="templates-empty-actions">
            <button type="button" className="templates-ghost-button" onClick={openIdeas}>
              <BulbOutlined />
              Inspire Me
            </button>
            <button type="button" className="templates-new-button" onClick={() => openCreatePanel()}>
              <PlusOutlined />
              New Template
            </button>
          </div>
        </div>
      )}

      {ideasOpen && (
        <div className="templates-panel-overlay" onMouseDown={() => setIdeasOpen(false)}>
          <div className="templates-ideas-panel" onMouseDown={(event) => event.stopPropagation()}>
            <div className="templates-panel-head">
              <h3>
                <BulbOutlined style={{ marginRight: 8, color: "#fac775" }} />
                Template Ideas {activeCategory !== "All" ? `— ${activeCategory}` : ""}
              </h3>
              <button type="button" onClick={() => setIdeasOpen(false)} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>

            <div className="templates-ideas-body">
              {ideas.map((idea) => (
                <div className="idea-card" key={idea.name}>
                  <div className="idea-card-top">
                    <h4>{idea.name}</h4>
                    <span className="template-card-category">{idea.category}</span>
                  </div>
                  <p>{idea.description}</p>
                  <div className="template-card-tags">
                    {idea.tags.map((tag) => (
                      <span className="template-card-tag" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="idea-card-meta">
                    <span>{idea.layoutStyle}</span>
                    <span>{idea.pageCount} pages</span>
                  </div>
                  <button type="button" className="templates-primary-button idea-use-button" onClick={() => openCreatePanel(idea)}>
                    Use This Idea
                  </button>
                </div>
              ))}
            </div>

            <div className="templates-panel-footer">
              <button type="button" className="templates-secondary-button" onClick={reshuffleIdeas}>
                Shuffle Ideas
              </button>
              <button type="button" className="templates-secondary-button" onClick={() => setIdeasOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {panelOpen && (
        <div className="templates-panel-overlay" onMouseDown={closePanel}>
          <div className="templates-panel" onMouseDown={(event) => event.stopPropagation()}>
            <div className="templates-panel-head">
              <h3>{editingId ? "Edit Template" : "New Template"}</h3>
              <button type="button" onClick={closePanel} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>

            <div className="templates-panel-body">
              <label className="templates-field">
                <span>Template name</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="e.g. Classic Wedding Story"
                  autoFocus
                />
              </label>

              <div className="templates-field-row">
                <label className="templates-field">
                  <span>Category</span>
                  <select
                    value={draft.category}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        category: event.target.value as TemplateCategory,
                      }))
                    }
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="templates-field">
                  <span>Layout style</span>
                  <select
                    value={draft.layoutStyle}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        layoutStyle: event.target.value as LayoutStyle,
                      }))
                    }
                  >
                    {LAYOUT_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="templates-field">
                <span>Page count</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={draft.pageCount}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      pageCount: Number(event.target.value) || 1,
                    }))
                  }
                />
              </label>

              <label className="templates-field">
                <span>Description</span>
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="What kind of event or mood is this template best for?"
                  rows={3}
                />
              </label>

              <label className="templates-field">
                <span>Tags</span>
                <div className="templates-tag-input-row">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addTagFromInput();
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                  />
                  <button type="button" className="templates-secondary-button" onClick={addTagFromInput}>
                    Add
                  </button>
                </div>
                {draft.tags.length > 0 && (
                  <div className="template-card-tags">
                    {draft.tags.map((tag) => (
                      <span className="template-card-tag template-card-tag-removable" key={tag}>
                        #{tag}
                        <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
                          <CloseOutlined />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </label>

              <div className="templates-field">
                <span>Accent color</span>
                <div className="templates-swatch-row">
                  {ACCENT_SWATCHES.map((color) => (
                    <button
                      type="button"
                      key={color}
                      className={`templates-swatch-dot ${draft.accentColor === color ? "selected" : ""}`}
                      style={{ "--dot-color": color } as React.CSSProperties}
                      onClick={() => setDraft((current) => ({ ...current, accentColor: color }))}
                      aria-label={`Use accent color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="templates-field">
                <span>Live preview</span>
                <div className="templates-live-preview">
                  <LayoutPreview accentColor={draft.accentColor} layoutStyle={draft.layoutStyle} />
                </div>
              </div>
            </div>

            <div className="templates-panel-footer">
              <button type="button" className="templates-secondary-button" onClick={closePanel}>
                Cancel
              </button>
              <button
                type="button"
                className="templates-primary-button"
                onClick={handleSave}
                disabled={!draft.name.trim()}
              >
                {editingId ? "Save Changes" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewTarget && (
        <div className="templates-panel-overlay" onMouseDown={() => setPreviewTarget(null)}>
          <div className="templates-preview-panel" onMouseDown={(event) => event.stopPropagation()}>
            <div className="templates-panel-head">
              <h3>{previewTarget.name}</h3>
              <button type="button" onClick={() => setPreviewTarget(null)} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>

            <div className="templates-preview-body">
              <div className="templates-preview-visual">
                <LayoutPreview accentColor={previewTarget.accentColor} layoutStyle={previewTarget.layoutStyle} />
              </div>

              <div className="templates-preview-details">
                <span className="template-card-category">{previewTarget.category}</span>
                <p>{previewTarget.description || "No description added yet."}</p>

                {previewTarget.tags.length > 0 && (
                  <div className="template-card-tags">
                    {previewTarget.tags.map((tag) => (
                      <span className="template-card-tag" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="templates-preview-stat-grid">
                  <div>
                    <span className="stat-label">Layout</span>
                    <span className="stat-value-text">{previewTarget.layoutStyle}</span>
                  </div>
                  <div>
                    <span className="stat-label">Pages</span>
                    <span className="stat-value-text">{previewTarget.pageCount}</span>
                  </div>
                  <div>
                    <span className="stat-label">Applied</span>
                    <span className="stat-value-text">{previewTarget.usageCount} times</span>
                  </div>
                  <div>
                    <span className="stat-label">Updated</span>
                    <span className="stat-value-text">
                      {new Date(previewTarget.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="templates-panel-footer">
              <button
                type="button"
                className="templates-secondary-button"
                onClick={() => {
                  openEditPanel(previewTarget);
                  setPreviewTarget(null);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="templates-primary-button"
                onClick={() => {
                  handleApply(previewTarget);
                  setPreviewTarget(null);
                }}
              >
                <ThunderboltOutlined />
                Apply to Event
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="templates-panel-overlay" onMouseDown={() => setDeleteTarget(null)}>
          <div className="templates-confirm" onMouseDown={(event) => event.stopPropagation()}>
            <h3>Delete "{deleteTarget.name}"?</h3>
            <p>This can't be undone. Events already using this template are not affected.</p>

            <div className="templates-confirm-actions">
              <button
                type="button"
                className="templates-secondary-button"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button type="button" className="templates-danger-button" onClick={handleDelete}>
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesPage;