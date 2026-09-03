import { JSX, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Checkbox } from "antd";
import {CheckCircleOutlined,CloseCircleOutlined,ExclamationCircleOutlined,UserOutlined,LoadingOutlined,ArrowLeftOutlined,SearchOutlined,DownOutlined,UpOutlined,ShopOutlined,CameraOutlined,} from "@ant-design/icons";
import "./RegistrationRequestsPage.css";
import {
  fetchPendingRegistrationsRequest,
  approveRegistrationRequest,
  rejectRegistrationRequest,
} from "../../../redux/actions/registrationApprovalActions";
import {
  PendingRegistration,
  RegistrationApprovalState,
  RegistrationType,
} from "../../../redux/types/registrationApprovalTypes";

interface RootStateLike {
  registrationApproval?: RegistrationApprovalState;
}

type SortOrder = "newest" | "oldest";

function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const days = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)));
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

const typeMeta: Record<RegistrationType, { label: string; icon: JSX.Element }> = {
  "studio-admin": { label: "Studio Admin", icon: <ShopOutlined /> },
  "freelance-photographer": { label: "Freelance Photographer", icon: <CameraOutlined /> },
};

function getApplicantName(reg: PendingRegistration): string {
  const basic = reg.basicInfo as { firstName?: string; lastName?: string };
  const full = `${basic.firstName || ""} ${basic.lastName || ""}`.trim();
  return full || reg.user?.name || "Unnamed applicant";
}

function getApplicantEmail(reg: PendingRegistration): string {
  const basic = reg.basicInfo as { email?: string };
  return basic.email || reg.user?.email || "—";
}

function RegistrationRequestsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { pendingList, pendingLoading, pendingError, actionLoadingProfileId, actionError } = useSelector(
    (state: RootStateLike) =>
      state.registrationApproval || {
        pendingList: [] as PendingRegistration[],
        pendingLoading: false,
        pendingError: null,
        actionLoadingProfileId: null,
        actionError: null,
      }
  );

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | RegistrationType>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    dispatch(fetchPendingRegistrationsRequest());
  }, [dispatch]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => {
    const total = pendingList.length;
    const studioCount = pendingList.filter((r) => r.type === "studio-admin").length;
    const photographerCount = total - studioCount;
    return { total, studioCount, photographerCount };
  }, [pendingList]);

  const visibleList = useMemo(() => {
    let list = [...pendingList];

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((r) => {
        const name = getApplicantName(r).toLowerCase();
        const email = getApplicantEmail(r).toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    list = typeFilter === "all" ? list : list.filter((r) => r.type === typeFilter);

    list.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

    return list;
  }, [pendingList, searchTerm, typeFilter, sortOrder]);

  const toggleSelect = (profileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(profileId) ? next.delete(profileId) : next.add(profileId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === visibleList.length ? new Set() : new Set(visibleList.map((r) => r.profileId))
    );
  };

  const handleApprove = (reg: PendingRegistration) => {
    dispatch(approveRegistrationRequest(reg.type, reg.profileId));
    setApprovingId(null);
    setToast({ message: `${getApplicantName(reg)} approved and activated`, type: "success" });
  };

  const handleReject = (reg: PendingRegistration) => {
    dispatch(rejectRegistrationRequest(reg.type, reg.profileId));
    setRejectingId(null);
    setToast({ message: `Registration for ${getApplicantName(reg)} rejected`, type: "success" });
  };

  const runBulkAction = (action: "approve" | "reject") => {
    const targets = visibleList.filter((r) => selectedIds.has(r.profileId));
    targets.forEach((reg) => {
      dispatch(
        action === "approve"
          ? approveRegistrationRequest(reg.type, reg.profileId)
          : rejectRegistrationRequest(reg.type, reg.profileId)
      );
    });
    setToast({
      message:
        action === "approve"
          ? `${targets.length} registration${targets.length === 1 ? "" : "s"} approved`
          : `${targets.length} registration${targets.length === 1 ? "" : "s"} rejected`,
      type: "success",
    });
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  return (
    <div className="rrq-page">
      <div className="rrq-header">
        <button type="button" className="rrq-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeftOutlined /> Back
        </button>
        <div className="rrq-header-icon">
          <ExclamationCircleOutlined />
        </div>
        <div>
          <h1>Pending Registrations</h1>
          <p>Review and approve new Studio Admin and Freelance Photographer sign-ups</p>
        </div>
        <div className="rrq-header-stats">
          <span className="rrq-count-pill">{stats.total} pending</span>
          {stats.studioCount > 0 ? (
            <span className="rrq-count-pill rrq-count-pill--studio">
              <ShopOutlined /> {stats.studioCount} studio
            </span>
          ) : null}
          {stats.photographerCount > 0 ? (
            <span className="rrq-count-pill rrq-count-pill--photographer">
              <CameraOutlined /> {stats.photographerCount} photographer
            </span>
          ) : null}
        </div>
      </div>

      {pendingError ? (
        <div className="rrq-banner rrq-banner--error">
          <ExclamationCircleOutlined /> {pendingError}
        </div>
      ) : null}
      {actionError ? (
        <div className="rrq-banner rrq-banner--error">
          <ExclamationCircleOutlined /> {actionError}
        </div>
      ) : null}

      {pendingLoading ? (
        <div className="rrq-loading">
          <LoadingOutlined spin /> Loading pending registrations...
        </div>
      ) : pendingList.length === 0 ? (
        <div className="rrq-empty">
          <CheckCircleOutlined />
          <p>No pending registrations. All caught up.</p>
        </div>
      ) : (
        <>
          <div className="rrq-toolbar">
            <div className="rrq-search-box">
              <SearchOutlined />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="rrq-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | RegistrationType)}
            >
              <option value="all">All types</option>
              <option value="studio-admin">Studio Admin</option>
              <option value="freelance-photographer">Freelance Photographer</option>
            </select>
            <select
              className="rrq-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <label className="rrq-select-all">
              <Checkbox
                checked={selectedIds.size > 0 && selectedIds.size === visibleList.length}
                indeterminate={selectedIds.size > 0 && selectedIds.size < visibleList.length}
                onChange={toggleSelectAll}
              />
              Select all
            </label>
          </div>

          {visibleList.length === 0 ? (
            <div className="rrq-empty rrq-empty--filtered">
              <SearchOutlined />
              <p>No registrations match your filters.</p>
            </div>
          ) : (
            <div className="rrq-list">
              <AnimatePresence initial={false}>
                {visibleList.map((reg) => {
                  const isActing = actionLoadingProfileId === reg.profileId;
                  const isRejecting = rejectingId === reg.profileId;
                  const isApproving = approvingId === reg.profileId;
                  const isExpanded = expandedId === reg.profileId;
                  const isSelected = selectedIds.has(reg.profileId);
                  const meta = typeMeta[reg.type];

                  return (
                    <motion.div
                      layout
                      key={reg.profileId}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={`rrq-card${isSelected ? " rrq-card--selected" : ""}`}
                    >
                      <div className="rrq-card-main">
                        <Checkbox checked={isSelected} onChange={() => toggleSelect(reg.profileId)} />
                        <div className={`rrq-avatar rrq-avatar--${reg.type}`}>
                          <UserOutlined />
                        </div>
                        <div className="rrq-user-info">
                          <h3>{getApplicantName(reg)}</h3>
                          <p>{getApplicantEmail(reg)}</p>
                        </div>
                        <span className={`rrq-type-badge rrq-type-badge--${reg.type}`}>
                          {meta.icon} {meta.label}
                        </span>
                        {reg.createdAt ? (
                          <span className="rrq-requested-at">{getRelativeTime(reg.createdAt)}</span>
                        ) : null}
                        <button
                          type="button"
                          className="rrq-expand-btn"
                          onClick={() => setExpandedId(isExpanded ? null : reg.profileId)}
                        >
                          {isExpanded ? <UpOutlined /> : <DownOutlined />}
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded ? (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="rrq-details-box"
                          >
                            <div className="rrq-details-grid">
                              <div>
                                <span className="rrq-details-label">Basic info</span>
                                <pre>{JSON.stringify(reg.basicInfo, null, 2)}</pre>
                              </div>
                              <div>
                                <span className="rrq-details-label">
                                  {reg.type === "studio-admin" ? "Studio details" : "Professional profile"}
                                </span>
                                <pre>{JSON.stringify(reg.details, null, 2)}</pre>
                              </div>
                              <div>
                                <span className="rrq-details-label">
                                  {reg.type === "studio-admin" ? "Documents" : "Work area"}
                                </span>
                                <pre>{JSON.stringify(reg.workOrDocuments, null, 2)}</pre>
                              </div>
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      {isRejecting ? (
                        <div className="rrq-confirm-row">
                          <span>Reject this registration?</span>
                          <div className="rrq-confirm-actions">
                            <button
                              type="button"
                              className="rrq-btn-ghost"
                              onClick={() => setRejectingId(null)}
                              disabled={isActing}
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              className="rrq-btn-reject-confirm"
                              onClick={() => handleReject(reg)}
                              disabled={isActing}
                            >
                              {isActing ? "Rejecting..." : "Yes, Reject"}
                            </button>
                          </div>
                        </div>
                      ) : isApproving ? (
                        <div className="rrq-confirm-row rrq-confirm-row--positive">
                          <span>Approve and activate this account?</span>
                          <div className="rrq-confirm-actions">
                            <button
                              type="button"
                              className="rrq-btn-ghost"
                              onClick={() => setApprovingId(null)}
                              disabled={isActing}
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              className="rrq-btn-approve-confirm"
                              onClick={() => handleApprove(reg)}
                              disabled={isActing}
                            >
                              {isActing ? "Approving..." : "Yes, Approve"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rrq-card-actions">
                          <button
                            type="button"
                            className="rrq-btn-reject"
                            onClick={() => setRejectingId(reg.profileId)}
                            disabled={isActing}
                          >
                            <CloseCircleOutlined /> Reject
                          </button>
                          <button
                            type="button"
                            className="rrq-btn-approve"
                            onClick={() => setApprovingId(reg.profileId)}
                            disabled={isActing}
                          >
                            <CheckCircleOutlined /> Approve
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {selectedIds.size > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="rrq-bulk-bar"
          >
            {bulkAction ? (
              <div className="rrq-bulk-confirm">
                <span>
                  {bulkAction === "approve" ? "Approve" : "Reject"} {selectedIds.size} selected
                  registration{selectedIds.size === 1 ? "" : "s"}?
                </span>
                <div className="rrq-confirm-actions">
                  <button type="button" className="rrq-btn-ghost" onClick={() => setBulkAction(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={bulkAction === "approve" ? "rrq-btn-approve-confirm" : "rrq-btn-reject-confirm"}
                    onClick={() => runBulkAction(bulkAction)}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="rrq-bulk-count">{selectedIds.size} selected</span>
                <div className="rrq-bulk-actions">
                  <button type="button" className="rrq-btn-ghost" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </button>
                  <button type="button" className="rrq-btn-reject" onClick={() => setBulkAction("reject")}>
                    <CloseCircleOutlined /> Reject All
                  </button>
                  <button type="button" className="rrq-btn-approve" onClick={() => setBulkAction("approve")}>
                    <CheckCircleOutlined /> Approve All
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`rrq-toast rrq-toast--${toast.type}`}
          >
            <CheckCircleOutlined /> {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default RegistrationRequestsPage;