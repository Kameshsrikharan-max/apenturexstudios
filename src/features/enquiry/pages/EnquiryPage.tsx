import { useMemo, useState } from "react";
import {
  Layout,
  Typography,
  Table,
  Input,
  Button,
  Space,
  ConfigProvider,
  Tag,
  Popover,
  Modal,
  message,
  Descriptions,
  Select,
  Form,
  Divider,
  Timeline,
  Tooltip,
  Progress,
  Empty,
} from "antd";

import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  MoreOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FireOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  MessageOutlined,
  TeamOutlined,
  CameraOutlined,
  InstagramOutlined,
  GlobalOutlined,
  GiftOutlined,
} from "@ant-design/icons";

import Sidebar from "../../../components/UI/Sidebar";
import "./EnquiryPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const imageFallback =
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80";

const initialEnquiries = [
  {
    id: "1",
    enquiryName: "Brand - Wedding",
    customerName: "Apsi",
    phone: "9597846525",
    eventDate: "May 31, 2026",
    status: "DRAFT",
    city: "Coimbatore",
    createdBy: "super admin",
    createdAt: "May 04, 2026",
    budget: "₹2,50,000",
    source: "Instagram",
    priority: "High",
    packageType: "Premium Wedding",
    nextFollowUp: "May 08, 2026",
    progress: 45,
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
    notes: "Client is interested in premium wedding coverage with candid team.",
    timeline: ["Enquiry created", "Budget discussed", "Awaiting follow-up"],
  },
  {
    id: "2",
    enquiryName: "John - Wedding",
    customerName: "Apsi",
    phone: "6560235894",
    eventDate: "May 07, 2026",
    status: "DRAFT",
    city: "Chennai",
    createdBy: "super admin",
    createdAt: "Apr 29, 2026",
    budget: "₹1,80,000",
    source: "Referral",
    priority: "Medium",
    packageType: "Classic Wedding",
    nextFollowUp: "May 06, 2026",
    progress: 62,
    image:
      "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=900&q=80",
    notes: "Needs album, traditional photography, and candid event coverage.",
    timeline: ["Enquiry created", "Package shared", "Waiting for confirmation"],
  },
  {
    id: "3",
    enquiryName: "Priya - Engagement",
    customerName: "Priya",
    phone: "9845012458",
    eventDate: "Jun 12, 2026",
    status: "FOLLOWUP",
    city: "Bangalore",
    createdBy: "super admin",
    createdAt: "May 05, 2026",
    budget: "₹90,000",
    source: "Website",
    priority: "High",
    packageType: "Engagement Plus",
    nextFollowUp: "May 07, 2026",
    progress: 78,
    image:
      "https://images.unsplash.com/photo-1529634597503-139d3726fed5?auto=format&fit=crop&w=900&q=80",
    notes: "Highly interested. Wants cinematic teaser and couple portraits.",
    timeline: ["Enquiry created", "Call completed", "Follow-up scheduled"],
  },
];

const statusColors = {
  DRAFT: "default",
  NEW: "blue",
  FOLLOWUP: "gold",
  CONFIRMED: "green",
  CANCELLED: "red",
};

const sourceIcons = {
  Instagram: <InstagramOutlined />,
  Website: <GlobalOutlined />,
  Referral: <GiftOutlined />,
};

const EnquiryPage = () => {
  const [enquiriesData, setEnquiriesData] = useState(initialEnquiries);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [viewEnquiry, setViewEnquiry] = useState(null);
  const [journeyEnquiry, setJourneyEnquiry] = useState(null);
  const [editEnquiry, setEditEnquiry] = useState(null);
  const [deleteEnquiry, setDeleteEnquiry] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const cities = useMemo(
    () => ["ALL", ...new Set(enquiriesData.map((item) => item.city))],
    [enquiriesData]
  );

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return enquiriesData.filter((enq) => {
      const matchesSearch = Object.values(enq).some((val) =>
        String(val).toLowerCase().includes(term)
      );

      return (
        matchesSearch &&
        (statusFilter === "ALL" || enq.status === statusFilter) &&
        (cityFilter === "ALL" || enq.city === cityFilter) &&
        (priorityFilter === "ALL" || enq.priority === priorityFilter)
      );
    });
  }, [enquiriesData, searchTerm, statusFilter, cityFilter, priorityFilter]);

  const stats = useMemo(
    () => ({
      total: enquiriesData.length,
      highPriority: enquiriesData.filter((i) => i.priority === "High").length,
      followUps: enquiriesData.filter((i) => i.status === "FOLLOWUP").length,
      confirmed: enquiriesData.filter((i) => i.status === "CONFIRMED").length,
    }),
    [enquiriesData]
  );

  const handleRefresh = () => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      message.success("Enquiries refreshed successfully");
    }, 700);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setCityFilter("ALL");
    setPriorityFilter("ALL");
  };

  const updateStatus = (record, status) => {
    setEnquiriesData((prev) =>
      prev.map((item) => (item.id === record.id ? { ...item, status } : item))
    );

    message.success(`Enquiry marked as ${status}`);
  };

  const confirmDelete = (record) => {
    setEnquiriesData((prev) => prev.filter((item) => item.id !== record.id));
    setDeleteEnquiry(null);
    message.success("Enquiry deleted successfully");
  };

  const handleBulkDelete = () => {
    if (!selectedRowKeys.length) {
      message.warning("Please select enquiries");
      return;
    }

    Modal.confirm({
      title: "Delete Selected Enquiries?",
      content: `${selectedRowKeys.length} enquiries will be deleted.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => {
        setEnquiriesData((prev) =>
          prev.filter((item) => !selectedRowKeys.includes(item.id))
        );
        setSelectedRowKeys([]);
      },
    });
  };

  const openEditModal = (record) => {
    setEditEnquiry(record);
    setIsCreateOpen(false);
    form.setFieldsValue(record);
  };

  const openCreateModal = () => {
    setEditEnquiry(null);
    setIsCreateOpen(true);
    form.resetFields();

    form.setFieldsValue({
      status: "DRAFT",
      priority: "Medium",
      progress: 10,
      image: imageFallback,
    });
  };

  const closeFormModal = () => {
    setEditEnquiry(null);
    setIsCreateOpen(false);
    form.resetFields();
  };

  const handleSaveEnquiry = () => {
    form.validateFields().then((values) => {
      if (editEnquiry) {
        setEnquiriesData((prev) =>
          prev.map((item) =>
            item.id === editEnquiry.id ? { ...item, ...values } : item
          )
        );

        message.success("Enquiry updated");
      } else {
        const newEnquiry = {
          ...values,
          id: Date.now().toString(),
          createdBy: "super admin",
          createdAt: "May 08, 2026",
          timeline: ["Enquiry created"],
        };

        setEnquiriesData((prev) => [newEnquiry, ...prev]);
        message.success("Enquiry created successfully");
      }

      closeFormModal();
    });
  };

  const columns = [
    {
      title: "Enquiry",
      dataIndex: "enquiryName",
      key: "enquiryName",
      width: 430,
      render: (text, record) => (
        <Popover
          trigger={["hover", "click"]}
          placement="rightTop"
          overlayClassName="enquiry-action-popover"
          content={
            <div className="action-panel">
              <Tooltip title="View enquiry details" color="#ffffff">
                <button onClick={() => setViewEnquiry(record)}>
                  <EyeOutlined />
                  <span>View</span>
                </button>
              </Tooltip>

              <Tooltip title="Edit enquiry information" color="#ffffff">
                <button onClick={() => openEditModal(record)}>
                  <EditOutlined />
                  <span>Edit</span>
                </button>
              </Tooltip>

              <Tooltip title="Open enquiry journey" color="#ffffff">
                <button onClick={() => setJourneyEnquiry(record)}>
                  <ClockCircleOutlined />
                  <span>Journey</span>
                </button>
              </Tooltip>

              <Tooltip title="Mark this enquiry as confirmed" color="#ffffff">
                <button onClick={() => updateStatus(record, "CONFIRMED")}>
                  <CheckCircleOutlined />
                  <span>Confirm</span>
                </button>
              </Tooltip>

              <Tooltip title="Delete this enquiry" color="#ffffff">
                <button className="danger" onClick={() => setDeleteEnquiry(record)}>
                  <DeleteOutlined />
                  <span>Delete</span>
                </button>
              </Tooltip>
            </div>
          }
        >
          <div className="enquiry-image-card">
            <div className="enquiry-photo-wrap">
              <img
                className="enquiry-photo"
                src={record.image || imageFallback}
                alt={record.enquiryName}
                onError={(e) => {
                  e.currentTarget.src = imageFallback;
                }}
              />
            </div>

            <div className="enquiry-card-info">
              <div className="card-title-row">
                <Tooltip title={record.enquiryName} color="#ffffff">
                  <strong>{text}</strong>
                </Tooltip>

                <Tooltip title="Quick actions" color="#ffffff">
                  <MoreOutlined className="more-icon" />
                </Tooltip>
              </div>

              <span className="package-line">
                <CameraOutlined /> {record.packageType}
              </span>

              <div className="tiny-meta">
                <span>
                  <CalendarOutlined /> {record.eventDate}
                </span>
                <span>
                  <EnvironmentOutlined /> {record.city}
                </span>
              </div>
            </div>
          </div>
        </Popover>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
      render: (text, record) => (
        <Tooltip title={`Customer: ${text}`} color="#ffffff">
          <div className="compact-cell">
            <UserOutlined />
            <div>
              <strong>{text}</strong>
              <span>
                {sourceIcons[record.source] || <MessageOutlined />} {record.source}
              </span>
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (text) => (
        <Tooltip title={`Call ${text}`} color="#ffffff">
          <Space>
            <PhoneOutlined />
            {text}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Budget",
      dataIndex: "budget",
      key: "budget",
      render: (budget, record) => (
        <Tooltip title={`Booking progress ${record.progress || 0}%`} color="#ffffff">
          <div className="budget-cell">
            <strong>
              <DollarOutlined /> {budget}
            </strong>
            <Progress percent={record.progress || 0} size="small" showInfo={false} />
          </div>
        </Tooltip>
      ),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority) => (
        <Tooltip title={`${priority} priority enquiry`} color="#ffffff">
          <span className={`priority-chip priority-${priority?.toLowerCase()}`}>
            <FireOutlined /> {priority}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tooltip title={`Current status: ${status}`} color="#ffffff">
          <Tag color={statusColors[status]}>{status}</Tag>
        </Tooltip>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#38bdf8",
          borderRadius: 14,
        },
      }}
    >
      <Layout className="enquiry-page">
        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell enquiry-shell">
            <Header className="dashboard-navbar enquiry-navbar">
              <Title level={3} className="page-title enquiry-title">
                Enquiries
              </Title>
            </Header>

            <Content className="content-area enquiry-content">
              <div className="enquiry-page-scroll">
                <div className="enquiry-page-inner">
                  <section className="hero-section">
                    <div className="hero-copy">
                      <span className="hero-pill">
                        <CameraOutlined /> Creative Lead Board
                      </span>

                      <Title level={2}>Event Enquiries</Title>

                      <Text>
                        Track enquiry photos, customers, follow-ups, city, budget and
                        booking status in one visual workspace.
                      </Text>

                      <div className="hero-buttons">
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          size="large"
                          onClick={openCreateModal}
                        >
                          New Enquiry
                        </Button>

                        <Tooltip title="Refresh enquiries" color="#ffffff">
                          <Button
                            icon={<ReloadOutlined spin={isLoading} />}
                            size="large"
                            onClick={handleRefresh}
                          />
                        </Tooltip>
                      </div>
                    </div>

                    <div className="hero-image-stack">
                      {enquiriesData.slice(0, 3).map((item) => (
                        <Tooltip
                          key={item.id}
                          title={item.enquiryName}
                          color="#ffffff"
                        >
                          <img
                            src={item.image || imageFallback}
                            alt={item.enquiryName}
                            onError={(e) => {
                              e.currentTarget.src = imageFallback;
                            }}
                          />
                        </Tooltip>
                      ))}
                    </div>
                  </section>

                  <section className="stats-row">
                    <Tooltip title="Total enquiries" color="#ffffff">
                      <div className="stat-card">
                        <FileTextOutlined className="stat-icon blue" />
                        <strong>{stats.total}</strong>
                        <span>Total</span>
                      </div>
                    </Tooltip>

                    <Tooltip title="High priority enquiries" color="#ffffff">
                      <div className="stat-card">
                        <FireOutlined className="stat-icon orange" />
                        <strong>{stats.highPriority}</strong>
                        <span>Hot Leads</span>
                      </div>
                    </Tooltip>

                    <Tooltip title="Follow-up enquiries" color="#ffffff">
                      <div className="stat-card">
                        <ClockCircleOutlined className="stat-icon yellow" />
                        <strong>{stats.followUps}</strong>
                        <span>Follow-ups</span>
                      </div>
                    </Tooltip>

                    <Tooltip title="Confirmed bookings" color="#ffffff">
                      <div className="stat-card">
                        <CheckCircleOutlined className="stat-icon green" />
                        <strong>{stats.confirmed}</strong>
                        <span>Confirmed</span>
                      </div>
                    </Tooltip>
                  </section>

                  <section className="table-container">
                    <div className="toolbar">
                      <Space wrap>
                        <Input
                          className="enquiry-search"
                          placeholder="Search enquiries..."
                          prefix={<SearchOutlined />}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          allowClear
                        />

                        <Select
                          className="filter-select"
                          value={statusFilter}
                          onChange={setStatusFilter}
                          options={[
                            { value: "ALL", label: "All Status" },
                            { value: "DRAFT", label: "Draft" },
                            { value: "FOLLOWUP", label: "Follow-up" },
                            { value: "CONFIRMED", label: "Confirmed" },
                            { value: "CANCELLED", label: "Cancelled" },
                          ]}
                        />

                        <Select
                          className="filter-select"
                          value={cityFilter}
                          onChange={setCityFilter}
                          options={cities.map((city) => ({
                            value: city,
                            label: city === "ALL" ? "All Cities" : city,
                          }))}
                        />

                        <Select
                          className="filter-select"
                          value={priorityFilter}
                          onChange={setPriorityFilter}
                          options={[
                            { value: "ALL", label: "All Priority" },
                            { value: "High", label: "High" },
                            { value: "Medium", label: "Medium" },
                            { value: "Low", label: "Low" },
                          ]}
                        />

                        <Button onClick={clearFilters}>Clear</Button>
                      </Space>

                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        disabled={!selectedRowKeys.length}
                        onClick={handleBulkDelete}
                      >
                        
                      </Button>
                    </div>

                    <Table
                      className="enquiry-table"
                      columns={columns}
                      dataSource={filteredData}
                      rowKey="id"
                      loading={isLoading}
                      rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                      }}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1250 }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No matching enquiries"
                          />
                        ),
                      }}
                    />
                  </section>
                </div>
              </div>
            </Content>
          </Layout>
        </div>

        <Modal
          className="enquiry-modal"
          open={!!viewEnquiry}
          onCancel={() => setViewEnquiry(null)}
          footer={null}
          width={820}
          centered
        >
          {viewEnquiry && (
            <>
              <div className="modal-image-cover">
                <img
                  src={viewEnquiry.image || imageFallback}
                  alt={viewEnquiry.enquiryName}
                  onError={(e) => {
                    e.currentTarget.src = imageFallback;
                  }}
                />

                <div>
                  <Title level={3}>{viewEnquiry.enquiryName}</Title>
                  <Tag color={statusColors[viewEnquiry.status]}>
                    {viewEnquiry.status}
                  </Tag>
                </div>
              </div>

              <Divider />

              <Descriptions bordered column={2}>
                <Descriptions.Item label="Customer">
                  {viewEnquiry.customerName}
                </Descriptions.Item>

                <Descriptions.Item label="Phone">
                  {viewEnquiry.phone}
                </Descriptions.Item>

                <Descriptions.Item label="Event Date">
                  {viewEnquiry.eventDate}
                </Descriptions.Item>

                <Descriptions.Item label="Budget">
                  {viewEnquiry.budget}
                </Descriptions.Item>

                <Descriptions.Item label="City">
                  {viewEnquiry.city}
                </Descriptions.Item>

                <Descriptions.Item label="Source">
                  {viewEnquiry.source}
                </Descriptions.Item>

                <Descriptions.Item label="Package" span={2}>
                  {viewEnquiry.packageType}
                </Descriptions.Item>

                <Descriptions.Item label="Notes" span={2}>
                  {viewEnquiry.notes}
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Modal>

        <Modal
          className="enquiry-modal"
          open={!!journeyEnquiry}
          onCancel={() => setJourneyEnquiry(null)}
          footer={null}
          width={540}
          centered
        >
          {journeyEnquiry && (
            <>
              <Title level={5}>{journeyEnquiry.enquiryName} - Journey</Title>

              <Timeline
                items={journeyEnquiry.timeline.map((item) => ({
                  dot: <ThunderboltOutlined />,
                  children: item,
                }))}
              />
            </>
          )}
        </Modal>

        <Modal
          className="enquiry-modal"
          open={!!editEnquiry || isCreateOpen}
          onCancel={closeFormModal}
          onOk={handleSaveEnquiry}
          okText={editEnquiry ? "Save Changes" : "Create Enquiry"}
          title={editEnquiry ? "Edit Enquiry" : "Create New Enquiry"}
          width={840}
          centered
        >
          <Form form={form} layout="vertical">
            <div className="form-grid">
              <Form.Item
                name="enquiryName"
                label="Enquiry Name"
                rules={[{ required: true }]}
              >
                <Input prefix={<FileTextOutlined />} />
              </Form.Item>

              <Form.Item
                name="customerName"
                label="Customer Name"
                rules={[{ required: true }]}
              >
                <Input prefix={<UserOutlined />} />
              </Form.Item>

              <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                <Input prefix={<PhoneOutlined />} />
              </Form.Item>

              <Form.Item
                name="eventDate"
                label="Event Date"
                rules={[{ required: true }]}
              >
                <Input prefix={<CalendarOutlined />} />
              </Form.Item>

              <Form.Item name="status" label="Status">
                <Select
                  options={Object.keys(statusColors).map((k) => ({
                    value: k,
                    label: k,
                  }))}
                />
              </Form.Item>

              <Form.Item name="city" label="City">
                <Input prefix={<EnvironmentOutlined />} />
              </Form.Item>

              <Form.Item name="budget" label="Budget">
                <Input prefix={<DollarOutlined />} />
              </Form.Item>

              <Form.Item name="priority" label="Priority">
                <Select
                  options={[
                    { value: "High", label: "High" },
                    { value: "Medium", label: "Medium" },
                    { value: "Low", label: "Low" },
                  ]}
                />
              </Form.Item>

              <Form.Item name="source" label="Source">
                <Input prefix={<MessageOutlined />} />
              </Form.Item>

              <Form.Item name="packageType" label="Package Type">
                <Input prefix={<TeamOutlined />} />
              </Form.Item>

              <Form.Item name="progress" label="Progress">
                <Input type="number" min={0} max={100} />
              </Form.Item>

              <Form.Item name="image" label="Image URL">
                <Input />
              </Form.Item>
            </div>

            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={4} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          className="enquiry-modal"
          open={!!deleteEnquiry}
          onCancel={() => setDeleteEnquiry(null)}
          onOk={() => confirmDelete(deleteEnquiry)}
          okText="Delete"
          okButtonProps={{ danger: true }}
          centered
        >
          <p>Are you sure you want to delete this enquiry?</p>
        </Modal>
      </Layout>
    </ConfigProvider>
  );
};

export default EnquiryPage;