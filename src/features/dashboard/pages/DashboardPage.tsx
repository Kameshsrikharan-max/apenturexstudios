import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  DatePicker,
  Drawer,
  Empty,
  FloatButton,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  FireOutlined,
  HistoryOutlined,
  PictureOutlined,
  PlusOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  ThunderboltFilled,
  UsergroupAddOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import "./DashboardPage.css";

const { Title, Text } = Typography;
const { Search } = Input;

const THEME_COLOR = "#38BDF8";

const featureCards = [
  {
    title: "Shoots",
    value: "18",
    icon: <CameraOutlined />,
    background: "linear-gradient(135deg, #38BDF8, #2563eb)",
  },
  {
    title: "Views",
    value: "12.8K",
    icon: <EyeOutlined />,
    background: "linear-gradient(135deg, #38BDF8, #06b6d4)",
  },
  {
    title: "Frames",
    value: "64",
    icon: <PictureOutlined />,
    background: "linear-gradient(135deg, #38BDF8, #22c55e)",
  },
  {
    title: "Bookings",
    value: "+27%",
    icon: <FireOutlined />,
    background: "linear-gradient(135deg, #38BDF8, #f59e0b)",
  },
];

const initialEventsData = [
  {
    key: "1",
    id: "EVT-001",
    name: "Portfolio Shoot",
    studio: "Main Studio",
    date: "2026-05-02",
    status: "Pending",
    priority: "High",
    client: "ApertureX Client",
    budget: "Rs. 18,000",
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
    budget: "Rs. 42,000",
  },
];

const metricCards = [
  { title: "Users", value: 1042, suffix: "", percent: 100, icon: <UsergroupAddOutlined />, color: "#38BDF8" },
  { title: "Events", value: 2, suffix: "", percent: 40, icon: <VideoCameraOutlined />, color: "#f59e0b" },
  { title: "Health", value: 98, suffix: "%", percent: 98, icon: <SafetyCertificateOutlined />, color: "#06b6d4" },
  { title: "Profile", value: 82, suffix: "%", percent: 82, icon: <CheckCircleOutlined />, color: "#22c55e" },
  { title: "Revenue", value: 180000, suffix: "Rs", percent: 76, icon: <DollarOutlined />, color: "#14b8a6" },
  { title: "Leads", value: 36, suffix: "", percent: 64, icon: <TeamOutlined />, color: "#38BDF8" },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: any) => state.auth);
  const displayEmail = user?.email || "guest@apenturexstudios.com";
  const displayName = displayEmail.split("@")[0];

  const [featureIndex, setFeatureIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Events are now stateful so newly created ones show up immediately
  const [eventsData, setEventsData] = useState(initialEventsData);

  // Create Event modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const userData = useMemo(
    () => [
      {
        key: "1",
        name: displayName,
        email: displayEmail,
        phone: user?.phone || "N/A",
        createdAt: user?.createdAt || "2026-04-15",
        role: user?.role || "Studio Admin",
      },
    ],
    [displayName, displayEmail, user]
  );

  useEffect(() => {
    const featureTimer = setInterval(() => {
      setFeatureIndex((current) => (current + 1) % featureCards.length);
    }, 4200);

    return () => clearInterval(featureTimer);
  }, []);

  const filteredUsers = useMemo(() => {
    const value = searchText.toLowerCase();

    return userData.filter((user) =>
      [user.name, user.email, user.phone, user.role].some((field) =>
        field.toLowerCase().includes(value)
      )
    );
  }, [searchText, userData]);

  const filteredEvents = useMemo(() => {
    const value = searchText.toLowerCase();

    return eventsData.filter((event) => {
      const matchesSearch = [
        event.id,
        event.name,
        event.studio,
        event.status,
        event.priority,
        event.client,
      ].some((field) => field.toLowerCase().includes(value));

      if (!matchesSearch) return false;
      if (dateFilter === "All") return true;

      const today = new Date("2026-04-30");
      const eventDate = new Date(event.date);
      const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (dateFilter === "Today") return diffDays === 0;
      if (dateFilter === "Week") return diffDays >= 0 && diffDays <= 7;
      if (dateFilter === "Month") return diffDays >= 0 && diffDays <= 30;

      return true;
    });
  }, [searchText, dateFilter, eventsData]);

  // ---- Navigation handlers ----
  const goToUsersPage = () => navigate("/users");
  const goToEventPage = (eventId?: string) => {
    if (eventId) {
      navigate(`/events/${eventId}`);
    } else {
      navigate("/events");
    }
  };

  // ---- Create Event modal handlers ----
  const openCreateModal = () => {
    createForm.resetFields();
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (submitting) return;
    setCreateModalOpen(false);
  };

  const handleCreateEvent = async () => {
    try {
      const values = await createForm.validateFields();
      setSubmitting(true);

      const newEvent = {
        key: String(eventsData.length + 1),
        id: `EVT-${String(eventsData.length + 1).padStart(3, "0")}`,
        name: values.name,
        studio: values.studio,
        date: values.date.format("YYYY-MM-DD"),
        status: "Pending",
        priority: values.priority,
        client: values.client,
        budget: `Rs. ${Number(values.budget).toLocaleString("en-IN")}`,
      };

      setEventsData((prev) => [newEvent, ...prev]);
      message.success("Event created successfully");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (err) {
      // validation errors are shown inline by the form itself
    } finally {
      setSubmitting(false);
    }
  };

  const userColumns = [
    {
      title: "User",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Space>
          <Avatar
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${text}`}
            style={{ background: THEME_COLOR }}
          />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Admin
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (value: string) => <Text type="secondary">{value}</Text>,
    },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    {
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => <Tag>{date}</Tag>,
    },
  ];

  const eventColumns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => <Text code>{id}</Text>,
    },
    {
      title: "Shoot",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    { title: "Studio", dataIndex: "studio", key: "studio" },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => (
        <Space>
          <CalendarOutlined style={{ color: THEME_COLOR }} />
          <Text>{date}</Text>
        </Space>
      ),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority: string) => (
        <Tag color={priority === "High" ? "red" : priority === "Medium" ? "gold" : "blue"}>
          {priority}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
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
      },
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: THEME_COLOR,
          borderRadius: 16,
          colorBgContainer: "#202024",
          colorText: "#f8f8f4",
          colorTextSecondary: "#a4a4aa",
          fontFamily:
            "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        },
        components: {
          Card: { borderRadiusLG: 16 },
          Table: {
            headerBg: "#242428",
            rowHoverBg: "rgba(56,189,248,0.08)",
          },
        },
      }}
    >
      <div className="dashboard-page-content">
        <div className="dashboard-page-top">
          <Title level={2}>Dashboard</Title>

          <Search
            placeholder="Search..."
            allowClear
            enterButton={<SearchOutlined />}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="dashboard-local-search"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="hero-card"
        >
          <div className="hero-overlay" />

          <div className="hero-content">
            <Tag color="cyan">
              <ThunderboltFilled /> Live
            </Tag>

            <Title level={1}>Welcome, {displayName}</Title>

            <div className="hero-mini-stats">
              <div>
                <CameraOutlined />
                <strong>18</strong>
                <span>Shoots</span>
              </div>

              <div>
                <EyeOutlined />
                <strong>12.8K</strong>
                <span>Views</span>
              </div>

              <div>
                <PictureOutlined />
                <strong>64</strong>
                <span>Frames</span>
              </div>
            </div>
          </div>
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

                    <Title level={1} className="feature-value">
                      {featureCards[featureIndex].value}
                    </Title>

                    <Text className="feature-label">
                      {featureCards[featureIndex].title}
                    </Text>
                  </motion.div>
                </AnimatePresence>
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={16}>
            <div className="horizontal-scroll-wrapper">
              <div className="horizontal-card-strip">
                {metricCards.map((item) => (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="horizontal-card-item"
                    onClick={() => {
                      if (item.title === "Users") goToUsersPage();
                      if (item.title === "Events") goToEventPage();
                    }}
                    style={{ cursor: item.title === "Users" || item.title === "Events" ? "pointer" : "default" }}
                  >
                    <Card variant="borderless" className="metric-card">
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

                      <RiseOutlined style={{ color: item.color, fontSize: 20 }} />
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <HistoryOutlined />
              Users
            </Space>
          }
          extra={
            <Button type="text" icon={<ArrowRightOutlined />} onClick={goToUsersPage} />
          }
          className="dashboard-panel"
        >
          <Table
            columns={userColumns}
            dataSource={filteredUsers}
            pagination={false}
            scroll={{ x: 760 }}
            onRow={() => ({
              onClick: goToUsersPage,
              style: { cursor: "pointer" },
            })}
          />
        </Card>

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
              style: { cursor: "pointer" },
            })}
          />
        </Card>

        <Card
          title={
            <Space>
              <ThunderboltFilled className="inline-blue" />
              Schedule
            </Space>
          }
          extra={
            <Button
              type="primary"
              shape="circle"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            />
          }
          className="dashboard-panel schedule-panel"
          styles={{ body: { padding: 0 } }}
        >
          <Table
            columns={eventColumns}
            dataSource={[]}
            pagination={false}
            scroll={{ x: 900 }}
            locale={{
              emptyText: (
                <div className="empty-schedule">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />

                  <Button
                    type="primary"
                    shape="circle"
                    icon={<PlusOutlined />}
                    onClick={openCreateModal}
                  />
                </div>
              ),
            }}
          />
        </Card>

        {/* Event details drawer */}
        <Drawer
          title="Event"
          open={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          size="default"
          extra={
            <Button
              type="primary"
              onClick={() => selectedEvent && goToEventPage(selectedEvent.id)}
            >
              View Full Details
            </Button>
          }
        >
          {selectedEvent && (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Title level={4}>{selectedEvent.name}</Title>

              <Text>
                <strong>ID:</strong> {selectedEvent.id}
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

        {/* Create Event modal */}
        <Modal
          title="Create Event"
          open={createModalOpen}
          onCancel={closeCreateModal}
          onOk={handleCreateEvent}
          okText="Create"
          confirmLoading={submitting}
          destroyOnHidden
        >
          <Form form={createForm} layout="vertical" requiredMark={false}>
            <Form.Item
              name="name"
              label="Shoot Name"
              rules={[{ required: true, message: "Please enter a shoot name" }]}
            >
              <Input placeholder="e.g. Portfolio Shoot" />
            </Form.Item>

            <Form.Item
              name="studio"
              label="Studio"
              rules={[{ required: true, message: "Please enter a studio" }]}
            >
              <Input placeholder="e.g. Main Studio" />
            </Form.Item>

            <Form.Item
              name="client"
              label="Client"
              rules={[{ required: true, message: "Please enter a client name" }]}
            >
              <Input placeholder="e.g. ApertureX Client" />
            </Form.Item>

            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: "Please select a date" }]}
              initialValue={dayjs()}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              name="priority"
              label="Priority"
              rules={[{ required: true, message: "Please select a priority" }]}
              initialValue="Medium"
            >
              <Select
                options={[
                  { value: "High", label: "High" },
                  { value: "Medium", label: "Medium" },
                  { value: "Low", label: "Low" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="budget"
              label="Budget (Rs.)"
              rules={[{ required: true, message: "Please enter a budget" }]}
            >
              <InputNumber style={{ width: "100%" }} min={0} placeholder="e.g. 18000" />
            </Form.Item>
          </Form>
        </Modal>

        <FloatButton
          icon={<PlusOutlined />}
          type="primary"
          tooltip="Create"
          onClick={openCreateModal}
        />
      </div>
    </ConfigProvider>
  );
};

export default DashboardPage;