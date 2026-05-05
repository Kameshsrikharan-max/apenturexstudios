import React from "react";
import Sidebar from "../UI/Sidebar";
import { Layout, Input, Button, Avatar, Badge, Space } from "antd";
import { 
  SearchOutlined, 
  SunOutlined, 
  BellOutlined, 
  DownOutlined 
} from "@ant-design/icons";
import "./MainLayout.css";

const { Header, Content } = Layout;

const MainLayout = ({ children, user }) => {
  return (
    <Layout className="app-container">
      {/* Sidebar is common to all pages */}
      <Sidebar />

      <Layout className="app-shell">
        <Header className="app-header">
          <div className="header-left">
            <div className="brand-icon">
              <img src="/dashboard-logo.png" alt="logo" />
            </div>
            <h2 className="page-title">Dashboard</h2>
          </div>

          <div className="header-center">
            <Input 
              placeholder="Search users, events, studios..." 
              prefix={<SearchOutlined />} 
              className="header-search"
            />
          </div>

          <div className="header-right">
            <Space size="large">
              <Button type="text" icon={<SunOutlined />} className="icon-btn" />
              <Badge dot color="#1890ff">
                <Button type="text" icon={<BellOutlined />} className="icon-btn" />
              </Badge>
              <div className="user-dropdown">
                <Avatar src={user?.avatar} icon="K" className="user-avatar" />
                <div className="user-info">
                  <span className="user-name">{user?.name || "Kamesh Srikharan.T"}</span>
                  <span className="user-role">Studio Admin</span>
                </div>
                <DownOutlined className="dropdown-arrow" />
              </div>
            </Space>
          </div>
        </Header>

        <Content className="app-content-area">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;