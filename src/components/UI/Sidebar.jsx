import { Layout, Menu, Typography } from "antd";
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
    },
    {
      key: "review",
      icon: <StarOutlined />,
      label: "Review",
      path: "/review",
    },
    {
      key: "users",
      icon: <UserOutlined />,
      label: "Users",
      path: "/users",
    },
    {
      key: "events",
      icon: <CalendarOutlined />,
      label: "Calendar",
    },
    {
      key: "enquiry",
      icon: <MailOutlined />,
      label: "Enquiry",
      path: "/enquiry",
    },

     {
    key: "media",
    icon: <CameraOutlined />,
    label: "Media Library",
    path: "/media",
  }, 
  
    {
      key: "studio",
      icon: <ShopOutlined />,
      label: "My Studio",
      path: "/studio",
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
        <button type="button" className="sidebar-close" onClick={onClose}>
          <CloseOutlined />
        </button>

        <div className="studio-sidebar-brand">
          <div className="studio-brand-mark">
            <CameraOutlined />
          </div>

          <div>
            <Text strong className="studio-brand-title">
              AXS
            </Text>
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
            label: item.label,
          }))}
        />

        <div className="studio-sidebar-footer">
          <Text className="studio-version">Version 2.0</Text>
        </div>
      </Sider>
    </>
  );
};

export default Sidebar;
