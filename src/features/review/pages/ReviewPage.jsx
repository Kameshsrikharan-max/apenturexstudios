import React, { useMemo, useState } from "react";
import {
  Layout,
  Typography,
  Table,
  Input,
  Select,
  Button,
  Space,
  Empty,
  ConfigProvider,
  Card,
  Avatar,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AppstoreOutlined,
  BarsOutlined,
  UsergroupAddOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import "./ReviewPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const ReviewPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [isLoading, setIsLoading] = useState(false);

  const referralsData = [
    {
      key: "1",
      submitted: "2026-05-02",
      applicant: "Rajesh ",
      location: "Chennai, Tamil Nadu",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      status: "Pending",
      score: 78,
      role: "Full Stack Developer",
    },
    {
      key: "2",
      submitted: "2026-05-01",
      applicant: "Priya",
      location: "Bangalore, Karnataka",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      status: "Approved",
      score: 92,
      role: "UI/UX Designer",
    },
    {
      key: "3",
      submitted: "2026-04-30",
      applicant: "Arjun ",
      location: "Hyderabad, Telangana",
      avatar: "https://randomuser.me/api/portraits/men/45.jpg",
      status: "Rejected",
      score: 45,
      role: "Data Scientist",
    },
  ];

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
  }, [searchTerm, statusFilter]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 900);
  };

  const getStatusClass = (status) => {
    if (status === "Approved") return "approved";
    if (status === "Rejected") return "rejected";
    return "pending";
  };

  const getStatusBadge = (status, score) => (
    <div className="status-container">
      <span className={`status-pill ${getStatusClass(status)}`}>
        <span className="status-dot" />
        {status}
      </span>

      <div className="score-orbit" style={{ "--score": `${score}%` }}>
        <div className="score-circle">{score}</div>
      </div>
    </div>
  );

  const columns = [
    {
      title: "Submitted",
      dataIndex: "submitted",
      key: "submitted",
      width: 150,
      render: (date) => <span className="date-chip">{date}</span>,
    },
    {
      title: "Applicant",
      dataIndex: "applicant",
      key: "applicant",
      render: (_, record) => (
        <Space>
          <Avatar src={record.avatar} size={44} className="avatar-ring" />
          <div>
            <div className="applicant-name">{record.applicant}</div>
            <div className="role-text">{record.role}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Location",
      dataIndex: "location",
      key: "location",
      render: (location) => <span className="location-text">{location}</span>,
    },
    {
      title: "AI Match",
      dataIndex: "score",
      key: "score",
      width: 150,
      render: (score) => (
        <div className="match-meter">
          <span>{score}%</span>
          <div className="meter-track">
            <div className="meter-fill" style={{ width: `${score}%` }} />
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (_, record) => getStatusBadge(record.status, record.score),
    },
    {
      title: "Actions",
      key: "actions",
      width: 310,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button ghost icon={<EyeOutlined />} className="action-btn">
            View Portfolio
          </Button>

          {record.status === "Pending" && (
            <>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                className="approve-btn"
              >
                Approve
              </Button>

              <Button
                danger
                icon={<CloseCircleOutlined />}
                className="reject-btn"
              >
                Reject
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#38bdf8",
          borderRadius: 12,
        },
      }}
    >
      <Layout className="dashboard-page dashboard-dark review-page">
        <div className="review-aurora review-aurora-one" />
        <div className="review-aurora review-aurora-two" />

        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell">
            <Header className="dashboard-navbar review-navbar">
              <div className="dashboard-brand">
                <div>
                  <Title level={3} className="dashboard-title review-title">
                    Review
                  </Title>
                  <Text className="review-subtitle">
                    
                  </Text>
                </div>
              </div>
            </Header>

            <Content className="dashboard-content review-content">
              <div className="stats-row">
                <Card className="metric-card metric-card-blue">
                  <div className="metric-icon">
                    <UsergroupAddOutlined />
                  </div>
                  <div>
                    <h3>47</h3>
                    <p>Total Referrals</p>
                  </div>
                </Card>

                <Card className="metric-card metric-card-green">
                  <div className="metric-icon">
                    <CalendarOutlined />
                  </div>
                  <div>
                    <h3>18</h3>
                    <p>This Week</p>
                  </div>
                </Card>

                <Card className="metric-card metric-card-violet">
                  <div className="metric-icon">
                    <ThunderboltOutlined />
                  </div>
                  <div>
                    <h3>81%</h3>
                    <p>Avg. Score</p>
                  </div>
                </Card>
              </div>

              <div className="section-heading">
                <div>
                  <Title level={4}>My Referrals</Title>
                  <Text>{filteredData.length} candidates visible</Text>
                </div>
              </div>

              <div className="review-toolbar">
                <Space size="middle" wrap>
                  <Input
                    placeholder="Search applicants, roles, or locations..."
                    prefix={<SearchOutlined />}
                    className="dashboard-search review-search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    allowClear
                  />

                  <Select
                    value={statusFilter}
                    className="status-select"
                    onChange={setStatusFilter}
                    options={[
                      { value: "all", label: "All Status" },
                      { value: "pending", label: "Pending" },
                      { value: "approved", label: "Approved" },
                      { value: "rejected", label: "Rejected" },
                    ]}
                  />

                  <Button
                    icon={<ReloadOutlined spin={isLoading} />}
                    onClick={handleRefresh}
                    className="refresh-btn"
                  >
                    Refresh
                  </Button>
                </Space>

                <div className="view-toggle">
                  <Tooltip title="Table view">
                    <Button
                      type={viewMode === "table" ? "primary" : "default"}
                      icon={<BarsOutlined />}
                      onClick={() => setViewMode("table")}
                    />
                  </Tooltip>

                  <Tooltip title="Card view">
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
                  <Empty description="No referrals found" />
                </div>
              ) : viewMode === "table" ? (
                <div className="table-wrapper animated-panel">
                  <Table
                    columns={columns}
                    dataSource={filteredData}
                    pagination={false}
                    scroll={{ x: 1200 }}
                    className="wow-table review-table"
                    rowClassName={(_, index) => `table-row-animate row-${index}`}
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
                        <Avatar src={item.avatar} size={68} className="avatar-ring" />
                        <div className="card-score-wrap">
                          <div className="score-orbit">
                            <div className="score-circle">{item.score}</div>
                          </div>
                        </div>
                      </div>

                      <h4>{item.applicant}</h4>
                      <p className="role-text">{item.role}</p>
                      <p className="location-text">{item.location}</p>

                      <div className="card-meta">
                        <span>{item.submitted}</span>
                        {getStatusBadge(item.status, item.score)}
                      </div>

                      <div className="card-actions">
                        <Button icon={<EyeOutlined />} className="action-btn">
                          Portfolio
                        </Button>

                        {item.status === "Pending" && (
                          <>
                            <Button type="primary" className="approve-btn">
                              Approve
                            </Button>

                            <Button danger className="reject-btn">
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Content>
          </Layout>
        </div>
      </Layout>
    </ConfigProvider>
  );
};

export default ReviewPage;
