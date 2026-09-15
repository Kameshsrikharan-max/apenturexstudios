import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Popover, Empty, Button, Tooltip, Spin } from "antd";
import { BellOutlined, CalendarOutlined, CheckOutlined, ThunderboltOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAssignmentNotifications, AssignmentNotification } from "././useAssignmentNotifications";

type Props = {
  user?: { email?: string } | null;
};

export default function NotificationBell({ user }: Props) {
  const navigate = useNavigate();
  const enabled = Boolean(user?.email);
  const { notifications, unreadCount, loading, markRead, markAllRead } = useAssignmentNotifications(enabled);
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  const handleClick = (n: AssignmentNotification) => {
    markRead(n.id);
    setOpen(false);
    navigate("/events");
  };

  const content = (
    <div style={{ width: 320, maxHeight: 420, overflowY: "auto" }}>
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 4px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <strong style={{ fontSize: 14 }}>Notifications</strong>
        {notifications.length > 0 ? (
          <Button type="link" size="small" onClick={markAllRead} icon={<CheckOutlined />}>
            Mark all read
          </Button>
        ) : null}
      </div>

      {loading && notifications.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center" }}>
          <Spin size="small" />
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ padding: "24px 0" }}>
          <Empty description="No notifications yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        notifications.map(n => (
          <button
            key={n.id}
            type="button"
            onClick={() => handleClick(n)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              background: n.read ? "transparent" : "rgba(56,189,248,0.08)",
              border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "10px 8px", cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#38bdf8", marginBottom: 4 }}>
              <ThunderboltOutlined /> {n.category}
              {!n.read ? (
                <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#f87171" }} />
              ) : null}
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, color: "inherit" }}>{n.title}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>{n.description}</div>
            <div style={{ fontSize: 11, opacity: 0.55, display: "flex", alignItems: "center", gap: 4 }}>
              <CalendarOutlined /> {dayjs(n.date).format("DD MMM YYYY")}{n.time ? ` · ${n.time}` : ""}
            </div>
          </button>
        ))
      )}
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      content={content}
      trigger="click"
      placement="bottomRight"
      overlayInnerStyle={{ padding: 0 }}
    >
      <Tooltip title="Notifications">
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
        </Badge>
      </Tooltip>
    </Popover>
  );
}