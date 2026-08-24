import { pushNotification } from "../../utils/notificationStore";
import {
  MediaNotificationPayload,
  MediaEngagementPayload,
  UserAccountPayload,
  PaymentStatusPayload,
} from "../../redux/types/notificationDetailTypes";


/* Gallery */

export function notifyPhotoUploaded(params: {
  mediaCount: number;
  albumName: string;
  uploadedBy: string;
  fileTypes?: string[];
}) {
  const payload: MediaNotificationPayload = {
    mediaCount: params.mediaCount,
    albumName: params.albumName,
    uploadedBy: params.uploadedBy,
    fileTypes: params.fileTypes,
  };

  return pushNotification({
    title: `${params.mediaCount} photo${params.mediaCount > 1 ? "s" : ""} uploaded`,
    notifCategory: "photoUploaded",
    category: "Gallery",
    description: `Uploaded to ${params.albumName}`,
    triggeredBy: params.uploadedBy,
    priority: "low",
    payload,
  });
}

export function notifyPhotoLiked(params: {
  photoTitle: string;
  albumName?: string;
  likedBy: string;
}) {
  const payload: MediaEngagementPayload = {
    photoTitle: params.photoTitle,
    albumName: params.albumName,
    likedBy: params.likedBy,
  };

  return pushNotification({
    title: `${params.photoTitle} was liked`,
    notifCategory: "photoLiked",
    category: "Gallery",
    triggeredBy: params.likedBy,
    priority: "low",
    payload,
  });
}


/* Album */

export function notifyAlbumCreated(params: {
  albumName: string;
  createdBy: string;
  mediaCount?: number;
}) {
  const payload: MediaNotificationPayload = {
    albumName: params.albumName,
    uploadedBy: params.createdBy,
    mediaCount: params.mediaCount,
  };

  return pushNotification({
    title: `New album created: ${params.albumName}`,
    notifCategory: "albumCreated",
    category: "Album",
    triggeredBy: params.createdBy,
    priority: "medium",
    payload,
  });
}


/* User / Admin */

export function notifyUserRegistered(params: { userName: string; userEmail: string }) {
  const payload: UserAccountPayload = {
    userName: params.userName,
    userEmail: params.userEmail,
  };

  return pushNotification({
    title: `New user registered: ${params.userName}`,
    notifCategory: "userRegistered",
    category: "User",
    triggeredBy: "AXS System",
    priority: "medium",
    payload,
  });
}

export function notifyUserLogin(params: {
  userName?: string;
  userEmail: string;
  ipAddress?: string;
  device?: string;
}) {
  const payload: UserAccountPayload = {
    userName: params.userName,
    userEmail: params.userEmail,
    ipAddress: params.ipAddress,
    device: params.device,
  };

  return pushNotification({
    title: "New login detected",
    notifCategory: "userLogin",
    category: "User",
    triggeredBy: params.userName || params.userEmail,
    priority: "low",
    payload,
  });
}

export function notifyPasswordChanged(params: {
  userName?: string;
  userEmail: string;
  ipAddress?: string;
}) {
  const payload: UserAccountPayload = {
    userName: params.userName,
    userEmail: params.userEmail,
    ipAddress: params.ipAddress,
  };

  return pushNotification({
    title: "Password changed",
    notifCategory: "passwordChanged",
    category: "User",
    triggeredBy: params.userName || params.userEmail,
    priority: "high",
    payload,
  });
}

export function notifyUserDeactivated(params: {
  userName: string;
  userEmail?: string;
  actionBy: string;
}) {
  const payload: UserAccountPayload = {
    userName: params.userName,
    userEmail: params.userEmail,
    actionBy: params.actionBy,
  };

  return pushNotification({
    title: `${params.userName} deactivated`,
    notifCategory: "userDeactivated",
    category: "User",
    triggeredBy: params.actionBy,
    priority: "medium",
    payload,
  });
}

export function notifyUserActivated(params: {
  userName: string;
  userEmail?: string;
  actionBy: string;
}) {
  const payload: UserAccountPayload = {
    userName: params.userName,
    userEmail: params.userEmail,
    actionBy: params.actionBy,
  };

  return pushNotification({
    title: `${params.userName} activated`,
    notifCategory: "userActivated",
    category: "User",
    triggeredBy: params.actionBy,
    priority: "medium",
    payload,
  });
}


/* Payment / Transaction */


export function notifyPaymentReceived(params: {
  amount: number;
  currency?: string;
  clientName: string;
  transactionId: string;
  totalAmount?: number;
  amountPaid?: number;
  balanceAmount?: number;
}) {
  const payload: PaymentStatusPayload = {
    amount: params.amount,
    currency: params.currency || "₹",
    clientName: params.clientName,
    transactionId: params.transactionId,
    totalAmount: params.totalAmount,
    amountPaid: params.amountPaid,
    balanceAmount: params.balanceAmount,
  };

  return pushNotification({
    title: `Payment received — ${payload.currency}${params.amount}`,
    notifCategory: "paymentReceived",
    category: "Payment",
    triggeredBy: params.clientName,
    priority: "medium",
    payload,
  });
}

export function notifyPaymentPending(params: {
  amount: number;
  currency?: string;
  clientName: string;
  transactionId: string;
  totalAmount?: number;
  amountPaid?: number;
  balanceAmount?: number;
}) {
  const payload: PaymentStatusPayload = {
    amount: params.amount,
    currency: params.currency || "₹",
    clientName: params.clientName,
    transactionId: params.transactionId,
    totalAmount: params.totalAmount,
    amountPaid: params.amountPaid,
    balanceAmount: params.balanceAmount,
  };

  return pushNotification({
    title: `Payment pending — ${payload.currency}${params.amount}`,
    notifCategory: "paymentPending",
    category: "Payment",
    triggeredBy: params.clientName,
    priority: "medium",
    payload,
  });
}

export function notifyPaymentFailed(params: {
  amount: number;
  currency?: string;
  clientName: string;
  transactionId: string;
  reason?: string;
}) {
  const payload: PaymentStatusPayload = {
    amount: params.amount,
    currency: params.currency || "₹",
    clientName: params.clientName,
    transactionId: params.transactionId,
    reason: params.reason,
  };

  return pushNotification({
    title: "Payment failed",
    notifCategory: "paymentFailed",
    category: "Payment",
    triggeredBy: params.clientName,
    priority: "high",
    description: params.reason,
    payload,
  });
}

export function notifyPaymentDue(params: {
  amount: number;
  currency?: string;
  clientName: string;
  transactionId: string;
  dueDate: string;
  totalAmount?: number;
  amountPaid?: number;
  balanceAmount?: number;
}) {
  const payload: PaymentStatusPayload = {
    amount: params.amount,
    currency: params.currency || "₹",
    clientName: params.clientName,
    transactionId: params.transactionId,
    dueDate: params.dueDate,
    totalAmount: params.totalAmount,
    amountPaid: params.amountPaid,
    balanceAmount: params.balanceAmount,
  };

  return pushNotification({
    title: `Payment due — ${payload.currency}${params.amount}`,
    notifCategory: "paymentDue",
    category: "Payment",
    triggeredBy: "AXS System",
    priority: "high",
    payload,
  });
}

export function notifyPaymentCompleted(params: {
  amount: number;
  currency?: string;
  clientName: string;
  transactionId: string;
  totalAmount?: number;
  amountPaid?: number;
  balanceAmount?: number;
}) {
  const payload: PaymentStatusPayload = {
    amount: params.amount,
    currency: params.currency || "₹",
    clientName: params.clientName,
    transactionId: params.transactionId,
    totalAmount: params.totalAmount,
    amountPaid: params.amountPaid,
    balanceAmount: params.balanceAmount,
  };

  return pushNotification({
    title: `Payment completed — ${payload.currency}${params.amount}`,
    notifCategory: "paymentCompleted",
    category: "Payment",
    triggeredBy: params.clientName,
    priority: "low",
    payload,
  });
}


/* Payment-due scanner — run on TransactionPage mount / whenever the   */
/* transaction list refreshes                                          */


const DUE_PUSHED_KEY = "axsPaymentDuePushedIds";
interface DueScanTransaction {
  id: string;
  clientName: string;
  totalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  status: "Paid" | "Partial" | "Pending" | "Refunded";
  dueDate?: string;
}

export function scanAndNotifyPaymentsDue(transactions: DueScanTransaction[]) {
  const todayStr = new Date().toISOString().slice(0, 10);

  let pushedIds: string[] = [];
  try {
    pushedIds = JSON.parse(localStorage.getItem(DUE_PUSHED_KEY) || "[]");
  } catch {
    pushedIds = [];
  }

  const pushedSet = new Set(pushedIds);
  let didPush = false;

  transactions.forEach((txn) => {
    if (txn.status === "Paid" || txn.status === "Refunded") return;
    if (txn.balanceAmount <= 0) return;
    if (!txn.dueDate) return;
    if (txn.dueDate > todayStr) return;
    if (pushedSet.has(txn.id)) return; 

    notifyPaymentDue({
      amount: txn.balanceAmount,
      clientName: txn.clientName,
      transactionId: txn.id,
      dueDate: txn.dueDate,
      totalAmount: txn.totalAmount,
      amountPaid: txn.amountPaid,
      balanceAmount: txn.balanceAmount,
    });

    pushedSet.add(txn.id);
    didPush = true;
  });

  if (didPush) {
    localStorage.setItem(DUE_PUSHED_KEY, JSON.stringify(Array.from(pushedSet)));
  }
}