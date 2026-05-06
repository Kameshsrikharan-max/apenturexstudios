import React, { useMemo, useState } from "react";
import {
  Layout,
  Typography,
  Table,
  Input,
  Button,
  Space,
  ConfigProvider,
  Tag,
  Tooltip,
  Popover,
  Modal,
  message,
  Empty,
  Descriptions,
  Select,
  Form,
  Divider,
  Timeline,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  UserOutlined,
  PhoneOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ClearOutlined,
  ThunderboltOutlined,
  FireOutlined,
  MessageOutlined,
} from "@ant-design/icons";

import Sidebar from "../../../components/UI/Sidebar";
import "./EnquiryPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

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

const priorityColors = {
  High: "red",
  Medium: "gold",
  Low: "green",
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
    const term = searchTerm.trim().toLowerCase();

    return enquiriesData.filter((enq) => {
      const matchesSearch = Object.values(enq).some((val) =>
        String(val).toLowerCase().includes(term)
      );

      const matchesStatus =
        statusFilter === "ALL" || enq.status === statusFilter;

      const matchesCity = cityFilter === "ALL" || enq.city === cityFilter;

      const matchesPriority =
        priorityFilter === "ALL" || enq.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesCity && matchesPriority;
    });
  }, [enquiriesData, searchTerm, statusFilter, cityFilter, priorityFilter]);

  const stats = useMemo(() => {
    const highPriority = enquiriesData.filter(
      (item) => item.priority === "High"
    ).length;

    const followUps = enquiriesData.filter(
      (item) => item.status === "FOLLOWUP"
    ).length;

    return {
      total: enquiriesData.length,
      highPriority,
      followUps,
    };
  }, [enquiriesData]);

  const handleRefresh = () => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      message.success("Enquiries refreshed");
    }, 800);
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
    message.success(`${record.enquiryName} marked as ${status}`);
  };

  const confirmDelete = (record) => {
    setEnquiriesData((prev) => prev.filter((item) => item.id !== record.id));
    setSelectedRowKeys((prev) => prev.filter((key) => key !== record.id));
    setViewEnquiry(null);
    setJourneyEnquiry(null);
    setDeleteEnquiry(null);
    message.success("Enquiry deleted");
  };

  const handleBulkDelete = () => {
    if (!selectedRowKeys.length) {
      message.warning("Select enquiries first");
      return;
    }

    Modal.confirm({
      title: "Delete selected enquiries?",
      content: `${selectedRowKeys.length} selected enquiry item(s) will be removed.`,
      okText: "Delete selected",
      okButtonProps: { danger: true },
      centered: true,
      className: "bulk-delete-modal",
      onOk: () => {
        setEnquiriesData((prev) =>
          prev.filter((item) => !selectedRowKeys.includes(item.id))
        );
        setSelectedRowKeys([]);
        message.success("Selected enquiries deleted");
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
      source: "Instagram",
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
          id: String(Date.now()),
          createdBy: "super admin",
          createdAt: "May 06, 2026",
          timeline: ["Enquiry created", "Initial details captured"],
        };

        setEnquiriesData((prev) => [newEnquiry, ...prev]);
        message.success("Enquiry created");
      }

      closeFormModal();
    });
  };

  const columns = [
    {
      title: "Enquiry Name",
      dataIndex: "enquiryName",
      key: "enquiryName",
      width: 270,
      render: (text, record) => (
        <div className="enquiry-name-cell">
          <div className="enquiry-avatar">
            {record.customerName?.charAt(0)?.toUpperCase()}
          </div>

          <div>
            <button
              className="enquiry-link"
              type="button"
              onClick={() => setViewEnquiry(record)}
            >
              {text}
            </button>
            <Text className="enquiry-subtext">{record.packageType}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Customer Name",
      dataIndex: "customerName",
      key: "customerName",
      width: 180,
      render: (text) => (
        <Space>
          <UserOutlined className="muted-icon" />
          {text}
        </Space>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 150,
      render: (text) => (
        <Space>
          <PhoneOutlined className="muted-icon" />
          {text}
        </Space>
      ),
    },
    {
      title: "Event Date",
      dataIndex: "eventDate",
      key: "eventDate",
      width: 160,
      sorter: (a, b) => new Date(a.eventDate) - new Date(b.eventDate),
      render: (text) => (
        <Space>
          <CalendarOutlined className="date-icon" />
          {text}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => (
        <Tag color={statusColors[status]} className="status-pill">
          {status}
        </Tag>
      ),
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      width: 150,
      render: (text) => (
        <Space>
          <EnvironmentOutlined className="city-icon" />
          {text}
        </Space>
      ),
    },
    {
      title: "Created By",
      dataIndex: "createdBy",
      key: "createdBy",
      width: 160,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
    },
    {
      title: "Actions",
      key: "actions",
      width: 170,
      fixed: "right",
      className: "transparent-action-column",
      render: (_, record) => {
        const actionMenu = (
          <div className="action-popover">
            <button type="button" onClick={() => setViewEnquiry(record)}>
              <EyeOutlined /> View details
            </button>
            <button type="button" onClick={() => setJourneyEnquiry(record)}>
              <MessageOutlined /> View journey
            </button>
            <button type="button" onClick={() => openEditModal(record)}>
              <EditOutlined /> Edit enquiry
            </button>
            <button type="button" onClick={() => updateStatus(record, "CONFIRMED")}>
              <CheckCircleOutlined /> Mark confirmed
            </button>
            <button
              type="button"
              className="danger-action"
              onClick={() => setDeleteEnquiry(record)}
            >
              <DeleteOutlined /> Delete
            </button>
          </div>
        );

        return (
          <Space size={8} className="action-button-wrap">
            <Tooltip title="View">
              <Button
                className="glass-action-btn glow-btn"
                icon={<EyeOutlined />}
                onClick={() => setViewEnquiry(record)}
              />
            </Tooltip>

            <Tooltip title="Edit">
              <Button
                className="glass-action-btn glow-btn"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
              />
            </Tooltip>

            <Popover content={actionMenu} trigger="click" placement="bottomRight">
              <Button className="glass-action-btn glow-btn" icon={<MoreOutlined />} />
            </Popover>
          </Space>
        );
      },
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#38bdf8",
          borderRadius: 12,
          fontFamily: "Inter, system-ui, sans-serif",
        },
      }}
    >
      <Layout className="dashboard-page dashboard-dark enquiry-page">
        <div className="enquiry-aurora enquiry-aurora-one" />
        <div className="enquiry-aurora enquiry-aurora-two" />

        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell">
            <Header className="dashboard-navbar enquiry-navbar">
              <div className="dashboard-brand">
                <Title level={3} className="dashboard-title enquiry-title">
                  Enquiry
                </Title>
                <Text className="enquiry-subtitle">
                  Manage leads, event details, and booking potential.
                </Text>
              </div>
            </Header>

            <Content className="dashboard-content enquiry-content">
              <div className="enquiry-hero">
                <div>
                  <Tag className="live-tag">
                    <ThunderboltOutlined />
                    Apenture Enquiry System
                  </Tag>

                  <Title level={2}>Event Enquiries</Title>

                  <Text>
                    Track event enquiries, prioritize high-value leads, and move
                    clients from first call to confirmed booking.
                  </Text>
                </div>
              </div>

              <div className="glass-flip-stats">
                <div className="glass-flip-card total-card">
                  <div className="glass-flip-inner">
                    <div className="glass-flip-face glass-flip-front">
                      <div className="glass-icon">
                        <FileTextOutlined />
                      </div>
                      <h3>Total Enquiries</h3>
                      <p>All incoming studio leads</p>
                    </div>
                    <div className="glass-flip-face glass-flip-back">
                      <strong>{stats.total}</strong>
                      <span>enquiries captured</span>
                    </div>
                  </div>
                </div>

                <div className="glass-flip-card priority-card">
                  <div className="glass-flip-inner">
                    <div className="glass-flip-face glass-flip-front">
                      <div className="glass-icon">
                        <FireOutlined />
                      </div>
                      <h3>High Priority</h3>
                      <p>Leads needing attention</p>
                    </div>
                    <div className="glass-flip-face glass-flip-back">
                      <strong>{stats.highPriority}</strong>
                      <span>priority leads</span>
                    </div>
                  </div>
                </div>

                <div className="glass-flip-card followup-card">
                  <div className="glass-flip-inner">
                    <div className="glass-flip-face glass-flip-front">
                      <div className="glass-icon">
                        <ClockCircleOutlined />
                      </div>
                      <h3>Follow-ups</h3>
                      <p>Conversations still active</p>
                    </div>
                    <div className="glass-flip-face glass-flip-back">
                      <strong>{stats.followUps}</strong>
                      <span>active follow-ups</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="table-wrapper animated-panel">
                <div className="review-toolbar user-toolbar-inline">
                  <Space size="middle" wrap>
                    <Input
                      placeholder="Search enquiries, city, source, phone..."
                      prefix={<SearchOutlined />}
                      className="review-search"
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
                        { value: "NEW", label: "New" },
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

                    <Tooltip title="Clear filters">
                      <Button
                        className="toolbar-glow-btn"
                        icon={<ClearOutlined />}
                        onClick={clearFilters}
                      />
                    </Tooltip>

                    <Tooltip title="Refresh enquiries">
                      <Button
                        className="toolbar-glow-btn"
                        icon={<ReloadOutlined spin={isLoading} />}
                        onClick={handleRefresh}
                      />
                    </Tooltip>
                  </Space>

                  <Space wrap>
                    <Button
                      danger
                      ghost
                      className="danger-glass-btn"
                      icon={<DeleteOutlined />}
                      disabled={!selectedRowKeys.length}
                      onClick={handleBulkDelete}
                    >
                      Delete Selected
                    </Button>

                    <Button
                      type="primary"
                      className="create-glow-btn"
                      icon={<PlusOutlined />}
                      onClick={openCreateModal}
                    >
                      Create Enquiry
                    </Button>
                  </Space>
                </div>

                <Table
                  className="review-table enquiry-table"
                  columns={columns}
                  dataSource={filteredData}
                  pagination={{
                    pageSize: 8,
                    showSizeChanger: false,
                  }}
                  rowKey="id"
                  loading={isLoading}
                  scroll={{ x: 1380 }}
                  rowSelection={{
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                  }}
                  locale={{
                    emptyText: (
                      <Empty
                        description="No enquiries found"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ),
                  }}
                />
              </div>
            </Content>
          </Layout>
        </div>

        <Modal
          open={!!viewEnquiry}
          onCancel={() => setViewEnquiry(null)}
          footer={null}
          width={720}
          centered
          title="Enquiry Details"
          className="enquiry-modal view-enquiry-modal"
        >
          {viewEnquiry && (
            <>
              <div className="modal-head">
                <div className="drawer-avatar">
                  {viewEnquiry.customerName?.charAt(0)?.toUpperCase()}
                </div>

                <div>
                  <Title level={4}>{viewEnquiry.enquiryName}</Title>
                  <Text>{viewEnquiry.notes}</Text>
                </div>
              </div>

              <Divider />

              <Descriptions bordered column={1} size="middle">
                <Descriptions.Item label="Customer">
                  {viewEnquiry.customerName}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">{viewEnquiry.phone}</Descriptions.Item>
                <Descriptions.Item label="Event Date">
                  {viewEnquiry.eventDate}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={statusColors[viewEnquiry.status]}>
                    {viewEnquiry.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="City">{viewEnquiry.city}</Descriptions.Item>
                <Descriptions.Item label="Created By">
                  {viewEnquiry.createdBy}
                </Descriptions.Item>
                <Descriptions.Item label="Created At">
                  {viewEnquiry.createdAt}
                </Descriptions.Item>
                <Descriptions.Item label="Budget">{viewEnquiry.budget}</Descriptions.Item>
                <Descriptions.Item label="Package">
                  {viewEnquiry.packageType}
                </Descriptions.Item>
                <Descriptions.Item label="Source">
                  {viewEnquiry.source}
                </Descriptions.Item>
                <Descriptions.Item label="Priority">
                  <Tag color={priorityColors[viewEnquiry.priority]}>
                    {viewEnquiry.priority}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Next Follow-up">
                  {viewEnquiry.nextFollowUp}
                </Descriptions.Item>
              </Descriptions>

              <div className="modal-actions">
                <Button onClick={() => setJourneyEnquiry(viewEnquiry)}>
                  View Journey
                </Button>
                <Button onClick={() => openEditModal(viewEnquiry)}>
                  Edit Enquiry
                </Button>
                <Button danger onClick={() => setDeleteEnquiry(viewEnquiry)}>
                  Delete
                </Button>
              </div>
            </>
          )}
        </Modal>

        <Modal
          open={!!journeyEnquiry}
          onCancel={() => setJourneyEnquiry(null)}
          footer={null}
          width={520}
          centered
          title="Enquiry Journey"
          className="enquiry-modal journey-enquiry-modal"
        >
          {journeyEnquiry && (
            <>
              <div className="journey-head">
                <h3>{journeyEnquiry.enquiryName}</h3>
                <p>{journeyEnquiry.customerName}</p>
                <Tag color={statusColors[journeyEnquiry.status]}>
                  {journeyEnquiry.status}
                </Tag>
              </div>

              <Divider />

              <Timeline
                items={journeyEnquiry.timeline.map((item) => ({
                  children: item,
                }))}
              />

              <Divider />

              <div className="journey-note">
                <strong>Next follow-up</strong>
                <span>{journeyEnquiry.nextFollowUp}</span>
              </div>
            </>
          )}
        </Modal>

        <Modal
          open={!!editEnquiry || isCreateOpen}
          onCancel={closeFormModal}
          onOk={handleSaveEnquiry}
          okText={editEnquiry ? "Save Changes" : "Create Enquiry"}
          title={editEnquiry ? "Edit Enquiry" : "Create Enquiry"}
          width={800}
          centered
          className={`enquiry-modal ${
            editEnquiry ? "edit-enquiry-modal" : "create-enquiry-modal"
          }`}
        >
          <Form form={form} layout="vertical" className="enquiry-form">
            <div className="form-grid">
              <Form.Item
                name="enquiryName"
                label="Enquiry Name"
                rules={[{ required: true, message: "Enter enquiry name" }]}
              >
                <Input placeholder="Example: Brand - Wedding" />
              </Form.Item>

              <Form.Item
                name="customerName"
                label="Customer Name"
                rules={[{ required: true, message: "Enter customer name" }]}
              >
                <Input placeholder="Customer name" />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Phone"
                rules={[{ required: true, message: "Enter phone number" }]}
              >
                <Input placeholder="Phone number" />
              </Form.Item>

              <Form.Item
                name="eventDate"
                label="Event Date"
                rules={[{ required: true, message: "Enter event date" }]}
              >
                <Input placeholder="May 31, 2026" />
              </Form.Item>

              <Form.Item name="status" label="Status">
                <Select
                  options={[
                    { value: "DRAFT", label: "Draft" },
                    { value: "NEW", label: "New" },
                    { value: "FOLLOWUP", label: "Follow-up" },
                    { value: "CONFIRMED", label: "Confirmed" },
                    { value: "CANCELLED", label: "Cancelled" },
                  ]}
                />
              </Form.Item>

              <Form.Item name="city" label="City">
                <Input placeholder="City" />
              </Form.Item>

              <Form.Item name="budget" label="Budget">
                <Input placeholder="₹2,50,000" />
              </Form.Item>

              <Form.Item name="packageType" label="Package Type">
                <Input placeholder="Premium Wedding" />
              </Form.Item>

              <Form.Item name="nextFollowUp" label="Next Follow-up">
                <Input placeholder="May 08, 2026" />
              </Form.Item>

              <Form.Item name="source" label="Source">
                <Select
                  options={[
                    { value: "Instagram", label: "Instagram" },
                    { value: "Referral", label: "Referral" },
                    { value: "Website", label: "Website" },
                    { value: "Walk-in", label: "Walk-in" },
                  ]}
                />
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
            </div>

            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={4} placeholder="Add enquiry notes..." />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          open={!!deleteEnquiry}
          onCancel={() => setDeleteEnquiry(null)}
          onOk={() => confirmDelete(deleteEnquiry)}
          okText="Delete"
          okButtonProps={{ danger: true }}
          centered
          title="Delete enquiry?"
          className="enquiry-modal delete-enquiry-modal"
        >
          {deleteEnquiry && (
            <Text>
              This will remove "{deleteEnquiry.enquiryName}" from the enquiry list.
            </Text>
          )}
        </Modal>
      </Layout>
    </ConfigProvider>
  );
};

export default EnquiryPage;

