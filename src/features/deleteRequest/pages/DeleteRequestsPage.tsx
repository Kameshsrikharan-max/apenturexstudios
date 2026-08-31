import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Checkbox } from "antd";
import {DeleteOutlined,CheckCircleOutlined,CloseCircleOutlined,ExclamationCircleOutlined,
  UserOutlined,LoadingOutlined,ArrowLeftOutlined,SearchOutlined,DownOutlined,UpOutlined,
  FireOutlined,ClockCircleOutlined,SafetyCertificateOutlined,} from "@ant-design/icons";
import "./DeleteRequestsPage.css";
import {fetchPendingDeleteRequestsRequest,approveDeleteRequestRequest,rejectDeleteRequestRequest,} from "../../../redux/actions/deleteRequestActions"; // adjust path to match your redux folder depth
import { PendingDeleteUser, DeleteRequestState } from "../../../redux/types/deleteRequestTypes"; // adjust path to match your redux folder depth

interface RootStateLike {
  deleteRequest?: DeleteRequestState;
}

type Urgency = "new" | "pending" | "urgent";
type SortOrder = "newest" | "oldest";

function getDaysPending(dateStr?: string): number {
  if (!dateStr) return 0;
  const requested = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - requested) / (1000 * 60 * 60 * 24)));
}

function getUrgency(days: number): Urgency {
  return days >= 7 ? "urgent" : days >= 2 ? "pending" : "new";
}

function getRelativeTime(dateStr?: string): string {
  const days = getDaysPending(dateStr);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const urgencyMeta: Record<Urgency, { label: string; icon: JSX.Element }> = {
  new: { label: "New", icon: <SafetyCertificateOutlined /> },
  pending: { label: "Aging", icon: <ClockCircleOutlined /> },
  urgent: { label: "Urgent", icon: <FireOutlined /> },
};

function DeleteRequestsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    pendingList,
    pendingLoading,
    pendingError,
    actionLoadingUserId,
    actionError,
  } = useSelector(
    (state: RootStateLike) =>
      state.deleteRequest || {
        pendingList: [] as PendingDeleteUser[],
        pendingLoading: false,
        pendingError: null,
        actionLoadingUserId: null,
        actionError: null,
      }
  );

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    dispatch(fetchPendingDeleteRequestsRequest());
  }, [dispatch]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const roles = useMemo(() => {
    const set = new Set(pendingList.map((u: PendingDeleteUser) => u.role));
    return Array.from(set);
  }, [pendingList]);

  const stats = useMemo(() => {
    const total = pendingList.length;
    const urgentCount = pendingList.filter(
      (u: PendingDeleteUser) => getUrgency(getDaysPending(u.deleteRequestedAt)) === "urgent"
    ).length;
    const avgDays = total
      ? Math.round(
          pendingList.reduce((sum: number, u: PendingDeleteUser) => sum + getDaysPending(u.deleteRequestedAt), 0) /
            total
        )
      : 0;
    return { total, urgentCount, avgDays };
  }, [pendingList]);

  const visibleList = useMemo(() => {
    let list = [...pendingList];

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (u: PendingDeleteUser) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    list = roleFilter === "all" ? list : list.filter((u: PendingDeleteUser) => u.role === roleFilter);

    list.sort((a: PendingDeleteUser, b: PendingDeleteUser) => {
      const aTime = a.deleteRequestedAt ? new Date(a.deleteRequestedAt).getTime() : 0;
      const bTime = b.deleteRequestedAt ? new Date(b.deleteRequestedAt).getTime() : 0;
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

    return list;
  }, [pendingList, searchTerm, roleFilter, sortOrder]);

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === visibleList.length ? new Set() : new Set(visibleList.map((u: PendingDeleteUser) => u._id))
    );
  };

  const handleApprove = (userId: string, name: string) => {
    dispatch(approveDeleteRequestRequest(userId));
    setApprovingId(null);
    setToast({ message: `${name}'s account has been deleted`, type: "success" });
  };

  const handleReject = (userId: string, name: string) => {
    dispatch(rejectDeleteRequestRequest(userId));
    setRejectingId(null);
    setToast({ message: `Deletion request for ${name} was rejected`, type: "success" });
  };

  const runBulkAction = (action: "approve" | "reject") => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => {
      dispatch(action === "approve" ? approveDeleteRequestRequest(id) : rejectDeleteRequestRequest(id));
    });
    setToast({
      message:
        action === "approve"
          ? `${ids.length} account${ids.length === 1 ? "" : "s"} deleted`
          : `${ids.length} request${ids.length === 1 ? "" : "s"} rejected`,
      type: "success",
    });
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  return (
    <div className="drq-page">
      <div className="drq-header">
        <button type="button" className="drq-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeftOutlined /> Back
        </button>
        <div className="drq-header-icon">
          <ExclamationCircleOutlined />
        </div>
        <div>
          <h1>Account Deletion Requests</h1>
          <p>Review and resolve pending account deletion requests from users</p>
        </div>
        <div className="drq-header-stats">
          <span className="drq-count-pill">{stats.total} pending</span>
          {stats.urgentCount > 0 ? (
            <span className="drq-count-pill drq-count-pill--urgent">
              <FireOutlined /> {stats.urgentCount} urgent
            </span>
          ) : null}
          {stats.total > 0 ? (
            <span className="drq-count-pill drq-count-pill--muted">avg {stats.avgDays}d wait</span>
          ) : null}
        </div>
      </div>

      {pendingError ? (
        <div className="drq-banner drq-banner--error">
          <ExclamationCircleOutlined /> {pendingError}
        </div>
      ) : null}
      {actionError ? (
        <div className="drq-banner drq-banner--error">
          <ExclamationCircleOutlined /> {actionError}
        </div>
      ) : null}

      {pendingLoading ? (
        <div className="drq-loading">
          <LoadingOutlined spin /> Loading pending requests...
        </div>
      ) : pendingList.length === 0 ? (
        <div className="drq-empty">
          <CheckCircleOutlined />
          <p>No pending delete requests. All clear.</p>
        </div>
      ) : (
        <>
          <div className="drq-toolbar">
            <div className="drq-search-box">
              <SearchOutlined />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="drq-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All roles</option>
              {roles.map((r: string) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="drq-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <label className="drq-select-all">
              <Checkbox
                checked={selectedIds.size > 0 && selectedIds.size === visibleList.length}
                indeterminate={selectedIds.size > 0 && selectedIds.size < visibleList.length}
                onChange={toggleSelectAll}
              />
              Select all
            </label>
          </div>

          {visibleList.length === 0 ? (
            <div className="drq-empty drq-empty--filtered">
              <SearchOutlined />
              <p>No requests match your filters.</p>
            </div>
          ) : (
            <div className="drq-list">
              <AnimatePresence initial={false}>
                {visibleList.map((user: PendingDeleteUser) => {
                  const isActing = actionLoadingUserId === user._id;
                  const isRejecting = rejectingId === user._id;
                  const isApproving = approvingId === user._id;
                  const isExpanded = expandedId === user._id;
                  const isSelected = selectedIds.has(user._id);
                  const days = getDaysPending(user.deleteRequestedAt);
                  const urgency = getUrgency(days);

                  return (
                    <motion.div
                      layout
                      key={user._id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={`drq-card drq-card--${urgency}${isSelected ? " drq-card--selected" : ""}`}
                    >
                      <div className="drq-card-main">
                        <Checkbox checked={isSelected} onChange={() => toggleSelect(user._id)} />
                        <div className={`drq-avatar drq-avatar--${urgency}`}>
                          <UserOutlined />
                        </div>
                        <div className="drq-user-info">
                          <h3>{user.name}</h3>
                          <p>{user.email}</p>
                          <span className="drq-role-tag">{user.role}</span>
                        </div>
                        <span className={`drq-urgency-badge drq-urgency-badge--${urgency}`}>
                          {urgencyMeta[urgency].icon} {urgencyMeta[urgency].label}
                        </span>
                        {user.deleteRequestedAt ? (
                          <span className="drq-requested-at">{getRelativeTime(user.deleteRequestedAt)}</span>
                        ) : null}
                        {user.deleteReason ? (
                          <button
                            type="button"
                            className="drq-expand-btn"
                            onClick={() => setExpandedId(isExpanded ? null : user._id)}
                          >
                            {isExpanded ? <UpOutlined /> : <DownOutlined />}
                          </button>
                        ) : null}
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded && user.deleteReason ? (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="drq-reason-box"
                          >
                            <span className="drq-reason-label">Reason given</span>
                            <p>{user.deleteReason}</p>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      {isRejecting ? (
                        <div className="drq-confirm-row">
                          <span>Reject this deletion request?</span>
                          <div className="drq-confirm-actions">
                            <button
                              type="button"
                              className="drq-btn-ghost"
                              onClick={() => setRejectingId(null)}
                              disabled={isActing}
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              className="drq-btn-reject-confirm"
                              onClick={() => handleReject(user._id, user.name)}
                              disabled={isActing}
                            >
                              {isActing ? "Rejecting..." : "Yes, Reject"}
                            </button>
                          </div>
                        </div>
                      ) : isApproving ? (
                        <div className="drq-confirm-row drq-confirm-row--danger">
                          <span>Permanently delete this account? This can't be undone.</span>
                          <div className="drq-confirm-actions">
                            <button
                              type="button"
                              className="drq-btn-ghost"
                              onClick={() => setApprovingId(null)}
                              disabled={isActing}
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              className="drq-btn-approve-confirm"
                              onClick={() => handleApprove(user._id, user.name)}
                              disabled={isActing}
                            >
                              {isActing ? "Deleting..." : "Yes, Delete"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="drq-card-actions">
                          <button
                            type="button"
                            className="drq-btn-reject"
                            onClick={() => setRejectingId(user._id)}
                            disabled={isActing}
                          >
                            <CloseCircleOutlined /> Reject
                          </button>
                          <button
                            type="button"
                            className="drq-btn-approve"
                            onClick={() => setApprovingId(user._id)}
                            disabled={isActing}
                          >
                            <DeleteOutlined /> Approve & Delete
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
            className="drq-bulk-bar"
          >
            {bulkAction ? (
              <div className="drq-bulk-confirm">
                <span>
                  {bulkAction === "approve" ? "Permanently delete" : "Reject"} {selectedIds.size} selected
                  request{selectedIds.size === 1 ? "" : "s"}?
                </span>
                <div className="drq-confirm-actions">
                  <button type="button" className="drq-btn-ghost" onClick={() => setBulkAction(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={bulkAction === "approve" ? "drq-btn-approve-confirm" : "drq-btn-reject-confirm"}
                    onClick={() => runBulkAction(bulkAction)}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="drq-bulk-count">{selectedIds.size} selected</span>
                <div className="drq-bulk-actions">
                  <button type="button" className="drq-btn-ghost" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </button>
                  <button type="button" className="drq-btn-reject" onClick={() => setBulkAction("reject")}>
                    <CloseCircleOutlined /> Reject All
                  </button>
                  <button type="button" className="drq-btn-approve" onClick={() => setBulkAction("approve")}>
                    <DeleteOutlined /> Approve All
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
            className={`drq-toast drq-toast--${toast.type}`}
          >
            <CheckCircleOutlined /> {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default DeleteRequestsPage;