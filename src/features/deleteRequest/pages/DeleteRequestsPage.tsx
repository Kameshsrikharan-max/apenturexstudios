import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import "./DeleteRequestsPage.css";
import {
  fetchPendingDeleteRequestsRequest,
  approveDeleteRequestRequest,
  rejectDeleteRequestRequest,
} from "../../../redux/actions/deleteRequestActions"; // adjust path to match your redux folder depth
import { PendingDeleteUser, DeleteRequestState } from "../../../redux/types/deleteRequestTypes"; // adjust path to match your redux folder depth

interface RootStateLike {
  deleteRequest?: DeleteRequestState;
}

function DeleteRequestsPage() {
  const dispatch = useDispatch();
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

  useEffect(() => {
    dispatch(fetchPendingDeleteRequestsRequest());
  }, [dispatch]);

  const handleApprove = (userId: string) => {
    dispatch(approveDeleteRequestRequest(userId));
  };

  const handleReject = (userId: string) => {
    dispatch(rejectDeleteRequestRequest(userId));
    setRejectingId(null);
  };

  return (
    <div className="drq-page">
      <div className="drq-header">
        <div className="drq-header-icon">
          <ExclamationCircleOutlined />
        </div>
        <div>
          <h1>Account Deletion Requests</h1>
          <p>Review and resolve pending account deletion requests from users</p>
        </div>
        <span className="drq-count-pill">{pendingList.length} pending</span>
      </div>

      {pendingError && (
        <div className="drq-banner drq-banner--error">
          <ExclamationCircleOutlined /> {pendingError}
        </div>
      )}
      {actionError && (
        <div className="drq-banner drq-banner--error">
          <ExclamationCircleOutlined /> {actionError}
        </div>
      )}

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
        <div className="drq-list">
          {pendingList.map((user: PendingDeleteUser) => {
            const isActing = actionLoadingUserId === user._id;
            const isRejecting = rejectingId === user._id;
            return (
              <div className="drq-card" key={user._id}>
                <div className="drq-card-main">
                  <div className="drq-avatar">
                    <UserOutlined />
                  </div>
                  <div className="drq-user-info">
                    <h3>{user.name}</h3>
                    <p>{user.email}</p>
                    <span className="drq-role-tag">{user.role}</span>
                  </div>
                  {user.deleteRequestedAt && (
                    <span className="drq-requested-at">
                      Requested{" "}
                      {new Date(user.deleteRequestedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>

                {user.deleteReason && (
                  <div className="drq-reason-box">
                    <span className="drq-reason-label">Reason given</span>
                    <p>{user.deleteReason}</p>
                  </div>
                )}

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
                        onClick={() => handleReject(user._id)}
                        disabled={isActing}
                      >
                        {isActing ? "Rejecting..." : "Yes, Reject"}
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
                      onClick={() => handleApprove(user._id)}
                      disabled={isActing}
                    >
                      <DeleteOutlined /> {isActing ? "Approving..." : "Approve & Delete"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DeleteRequestsPage;