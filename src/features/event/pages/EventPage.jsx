import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  ConfigProvider,
  Empty,
  Form,
  Input,
  Modal,
  Popover,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TableOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import "./EventPage.css";
import TeamAssignmentPage from "./TeamAssignmentPage";

const { Title, Text } = Typography;

const initialEvents = [
  {
    id: "ev-1001",
    name: "John - Wedding",
    type: "Wedding",
    date: "Jun 16, 2026",
    time: "12:00 AM",
    address: "mettupalayam",
    city: "coimbatore",
    customer: "Apsi",
    status: "DRAFT",
    pipeline: "Converted",
    members: 0,
    budget: "INR 1.8L",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "ev-1002",
    name: "Aarav - Reception",
    type: "Reception",
    date: "Jun 20, 2026",
    time: "06:30 PM",
    address: "Le Meridien Hall",
    city: "Chennai",
    customer: "Meera",
    status: "LIVE",
    pipeline: "Booked",
    members: 6,
    budget: "INR 2.4L",
    image:
      "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "ev-1003",
    name: "Studio Launch Night",
    type: "Corporate",
    date: "Jul 02, 2026",
    time: "05:00 PM",
    address: "Race Course Road",
    city: "Coimbatore",
    customer: "Nova Labs",
    status: "PLANNED",
    pipeline: "Proposal",
    members: 3,
    budget: "INR 95K",
    image:
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80",
  },
];

const EVENTS_STORAGE_KEY = "ax.events.v1";

const readStoredEvents = () => {
  if (typeof window === "undefined") return initialEvents;

  try {
    const saved = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : initialEvents;
  } catch {
    return initialEvents;
  }
};

const saveStoredEvents = (events) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
};

const statuses = ["DRAFT", "PLANNED", "LIVE", "DONE"];
const eventTypes = [
  "Wedding",
  "Reception",
  "Corporate",
  "Family",
  "Birthday",
  "Engagement",
];

const statusMeta = {
  DRAFT: {
    icon: <EditOutlined />,
    color: "#cbd5e1",
    bg: "rgba(148,163,184,0.14)",
  },
  PLANNED: {
    icon: <ClockCircleOutlined />,
    color: "#93c5fd",
    bg: "rgba(59,130,246,0.14)",
  },
  LIVE: {
    icon: <ThunderboltOutlined />,
    color: "#86efac",
    bg: "rgba(34,197,94,0.14)",
  },
  DONE: {
    icon: <CheckCircleOutlined />,
    color: "#c4b5fd",
    bg: "rgba(124,58,237,0.14)",
  },
};

const pipelineColor = {
  Converted: "#86efac",
  Booked: "#7dd3fc",
  Proposal: "#fbbf24",
  Delivered: "#c4b5fd",
};

const escapeRegExp = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function EventPage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState(() => readStoredEvents());
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [filterOpen, setFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewEvent, setViewEvent] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignEvent, setAssignEvent] = useState(null);

  const [form] = Form.useForm();

  useEffect(() => {
    saveStoredEvents(events);
  }, [events]);

  useEffect(() => {
    const syncEvents = () => setEvents(readStoredEvents());

    window.addEventListener("focus", syncEvents);
    window.addEventListener("storage", syncEvents);

    return () => {
      window.removeEventListener("focus", syncEvents);
      window.removeEventListener("storage", syncEvents);
    };
  }, []);

  const counts = useMemo(
    () =>
      events.reduce(
        (acc, e) => {
          acc.All += 1;
          acc[e.status] = (acc[e.status] || 0) + 1;
          return acc;
        },
        { All: 0, DRAFT: 0, PLANNED: 0, LIVE: 0, DONE: 0 }
      ),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return events.filter((e) => {
      const matchStatus = activeStatus === "All" || e.status === activeStatus;
      const matchSearch =
        !term ||
        Object.values(e).some((v) => String(v).toLowerCase().includes(term));

      return matchStatus && matchSearch;
    });
  }, [activeStatus, events, searchTerm]);

  const highlightText = (value) => {
    if (!searchTerm.trim()) return value;

    const regex = new RegExp(`(${escapeRegExp(searchTerm.trim())})`, "gi");

    return String(value)
      .split(regex)
      .map((part, i) =>
        part.toLowerCase() === searchTerm.trim().toLowerCase() ? (
          <mark className="event-search-highlight" key={`${part}-${i}`}>
            {part}
          </mark>
        ) : (
          part
        )
      );
  };

  const openCreate = () => {
    navigate("/events/create");
  };

  const openEdit = (event) => {
    setEditEvent(event);
    form.setFieldsValue(event);
    setCreateOpen(true);
  };

  const handleSave = (values) => {
    const clean = { ...values, members: Number(values.members || 0) };

    if (editEvent) {
      setEvents((prev) =>
        prev.map((e) => (e.id === editEvent.id ? { ...e, ...clean } : e))
      );
      message.success("Event updated");
    }

    setCreateOpen(false);
    setEditEvent(null);
    form.resetFields();
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      message.success("Events refreshed");
    }, 650);
  };

  const copyEventToClipboard = async (event) => {
    const text = [
      `Event: ${event.name}`,
      `Date: ${event.date}`,
      `Time: ${event.time}`,
      `Address: ${event.address}, ${event.city}`,
      `Customer: ${event.customer}`,
      `Status: ${event.status}`,
      `Stage: ${event.pipeline}`,
      `Assigned Members: ${event.members}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      message.success("Event copied to clipboard");
    } catch {
      message.error("Clipboard permission is not available");
    }
  };

  const handleAssignSave = (assignedList) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === assignEvent?.id ? { ...e, members: assignedList.length } : e
      )
    );
    setAssignEvent(null);
  };

  const renderStatus = (status) => {
    const meta = statusMeta[status] || statusMeta.DRAFT;

    return (
      <Tag
        className="event-status-tag"
        style={{ "--tag-color": meta.color, "--tag-bg": meta.bg }}
      >
        {meta.icon}
        {status}
      </Tag>
    );
  };

  const renderPipeline = (pipeline) => (
    <Tag
      className="event-pipeline-tag"
      style={{ "--pipeline-color": pipelineColor[pipeline] || "#93c5fd" }}
    >
      {pipeline}
    </Tag>
  );

  const filterMenu = (
    <div className="event-filter-popover">
      {["All", ...statuses].map((status) => (
        <button
          type="button"
          key={status}
          className={activeStatus === status ? "active" : ""}
          onClick={() => {
            setActiveStatus(status);
            setFilterOpen(false);
          }}
        >
          {status === "All" ? <AppstoreOutlined /> : statusMeta[status].icon}
          <span>{counts[status] || 0}</span>
        </button>
      ))}
    </div>
  );

  const columns = [
    {
      title: "Event Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: 190,
      render: (text, record) => (
        <button
          type="button"
          className="event-name-cell"
          onClick={() => setViewEvent(record)}
        >
          <Avatar src={record.image} className="event-name-avatar">
            {record.name.charAt(0)}
          </Avatar>
          <span>
            <strong>{highlightText(text)}</strong>
            <small>{record.type}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      sorter: (a, b) => a.date.localeCompare(b.date),
      width: 128,
      render: (t) => <span className="event-soft-cell">{highlightText(t)}</span>,
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
      width: 104,
      render: (t) => <span className="event-soft-cell">{highlightText(t)}</span>,
    },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      width: 180,
      render: (t) => <span className="event-soft-cell">{highlightText(t)}</span>,
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      width: 134,
      render: (t) => <span className="event-soft-cell">{highlightText(t)}</span>,
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      width: 130,
      render: (t) => <span className="event-soft-cell">{highlightText(t)}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 108,
      render: renderStatus,
    },
    {
      title: "Stage",
      dataIndex: "pipeline",
      key: "pipeline",
      width: 118,
      render: renderPipeline,
    },
    {
      title: "Assigned Members",
      dataIndex: "members",
      key: "members",
      width: 150,
      render: (members) => (
        <Tag className="event-member-tag">
          <TeamOutlined />
          {members}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      fixed: "right",
      width: 92,
      render: (_, record) => (
        <Space size={4} className="event-row-actions">
          <Tooltip title="Assign members">
            <Button
              type="text"
              icon={<TeamOutlined />}
              className="event-action-btn assign"
              onClick={() => setAssignEvent(record)}
            />
          </Tooltip>
          <Tooltip title="Copy to clipboard">
            <Button
              type="text"
              icon={<CopyOutlined />}
              className="event-action-btn copy"
              onClick={() => copyEventToClipboard(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (assignEvent) {
    return (
      <ConfigProvider
        theme={{ token: { colorPrimary: "#3b82f6", borderRadius: 8 } }}
      >
        <TeamAssignmentPage
          event={assignEvent}
          onPrevious={() => setAssignEvent(null)}
          onNext={handleAssignSave}
        />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      theme={{ token: { colorPrimary: "#3b82f6", borderRadius: 8 } }}
    >
      <main className="event-page">
        <section className="event-hero">
          <div className="event-hero-copy">
            <span className="event-hero-pill">
              <CalendarOutlined />
              Event board
            </span>
            <Title level={2}>Events</Title>
            <Text>
              Plan bookings, customers, city, stage and assigned members in one
              transparent workspace.
            </Text>
            <div className="event-hero-actions">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="event-hero-create"
                onClick={openCreate}
              >
                Create Event
              </Button>
              <Tooltip title="Refresh">
                <Button
                  type="text"
                  icon={<ReloadOutlined spin={isLoading} />}
                  className="event-hero-refresh"
                  onClick={handleRefresh}
                />
              </Tooltip>
            </div>
          </div>

          <div className="event-hero-art" aria-hidden="true">
            {initialEvents.slice(0, 3).map((e, i) => (
              <img
                key={e.id}
                src={e.image}
                alt=""
                className={`event-hero-photo photo-${i + 1}`}
              />
            ))}
            <span className="event-hero-orbit orbit-one" />
            <span className="event-hero-orbit orbit-two" />
          </div>
        </section>

        <section className="event-panel">
          <div className="event-toolbar">
            <Space size={10} wrap>
              <Input
                allowClear
                className="event-search"
                placeholder="Search events..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <Popover
                open={filterOpen}
                onOpenChange={setFilterOpen}
                content={filterMenu}
                trigger="click"
                placement="bottomLeft"
              >
                <Tooltip title="Filter">
                  <Button
                    type="text"
                    icon={<FilterOutlined />}
                    className="event-tool-btn"
                  />
                </Tooltip>
              </Popover>

              <Tooltip title="Refresh">
                <Button
                  type="text"
                  icon={<ReloadOutlined spin={isLoading} />}
                  className="event-tool-btn"
                  onClick={handleRefresh}
                />
              </Tooltip>

              <div className="event-view-toggle">
                <Tooltip title="Table view">
                  <button
                    type="button"
                    className={viewMode === "table" ? "active" : ""}
                    onClick={() => setViewMode("table")}
                  >
                    <TableOutlined />
                  </button>
                </Tooltip>
                <Tooltip title="Card view">
                  <button
                    type="button"
                    className={viewMode === "cards" ? "active" : ""}
                    onClick={() => setViewMode("cards")}
                  >
                    <UnorderedListOutlined />
                  </button>
                </Tooltip>
              </div>
            </Space>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="event-create-btn"
              onClick={openCreate}
            >
              Create Event
            </Button>
          </div>

          <div className="event-chip-row">
            {["All", ...statuses].map((status) => (
              <Tooltip title={status} key={status}>
                <button
                  type="button"
                  className={`event-status-chip ${
                    activeStatus === status ? "active" : ""
                  }`}
                  onClick={() => setActiveStatus(status)}
                >
                  {status === "All" ? (
                    <AppstoreOutlined />
                  ) : (
                    statusMeta[status].icon
                  )}
                  <b>{counts[status] || 0}</b>
                </button>
              </Tooltip>
            ))}
          </div>

          {viewMode === "table" ? (
            <Table
              columns={columns}
              dataSource={filteredEvents}
              pagination={false}
              rowKey="id"
              className="event-table"
              scroll={{ x: 1380 }}
              locale={{
                emptyText: (
                  <Empty
                    description="No matching events"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          ) : (
            <div className="event-card-grid">
              {filteredEvents.map((event) => (
                <article className="event-card" key={event.id}>
                  <img src={event.image} alt={event.name} />
                  <div className="event-card-body">
                    <span>{event.type}</span>
                    <h3>{event.name}</h3>
                    <p>
                      <CalendarOutlined /> {event.date} at {event.time}
                    </p>
                    <p>
                      <EnvironmentOutlined /> {event.city}
                    </p>
                    <div className="event-card-footer">
                      {renderStatus(event.status)}
                      <Space size={4}>
                        <Tooltip title="Assign members">
                          <Button
                            type="text"
                            icon={<TeamOutlined />}
                            onClick={() => setAssignEvent(event)}
                          />
                        </Tooltip>
                        <Tooltip title="Copy to clipboard">
                          <Button
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={() => copyEventToClipboard(event)}
                          />
                        </Tooltip>
                      </Space>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <Modal
          open={!!viewEvent}
          onCancel={() => setViewEvent(null)}
          footer={null}
          width={680}
          title={null}
          centered
          className="event-modal event-view-modal"
        >
          {viewEvent && (
            <div className="event-view-shell">
              <div className="event-view-cover">
                <img src={viewEvent.image} alt={viewEvent.name} />
                <div>
                  {renderStatus(viewEvent.status)}
                  <h2>{viewEvent.name}</h2>
                  <p>{viewEvent.type}</p>
                </div>
              </div>

              <div className="event-view-grid">
                <InfoTile
                  icon={<CalendarOutlined />}
                  label="Date"
                  value={viewEvent.date}
                />
                <InfoTile
                  icon={<ClockCircleOutlined />}
                  label="Time"
                  value={viewEvent.time}
                />
                <InfoTile
                  icon={<EnvironmentOutlined />}
                  label="City"
                  value={viewEvent.city}
                />
                <InfoTile
                  icon={<TeamOutlined />}
                  label="Members"
                  value={viewEvent.members}
                />
              </div>

              <div className="event-view-location">
                <small>Address</small>
                <strong>{viewEvent.address}</strong>
                <span>
                  {viewEvent.customer} - {viewEvent.budget}
                </span>
              </div>

              <div className="event-modal-actions">
                <Button onClick={() => setViewEvent(null)}>Close</Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => {
                    const selectedEvent = viewEvent;
                    setViewEvent(null);
                    openEdit(selectedEvent);
                  }}
                >
                  Edit Event
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          open={createOpen}
          onCancel={() => {
            setCreateOpen(false);
            setEditEvent(null);
          }}
          footer={null}
          width={700}
          title={null}
          centered
          className="event-modal"
        >
          <div className="event-modal-shell">
            <div className="event-modal-heading">
              <Avatar className="event-modal-avatar">
                <EditOutlined />
              </Avatar>
              <div>
                <Title level={3}>Edit Event</Title>
                <Text>Update the event details.</Text>
              </div>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSave}>
              <div className="event-form-grid">
                <Form.Item
                  name="name"
                  label="Event Name"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="John - Wedding" />
                </Form.Item>

                <Form.Item
                  name="customer"
                  label="Customer"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Apsi" />
                </Form.Item>

                <Form.Item
                  name="date"
                  label="Date"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Jun 16, 2026" />
                </Form.Item>

                <Form.Item
                  name="time"
                  label="Time"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="12:00 AM" />
                </Form.Item>

                <Form.Item name="type" label="Event Type">
                  <Select
                    options={eventTypes.map((t) => ({ value: t, label: t }))}
                  />
                </Form.Item>

                <Form.Item name="status" label="Status">
                  <Select
                    options={statuses.map((s) => ({ value: s, label: s }))}
                  />
                </Form.Item>

                <Form.Item name="pipeline" label="Stage">
                  <Select
                    options={["Converted", "Booked", "Proposal", "Delivered"].map(
                      (s) => ({ value: s, label: s })
                    )}
                  />
                </Form.Item>

                <Form.Item name="members" label="Assigned Members">
                  <Input type="number" min={0} />
                </Form.Item>

                <Form.Item name="budget" label="Budget">
                  <Input placeholder="INR 1.8L" />
                </Form.Item>

                <Form.Item
                  name="city"
                  label="City"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="coimbatore" />
                </Form.Item>

                <Form.Item
                  name="address"
                  label="Address"
                  rules={[{ required: true }]}
                  className="event-form-wide"
                >
                  <Input placeholder="mettupalayam" />
                </Form.Item>

                <Form.Item
                  name="image"
                  label="Image URL"
                  className="event-form-wide"
                >
                  <Input placeholder="https://..." />
                </Form.Item>
              </div>

              <div className="event-modal-actions">
                <Button
                  onClick={() => {
                    setCreateOpen(false);
                    setEditEvent(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" icon={<EditOutlined />}>
                  Save Event
                </Button>
              </div>
            </Form>
          </div>
        </Modal>
      </main>
    </ConfigProvider>
  );
}

const InfoTile = ({ icon, label, value }) => (
  <div className="event-info-tile">
    <span>{icon}</span>
    <small>{label}</small>
    <strong>{value}</strong>
  </div>
);
