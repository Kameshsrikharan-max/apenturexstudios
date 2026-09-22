import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  CameraOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  DollarOutlined,
  DoubleLeftOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import "./EquipmentChecklistPage.css";
import {
  fetchChecklistRequest,
  addChecklistItemRequest,
  removeChecklistItemRequest,
  toggleChecklistItemRequest,
  fetchDefaultListRequest,
  saveDefaultListRequest,
} from "../../../redux/actions/equipmentChecklistActions";
import type { DefaultListItem } from "../../../redux/types/equipmentChecklistTypes";

interface StepDef {
  label: string;
  icon: React.ReactNode;
}

// Mirrors CreateEventPage's step rail, with Equipment Checklist inserted
// as step 3 (right after Team Assignment) — 7 steps become 8.
const steps: StepDef[] = [
  { label: "Event Details", icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Equipment Checklist", icon: <ToolOutlined /> },
  { label: "Payment", icon: <DollarOutlined /> },
  { label: "Attendance", icon: <ClockCircleOutlined /> },
  { label: "Media", icon: <CameraOutlined /> },
  { label: "Album", icon: <PictureOutlined /> },
  { label: "Closure", icon: <CheckCircleOutlined /> },
];

const ACTIVE_STEP_INDEX = 2;

function getStoredEvent(): any {
  try {
    const raw = sessionStorage.getItem("currentEvent");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function EquipmentChecklistPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const storedEvent = useMemo(() => getStoredEvent(), []);
  const eventId: string | undefined =
    (location.state as any)?.eventId || storedEvent?.id || storedEvent?._id;

  const { checklist, defaultList, loading, savingDefaultList, error } = useSelector(
    (state: any) => state.equipmentChecklist
  );

  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("General");
  const [manageOpen, setManageOpen] = useState(false);
  const [draftDefaultItems, setDraftDefaultItems] = useState<DefaultListItem[]>([]);

  useEffect(() => {
    if (eventId) dispatch(fetchChecklistRequest(eventId));
  }, [eventId, dispatch]);

  useEffect(() => {
    if (manageOpen) dispatch(fetchDefaultListRequest());
  }, [manageOpen, dispatch]);

  useEffect(() => {
    if (manageOpen && defaultList?.items) {
      setDraftDefaultItems(defaultList.items.map((it: any) => ({ ...it })));
    }
  }, [manageOpen, defaultList]);

  const grouped = useMemo(() => {
    const items = checklist?.items || [];
    const map: Record<string, any[]> = {};
    items.forEach((item: any) => {
      const cat = item.category || "General";
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }, [checklist]);

  const totalCount = checklist?.items?.length || 0;
  const checkedCount = (checklist?.items || []).filter((i: any) => i.checked).length;
  const allChecked = totalCount > 0 && checkedCount === totalCount;

  const handleToggle = (itemId: string, checked: boolean) => {
    if (!eventId) return;
    dispatch(toggleChecklistItemRequest(eventId, itemId, checked));
  };

  const handleAddItem = () => {
    const name = newItemName.trim();
    if (!name || !eventId) return;
    dispatch(addChecklistItemRequest(eventId, name, newItemCategory.trim() || "General"));
    setNewItemName("");
  };

  const handleRemoveItem = (itemId: string) => {
    if (!eventId) return;
    dispatch(removeChecklistItemRequest(eventId, itemId));
  };

  const updateDraftItem = (index: number, patch: Partial<DefaultListItem>) => {
    setDraftDefaultItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const removeDraftItem = (index: number) => {
    setDraftDefaultItems((current) => current.filter((_, i) => i !== index));
  };

  const addDraftItem = () => {
    setDraftDefaultItems((current) => [...current, { name: "", category: "General" }]);
  };

  const saveDraftDefaultList = () => {
    const clean = draftDefaultItems
      .map((item) => ({
        name: item.name.trim(),
        category: (item.category || "General").trim() || "General",
      }))
      .filter((item) => item.name.length > 0);
    dispatch(saveDefaultListRequest(clean));
    setManageOpen(false);
  };

  // NOTE: TeamAssignmentPage.tsx wasn't provided, so its own "Next" handler
  // still needs to be pointed at this route manually — see integration notes.
  const goBack = () => navigate("/events/create/team-assignment", { state: { eventId } });
  const goNext = () => navigate("/events/create/payment", { state: { eventId } });

  const renderStepButtons = () => (
    <>
      {steps.map((step, index) => (
        <div className="eqc-step-wrap" key={step.label}>
          <button
            className={`eqc-step ${index === ACTIVE_STEP_INDEX ? "active" : ""}`}
            type="button"
            disabled={index !== ACTIVE_STEP_INDEX}
            aria-label={step.label}
          >
            {step.icon}
            {index === ACTIVE_STEP_INDEX && <span className="eqc-step-indicator" />}
          </button>
          <span className="eqc-tooltip">{step.label}</span>
        </div>
      ))}
    </>
  );

  return (
    <main className="eqc-page">
      <section className="eqc-stage">
        <header className="eqc-topbar">
          <button className="eqc-back" type="button" onClick={goBack}>
            <DoubleLeftOutlined /> Back
          </button>

          <div className="eqc-title-wrap">
            <span className="eqc-title-icon">
              <ToolOutlined />
            </span>
            <div>
              <p className="eqc-subtitle">Step 3 of 8 / Equipment Checklist</p>
              <h1 className="eqc-heading">Equipment Checklist</h1>
            </div>
          </div>

          <div className="eqc-progress" aria-label="Event progress">
            <button
              type="button"
              aria-label="Refresh checklist"
              onClick={() => eventId && dispatch(fetchChecklistRequest(eventId))}
            >
              <ReloadOutlined />
            </button>
          </div>
        </header>

        <div className="eqc-body">
          <aside className="eqc-rail" aria-label="Create event steps">
            {renderStepButtons()}
          </aside>

          <div className="eqc-form">
            {!eventId ? (
              <div className="eqc-panel eqc-empty-state">
                <p>No event selected. Go back and create an event first.</p>
              </div>
            ) : (
              <>
                <section className="eqc-panel eqc-summary-panel">
                  <div className="eqc-panel-head">
                    <h2>
                      <ToolOutlined /> What to Bring
                    </h2>
                    <button className="eqc-manage-btn" type="button" onClick={() => setManageOpen(true)}>
                      <SettingOutlined /> Manage Default List
                    </button>
                  </div>
                  <div className="eqc-progress-row">
                    <div className="eqc-progress-bar">
                      <div
                        className="eqc-progress-fill"
                        style={{ width: totalCount ? `${(checkedCount / totalCount) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className={`eqc-progress-count${allChecked ? " ready" : ""}`}>
                      {checkedCount}/{totalCount} packed
                    </span>
                  </div>
                  {error && <span className="eqc-error">{error}</span>}
                </section>

                {loading && !checklist ? (
                  <div className="eqc-panel">
                    <p>Loading checklist...</p>
                  </div>
                ) : (
                  Object.keys(grouped).map((category) => (
                    <section className="eqc-panel" key={category}>
                      <div className="eqc-panel-head">
                        <h2>{category}</h2>
                        <span className="eqc-count">
                          {grouped[category].filter((i) => i.checked).length}/{grouped[category].length}
                        </span>
                      </div>
                      <div className="eqc-item-list">
                        {grouped[category].map((item: any) => (
                          <label className={`eqc-item${item.checked ? " checked" : ""}`} key={item._id}>
                            <span className="eqc-item-check">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={(e) => handleToggle(item._id, e.target.checked)}
                              />
                              <span className="eqc-item-box">{item.checked && <CheckOutlined />}</span>
                              <span className="eqc-item-name">{item.name}</span>
                            </span>
                            <span className="eqc-item-right">
                              {item.checked && item.checkedBy && (
                                <span className="eqc-item-meta">by {item.checkedBy}</span>
                              )}
                              <button
                                type="button"
                                className="eqc-item-remove"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRemoveItem(item._id);
                                }}
                                aria-label={`Remove ${item.name}`}
                              >
                                <CloseOutlined />
                              </button>
                            </span>
                          </label>
                        ))}
                      </div>
                    </section>
                  ))
                )}

                <section className="eqc-panel eqc-add-panel">
                  <div className="eqc-panel-head">
                    <h2>
                      <PlusOutlined /> Add Item
                    </h2>
                  </div>
                  <div className="eqc-add-row">
                    <input
                      className="eqc-add-input"
                      placeholder="Item name (e.g., Extra SD Card)"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    />
                    <input
                      className="eqc-add-input eqc-add-category"
                      placeholder="Category"
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    />
                    <button className="eqc-add-btn" type="button" onClick={handleAddItem}>
                      <PlusOutlined /> Add
                    </button>
                  </div>
                </section>
              </>
            )}

            <footer className="eqc-actions">
              <button className="eqc-secondary" type="button" onClick={goBack}>
                <DoubleLeftOutlined /> Back
              </button>
              <button className="eqc-primary" type="button" onClick={goNext} disabled={!eventId}>
                Continue to Payment
              </button>
            </footer>
          </div>
        </div>
      </section>

      {manageOpen && (
        <div className="eqc-modal-backdrop" onClick={() => setManageOpen(false)}>
          <div className="eqc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="eqc-modal-head">
              <h2>
                <SettingOutlined /> Manage Default Equipment List
              </h2>
              <button type="button" className="eqc-modal-close" onClick={() => setManageOpen(false)}>
                <CloseOutlined />
              </button>
            </div>
            <p className="eqc-modal-sub">
              This is your own default packing list. New events will be seeded with these items.
            </p>
            <div className="eqc-draft-list">
              {draftDefaultItems.map((item, index) => (
                <div className="eqc-draft-row" key={index}>
                  <input
                    className="eqc-draft-input"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateDraftItem(index, { name: e.target.value })}
                  />
                  <input
                    className="eqc-draft-input eqc-draft-category"
                    placeholder="Category"
                    value={item.category}
                    onChange={(e) => updateDraftItem(index, { category: e.target.value })}
                  />
                  <button
                    type="button"
                    className="eqc-draft-remove"
                    onClick={() => removeDraftItem(index)}
                    aria-label="Remove item"
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="eqc-draft-add" onClick={addDraftItem}>
              <PlusOutlined /> Add Row
            </button>
            <div className="eqc-modal-actions">
              <button type="button" className="eqc-secondary" onClick={() => setManageOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="eqc-primary"
                onClick={saveDraftDefaultList}
                disabled={savingDefaultList}
              >
                {savingDefaultList ? "Saving..." : "Save Default List"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}