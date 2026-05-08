import React, { useMemo, useState, useEffect } from "react";
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

  const cities = useMemo(() => ["ALL", ...new Set(enquiriesData.map(item => item.city))], [enquiriesData]);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return enquiriesData.filter(enq => {
      const matchesSearch = Object.values(enq).some(val => String(val).toLowerCase().includes(term));
      const matchesStatus = statusFilter === "ALL" || enq.status === statusFilter;
      const matchesCity = cityFilter === "ALL" || enq.city === cityFilter;
      const matchesPriority = priorityFilter === "ALL" || enq.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesCity && matchesPriority;
    });
  }, [enquiriesData, searchTerm, statusFilter, cityFilter, priorityFilter]);

  const stats = useMemo(() => ({
    total: enquiriesData.length,
    highPriority: enquiriesData.filter(i => i.priority === "High").length,
    followUps: enquiriesData.filter(i => i.status === "FOLLOWUP").length,
  }), [enquiriesData]);

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
    setEnquiriesData(prev => prev.map(item => item.id === record.id ? { ...item, status } : item));
    message.success(`Enquiry marked as ${status}`);
  };

  const confirmDelete = (record) => {
    setEnquiriesData(prev => prev.filter(item => item.id !== record.id));
    setDeleteEnquiry(null);
    message.success("Enquiry deleted successfully");
  };

  const handleBulkDelete = () => {
    if (!selectedRowKeys.length) return message.warning("Please select enquiries");
    Modal.confirm({
      title: "Delete Selected Enquiries?",
      content: `${selectedRowKeys.length} enquiries will be deleted.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => {
        setEnquiriesData(prev => prev.filter(item => !selectedRowKeys.includes(item.id)));
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
    form.setFieldsValue({ status: "DRAFT", priority: "Medium" });
  };

  const closeFormModal = () => {
    setEditEnquiry(null);
    setIsCreateOpen(false);
    form.resetFields();
  };

  const handleSaveEnquiry = () => {
    form.validateFields().then(values => {
      if (editEnquiry) {
        setEnquiriesData(prev => prev.map(item => item.id === editEnquiry.id ? { ...item, ...values } : item));
        message.success("Enquiry updated");
      } else {
        const newEnquiry = {
          ...values,
          id: Date.now().toString(),
          createdBy: "super admin",
          createdAt: "May 08, 2026",
          timeline: ["Enquiry created"],
        };
        setEnquiriesData(prev => [newEnquiry, ...prev]);
        message.success("Enquiry created successfully");
      }
      closeFormModal();
    });
  };

  const columns = [
    {
      title: "Enquiry Name",
      dataIndex: "enquiryName",
      key: "enquiryName",
      width: 280,
      render: (text, record) => (
        <div className="enquiry-name-cell">
          <div className="avatar">{record.customerName?.charAt(0)}</div>
          <div>
            <a className="enquiry-link" onClick={() => setViewEnquiry(record)}>{text}</a>
            <div className="package">{record.packageType}</div>
          </div>
        </div>
      ),
    },
    { title: "Customer", dataIndex: "customerName", key: "customerName", render: text => <Space><UserOutlined />{text}</Space> },
    { title: "Phone", dataIndex: "phone", key: "phone", render: text => <Space><PhoneOutlined />{text}</Space> },
    { title: "Event Date", dataIndex: "eventDate", key: "eventDate" },
    { title: "Status", dataIndex: "status", key: "status", render: status => <Tag color={statusColors[status]}>{status}</Tag> },
    { title: "City", dataIndex: "city", key: "city" },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="View"><Button icon={<EyeOutlined />} onClick={() => setViewEnquiry(record)} /></Tooltip>
          <Tooltip title="Edit"><Button icon={<EditOutlined />} onClick={() => openEditModal(record)} /></Tooltip>
          <Popover
            content={
              <div className="action-menu">
                <button onClick={() => setJourneyEnquiry(record)}>View Journey</button>
                <button onClick={() => updateStatus(record, "CONFIRMED")}>Mark Confirmed</button>
                <button className="delete-btn" onClick={() => setDeleteEnquiry(record)}>Delete</button>
              </div>
            }
            trigger="click"
          >
            <Button icon={<MoreOutlined />} />
          </Popover>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#3b82f6", borderRadius: 12 } }}>
      <Layout className="enquiry-page">
        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell">
            <Header className="dashboard-navbar">
              <Title level={3} className="page-title">Enquiries</Title>
            </Header>

            <Content className="content-area">
              <div className="hero-section">
                <div>
                  <Title level={2}>Event Enquiries</Title>
                  <Text type="secondary">Manage leads, track follow-ups and convert bookings</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreateModal}>
                  New Enquiry
                </Button>
              </div>

              <div className="stats-row">
                <div className="stat-card">
                  <FileTextOutlined className="stat-icon" />
                  <div><h3>{stats.total}</h3><p>Total Enquiries</p></div>
                </div>
                <div className="stat-card">
                  <FireOutlined className="stat-icon high" />
                  <div><h3>{stats.highPriority}</h3><p>High Priority</p></div>
                </div>
                <div className="stat-card">
                  <ClockCircleOutlined className="stat-icon" />
                  <div><h3>{stats.followUps}</h3><p>Follow-ups</p></div>
                </div>
              </div>

              <div className="table-container">
                <div className="toolbar">
                  <Space wrap>
                    <Input
                      placeholder="Search enquiries, customer, phone..."
                      prefix={<SearchOutlined />}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{ width: 340 }}
                      allowClear
                    />
                    <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 160 }}>
                      <Select.Option value="ALL">All Status</Select.Option>
                      <Select.Option value="DRAFT">Draft</Select.Option>
                      <Select.Option value="FOLLOWUP">Follow-up</Select.Option>
                      <Select.Option value="CONFIRMED">Confirmed</Select.Option>
                    </Select>
                    <Select value={cityFilter} onChange={setCityFilter} style={{ width: 160 }}>
                      {cities.map(city => <Select.Option key={city} value={city}>{city}</Select.Option>)}
                    </Select>
                    <Button onClick={clearFilters}>Clear</Button>
                    <Button icon={<ReloadOutlined spin={isLoading} />} onClick={handleRefresh}>Refresh</Button>
                  </Space>

                  <Button danger icon={<DeleteOutlined />} disabled={!selectedRowKeys.length} onClick={handleBulkDelete}>
                    Delete Selected
                  </Button>
                </div>

                <Table
                  columns={columns}
                  dataSource={filteredData}
                  rowKey="id"
                  loading={isLoading}
                  rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1200 }}
                />
              </div>
            </Content>
          </Layout>
        </div>

        {/* Modals */}
        <Modal open={!!viewEnquiry} onCancel={() => setViewEnquiry(null)} footer={null} width={720} centered>
          {viewEnquiry && (
            <>
              <Title level={4}>{viewEnquiry.enquiryName}</Title>
              <Divider />
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Customer">{viewEnquiry.customerName}</Descriptions.Item>
                <Descriptions.Item label="Phone">{viewEnquiry.phone}</Descriptions.Item>
                <Descriptions.Item label="Event Date">{viewEnquiry.eventDate}</Descriptions.Item>
                <Descriptions.Item label="Budget">{viewEnquiry.budget}</Descriptions.Item>
                <Descriptions.Item label="Status"><Tag color={statusColors[viewEnquiry.status]}>{viewEnquiry.status}</Tag></Descriptions.Item>
                <Descriptions.Item label="City">{viewEnquiry.city}</Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Modal>

        <Modal open={!!journeyEnquiry} onCancel={() => setJourneyEnquiry(null)} footer={null} width={500} centered>
          {journeyEnquiry && (
            <>
              <Title level={5}>{journeyEnquiry.enquiryName} - Journey</Title>
              <Timeline items={journeyEnquiry.timeline.map(item => ({ children: item }))} />
            </>
          )}
        </Modal>

        <Modal
          open={!!editEnquiry || isCreateOpen}
          onCancel={closeFormModal}
          onOk={handleSaveEnquiry}
          okText={editEnquiry ? "Save Changes" : "Create Enquiry"}
          title={editEnquiry ? "Edit Enquiry" : "Create New Enquiry"}
          width={800}
          centered
        >
          <Form form={form} layout="vertical">
            <div className="form-grid">
              <Form.Item name="enquiryName" label="Enquiry Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="customerName" label="Customer Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="eventDate" label="Event Date" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="status" label="Status">
                <Select options={Object.keys(statusColors).map(k => ({ value: k, label: k }))} />
              </Form.Item>
              <Form.Item name="city" label="City"><Input /></Form.Item>
              <Form.Item name="budget" label="Budget"><Input /></Form.Item>
              <Form.Item name="priority" label="Priority">
                <Select options={[{ value: "High", label: "High" }, { value: "Medium", label: "Medium" }, { value: "Low", label: "Low" }]} />
              </Form.Item>
            </div>
            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={4} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal open={!!deleteEnquiry} onCancel={() => setDeleteEnquiry(null)} onOk={() => confirmDelete(deleteEnquiry)} okText="Delete" okButtonProps={{ danger: true }} centered>
          <p>Are you sure you want to delete this enquiry?</p>
        </Modal>
      </Layout>
    </ConfigProvider>
  );
};

export default EnquiryPage;
