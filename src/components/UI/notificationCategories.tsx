import React from "react";
import {FileSearchOutlined,EditOutlined,DeleteOutlined,TeamOutlined,DollarOutlined,PictureOutlined,} from "@ant-design/icons";

export interface NotificationCategory {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}

export const CATEGORIES: NotificationCategory[] = [
  {
    key: "reviewEndorsement",
    title: "Review Endorsement and Approval",
    description: "Referral, endorsement, and approval decisions.",
    icon: <FileSearchOutlined />,
    accent: "#38bdf8",
  },
  {
    key: "changeRequest",
    title: "Change Request",
    description: "Profile and studio update request notifications.",
    icon: <EditOutlined />,
    accent: "#22c55e",
  },
  {
    key: "deleteRequest",
    title: "Delete Request",
    description: "Delete request submissions and decisions.",
    icon: <DeleteOutlined />,
    accent: "#f87171",
  },
  {
    key: "eventAssignment",
    title: "Event Assignment",
    description: "New assignments and assignment responses.",
    icon: <TeamOutlined />,
    accent: "#60a5fa",
  },
  {
    key: "paymentExpenses",
    title: "Payment and Expenses Alert",
    description: "Payment reminders and expense alerts.",
    icon: <DollarOutlined />,
    accent: "#fbbf24",
  },
  {
    key: "mediaNotifications",
    title: "Media Notifications",
    description: "Media submission, acknowledgement, and upload summary updates.",
    icon: <PictureOutlined />,
    accent: "#06b6d4",
  },
];