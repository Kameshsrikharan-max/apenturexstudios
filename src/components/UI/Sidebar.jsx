import { Layout, Menu, Typography, Tooltip } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  StarOutlined,
  UserOutlined,
  CalendarOutlined,
  MailOutlined,
  ShopOutlined,
  CameraOutlined,
  CloseOutlined,
} from "@ant-design/icons";

import "./Sidebar.css";

const { Sider } = Layout;
const { Text } = Typography;

const Sidebar = ({ dark = false, open = false, onClose, onCalendarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      path: "/dashboard",
      tooltip: "View your main dashboard metrics",
    },
    {
      key: "review",
      icon: <StarOutlined />,
      label: "Review",
      path: "/review",
      tooltip: "Manage and read client reviews",
    },
    {
      key: "users",
      icon: <UserOutlined />,
      label: "Users",
      path: "/users",
      tooltip: "Manage client and team accounts",
    },
    {
      key: "events",
      icon: <CalendarOutlined />,
      label: "Calendar",
      tooltip: "Open the event scheduler",
    },
    {
      key: "enquiry",
      icon: <MailOutlined />,
      label: "Enquiry",
      path: "/enquiry",
      tooltip: "Check incoming customer inquiries",
    },
    {
      key: "media",
      icon: <CameraOutlined />,
      label: "Media Library",
      path: "/media",
      tooltip: "Browse uploaded photos and videos",
    },
    {
      key: "studio",
      icon: <ShopOutlined />,
      label: "My Studio",
      path: "/studio",
      tooltip: "Configure your studio storefront settings",
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === "events") {
      onCalendarOpen?.();
      onClose?.();
      return;
    }

    const item = menuItems.find((menuItem) => menuItem.key === key);

    if (item?.path) {
      navigate(item.path);
      onClose?.();
    }
  };

  const getSelectedKey = () => {
    const activeItem = menuItems.find((item) => item.path === location.pathname);
    return activeItem ? [activeItem.key] : ["dashboard"];
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? "sidebar-backdrop-open" : ""}`}
        onClick={onClose}
      />

      <Sider
        width={260}
        className={[
          "studio-sidebar",
          dark ? "studio-sidebar-dark" : "studio-sidebar-light",
          open ? "studio-sidebar-open" : "",
        ].join(" ")}
      >
        <Tooltip title="Close Sidebar" placement="left">
          <button type="button" className="sidebar-close" onClick={onClose}>
            <CloseOutlined />
          </button>
        </Tooltip>

        <div className="studio-sidebar-brand">
          <Tooltip title="Aperture X Studios Identity" placement="bottom">
            <div className="studio-brand-mark">
              <CameraOutlined />
            </div>
          </Tooltip>

          <div>
            <Tooltip title="Aperture X Studios" placement="right">
              <Text strong className="studio-brand-title">
                AXS
              </Text>
            </Tooltip>
            <Text className="studio-brand-subtitle">
              Apenture X Studios
            </Text>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={getSelectedKey()}
          onClick={handleMenuClick}
          className="studio-sidebar-menu"
          items={menuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            // Wrapped label in a full width div so the tooltip covers the entire item row
            label: (
              <Tooltip title={item.tooltip} placement="right" mouseEnterDelay={0.4}>
                <div style={{ width: "100%", height: "100%" }}>{item.label}</div>
              </Tooltip>
            ),
          }))}
        />

        <Tooltip title="Current Production Version" placement="top">
          <div className="studio-sidebar-footer">
            <Text className="studio-version">Version 2.0</Text>
          </div>
        </Tooltip>
      </Sider>
    </>
  );
};

export default Sidebar;
