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
  Avatar,
  Tabs,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  UserAddOutlined,
  FilterOutlined,
  DownOutlined,
} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar"; 
import "./UsersPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const UsersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const usersData = [
    { id: "1", name: "Kamesh Srikharan.T", email: "kameshsrikharan.t@gmail.com", phone: "8888888888", studio: "Wave Studios", role: "Studio Admin", status: "Active", signupType: "Registered" },
    { id: "2", name: "Arun Kumar", email: "arun.photography@gmail.com", phone: "9840123456", studio: "Wave Studios", role: "Photographer", status: "Active", signupType: "Google" },
    { id: "3", name: "Priya", email: "priya.sharma@outlook.com", phone: "9123456789", studio: "Wave Studios", role: "Editor", status: "Inactive", signupType: "Registered" },
    { id: "4", name: "John", email: "john.d@wavestudios.com", phone: "8056123987", studio: "Wave Studios", role: "Photographer", status: "Active", signupType: "Registered" },
    { id: "5", name: "Meera", email: "meera.reddy@gmail.com", phone: "7012345678", studio: "Wave Studios", role: "Studio Admin", status: "Active", signupType: "Google" },
    { id: "6", name: "Vikram", email: "vikram.seth@live.com", phone: "9944556677", studio: "Wave Studios", role: "Photographer", status: "Pending", signupType: "Registered" },
    { id: "7", name: "Sara", email: "sara.w@yahoo.com", phone: "9887766554", studio: "Wave Studios", role: "Editor", status: "Active", signupType: "Registered" },
    { id: "8", name: "Rajesh", email: "rajesh.k@gmail.com", phone: "8122334455", studio: "Wave Studios", role: "Photographer", status: "Active", signupType: "Google" },
    { id: "9", name: "Paul", email: "anitha.p@gmail.com", phone: "9000111222", studio: "Wave Studios", role: "Editor", status: "Active", signupType: "Registered" }
  ];

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  const columns = [
    { 
      title: "Name", 
      dataIndex: "name", 
      key: "name", 
      sorter: true,
      width: 200,
      render: (text) => <span className="applicant-name">{text}</span>
    },
    { title: "Email", dataIndex: "email", key: "email", width: 250 },
    { title: "Phone", dataIndex: "phone", key: "phone", width: 150 },
    { 
      title: "Studio", 
      dataIndex: "studio", 
      key: "studio",
      width: 150,
      render: (text) => <Tag color="purple" className="status-pill">{text}</Tag>
    },
    { 
      title: "Role", 
      dataIndex: "role", 
      key: "role",
      width: 150,
      render: (text) => <Tag color="blue" className="status-pill">{text}</Tag>
    },
    { 
      title: "Status", 
      dataIndex: "status", 
      key: "status",
      width: 120,
      render: (status) => {
        let color = status === "Active" ? "green" : status === "Pending" ? "gold" : "red";
        return <Tag color={color} className="status-pill">{status}</Tag>;
      },
    },
    { 
      title: "Signup type", 
      dataIndex: "signupType", 
      key: "signupType",
      width: 150,
      render: (text) => <Tag className="signup-tag-outline">{text}</Tag>
    },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#6366f1", borderRadius: 12 } }}>
      <Layout className="dashboard-page dashboard-dark review-page">
        <div className="review-aurora review-aurora-one" />
        <div className="review-aurora review-aurora-two" />

        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell">
            <Header className="dashboard-navbar review-navbar">
              <div className="dashboard-brand">
                <Title level={3} className="dashboard-title review-title">Users</Title>
              </div>
              <div className="header-user-profile">
                 <Space className="profile-badge-glass">
                    <Avatar size="small" style={{ backgroundColor: '#818cf8' }}>K</Avatar>
                    <div className="profile-text">
                        <Text className="user-name-header">Kamesh Srikharan.T</Text>
                        <Text className="user-role-header">Studioadmin</Text>
                    </div>
                    <DownOutlined style={{ fontSize: '10px' }} />
                 </Space>
              </div>
            </Header>

            <Content className="dashboard-content review-content">
              <div className="table-wrapper animated-panel user-panel-container">
                <Tabs 
                  defaultActiveKey="1" 
                  className="user-tabs-glass"
                  items={[
                    { label: 'All Users', key: '1' },
                    { label: 'Referrals', key: '2' },
                    { label: 'Photographers', key: '3' },
                  ]}
                />

                <div className="review-toolbar user-toolbar-inline">
                  <Space size="middle">
                    <Input
                      placeholder="Search by name, email, or phon..."
                      prefix={<SearchOutlined />}
                      className="review-search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button type="text" icon={<FilterOutlined />} className="icon-btn-glass" />
                    <Button 
                      type="text"
                      icon={<ReloadOutlined spin={isLoading} />} 
                      onClick={handleRefresh}
                      className="icon-btn-glass"
                    />
                  </Space>
                  <Button type="primary" icon={<UserAddOutlined />} className="invite-btn-styled">
                    Invite User
                  </Button>
                </div>

                <Table
                  columns={columns}
                  dataSource={usersData}
                  pagination={false}
                  className="review-table user-table-custom"
                  rowKey="id"
                  scroll={{ x: 1200 }} 
                />
              </div>
              <div className="footer-copyright">
                <Text>© PSP</Text>
              </div>
            </Content>
          </Layout>
        </div>
      </Layout>
    </ConfigProvider>
  );
};

export default UsersPage;