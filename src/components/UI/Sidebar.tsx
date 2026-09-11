import { Layout, Menu, Typography, Tooltip } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {DashboardOutlined,StarOutlined,UserOutlined,CalendarOutlined,ScheduleOutlined,MailOutlined,ShopOutlined,CameraOutlined,CreditCardOutlined,ExclamationCircleOutlined,FileImageOutlined,ClockCircleOutlined,} from "@ant-design/icons";
import { canAccessSection, SectionKey } from "../../config/rolePermissions";

import "./Sidebar.css";
import { JSX } from "react/jsx-runtime";

const { Sider } = Layout;
const { Text } = Typography;

interface SidebarUser {
  role?: string;
}

interface SidebarProps {
  dark?: boolean;
  open?: boolean;
  onClose?: () => void;
  onCalendarOpen?: () => void;
  user?: SidebarUser;
}

const Sidebar = ({
  dark = false,
  open = false,
  onClose,
  onCalendarOpen,
  user,
}: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = user?.role === "super_admin";

  const ALL_MENU_ITEMS: Array<{
    key: string;
    icon: JSX.Element;
    label: string;
    path: string;
    section?: SectionKey;
  }> = [
    { key: "dashboard", icon: <DashboardOutlined />, label: "Dashboard", path: "/dashboard", section: "dashboard" },
    { key: "review", icon: <StarOutlined />, label: "Review", path: "/review", section: "review" },
    { key: "users", icon: <UserOutlined />, label: "Users", path: "/users", section: "users" },
    { key: "events", icon: <CalendarOutlined />, label: "Events", path: "/events", section: "events" },
    { key: "calendar", icon: <ScheduleOutlined />, label: "Calendar", path: "/calendar" },
    { key: "availability", icon: <ClockCircleOutlined />, label: "Availability", path: "/availability", section: "availability" },
    { key: "enquiry", icon: <MailOutlined />, label: "Enquiry", path: "/enquiry", section: "enquiry" },
    { key: "media", icon: <CameraOutlined />, label: "Media Library", path: "/media" },
    { key: "studio", icon: <ShopOutlined />, label: "My Studio", path: "/studio/view", section: "studio" },
    { key: "templates", icon: <FileImageOutlined />, label: "Templates", path: "/templates", section: "templates" },
    { key: "subscription", icon: <CreditCardOutlined />, label: "Subscription", path: "/subscription", section: "subscription" },
  ];

  const menuItems = [
    ...ALL_MENU_ITEMS.filter(
      (item) => !item.section || canAccessSection(user?.role, item.section)
    ),
    ...(isSuperAdmin
      ? [
          {
            key: "delete-requests",
            icon: <ExclamationCircleOutlined />,
            label: "Delete Requests",
            path: "/delete-requests",
          },
        ]
      : []),
  ];

  const handleMenuClick = ({ key }) => {
    const item = menuItems.find(
      (menuItem) => menuItem.key === key
    );

    if (item?.path) {
      navigate(item.path);
      onClose?.();
    }
  };

  const getSelectedKey = () => {
    const activeItem = menuItems.find(
      (item) => item.path === location.pathname
    );

    return activeItem ? [activeItem.key] : ["dashboard"];
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${
          open ? "sidebar-backdrop-open" : ""
        }`}
        onClick={onClose}
      />

      <Sider
        width={96}
        className={[
          "studio-sidebar",
          dark
            ? "studio-sidebar-dark"
            : "studio-sidebar-light",
          open ? "studio-sidebar-open" : "",
        ].join(" ")}
      >
        <div className="studio-sidebar-brand">
          <Tooltip
            title="Aperture X Studios"
            placement="right"
          >
            <div className="studio-brand-stack">
              <div className="studio-brand-mark">
                <CameraOutlined />
              </div>

              <Text strong className="studio-brand-title">
                AXS
              </Text>
            </div>
          </Tooltip>
        </div>

        <Menu
          mode="inline"
          selectedKeys={getSelectedKey()}
          onClick={handleMenuClick}
          className="studio-sidebar-menu"
          items={menuItems.map((item, index) => ({
            key: item.key,
            icon: (
              <Tooltip
                title={item.label}
                placement="right"
                trigger={["hover", "focus", "click"]}
                mouseEnterDelay={0.2}
              >
                <span
                  className="sidebar-menu-icon"
                  style={{ "--item-index": index }}
                >
                  {item.icon}
                </span>
              </Tooltip>
            ),
            label: null,
          }))}
        />
      </Sider>
    </>
  );
};

export default Sidebar;