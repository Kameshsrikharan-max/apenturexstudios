import { useMemo, useState } from "react";
import {Avatar,Button,Card,ConfigProvider,Descriptions,Empty,Input,Layout,message,Modal,Select,Space,Table,Tag,Tooltip,Typography,} from "antd";
import type { ColumnsType } from "antd/es/table";
import {AppstoreOutlined,BarsOutlined,CalendarOutlined,CheckCircleOutlined,ClockCircleOutlined,CloseCircleOutlined,EyeOutlined,ReloadOutlined,SearchOutlined,UsergroupAddOutlined,} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import "./ReviewPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const statusIconMap = {
  Pending: <ClockCircleOutlined />,
  Approved: <CheckCircleOutlined />,
  Rejected: <CloseCircleOutlined />,
};

const ReviewPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [activeRowKey, setActiveRowKey] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 6;

  const [referralsData, setReferralsData] = useState([
    {key: "1",submitted: "2026-05-02",applicant: "Rajesh",location: "Chennai",avatar: "https://randomuser.me/api/portraits/men/32.jpg",status: "Pending",score: 78,role: "Full Stack",},
    {key: "2",submitted: "2026-05-01",applicant: "Priya",location: "Bangalore",avatar: "https://randomuser.me/api/portraits/women/44.jpg",status: "Approved",score: 92,role: "UI/UX",},
    {key: "3",submitted: "2026-04-30",applicant: "Arjun",location: "Hyderabad",avatar: "https://randomuser.me/api/portraits/men/45.jpg",status: "Rejected",score: 45,role: "Data",},
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

  const handleStatusChange = (key, status) => {
    setReferralsData((prevData) =>
      prevData.map((item) => (item.key === key ? { ...item, status } : item))
    );

    message.success(status);
  };

  const getStatusClass = (status) => {
    if (status === "Approved") return "approved";
    if (status === "Rejected") return "rejected";
    return "pending";
  };

  const renderStatusTag = (status) => (
    <Tooltip title={`Status: ${status}`}>
      <Tag className={`status-dot status-${getStatusClass(status)} icon-only`}>
        {statusIconMap[status]}
      </Tag>
    </Tooltip>
  );

  const renderRowActionsOverlay = (record) => (
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

  const columns: ColumnsType<any> = [
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
                          style={{ "--delay": `${index * 90}ms` }}
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

        <Modal
          open={Boolean(selectedReferral)}
          title="Profile"
          footer={null}
          onCancel={() => setSelectedReferral(null)}
          className="review-modal"
          centered
          width={480}
          styles={{
            mask: {
              background: "rgba(2, 6, 23, 0.72)",
              backdropFilter: "blur(3px)",
            },
            header: {
              background: "transparent",
              borderBottom: 0,
              marginBottom: 14,
            },
            body: {
              background: "rgba(13, 17, 39, 0.2)",
              border: "1px solid var(--sky-border)",
              borderRadius: 22,
              padding: "22px 24px",
              backdropFilter: "blur(22px)",
              WebkitBackdropFilter: "blur(22px)",
              boxShadow:
                "0 28px 80px rgba(0, 0, 0, 0.5), 0 0 40px var(--sky-dim), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
              maxHeight: "calc(100vh - 48px - 90px)",
              overflowY: "auto",
              overflowX: "hidden",
            },
          }}
        >
          {selectedReferral && (
            <div className="portfolio-preview">
              <div className="portfolio-hero">
                <Avatar
                  src={selectedReferral.avatar}
                  size={86}
                  className="portfolio-avatar"
                />

                <div>
                  <h2>{selectedReferral.applicant}</h2>
                  <p>{selectedReferral.role}</p>
                </div>
              </div>

              <div className="portfolio-tiles">
                <div>
                  <span>City</span>
                  <strong>{selectedReferral.location}</strong>
                </div>

                <div>
                  <span>Date</span>
                  <strong>{selectedReferral.submitted}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{selectedReferral.status}</strong>
                </div>
              </div>

              <Descriptions column={1} size="small" className="portfolio-details">
                <Descriptions.Item label="Name">
                  {selectedReferral.applicant}
                </Descriptions.Item>
                <Descriptions.Item label="Role">
                  {selectedReferral.role}
                </Descriptions.Item>
                <Descriptions.Item label="City">
                  {selectedReferral.location}
                </Descriptions.Item>
                <Descriptions.Item label="Date">
                  {selectedReferral.submitted}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Modal>
      </Layout>
    </ConfigProvider>
    
  );
};

export default ReviewPage;