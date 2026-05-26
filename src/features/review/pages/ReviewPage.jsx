import { useMemo, useState } from "react";
import {Avatar,Button,Card,ConfigProvider,Descriptions,Empty,Input,Layout,message,Modal,Select,Space,Table,Tooltip,Typography,} from "antd";
import {AppstoreOutlined,BarsOutlined,CalendarOutlined,CheckCircleOutlined,CloseCircleOutlined,EyeOutlined,ReloadOutlined,SearchOutlined,ThunderboltOutlined,UsergroupAddOutlined,} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import "./ReviewPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const ReviewPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);

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

  const avgScore = Math.round(
    referralsData.reduce((total, item) => total + item.score, 0) /
      referralsData.length
  );

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
      title: "Date",
      dataIndex: "submitted",
      key: "submitted",
      width: 140,
      render: (date) => <span className="date-chip">{date}</span>,
    },
    {
      title: "Name",
      dataIndex: "applicant",
      key: "applicant",
      width: 240,
      render: (_, record) => (
        <Space>
          <Avatar src={record.avatar} size={42} className="avatar-ring" />
          <div>
            <div className="applicant-name">{record.applicant}</div>
            <div className="role-text">{record.role}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "City",
      dataIndex: "location",
      key: "location",
      width: 170,
      render: (location) => <span className="location-text">{location}</span>,
    },
    {
      title: "Score",
      dataIndex: "status",
      key: "status",
      width: 230,
      render: (_, record) => getStatusBadge(record.status, record.score),
    },
    {
      title: "",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="View">
            <Button
              ghost
              icon={<EyeOutlined />}
              className="action-btn icon-action"
              onClick={() => setSelectedReferral(record)}
            />
          </Tooltip>

          {record.status === "Pending" && (
            <>
              <Tooltip title="Approve">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  className="approve-btn icon-action"
                  onClick={() => handleStatusChange(record.key, "Approved")}
                />
              </Tooltip>

              <Tooltip title="Reject">
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  className="reject-btn icon-action"
                  onClick={() => handleStatusChange(record.key, "Rejected")}
                />
              </Tooltip>
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

                    <div className="hero-score">
                      <ThunderboltOutlined />
                      <strong>{avgScore}%</strong>
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

                    <Card className="review-metric-card">
                      <div className="metric-icon">
                        <ThunderboltOutlined />
                      </div>
                      <div>
                        <h3>{avgScore}%</h3>
                        <p>Score</p>
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
                        onChange={(event) => setSearchTerm(event.target.value)}
                        allowClear
                      />

                      <Select
                        value={statusFilter}
                        className="status-select"
                        onChange={setStatusFilter}
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
                        pagination={false}
                        scroll={{ x: 1000 }}
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
                            <Avatar
                              src={item.avatar}
                              size={58}
                              className="avatar-ring"
                            />
                            <div
                              className="score-orbit"
                              style={{ "--score": `${item.score}%` }}
                            >
                              <div className="score-circle">{item.score}</div>
                            </div>
                          </div>

                          <h4>{item.applicant}</h4>
                          <p className="role-text">{item.role}</p>

                          <div className="card-meta">
                            <span>{item.location}</span>
                            <span
                              className={`status-pill ${getStatusClass(
                                item.status
                              )}`}
                            >
                              <span className="status-dot" />
                              {item.status}
                            </span>
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

                <div
                  className="portfolio-score"
                  style={{ "--score": `${selectedReferral.score}%` }}
                >
                  <strong>{selectedReferral.score}</strong>
                  <span>Score</span>
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