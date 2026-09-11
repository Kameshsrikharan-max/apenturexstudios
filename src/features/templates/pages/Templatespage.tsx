import { useEffect, useMemo, useState } from "react";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CloseOutlined,
  FileImageOutlined,
} from "@ant-design/icons";
import "./TemplatesPage.css";


const TEMPLATES_STORAGE_KEY = "axs_templates";
export const TEMPLATES_UPDATED_EVENT = "templatesUpdated";

type TemplateCategory = "Wedding" | "Portrait" | "Event" | "Corporate" | "Maternity" | "Custom";

type StudioTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  accentColor: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
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

const ACCENT_SWATCHES = ["#38d5ff", "#4ade80", "#fac775", "#c084fc", "#fb7185", "#38bdf8"];

const createId = () =>
  `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const readTemplates = (): StudioTemplate[] => {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeTemplates = (templates: StudioTemplate[]) => {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  window.dispatchEvent(new CustomEvent(TEMPLATES_UPDATED_EVENT, { detail: templates }));
};

const emptyDraft = (): Omit<StudioTemplate, "id" | "createdAt" | "updatedAt"> => ({
  name: "",
  category: "Wedding",
  description: "",
  accentColor: ACCENT_SWATCHES[0],
  pageCount: 20,
});

function TemplatesPage({ user }: TemplatesPageProps) {
  const [templates, setTemplates] = useState<StudioTemplate[]>(readTemplates);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "All">("All");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<StudioTemplate | null>(null);

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

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return templates
      .filter((template) => activeCategory === "All" || template.category === activeCategory)
      .filter((template) => {
        if (!normalizedQuery) return true;
        return (
          template.name.toLowerCase().includes(normalizedQuery) ||
          template.description.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  }, [templates, query, activeCategory]);

  const openCreatePanel = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setPanelOpen(true);
  };

  const openEditPanel = (template: StudioTemplate) => {
    setEditingId(template.id);
    setDraft({
      name: template.name,
      category: template.category,
      description: template.description,
      accentColor: template.accentColor,
      pageCount: template.pageCount,
    });
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingId(null);
    setDraft(emptyDraft());
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
    };
    const next = [duplicate, ...templates];
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

  return (
    <div className="templates-page">
      <div className="templates-header">
        <div className="templates-header-text">
          <span className="templates-eyebrow">Studio Assets</span>
          <h1>Template Library</h1>
          <p>Reusable album layouts your team can apply when building an event's album.</p>
        </div>

        <button type="button" className="templates-new-button" onClick={openCreatePanel}>
          <PlusOutlined />
          New Template
        </button>
      </div>

      <div className="templates-toolbar">
        <div className="templates-search">
          <SearchOutlined />
          <input
            type="text"
            placeholder="Search templates…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
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
      </div>

      {filteredTemplates.length > 0 ? (
        <div className="templates-grid">
          {filteredTemplates.map((template) => (
            <div className="template-card" key={template.id}>
              <div
                className="template-card-swatch"
                style={{ "--swatch-color": template.accentColor } as React.CSSProperties}
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

                <div className="template-card-meta">
                  <span>{template.pageCount} pages</span>
                  <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="template-card-actions">
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
          <h3>No templates yet</h3>
          <p>Create your first reusable album template to speed up event closure.</p>
          <button type="button" className="templates-new-button" onClick={openCreatePanel}>
            <PlusOutlined />
            New Template
          </button>
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