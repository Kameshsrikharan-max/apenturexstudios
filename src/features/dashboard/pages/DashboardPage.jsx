import React, { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Typography,
  Card,
  Row,
  Col,
  Progress,
  Table,
  Avatar,
  Space,
  Dropdown,
  Tag,
  Button,
  ConfigProvider,
  Badge,
  Statistic,
  Tooltip,
  Empty,
  Input,
  Drawer,
  Segmented,
  Calendar,
  FloatButton
} from "antd";
import {
  DashboardOutlined,
  DownOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  BellOutlined,
  ThunderboltFilled,
  HistoryOutlined,
  UsergroupAddOutlined,
  VideoCameraOutlined,
  PlusOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  LogoutOutlined,
  SearchOutlined,
  CameraOutlined,
  PictureOutlined,
  FireOutlined,
  EyeOutlined,
  SunOutlined,
  MoonOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  TeamOutlined
} from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/UI/Sidebar";
import "./DashboardPage.css";

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const THEME_COLOR = "#38BDF8";

const photographyQuotes = [
  "Photography is the story you fail to put into words.",
  "A camera freezes time, but vision gives it meaning.",
  "Great portraits begin long before the shutter clicks.",
  "Light is not just seen. It is shaped.",
  "Every frame is a decision about what matters."
];

const featureCards = [
  {
    title: "Creative Shoots",
    value: "18",
    caption: "Concept sessions planned",
    icon: <CameraOutlined />,
    background: "linear-gradient(135deg, #38BDF8, #2563eb)"
  },
  {
    title: "Gallery Views",
    value: "12.8K",
    caption: "Portfolio impressions",
    icon: <EyeOutlined />,
    background: "linear-gradient(135deg, #38BDF8, #06b6d4)"
  },
  {
    title: "Featured Frames",
    value: "64",
    caption: "Selected final edits",
    icon: <PictureOutlined />,
    background: "linear-gradient(135deg, #38BDF8, #22c55e)"
  },
  {
    title: "Trending Bookings",
    value: "+27%",
    caption: "Demand this month",
    icon: <FireOutlined />,
    background: "linear-gradient(135deg, #38BDF8, #f59e0b)"
  }
];

const userData = [
  {
    key: "1",
    name: "Kamesh Srikharan.T",
    email: "kameshsrikharan.t@gmail.com",
    phone: "8888...",
    createdAt: "2026-04-15",
    role: "Studio Admin"
  }
];

const eventsData = [
  {
    key: "1",
    id: "EVT-001",
    name: "Portfolio Shoot",
    studio: "Main Studio",
    date: "2026-05-02",
    status: "Pending",
    priority: "High",
    client: "ApertureX Client",
    budget: "Rs. 18,000"
  },
  {
    key: "2",
    id: "EVT-002",
    name: "Product Campaign",
    studio: "Creative Bay",
    date: "2026-05-08",
    status: "Confirmed",
    priority: "Medium",
    client: "Brand Studio",
    budget: "Rs. 42,000"
  }
];

const upcomingEventsData = [];

const metricCards = [
  {
    title: "Total Users",
    value: 1042,
    suffix: "+12%",
    caption: "Growth this month",
    percent: 100,
    icon: <UsergroupAddOutlined />,
    color: "#38BDF8"
  },
  {
    title: "Active Events",
    value: 2,
    suffix: "Live",
    caption: "Currently tracked",
    percent: 40,
    icon: <VideoCameraOutlined />,
    color: "#f59e0b"
  },
  {
    title: "Studio Health",
    value: 98,
    suffix: "%",
    caption: "System performance",
    percent: 98,
    icon: <SafetyCertificateOutlined />,
    color: "#06b6d4"
  },
  {
    title: "Profile Strength",
    value: 82,
    suffix: "%",
    caption: "Admin profile complete",
    percent: 82,
    icon: <CheckCircleOutlined />,
    color: "#22c55e"
  },
  {
    title: "Monthly Revenue",
    value: 180000,
    suffix: "Rs",
    caption: "Estimated this month",
    percent: 76,
    icon: <DollarOutlined />,
    color: "#14b8a6"
  },
  {
    title: "Client Leads",
    value: 36,
    suffix: "New",
    caption: "Fresh enquiries",
    percent: 64,
    icon: <TeamOutlined />,
    color: "#38BDF8"
  }
];

const notifications = [
  { key: "1", label: "Portfolio campaign is pending approval." },
  { key: "2", label: "Studio health check completed successfully." },
  { key: "3", label: "No events booked for the next 7 days." }
];

const DashboardPage = () => {
  const navigate = useNavigate();

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [themeMode, setThemeMode] = useState("dark");
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const isDark = themeMode === "dark";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("auth");
    sessionStorage.clear();
    navigate("/");
  };

  useEffect(() => {
    const quoteTimer = setInterval(() => {
      setQuoteIndex((current) => (current + 1) % photographyQuotes.length);
    }, 6000);

    const featureTimer = setInterval(() => {
      setFeatureIndex((current) => (current + 1) % featureCards.length);
    }, 5200);

    return () => {
      clearInterval(quoteTimer);
      clearInterval(featureTimer);
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const value = searchText.toLowerCase();

    return userData.filter((user) =>
      [user.name, user.email, user.phone, user.role].some((field) =>
        field.toLowerCase().includes(value)
      )
    );
  }, [searchText]);

  const filteredEvents = useMemo(() => {
    const value = searchText.toLowerCase();

    return eventsData.filter((event) => {
      const matchesSearch = [
        event.id,
        event.name,
        event.studio,
        event.status,
        event.priority,
        event.client
      ].some((field) => field.toLowerCase().includes(value));

      if (!matchesSearch) return false;
      if (dateFilter === "All") return true;

      const today = new Date("2026-04-30");
      const eventDate = new Date(event.date);
      const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

      if (dateFilter === "Today") return diffDays === 0;
      if (dateFilter === "Week") return diffDays >= 0 && diffDays <= 7;
      if (dateFilter === "Month") return diffDays >= 0 && diffDays <= 30;

      return true;
    });
  }, [searchText, dateFilter]);

  const userColumns = [
    {
      title: "User Profile",
      dataIndex: "name",
      key: "name",
      render: (text) => (
        <Space>
          <Avatar
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${text}`}
            style={{ background: THEME_COLOR }}
          />
          <div>
            <Text strong style={{ display: "block" }}>
              {text}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {text.split(" ")[0].toLowerCase()}_admin
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (value) => <Text type="secondary">{value}</Text>
    },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => <Tag>{date}</Tag>
    }
  ];

  const eventColumns = [
    {
      title: "Event ID",
      dataIndex: "id",
      key: "id",
      render: (id) => <Text code>{id}</Text>
    },
    {
      title: "Event Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong>{text}</Text>
    },
    { title: "Studio", dataIndex: "studio", key: "studio" },
    {
      title: "Event Date",
      dataIndex: "date",
      key: "date",
      render: (date) => (
        <Space>
          <CalendarOutlined style={{ color: THEME_COLOR }} />
          <Text>{date}</Text>
        </Space>
      )
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority) => (
        <Tag color={priority === "High" ? "red" : priority === "Medium" ? "gold" : "blue"}>
          {priority}
        </Tag>
      )
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const confirmed = status === "Confirmed";

        return (
          <Badge
            status={confirmed ? "processing" : "warning"}
            text={
              <Text strong style={{ color: confirmed ? "#38BDF8" : "#f59e0b" }}>
                {status}
              </Text>
            }
          />
        );
      }
    }
  ];

  const pageClass = isDark ? "dashboard-page dashboard-dark" : "dashboard-page";

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: THEME_COLOR,
          borderRadius: 16,
          colorBgContainer: isDark ? "#202024" : "#ffffff",
          colorText: isDark ? "#f8f8f4" : "#1f2937",
          colorTextSecondary: isDark ? "#a4a4aa" : "#6b7280",
          fontFamily:
            "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
        },
        components: {
          Card: { borderRadiusLG: 16 },
          Table: {
            headerBg: isDark ? "#242428" : "#f7f8fc",
            rowHoverBg: "rgba(56,189,248,0.08)"
          }
        }
      }}
    >
      <Layout className={pageClass}>
        <div className="dashboard-frame">
          <Sidebar dark={isDark} />

          <Layout className="dashboard-shell">
            <Header className="dashboard-navbar">
              <Space size={14} align="center" className="dashboard-brand">
                <div className="dashboard-logo">
                  <DashboardOutlined />
                </div>
                <Title level={4} className="dashboard-title">
                  Dashboard
                </Title>
              </Space>

              <Search
                placeholder="Search users, events, studios..."
                allowClear
                enterButton={<SearchOutlined />}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="dashboard-search"
              />

              <Space size={14}>
                <Tooltip title={isDark ? "Light mode" : "Dark mode"}>
                  <Button
                    shape="circle"
                    icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                    onClick={() => setThemeMode(isDark ? "light" : "dark")}
                    className="nav-icon-btn"
                  />
                </Tooltip>

                <Dropdown menu={{ items: notifications }} trigger={["click"]}>
                  <Badge dot color={THEME_COLOR}>
                    <Button shape="circle" icon={<BellOutlined />} className="nav-icon-btn" />
                  </Badge>
                </Dropdown>

                <Dropdown
                  trigger={["click"]}
                  menu={{
                    onClick: ({ key }) => {
                      if (key === "logout") handleLogout();
                    },
                    items: [
                      {
                        key: "settings",
                        icon: <SettingOutlined />,
                        label: "Account Settings"
                      },
                      { type: "divider" },
                      {
                        key: "logout",
                        icon: <LogoutOutlined />,
                        label: "Logout"
                      }
                    ]
                  }}
                >
                  <div className="profile-pill">
                    <Avatar style={{ backgroundColor: THEME_COLOR, color: "#082f49" }}>
                      K
                    </Avatar>
                    <div className="profile-copy">
                      <Text strong style={{ display: "block" }}>
                        Kamesh Srikharan.T
                      </Text>
                      <Text type="secondary">Studio Admin</Text>
                    </div>
                    <DownOutlined />
                  </div>
                </Dropdown>
              </Space>
            </Header>

            <Content className="dashboard-content">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="welcome-card"
              >
                <Row align="middle" gutter={[28, 28]}>
                  <Col xs={24} lg={10}>
                    <Space orientation="vertical" size={10}>
                      <Tag color="cyan">
                        <ThunderboltFilled /> Live Creative Overview
                      </Tag>
                      <Title level={2} style={{ margin: 0 }}>
                        Welcome back, Kamesh
                      </Title>
                      <Paragraph type="secondary" style={{ fontSize: 15, margin: 0 }}>
                        Manage studio events, production schedules, users, and
                        photography activity from one elegant dashboard.
                      </Paragraph>
                    </Space>
                  </Col>

                  <Col xs={24} lg={14}>
                    <div className="quote-runner">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={quoteIndex}
                          initial={{ x: -90, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: 90, opacity: 0 }}
                          transition={{ duration: 0.7, ease: "easeInOut" }}
                          className="quote-item"
                        >
                          <div className="quote-icon">
                            <CameraOutlined />
                          </div>
                          <Title level={4} className="quote-text">
                            "{photographyQuotes[quoteIndex]}"
                          </Title>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </Col>
                </Row>
              </motion.div>

              <Row gutter={[24, 24]}>
                <Col xs={24} xl={8}>
                  <Card variant="borderless" className="feature-card" styles={{ body: { padding: 0 } }}>
                    <div className="feature-stage">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={featureIndex}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.45 }}
                          className="feature-slide"
                          style={{ background: featureCards[featureIndex].background }}
                        >
                          <div className="feature-icon">{featureCards[featureIndex].icon}</div>
                          <Text className="feature-label">{featureCards[featureIndex].title}</Text>
                          <Title level={1} className="feature-value">
                            {featureCards[featureIndex].value}
                          </Title>
                          <Text className="feature-caption">
                            {featureCards[featureIndex].caption}
                          </Text>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </Card>
                </Col>

                <Col xs={24} xl={16}>
                  <div className="horizontal-card-strip">
                    {metricCards.map((item) => (
                      <motion.div
                        key={item.title}
                        whileHover={{ y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="horizontal-card-item"
                      >
                        <Card variant="borderless" className="metric-card">
                          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
                            <div className="metric-top">
                              <div className="metric-icon" style={{ color: item.color }}>
                                {item.icon}
                              </div>
                              <Progress
                                type="circle"
                                percent={item.percent}
                                size={58}
                                strokeColor={item.color}
                                railColor="rgba(255,255,255,0.1)"
                                format={() => ""}
                              />
                            </div>

                            <Statistic
                              title={
                                <Text strong type="secondary">
                                  {item.title}
                                </Text>
                              }
                              value={item.value}
                              suffix={item.suffix}
                              styles={{ content: { fontWeight: 800 } }}
                            />

                            <Space>
                              <RiseOutlined style={{ color: item.color }} />
                              <Text type="secondary">{item.caption}</Text>
                            </Space>
                          </Space>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </Col>
              </Row>

              <Row gutter={[24, 24]} style={{ marginTop: 32 }}>
                <Col xs={24} xl={15}>
                  <Card
                    title={
                      <Space>
                        <HistoryOutlined />
                        User Records
                      </Space>
                    }
                    extra={
                      <Button type="text" icon={<ArrowRightOutlined />}>
                        View All
                      </Button>
                    }
                    className="dashboard-panel"
                  >
                    <Table
                      columns={userColumns}
                      dataSource={filteredUsers}
                      pagination={false}
                      scroll={{ x: 760 }}
                    />
                  </Card>
                </Col>

                <Col xs={24} xl={9}>
                  <Card title="Mini Calendar" className="dashboard-panel calendar-panel">
                    <Calendar fullscreen={false} />
                  </Card>
                </Col>
              </Row>

              <Card
                title={
                  <Space>
                    <VideoCameraOutlined className="inline-blue" />
                    Events
                  </Space>
                }
                extra={
                  <Segmented
                    value={dateFilter}
                    onChange={setDateFilter}
                    options={["Today", "Week", "Month", "All"]}
                  />
                }
                className="dashboard-panel events-panel"
              >
                <Table
                  columns={eventColumns}
                  dataSource={filteredEvents}
                  pagination={false}
                  scroll={{ x: 900 }}
                  onRow={(record) => ({
                    onClick: () => setSelectedEvent(record),
                    style: { cursor: "pointer" }
                  })}
                />
              </Card>

              <Card
                title={
                  <Space>
                    <ThunderboltFilled className="inline-blue" />
                    Upcoming Production Schedule
                  </Space>
                }
                extra={
                  <Button type="primary" shape="round" icon={<PlusOutlined />}>
                    Create New Event
                  </Button>
                }
                className="dashboard-panel schedule-panel"
                styles={{ body: { padding: 0 } }}
              >
                <Table
                  columns={eventColumns}
                  dataSource={upcomingEventsData}
                  pagination={false}
                  scroll={{ x: 900 }}
                  locale={{
                    emptyText: (
                      <div className="empty-schedule">
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="No production events are booked for the next 7 days."
                        />
                        <Button type="primary" shape="round" icon={<PlusOutlined />}>
                          Plan First Shoot
                        </Button>
                      </div>
                    )
                  }}
                />
              </Card>

              <div className="dashboard-footer">
                <Text type="secondary">© 2026 Apenture X Studios • Powered by PSP</Text>
              </div>
            </Content>
          </Layout>
        </div>

        <Drawer
          title="Event Details"
          open={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          size="default"
        >
          {selectedEvent && (
            <Space orientation="vertical" size={16} style={{ width: "100%" }}>
              <Title level={4}>{selectedEvent.name}</Title>
              <Text>
                <strong>Event ID:</strong> {selectedEvent.id}
              </Text>
              <Text>
                <strong>Studio:</strong> {selectedEvent.studio}
              </Text>
              <Text>
                <strong>Date:</strong> {selectedEvent.date}
              </Text>
              <Text>
                <strong>Client:</strong> {selectedEvent.client}
              </Text>
              <Text>
                <strong>Budget:</strong> {selectedEvent.budget}
              </Text>
              <Tag color={selectedEvent.status === "Confirmed" ? "blue" : "gold"}>
                {selectedEvent.status}
              </Tag>
            </Space>
          )}
        </Drawer>

        <FloatButton icon={<PlusOutlined />} type="primary" tooltip="Create Event" />
      </Layout>
    </ConfigProvider>
  );
};

export default DashboardPage;
