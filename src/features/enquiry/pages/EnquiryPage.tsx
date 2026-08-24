import { useEffect, useMemo, useState, type ReactNode } from "react";
import {Layout,Typography,Table,Input,Button,Space,ConfigProvider,Tag,Modal,message,Descriptions,Select,Form,Divider,Timeline,Tooltip,Empty,Avatar,} from "antd";
import type { ColumnsType } from "antd/es/table";

import {SearchOutlined,ReloadOutlined,PlusOutlined,EyeOutlined,EditOutlined,UserOutlined,PhoneOutlined,ClockCircleOutlined,FileTextOutlined,CalendarOutlined,EnvironmentOutlined,CheckCircleOutlined,ThunderboltOutlined,CameraOutlined,} from "@ant-design/icons";

import Sidebar from "../../../components/UI/Sidebar";
import DeleteButton from "../../../components/common/DeleteButton";
import "./EnquiryPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/*  Types  */


type EnquiryStatus = "DRAFT" | "NEW" | "FOLLOWUP" | "CONFIRMED" | "CANCELLED";

interface EnquiryRecord {
  id: string;
  enquiryName: string;
  customerName: string;
  phone: string;
  eventDate: string;
  status: EnquiryStatus;
  city: string;
  createdBy: string;
  createdAt: string;
  image?: string;
  notes?: string;
  timeline: string[];
}

interface EnquiryFormValues {
  enquiryName: string;
  customerName: string;
  phone: string;
  eventDate: string;
  status: EnquiryStatus;
  city: string;
  image?: string;
  notes?: string;
}


/*  Constants  */
const imageFallback =
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80";

const statusColors: Record<EnquiryStatus, string> = {
  DRAFT: "default",
  NEW: "blue",
  FOLLOWUP: "gold",
  CONFIRMED: "green",
  CANCELLED: "red",
};

const initialEnquiries: EnquiryRecord[] = [
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
    image:
      "https://images.unsplash.com/photo-1529634597503-139d3726fed5?auto=format&fit=crop&w=900&q=80",
    notes: "Highly interested. Wants cinematic teaser and couple portraits.",
    timeline: ["Enquiry created", "Call completed", "Follow-up scheduled"],
  },
];


interface EnquiryFormModalProps {
  open: boolean;
  width?: number;
  children: ReactNode;
}

const EnquiryFormModal = ({ open, width = 680, children }: EnquiryFormModalProps) => {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="enquiry-cm-backdrop">
      <div className="enquiry-cm-panel" style={{ maxWidth: width }}>
        {children}
      </div>
    </div>
  );
};


/*  EnquiryPage  */

const EnquiryPage = () => {
  const [enquiriesData, setEnquiriesData] = useState<EnquiryRecord[]>(initialEnquiries);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EnquiryStatus>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [viewEnquiry, setViewEnquiry] = useState<EnquiryRecord | null>(null);
  const [journeyEnquiry, setJourneyEnquiry] = useState<EnquiryRecord | null>(null);
  const [editEnquiry, setEditEnquiry] = useState<EnquiryRecord | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [form] = Form.useForm<EnquiryFormValues>();

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
        (cityFilter === "ALL" || enq.city === cityFilter)
      );
    });
  }, [enquiriesData, searchTerm, statusFilter, cityFilter]);

  const stats = useMemo(
    () => ({
      total: enquiriesData.length,
      draft: enquiriesData.filter((i) => i.status === "DRAFT").length,
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
  };

  const updateStatus = (record: EnquiryRecord, status: EnquiryStatus) => {
    setEnquiriesData((prev) =>
      prev.map((item) => (item.id === record.id ? { ...item, status } : item))
    );

    message.success(`Enquiry marked as ${status}`);
  };

  const handleDeleteEnquiry = (record: EnquiryRecord) => {
    setEnquiriesData((prev) => prev.filter((item) => item.id !== record.id));
    setSelectedRowKeys((prev) => prev.filter((key) => key !== record.id));
  };

  const handleBulkDelete = () => {
    setEnquiriesData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)));
    setSelectedRowKeys([]);
  };

  const openEditModal = (record: EnquiryRecord) => {
    setEditEnquiry(record);
    setIsCreateOpen(false);
    form.setFieldsValue({
      enquiryName: record.enquiryName,
      customerName: record.customerName,
      phone: record.phone,
      eventDate: record.eventDate,
      status: record.status,
      city: record.city,
      image: record.image,
      notes: record.notes,
    });
  };

  const openCreateModal = () => {
    setEditEnquiry(null);
    setIsCreateOpen(true);
    form.resetFields();
    form.setFieldsValue({ status: "DRAFT" });
  };

  const closeFormModal = () => {
    setEditEnquiry(null);
    setIsCreateOpen(false);
    form.resetFields();
  };

  const handleSaveEnquiry = () => {
    form
      .validateFields()
      .then((values) => {
        if (editEnquiry) {
          setEnquiriesData((prev) =>
            prev.map((item) => (item.id === editEnquiry.id ? { ...item, ...values } : item))
          );

          message.success("Enquiry updated");
        } else {
          const newEnquiry: EnquiryRecord = {
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
      })
      .catch(() => {
      });
  };

  const renderRowActions = (record: EnquiryRecord) => (
    <div className="enquiry-row-actions-overlay">
      <Tooltip title="View enquiry">
        <Button
          type="text"
          icon={<EyeOutlined />}
          className="enquiry-action-btn view"
          onClick={(e) => {
            e.stopPropagation();
            setViewEnquiry(record);
          }}
        />
      </Tooltip>

      <Tooltip title="Edit enquiry">
        <Button
          type="text"
          icon={<EditOutlined />}
          className="enquiry-action-btn edit"
          onClick={(e) => {
            e.stopPropagation();
            openEditModal(record);
          }}
        />
      </Tooltip>

      <Tooltip title="Enquiry journey">
        <Button
          type="text"
          icon={<ClockCircleOutlined />}
          className="enquiry-action-btn journey"
          onClick={(e) => {
            e.stopPropagation();
            setJourneyEnquiry(record);
          }}
        />
      </Tooltip>

      <Tooltip title="Mark as confirmed">
        <Button
          type="text"
          icon={<CheckCircleOutlined />}
          className="enquiry-action-btn confirm"
          onClick={(e) => {
            e.stopPropagation();
            updateStatus(record, "CONFIRMED");
          }}
        />
      </Tooltip>

      <Tooltip title="Delete enquiry">
        <DeleteButton
          itemName={record.enquiryName}
          onDelete={() => handleDeleteEnquiry(record)}
          className="enquiry-action-btn delete"
        />
      </Tooltip>
    </div>
  );

  /*  Table columns — text-only, no thumbnails, no Budget/Priority       */

  const columns: ColumnsType<EnquiryRecord> = [
    {
      title: "Enquiry",
      dataIndex: "enquiryName",
      key: "enquiryName",
      render: (text: string, record) => (
        <button type="button" className="enquiry-name-cell" onClick={() => setViewEnquiry(record)}>
          <strong>{text}</strong>
        </button>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
      render: (text: string) => (
        <span className="enquiry-compact-cell">
          <UserOutlined /> {text}
        </span>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (text: string) => (
        <span className="enquiry-soft-cell">
          <PhoneOutlined /> {text}
        </span>
      ),
    },
    {
      title: "Event Date",
      dataIndex: "eventDate",
      key: "eventDate",
      render: (text: string) => (
        <span className="enquiry-soft-cell">
          <CalendarOutlined /> {text}
        </span>
      ),
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      render: (text: string) => (
        <span className="enquiry-soft-cell">
          <EnvironmentOutlined /> {text}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      onCell: () => ({ className: "enquiry-actions-anchor-cell" }),
      render: (status: EnquiryStatus, record) => (
        <>
          <Tag color={statusColors[status]} className="enquiry-status-tag">
            {status}
          </Tag>
          {renderRowActions(record)}
        </>
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
                        Track enquiry customers, follow-ups, city and booking status in one clean
                        workspace.
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

                        <Tooltip title="Refresh enquiries">
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
                        <Tooltip key={item.id} title={item.enquiryName}>
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
                    <Tooltip title="Total enquiries">
                      <div className="stat-card">
                        <FileTextOutlined className="stat-icon blue" />
                        <strong>{stats.total}</strong>
                        <span>Total</span>
                      </div>
                    </Tooltip>

                    <Tooltip title="Draft enquiries">
                      <div className="stat-card">
                        <EditOutlined className="stat-icon slate" />
                        <strong>{stats.draft}</strong>
                        <span>Draft</span>
                      </div>
                    </Tooltip>

                    <Tooltip title="Follow-up enquiries">
                      <div className="stat-card">
                        <ClockCircleOutlined className="stat-icon yellow" />
                        <strong>{stats.followUps}</strong>
                        <span>Follow-ups</span>
                      </div>
                    </Tooltip>

                    <Tooltip title="Confirmed bookings">
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
                          onChange={(val) => setStatusFilter(val)}
                          classNames={{ popup: { root: "enquiry-dark-select-dropdown" } }}
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
                          classNames={{ popup: { root: "enquiry-dark-select-dropdown" } }}
                          options={cities.map((city) => ({
                            value: city,
                            label: city === "ALL" ? "All Cities" : city,
                          }))}
                        />

                        <Button onClick={clearFilters}>Clear</Button>
                      </Space>

                      <DeleteButton
                        itemName={`${selectedRowKeys.length} selected enquir${
                          selectedRowKeys.length === 1 ? "y" : "ies"
                        }`}
                        onDelete={handleBulkDelete}
                        disabled={!selectedRowKeys.length}
                      />
                    </div>

                    <Table<EnquiryRecord>
                      className="enquiry-table"
                      columns={columns}
                      dataSource={filteredData}
                      rowKey="id"
                      loading={isLoading}
                      rowClassName={(record) => (activeRowId === record.id ? "enquiry-row-active" : "")}
                      onRow={(record) => ({
                        onMouseEnter: () => setActiveRowId(record.id),
                        onMouseLeave: () =>
                          setActiveRowId((current) => (current === record.id ? null : current)),
                        onTouchStart: () =>
                          setActiveRowId((current) => (current === record.id ? null : record.id)),
                      })}
                      rowSelection={{
                        selectedRowKeys,
                        onChange: (keys) => setSelectedRowKeys(keys as string[]),
                      }}
                      pagination={{ pageSize: 10 }}
                      tableLayout="fixed"
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

        {/* View enquiry — unchanged antd Modal, closes normally */}
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
                  <Tag color={statusColors[viewEnquiry.status]}>{viewEnquiry.status}</Tag>
                </div>
              </div>

              <Divider />

              <Descriptions bordered column={2}>
                <Descriptions.Item label="Customer">{viewEnquiry.customerName}</Descriptions.Item>
                <Descriptions.Item label="Phone">{viewEnquiry.phone}</Descriptions.Item>
                <Descriptions.Item label="Event Date">{viewEnquiry.eventDate}</Descriptions.Item>
                <Descriptions.Item label="City">{viewEnquiry.city}</Descriptions.Item>
                <Descriptions.Item label="Notes" span={2}>
                  {viewEnquiry.notes || "—"}
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Modal>

        {/* Enquiry journey — unchanged antd Modal, closes normally */}
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

        {/* Create / Edit enquiry — Users-page-styled modal. Only Cancel or  */}
        {/* Create/Save closes it; clicking outside does nothing.           */}
        <EnquiryFormModal open={!!editEnquiry || isCreateOpen} width={680}>
          <div className="enquiry-modal-shell">
            <div className="enquiry-modal-title-row">
              <Avatar className="enquiry-modal-avatar">
                {editEnquiry ? <EditOutlined /> : <PlusOutlined />}
              </Avatar>
              <Title level={3}>{editEnquiry ? "Edit Enquiry" : "Create New Enquiry"}</Title>
            </div>

            <Form<EnquiryFormValues> form={form} layout="vertical" className="enquiry-form">
              <div className="enquiry-form-grid">
                <Form.Item
                  name="enquiryName"
                  label="Enquiry Name"
                  rules={[{ required: true, message: "Enquiry name is required" }]}
                >
                  <Input prefix={<FileTextOutlined />} placeholder="e.g. Priya - Wedding" />
                </Form.Item>

                <Form.Item
                  name="customerName"
                  label="Customer Name"
                  rules={[{ required: true, message: "Customer name is required" }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Customer full name" />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label="Phone"
                  rules={[
                    { required: true, message: "Phone number is required" },
                    { pattern: /^[6-9]\d{9}$/, message: "Enter a valid 10-digit phone number" },
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="10-digit mobile number" maxLength={10} />
                </Form.Item>

                <Form.Item
                  name="eventDate"
                  label="Event Date"
                  rules={[{ required: true, message: "Event date is required" }]}
                >
                  <Input prefix={<CalendarOutlined />} placeholder="e.g. May 31, 2026" />
                </Form.Item>

                <Form.Item
                  name="city"
                  label="City"
                  rules={[{ required: true, message: "City is required" }]}
                >
                  <Input prefix={<EnvironmentOutlined />} placeholder="Event city" />
                </Form.Item>

                <Form.Item
                  name="status"
                  label="Status"
                  rules={[{ required: true, message: "Status is required" }]}
                >
                  <Select
                    classNames={{ popup: { root: "enquiry-dark-select-dropdown" } }}
                    options={Object.keys(statusColors).map((k) => ({ value: k, label: k }))}
                  />
                </Form.Item>

                <Form.Item
                  name="image"
                  label="Image URL"
                  className="enquiry-form-full"
                  rules={[{ type: "url", message: "Enter a valid image URL" }]}
                >
                  <Input placeholder="https://..." />
                </Form.Item>

                <Form.Item name="notes" label="Notes" className="enquiry-form-full">
                  <Input.TextArea rows={4} placeholder="Additional notes about this enquiry" />
                </Form.Item>
              </div>
            </Form>

            <div className="enquiry-modal-action-row">
              <Button className="enquiry-modal-cancel-btn" onClick={closeFormModal}>
                Cancel
              </Button>
              <Button type="primary" className="enquiry-modal-save-btn" onClick={handleSaveEnquiry}>
                {editEnquiry ? "Save Changes" : "Create Enquiry"}
              </Button>
            </div>
          </div>
        </EnquiryFormModal>
      </Layout>
    </ConfigProvider>
  );
};

export default EnquiryPage;