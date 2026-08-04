import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  ConfigProvider,
  Empty,
  Input,
  Layout,
  message,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  AppstoreOutlined,
  BarsOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  IdcardOutlined,
  ReloadOutlined,
  SearchOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import "./ReviewPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const statusIconMap = {
  Pending: <ClockCircleOutlined />,
  Approved: <CheckCircleOutlined />,
  Rejected: <CloseCircleOutlined />,
};

const fallbackImage =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80";

/* -------------------------------------------------------------------------- */
/*  ReviewProfileOverlay — same full-screen glass/HUD language as the         */
/*  Users page's UserViewOverlay (blurred backdrop, particles, orbital glow,  */
/*  avatar rings, info-card grid) but built for a referral record: no photo   */
/*  gallery, instead a score gauge + inline Approve/Reject actions.           */
/* -------------------------------------------------------------------------- */

interface ReferralRecord {
  key: string;
  submitted: string;
  applicant: string;
  location: string;
  avatar: string;
  status: "Pending" | "Approved" | "Rejected";
  score: number;
  role: string;
}

interface ReviewProfileOverlayProps {
  referral: ReferralRecord;
  onClose: () => void;
  onStatusChange: (key: string, status: "Approved" | "Rejected") => void;
}

const statusMetaMap: Record<ReferralRecord["status"], { color: string; glow: string; label: string }> = {
  Approved: { color: "#22c55e", glow: "rgba(34,197,94,0.4)", label: "Approved" },
  Rejected: { color: "#ef4444", glow: "rgba(239,68,68,0.4)", label: "Rejected" },
  Pending: { color: "#f59e0b", glow: "rgba(245,158,11,0.4)", label: "Pending" },
};

const ReviewProfileOverlay = ({ referral, onClose, onStatusChange }: ReviewProfileOverlayProps) => {
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const statusMeta = statusMetaMap[referral.status] || {
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.3)",
    label: referral.status,
  };

  const infoItems = [
    { icon: <EnvironmentOutlined />, label: "City", value: referral.location, accent: "#a78bfa" },
    { icon: <CalendarOutlined />, label: "Submitted", value: referral.submitted, accent: "#fb923c" },
    { icon: <IdcardOutlined />, label: "Role", value: referral.role, accent: "#f59e0b" },
  ];

  return (
    <div className="rvo-root">
      <div className="rvo-bg-blur">
        <img
          src={referral.avatar || fallbackImage}
          alt=""
          onError={(e) => {
            e.currentTarget.src = fallbackImage;
          }}
        />
      </div>
      <div className="rvo-bg-noise" />
      <div className="rvo-bg-vignette" />

      <div className="rvo-particles" aria-hidden="true">
        {[...Array(22)].map((_, i) => (
          <span
            key={i}
            className="rvo-particle"
            style={
              {
                "--x": `${Math.random() * 100}%`,
                "--y": `${Math.random() * 100}%`,
                "--d": `${4 + Math.random() * 10}s`,
                "--s": `${2 + Math.random() * 5}px`,
                "--o": `${0.15 + Math.random() * 0.45}`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="rvo-orbital-bg" aria-hidden="true">
        <div className="rvo-orb rvo-orb-1" />
        <div className="rvo-orb rvo-orb-2" />
        <div className="rvo-orb rvo-orb-3" />
      </div>

      <button className="rvo-x" onClick={onClose} aria-label="Close">
        <CloseOutlined />
      </button>

      <div className="rvo-panel">
        <div className="rvo-card">
          <div className="rvo-profile-visual">
            <div className="rvo-avatar-glow" style={{ "--gcolor": statusMeta.glow } as React.CSSProperties} />

            <div className="rvo-avatar-shell">
              <img
                className={`rvo-profile-img ${imgLoaded ? "loaded" : ""}`}
                src={referral.avatar}
                alt={referral.applicant}
                onLoad={() => setImgLoaded(true)}
                onError={(e) => {
                  e.currentTarget.src = fallbackImage;
                  setImgLoaded(true);
                }}
              />
              <div className="rvo-ring rvo-ring-1" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
              <div className="rvo-ring rvo-ring-2" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
              <div className="rvo-ring rvo-ring-3" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
            </div>

            <h1 className="rvo-name">{referral.applicant}</h1>
            <p className="rvo-role-label">{referral.role}</p>

            <div className="rvo-badge-row">
              <Tooltip title={`Status: ${statusMeta.label}`}>
                <span
                  className="rvo-status-badge"
                  style={{ "--bc": statusMeta.color, "--bg": statusMeta.glow } as React.CSSProperties}
                >
                  {statusIconMap[referral.status]}
                  {statusMeta.label}
                </span>
              </Tooltip>
            </div>
          </div>

          <div className="rvo-info-grid">
            {infoItems.map(({ icon, label, value, accent }) => (
              <div key={label} className="rvo-info-card" style={{ "--acc": accent } as React.CSSProperties}>
                <div className="rvo-info-icon">{icon}</div>
                <div className="rvo-info-text">
                  <small>{label}</small>
                  <strong title={String(value)}>{value}</strong>
                </div>
              </div>
            ))}
          </div>

          {referral.status === "Pending" && (
            <div className="rvo-action-row">
              <Button
                className="rvo-reject-btn"
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  onStatusChange(referral.key, "Rejected");
                  onClose();
                }}
              >
                Reject
              </Button>
              <Button
                type="primary"
                className="rvo-approve-btn"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  onStatusChange(referral.key, "Approved");
                  onClose();
                }}
              >
                Approve
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  ReviewPage                                                                 */
/* -------------------------------------------------------------------------- */

const ReviewPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferralRecord | null>(null);
  const [activeRowKey, setActiveRowKey] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 6;

  const [referralsData, setReferralsData] = useState<ReferralRecord[]>([
    { key: "1", submitted: "2026-05-02", applicant: "Rajesh", location: "Chennai", avatar: "https://randomuser.me/api/portraits/men/32.jpg", status: "Pending", score: 78, role: "Full Stack" },
    { key: "2", submitted: "2026-05-01", applicant: "Priya", location: "Bangalore", avatar: "https://randomuser.me/api/portraits/women/44.jpg", status: "Approved", score: 92, role: "UI/UX" },
    { key: "3", submitted: "2026-04-30", applicant: "Arjun", location: "Hyderabad", avatar: "https://randomuser.me/api/portraits/men/45.jpg", status: "Rejected", score: 45, role: "Data" },
  ]);

  const filteredData = useMemo(() => {
    return referralsData.filter((item) => {
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        item.applicant.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.role.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        item.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [referralsData, searchTerm, statusFilter]);

  const pendingCount = referralsData.filter(
    (item) => item.status === "Pending"
  ).length;

  const handleRefresh = () => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      message.success("Updated");
    }, 900);
  };

  const handleStatusChange = (key: string, status: "Approved" | "Rejected") => {
    setReferralsData((prevData) =>
      prevData.map((item) => (item.key === key ? { ...item, status } : item))
    );

    // keep the overlay in sync if it's currently showing this referral
    setSelectedReferral((prev) => (prev && prev.key === key ? { ...prev, status } : prev));

    message.success(status);
  };

  const getStatusClass = (status: string) => {
    if (status === "Approved") return "approved";
    if (status === "Rejected") return "rejected";
    return "pending";
  };

  const renderStatusTag = (status: ReferralRecord["status"]) => (
    <Tooltip title={`Status: ${status}`}>
      <Tag className={`status-dot status-${getStatusClass(status)} icon-only`}>
        {statusIconMap[status]}
      </Tag>
    </Tooltip>
  );

  const renderRowActionsOverlay = (record: ReferralRecord) => (
    <div className="review-row-actions-overlay">
      <Tooltip title="View">
        <Button
          type="text"
          icon={<EyeOutlined />}
          className="review-action-btn view"
          onClick={(e) => { e.stopPropagation(); setSelectedReferral(record); }}
        />
      </Tooltip>

      {record.status === "Pending" && (
        <>
          <Tooltip title="Approve">
            <Button
              type="text"
              icon={<CheckCircleOutlined />}
              className="review-action-btn approve"
              onClick={(e) => { e.stopPropagation(); handleStatusChange(record.key, "Approved"); }}
            />
          </Tooltip>

          <Tooltip title="Reject">
            <Button
              type="text"
              icon={<CloseCircleOutlined />}
              className="review-action-btn reject"
              onClick={(e) => { e.stopPropagation(); handleStatusChange(record.key, "Rejected"); }}
            />
          </Tooltip>
        </>
      )}
    </div>
  );

  const columns: ColumnsType<ReferralRecord> = [
    {
      title: "Name",
      dataIndex: "applicant",
      key: "applicant",
      width: 220,
      render: (_, record) => (
        <button
          type="button"
          className="review-name-cell"
          onClick={() => setSelectedReferral(record)}
        >
          <Avatar src={record.avatar} className="review-name-avatar" />
          <span>
            <strong>{record.applicant}</strong>
            <small>{record.role}</small>
          </span>
        </button>
      ),
    },
    {
      title: "City",
      dataIndex: "location",
      key: "location",
      width: 150,
      render: (location) => <span className="review-soft-cell">{location}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 90,
      align: "center",
      render: renderStatusTag,
    },
    {
      title: "Date",
      dataIndex: "submitted",
      key: "submitted",
      width: 160,
      onCell: () => ({ className: "review-actions-anchor-cell" }),
      render: (date, record) => (
        <>
          <Tag className="review-date-tag"><CalendarOutlined /> {date}</Tag>
          {renderRowActionsOverlay(record)}
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
          colorText: "#f8fafc",
          colorTextSecondary: "#94a3b8",
        },
      }}
    >
      <Layout className="dashboard-page dashboard-dark review-page">
        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell review-shell">
            <Header className="dashboard-navbar review-navbar">
              <div className="dashboard-brand">
                <Title level={3} className="dashboard-title review-title">
                  Review
                </Title>
              </div>
            </Header>

            <Content className="dashboard-content review-content">
              <div className="review-page-scroll">
                <div className="review-page-inner">
                  <div className="review-hero">
                    <div>
                      <Text className="hero-kicker">Live</Text>
                      <Title level={1}>Reviews</Title>
                    </div>
                  </div>

                  <div className="stats-row">
                    <Card className="review-metric-card">
                      <div className="metric-icon">
                        <UsergroupAddOutlined />
                      </div>
                      <div>
                        <h3>{referralsData.length}</h3>
                        <p>Total</p>
                      </div>
                    </Card>

                    <Card className="review-metric-card">
                      <div className="metric-icon">
                        <CalendarOutlined />
                      </div>
                      <div>
                        <h3>{pendingCount}</h3>
                        <p>Pending</p>
                      </div>
                    </Card>
                  </div>

                  <div className="review-toolbar">
                    <Space size="middle" wrap>
                      <Input
                        placeholder="Search..."
                        prefix={<SearchOutlined />}
                        className="dashboard-search review-search"
                        value={searchTerm}
                        onChange={(event) => {
                          setSearchTerm(event.target.value);
                          setCurrentPage(1);
                        }}
                        allowClear
                      />

                      <Select
                        value={statusFilter}
                        className="status-select"
                        onChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
                        options={[
                          { value: "all", label: "All" },
                          { value: "pending", label: "Pending" },
                          { value: "approved", label: "Approved" },
                          { value: "rejected", label: "Rejected" },
                        ]}
                      />

                      <Tooltip title="Refresh">
                        <Button
                          icon={<ReloadOutlined spin={isLoading} />}
                          onClick={handleRefresh}
                          className="refresh-btn icon-action"
                        />
                      </Tooltip>
                    </Space>

                    <div className="view-toggle">
                      <Tooltip title="Table">
                        <Button
                          type={viewMode === "table" ? "primary" : "default"}
                          icon={<BarsOutlined />}
                          onClick={() => setViewMode("table")}
                        />
                      </Tooltip>

                      <Tooltip title="Cards">
                        <Button
                          type={viewMode === "card" ? "primary" : "default"}
                          icon={<AppstoreOutlined />}
                          onClick={() => setViewMode("card")}
                        />
                      </Tooltip>
                    </div>
                  </div>

                  {filteredData.length === 0 ? (
                    <div className="empty-state">
                      <Empty description={false} />
                    </div>
                  ) : viewMode === "table" ? (
                    <div className="table-wrapper animated-panel">
                      <Table
                        columns={columns}
                        dataSource={filteredData}
                        rowKey="key"
                        tableLayout="fixed"
                        className="review-table-custom"
                        rowClassName={(record) => (activeRowKey === record.key ? "review-row-active" : "")}
                        onRow={(record) => ({
                          onMouseEnter: () => setActiveRowKey(record.key),
                          onMouseLeave: () =>
                            setActiveRowKey((current) => (current === record.key ? null : current)),
                          onTouchStart: () =>
                            setActiveRowKey((current) => (current === record.key ? null : record.key)),
                        })}
                        locale={{ emptyText: <Empty description="No matching referrals" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                        pagination={{
                          current: currentPage,
                          pageSize: PAGE_SIZE,
                          total: filteredData.length,
                          onChange: (page) => setCurrentPage(page),
                          showSizeChanger: false,
                          hideOnSinglePage: true,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="card-grid">
                      {filteredData.map((item, index) => (
                        <Card
                          key={item.key}
                          className={`talent-card talent-card-${getStatusClass(
                            item.status
                          )}`}
                          hoverable
                          style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}
                        >
                          <div className="talent-card-shine" />

                          <div className="talent-top">
                            <Avatar
                              src={item.avatar}
                              size={58}
                              className="avatar-ring"
                            />
                            <span
                              className={`status-pill ${getStatusClass(
                                item.status
                              )}`}
                            >
                              <span className="status-dot-mark" />
                              {item.status}
                            </span>
                          </div>

                          <h4>{item.applicant}</h4>
                          <p className="role-text">{item.role}</p>

                          <div className="card-meta">
                            <span>{item.location}</span>
                            <span>{item.submitted}</span>
                          </div>

                          <div className="card-actions">
                            <Tooltip title="View">
                              <Button
                                icon={<EyeOutlined />}
                                className="action-btn icon-action"
                                onClick={() => setSelectedReferral(item)}
                              />
                            </Tooltip>

                            {item.status === "Pending" && (
                              <>
                                <Tooltip title="Approve">
                                  <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    className="approve-btn icon-action"
                                    onClick={() =>
                                      handleStatusChange(item.key, "Approved")
                                    }
                                  />
                                </Tooltip>

                                <Tooltip title="Reject">
                                  <Button
                                    danger
                                    icon={<CloseCircleOutlined />}
                                    className="reject-btn icon-action"
                                    onClick={() =>
                                      handleStatusChange(item.key, "Rejected")
                                    }
                                  />
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Content>
          </Layout>
        </div>

        {selectedReferral && (
          <ReviewProfileOverlay
            referral={selectedReferral}
            onClose={() => setSelectedReferral(null)}
            onStatusChange={handleStatusChange}
          />
        )}
      </Layout>
    </ConfigProvider>
  );
};

export default ReviewPage;