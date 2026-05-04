import React from "react";
import { Layout, Menu, Typography } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  StarOutlined,
  UserOutlined,
  CalendarOutlined,
  MailOutlined,
  ShopOutlined,
  CameraOutlined
} from "@ant-design/icons";

import "./Sidebar.css";

const { Sider } = Layout;
const { Text } = Typography;

const Sidebar = ({ dark = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Map menu keys to routes
  const menuItems = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      path: "/dashboard"
    },
    {
      key: "review",
      icon: <StarOutlined />,
      label: "Review",
      path: "/review"
    },
    {
      key: "users",
      icon: <UserOutlined />,
      label: "Users",
      path: "/users"
    },
    {
      key: "events",
      icon: <CalendarOutlined />,
      label: "Events",
      path: "/events"
    },
    {
      key: "enquiry",
      icon: <MailOutlined />,
      label: "Enquiry",
      path: "/enquiry"
    },
    {
      key: "studio",
      icon: <ShopOutlined />,
      label: "My Studio",
      path: "/studio"
    }
  ];

  const handleMenuClick = ({ key }) => {
    const item = menuItems.find(item => item.key === key);
    if (item) {
      navigate(item.path);
    }
  };

  // Get current selected key based on URL
  const getSelectedKey = () => {
    const currentPath = location.pathname;
    const activeItem = menuItems.find(item => item.path === currentPath);
    return activeItem ? [activeItem.key] : ["dashboard"];
  };

  return (
    <Sider
      width={260}
      className={dark ? "studio-sidebar studio-sidebar-dark" : "studio-sidebar"}
    >
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
        items={menuItems.map(item => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
        }))}
      />

      <div className="studio-sidebar-footer">
        <Text type="secondary" className="studio-version">
          Version 2.0
        </Text>
      </div>
    </Sider>
  );
};

export default Sidebar;
