import {StarOutlined,EditOutlined,DeleteOutlined,TeamOutlined,DollarOutlined,PictureOutlined,UploadOutlined,HeartOutlined,FolderAddOutlined,UserAddOutlined,LoginOutlined,LockOutlined,StopOutlined,CheckCircleOutlined,WalletOutlined,HourglassOutlined,CloseCircleOutlined,CalendarOutlined,CheckOutlined,} from "@ant-design/icons";
import {NotificationCategoryKey,NotificationEvent,NotificationDetailItem,ReviewEndorsementPayload,ChangeRequestPayload,DeleteRequestPayload,EventAssignmentPayload,PaymentExpensesPayload,MediaNotificationPayload,MediaEngagementPayload,UserAccountPayload,PaymentStatusPayload,} from "../../redux/types/notificationDetailTypes";

export interface DecisionLabels {
  approve: string;
  decline: string;
  approvedText: string;
  declinedText: string;
  actionPrompt: string;
}

export interface CategoryConfig {
  key: NotificationCategoryKey;
  label: string;
  accent: string;
  icon: React.ReactNode;
  getPayloadFields: (event: NotificationEvent) => NotificationDetailItem[];
  decisionLabels: DecisionLabels;
}

const DEFAULT_DECISION_LABELS: DecisionLabels = {
  approve: "Approve",
  decline: "Decline",
  approvedText: "approved",
  declinedText: "declined",
  actionPrompt: "This item needs your decision.",
};

const field = (label: string, value: unknown): NotificationDetailItem | null => {
  if (value === undefined || value === null || value === "") return null;
  return { label, value: String(value) };
};

const compact = (items: (NotificationDetailItem | null)[]): NotificationDetailItem[] =>
  items.filter((item): item is NotificationDetailItem => item !== null);

const CATEGORY_CONFIG: Record<NotificationCategoryKey, CategoryConfig> = {
  reviewEndorsement: {
    key: "reviewEndorsement",
    label: "Review Endorsement",
    accent: "#fac775",
    icon: <StarOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as ReviewEndorsementPayload;
      return compact([
        field("Referral Name", payload.referralName),
        field("Referred To", payload.referredTo),
        field("Decision Type", payload.decisionType),
        field("Remarks", payload.remarks),
      ]);
    },
    decisionLabels: {
      approve: "Endorse",
      decline: "Reject",
      approvedText: "endorsed",
      declinedText: "rejected",
      actionPrompt: "This review is awaiting your endorsement.",
    },
  },

  changeRequest: {
    key: "changeRequest",
    label: "Change Request",
    accent: "#38d5ff",
    icon: <EditOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as ChangeRequestPayload;
      return compact([
        field("Requested Field", payload.requestedField),
        field("Old Value", payload.oldValue),
        field("New Value", payload.newValue),
        field("Requested By", payload.requestedBy),
        field("Studio", payload.studioName),
      ]);
    },
    decisionLabels: {
      approve: "Approve Change",
      decline: "Reject Change",
      approvedText: "approved",
      declinedText: "rejected",
      actionPrompt: "A change request is waiting for your approval.",
    },
  },

  deleteRequest: {
    key: "deleteRequest",
    label: "Delete Request",
    accent: "#ff6b6b",
    icon: <DeleteOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as DeleteRequestPayload;
      return compact([
        field("Target Type", payload.targetType),
        field("Target Name", payload.targetName),
        field("Reason", payload.reason),
        field("Requested By", payload.requestedBy),
      ]);
    },
    decisionLabels: {
      approve: "Approve Deletion",
      decline: "Deny Deletion",
      approvedText: "approved",
      declinedText: "denied",
      actionPrompt: "A deletion request needs your confirmation.",
    },
  },

  eventAssignment: {
    key: "eventAssignment",
    label: "Event Assignment",
    accent: "#4ade80",
    icon: <TeamOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as EventAssignmentPayload;
      return compact([
        field("Event Name", payload.eventName),
        field("Role", payload.role),
        field("Venue", payload.venue),
        field("Assigned By", payload.assignedBy),
      ]);
    },
    decisionLabels: {
      approve: "Accept Assignment",
      decline: "Decline Assignment",
      approvedText: "accepted",
      declinedText: "declined",
      actionPrompt: "You've been assigned to an event — please respond.",
    },
  },

  paymentExpenses: {
    key: "paymentExpenses",
    label: "Payment / Expenses",
    accent: "#fac775",
    icon: <DollarOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as PaymentExpensesPayload;
      return compact([
        field("Amount", payload.amount ? `${payload.currency || "₹"}${payload.amount}` : undefined),
        field("Due Date", payload.dueDate),
        field("Invoice ID", payload.invoiceId),
        field("Expense Type", payload.expenseType),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  mediaNotifications: {
    key: "mediaNotifications",
    label: "Media",
    accent: "#38d5ff",
    icon: <PictureOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as MediaNotificationPayload;
      return compact([
        field("Media Count", payload.mediaCount),
        field("Album", payload.albumName),
        field("Uploaded By", payload.uploadedBy),
        field("File Types", payload.fileTypes?.join(", ")),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  // ===== gallery =====
  photoUploaded: {
    key: "photoUploaded",
    label: "Photos Uploaded",
    accent: "#38d5ff",
    icon: <UploadOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as MediaNotificationPayload;
      return compact([
        field("Media Count", payload.mediaCount),
        field("Album", payload.albumName),
        field("Uploaded By", payload.uploadedBy),
        field("File Types", payload.fileTypes?.join(", ")),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  photoLiked: {
    key: "photoLiked",
    label: "Photo Liked",
    accent: "#ff6b6b",
    icon: <HeartOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as MediaEngagementPayload;
      return compact([
        field("Photo", payload.photoTitle),
        field("Album", payload.albumName),
        field("Liked By", payload.likedBy),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  // ===== album =====
  albumCreated: {
    key: "albumCreated",
    label: "New Album Created",
    accent: "#4ade80",
    icon: <FolderAddOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as MediaNotificationPayload;
      return compact([
        field("Album", payload.albumName),
        field("Created By", payload.uploadedBy),
        field("Media Count", payload.mediaCount),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  // ===== user / admin =====
  userRegistered: {
    key: "userRegistered",
    label: "New User Registered",
    accent: "#4ade80",
    icon: <UserAddOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as UserAccountPayload;
      return compact([
        field("User", payload.userName),
        field("Email", payload.userEmail),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  userLogin: {
    key: "userLogin",
    label: "New Login",
    accent: "#38d5ff",
    icon: <LoginOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as UserAccountPayload;
      return compact([
        field("User", payload.userName || payload.userEmail),
        field("IP Address", payload.ipAddress),
        field("Device", payload.device),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  passwordChanged: {
    key: "passwordChanged",
    label: "Password Changed",
    accent: "#fac775",
    icon: <LockOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as UserAccountPayload;
      return compact([
        field("User", payload.userName || payload.userEmail),
        field("IP Address", payload.ipAddress),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  userDeactivated: {
    key: "userDeactivated",
    label: "User Deactivated",
    accent: "#ff6b6b",
    icon: <StopOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as UserAccountPayload;
      return compact([
        field("User", payload.userName || payload.userEmail),
        field("Action By", payload.actionBy),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  userActivated: {
    key: "userActivated",
    label: "User Activated",
    accent: "#4ade80",
    icon: <CheckCircleOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as UserAccountPayload;
      return compact([
        field("User", payload.userName || payload.userEmail),
        field("Action By", payload.actionBy),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  // ===== payment / transaction =====
  paymentReceived: {
    key: "paymentReceived",
    label: "Payment Received",
    accent: "#4ade80",
    icon: <WalletOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as PaymentStatusPayload;
      const cur = payload.currency || "₹";
      return compact([
        field("Amount Received", payload.amount != null ? `${cur}${payload.amount}` : undefined),
        field("Client", payload.clientName),
        field("Total Event Amount", payload.totalAmount != null ? `${cur}${payload.totalAmount}` : undefined),
        field("Total Amount Paid", payload.amountPaid != null ? `${cur}${payload.amountPaid}` : undefined),
        field("Balance Remaining", payload.balanceAmount != null ? `${cur}${payload.balanceAmount}` : undefined),
        field("Transaction ID", payload.transactionId),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  paymentPending: {
    key: "paymentPending",
    label: "Payment Pending",
    accent: "#fac775",
    icon: <HourglassOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as PaymentStatusPayload;
      const cur = payload.currency || "₹";
      return compact([
        field("Amount", payload.amount != null ? `${cur}${payload.amount}` : undefined),
        field("Client", payload.clientName),
        field("Total Event Amount", payload.totalAmount != null ? `${cur}${payload.totalAmount}` : undefined),
        field("Total Amount Paid", payload.amountPaid != null ? `${cur}${payload.amountPaid}` : undefined),
        field("Balance Remaining", payload.balanceAmount != null ? `${cur}${payload.balanceAmount}` : undefined),
        field("Transaction ID", payload.transactionId),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  paymentFailed: {
    key: "paymentFailed",
    label: "Payment Failed",
    accent: "#ff6b6b",
    icon: <CloseCircleOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as PaymentStatusPayload;
      return compact([
        field("Amount", payload.amount ? `${payload.currency || "₹"}${payload.amount}` : undefined),
        field("Client", payload.clientName),
        field("Transaction ID", payload.transactionId),
        field("Reason", payload.reason),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  paymentDue: {
    key: "paymentDue",
    label: "Payment Due",
    accent: "#fac775",
    icon: <CalendarOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as PaymentStatusPayload;
      const cur = payload.currency || "₹";
      return compact([
        field("Amount Due", payload.amount != null ? `${cur}${payload.amount}` : undefined),
        field("Client", payload.clientName),
        field("Due Date", payload.dueDate),
        field("Total Event Amount", payload.totalAmount != null ? `${cur}${payload.totalAmount}` : undefined),
        field("Total Amount Paid", payload.amountPaid != null ? `${cur}${payload.amountPaid}` : undefined),
        field("Balance Remaining", payload.balanceAmount != null ? `${cur}${payload.balanceAmount}` : undefined),
        field("Transaction ID", payload.transactionId),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },

  paymentCompleted: {
    key: "paymentCompleted",
    label: "Payment Completed",
    accent: "#4ade80",
    icon: <CheckOutlined />,
    getPayloadFields: (event) => {
      const payload = (event.payload || {}) as PaymentStatusPayload;
      const cur = payload.currency || "₹";
      return compact([
        field("Final Payment", payload.amount != null ? `${cur}${payload.amount}` : undefined),
        field("Client", payload.clientName),
        field("Total Event Amount", payload.totalAmount != null ? `${cur}${payload.totalAmount}` : undefined),
        field("Total Amount Paid", payload.amountPaid != null ? `${cur}${payload.amountPaid}` : undefined),
        field("Balance Remaining", payload.balanceAmount != null ? `${cur}${payload.balanceAmount}` : undefined),
        field("Transaction ID", payload.transactionId),
      ]);
    },
    decisionLabels: DEFAULT_DECISION_LABELS,
  },
};


export const getCategoryConfig = (key: NotificationCategoryKey | undefined | null): CategoryConfig | null => {
  if (!key) return null;
  return CATEGORY_CONFIG[key] || null;
};

export default CATEGORY_CONFIG;