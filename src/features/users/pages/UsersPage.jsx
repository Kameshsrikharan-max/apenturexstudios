import  { useEffect, useMemo, useState } from "react";
import {Layout,Typography,Table,Input,Button,Space,ConfigProvider,Tag,Avatar,Tabs,Tooltip,Popover,Modal,Form,Select,message,Empty,Divider,} from "antd";
import {SearchOutlined,ReloadOutlined,UserAddOutlined,FilterOutlined,EyeOutlined,EditOutlined,DeleteOutlined,MailOutlined,PhoneOutlined,CheckCircleOutlined,CloseCircleOutlined,SendOutlined,UserSwitchOutlined,WarningOutlined,EnvironmentOutlined, CalendarOutlined,SaveOutlined,} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import "./UsersPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const UsersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [editForm] = Form.useForm();
  const [inviteForm] = Form.useForm();

  const [usersData, setUsersData] = useState([
    { id: "1", name: "Kamesh Srikharan.T", email: "kameshsrikharan.t@gmail.com", phone: "8888888888", studio: "Wave Studios", role: "Studio Admin", status: "Active", signupType: "Registered", created: "06 May 2026" },
    { id: "2", name: "Arun Kumar", email: "arun.photography@gmail.com", phone: "9840123456", studio: "Wave Studios", role: "Photographer", status: "Active", signupType: "Google", created: "05 May 2026" },
    { id: "3", name: "Priya", email: "priya.sharma@outlook.com", phone: "9123456789", studio: "Wave Studios", role: "Editor", status: "Inactive", signupType: "Registered", created: "04 May 2026" },
    { id: "4", name: "John", email: "john.d@wavestudios.com", phone: "8056123987", studio: "Wave Studios", role: "Photographer", status: "Active", signupType: "Registered", created: "03 May 2026" },
    { id: "5", name: "Meera", email: "meera.reddy@gmail.com", phone: "7012345678", studio: "Wave Studios", role: "Studio Admin", status: "Active", signupType: "Google", created: "02 May 2026" },
    { id: "6", name: "Vikram", email: "vikram.seth@live.com", phone: "9944556677", studio: "Wave Studios", role: "Photographer", status: "Pending", signupType: "Registered", created: "01 May 2026" },
    { id: "7", name: "Sara", email: "sara.w@yahoo.com", phone: "9887766554", studio: "Wave Studios", role: "Editor", status: "Active", signupType: "Registered", created: "30 Apr 2026" },
    { id: "8", name: "Rajesh", email: "rajesh.k@gmail.com", phone: "8122334455", studio: "Wave Studios", role: "Photographer", status: "Active", signupType: "Google", created: "29 Apr 2026" },
    { id: "9", name: "Paul", email: "anitha.p@gmail.com", phone: "9000111222", studio: "Wave Studios", role: "Editor", status: "Active", signupType: "Registered", created: "28 Apr 2026" },
  ]);

  const [referralsData] = useState([
  {
    id: "r1",
    name: "Referral User",
    email: "referral@gmail.com",
    phone: "9999999999",
    studio: "Wave Studios",
    role: "Referral",
    status: "Active",
    signupType: "Registered",
    created: "06 May 2026",
  },
]);

  

  const [photographersData, setPhotographersData] = useState([
    { id: "p1", name: "Srikharan Kamesh", email: "srikharankamesh@gmail.com", phone: "8888888888", role: "Freelance Photographer", status: "Active", signupType: "Registered", created: "06 May 2026", shoots: 18, location: "Chennai", notes: "Reliable for wedding and event shoots." },
    { id: "p2", name: "photo grapher(user-2)", email: "tolewi9752@pertok.com", phone: "8383838383", role: "Freelance Photographer", status: "Active", signupType: "Invited", created: "05 May 2026", shoots: 4, location: "Bangalore", notes: "Invite opened, profile pending." },
    { id: "p3", name: "photo grapher(user-1)", email: "velafe9699@mugstock.com", phone: "8569742356", role: "Freelance Photographer", status: "Active", signupType: "Invited", created: "04 May 2026", shoots: 6, location: "Coimbatore", notes: "Good candid photographer." },
    { id: "p4", name: "photographer-chan dran", email: "tosaf14628@soppat.com", phone: "5457452158", role: "Freelance Photographer", status: "Active", signupType: "Registered", created: "03 May 2026", shoots: 24, location: "Madurai", notes: "Preferred for outdoor shoots." },
    { id: "p5", name: "photographer chandran", email: "netimil194@bmoar.com", phone: "3838383678", role: "Freelance Photographer", status: "Inactive", signupType: "Invited", created: "02 May 2026", shoots: 2, location: "Trichy", notes: "Needs follow up." },
    { id: "p6", name: "ley opo", email: "leyopoj378@spotshops.com", phone: "9840203148", role: "Freelance Photographer", status: "Pending", signupType: "Registered", created: "01 May 2026", shoots: 0, location: "Salem", notes: "New profile under review." },
  ]);

  useEffect(() => {
    if (editUser) {
      editForm.setFieldsValue(editUser);
    }
  }, [editUser, editForm]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      message.success("Users refreshed");
    }, 800);
  };

  const currentData = useMemo(() => {
    if (activeTab === "referrals") return referralsData;
    if (activeTab === "photographers") return photographersData;
    return usersData;
  }, [activeTab, referralsData, photographersData, usersData]);
  const filterOptions = useMemo(() => {
    if (activeTab !== "photographers") {
      return ["All", "Active", "Inactive", "Pending", "Registered", "Google"];
    }

    return ["All", "Active", "Inactive", "Pending", "Registered", "Invited"];
  }, [activeTab]);

  const filterCounts = useMemo(() => {
    return filterOptions.reduce((acc, filter) => {
      acc[filter] =
        filter === "All"
          ? currentData.length
          : currentData.filter(
              (item) => item.status === filter || item.signupType === filter
            ).length;

      return acc;
    }, {});
  }, [currentData, filterOptions]);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return currentData.filter((user) => {
      const matchesSearch =
        !term ||
        Object.values(user).some((value) =>
          String(value).toLowerCase().includes(term)
        );

      const matchesFilter =
        activeFilter === "All" ||
        user.status === activeFilter ||
        user.signupType === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [currentData, searchTerm, activeFilter]);

  const highlightText = (value) => {
    if (!searchTerm.trim()) return value;

    const regex = new RegExp(`(${escapeRegExp(searchTerm.trim())})`, "gi");
    const parts = String(value).split(regex);

    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.trim().toLowerCase() ? (
        <mark className="search-highlight" key={`${part}-${index}`}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleEditSave = (values) => {
    const updatedValues = {
      ...values,
      shoots: values.shoots === undefined ? values.shoots : Number(values.shoots),
    };

    if (editUser.id.startsWith("p")) {
      setPhotographersData((prev) =>
        prev.map((item) =>
          item.id === editUser.id ? { ...item, ...updatedValues } : item
        )
      );
    } else {
      setUsersData((prev) =>
        prev.map((item) =>
          item.id === editUser.id ? { ...item, ...updatedValues } : item
        )
      );
    }

    setEditUser(null);
    message.success("User updated");
  };

  const handleDeleteConfirm = () => {
    if (deleteUser.id.startsWith("p")) {
      setPhotographersData((prev) =>
        prev.filter((item) => item.id !== deleteUser.id)
      );
    } else {
      setUsersData((prev) =>
        prev.filter((item) => item.id !== deleteUser.id)
      );
    }

    setSelectedRowKeys((prev) => prev.filter((key) => key !== deleteUser.id));
    message.success(`${deleteUser.name} deleted`);
    setDeleteUser(null);
  };

  const handleBulkDelete = () => {
    setPhotographersData((prev) =>
      prev.filter((item) => !selectedRowKeys.includes(item.id))
    );
    message.success(`${selectedRowKeys.length} photographers deleted`);
    setSelectedRowKeys([]);
    setBulkDeleteOpen(false);
  };

  const handleBulkStatus = (status) => {
    setPhotographersData((prev) =>
      prev.map((item) =>
        selectedRowKeys.includes(item.id) ? { ...item, status } : item
      )
    );
    message.success(`Selected photographers marked ${status}`);
  };

  const handleBulkSignup = () => {
    setPhotographersData((prev) =>
      prev.map((item) =>
        selectedRowKeys.includes(item.id)
          ? { ...item, signupType: "Invited" }
          : item
      )
    );
    message.success("Selected photographers marked Invited");
  };

  const handleInvite = (values) => {
    const isPhotographer = activeTab === "photographers";

    const newUser = {
      id: `${isPhotographer ? "p" : "u"}${Date.now()}`,
      name: values.name,
      email: values.email,
      phone: values.phone,
      studio: "Wave Studios",
      role: isPhotographer ? "Freelance Photographer" : values.role,
      status: "Pending",
      signupType: "Invited",
      created: "18 May 2026",
      shoots: 0,
      location: values.location || "Chennai",
      notes: "Invited from users page.",
    };

    if (isPhotographer) {
      setPhotographersData((prev) => [newUser, ...prev]);
    } else {
      setUsersData((prev) => [newUser, ...prev]);
    }

    inviteForm.resetFields();
    setInviteOpen(false);
    message.success("Invite added");
  };

  const renderStatusTag = (status) => (
    <Tag className={`status-pill transparent-status status-${status.toLowerCase()}`}>
      {status}
    </Tag>
  );

  const renderSignupTag = (text) => (
    <Tag className={text === "Invited" ? "signup-tag-invited" : "signup-tag-outline"}>
      {text}
    </Tag>
  );

  const photographerPreview = (record) => (
    <div className="photographer-preview-card">
      <div className="preview-header">
        <Avatar className="preview-avatar">{record.name.charAt(0)}</Avatar>
        <div>
          <Text className="preview-name">{record.name}</Text>
          <Text className="preview-role">{record.role}</Text>
        </div>
      </div>

      <div className="preview-info-grid">
        <span><MailOutlined /> Email</span>
        <strong>{record.email}</strong>
        <span><PhoneOutlined /> Phone</span>
        <strong>{record.phone}</strong>
        <span><UserSwitchOutlined /> Shoots</span>
        <strong>{record.shoots ?? "-"}</strong>
        <span><EnvironmentOutlined /> Location</span>
        <strong>{record.location || "Wave Studios"}</strong>
      </div>

      <div className="preview-tags">
        {renderStatusTag(record.status)}
        {renderSignupTag(record.signupType)}
      </div>

      <Button
        type="primary"
        size="small"
        icon={<EyeOutlined />}
        className="preview-action-btn"
        onClick={() => setViewUser(record)}
      >
        View Profile
      </Button>
    </div>
  );

  const commonColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: 240,
      render: (text, record) =>
        activeTab === "photographers" ? (
          <Popover
            content={photographerPreview(record)}
            placement="right"
            trigger="hover"
            overlayClassName="photographer-preview-popover"
          >
            <span className="applicant-name photographer-name-hover">
              <Avatar size="small" className="name-avatar">
                {text.charAt(0)}
              </Avatar>
              {highlightText(text)}
            </span>
          </Popover>
        ) : (
          <span className="applicant-name">{highlightText(text)}</span>
        ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 280,
      render: (text) => highlightText(text),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 160,
      render: (text) => highlightText(text),
    },
  ];

  const actionColumn = {
    title: "",
    key: "actions",
    fixed: "right",
    width: 124,
    render: (_, record) => (
      <Space size={6} className="photographer-actions">
        <Tooltip title="View" placement="top">
          <Button
            type="text"
            icon={<EyeOutlined />}
            className="photographer-action-btn view-action"
            onClick={() => setViewUser(record)}
          />
        </Tooltip>

        <Tooltip title="Edit" placement="top">
          <Button
            type="text"
            icon={<EditOutlined />}
            className="photographer-action-btn edit-action"
            onClick={() => setEditUser(record)}
          />
        </Tooltip>

        <Tooltip title="Delete" placement="top">
          <Button
            type="text"
            icon={<DeleteOutlined />}
            className="photographer-action-btn delete-action"
            onClick={() => setDeleteUser(record)}
          />
        </Tooltip>
      </Space>
    ),
  };

  const usersColumns = [
    ...commonColumns,
    {
      title: "Studio",
      dataIndex: "studio",
      key: "studio",
      width: 160,
      render: (text) => <Tag className="studio-pill">{text}</Tag>,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 180,
      render: (text) => <Tag className="role-pill">{text}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: renderStatusTag,
    },
    {
      title: "Signup type",
      dataIndex: "signupType",
      key: "signupType",
      width: 160,
      render: renderSignupTag,
    },
    {
      title: "Created",
      dataIndex: "created",
      key: "created",
      sorter: true,
      width: 160,
    },
    actionColumn,
  ];

  const photographersColumns = [
    ...commonColumns,
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 250,
      render: (text) => (
        <Tag className="role-pill photographer-role-pill">
          {text}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: renderStatusTag,
    },
    {
      title: "Signup type",
      dataIndex: "signupType",
      key: "signupType",
      width: 160,
      render: renderSignupTag,
    },
    {
      title: "Created",
      dataIndex: "created",
      key: "created",
      sorter: true,
      width: 160,
    },
    actionColumn,
  ];

  const filterMenu = (
    <div className="filter-popover-panel">
      <Text strong>Quick filter</Text>
      <div className="filter-popover-list">
        {filterOptions.map((filter) => (
          <Button
            key={filter}
            type={activeFilter === filter ? "primary" : "text"}
            onClick={() => {
              setActiveFilter(filter);
              setFilterOpen(false);
            }}
          >
            {filter} ({filterCounts[filter] || 0})
          </Button>
        ))}
      </div>
    </div>
  );

  const columns = activeTab === "photographers" ? photographersColumns : usersColumns;

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
            </Header>

            <Content className="dashboard-content review-content">
              <div className="table-wrapper animated-panel user-panel-container">
                <Tabs
                  activeKey={activeTab}
                  onChange={(key) => {
                    setActiveTab(key);
                    setSearchTerm("");
                    setActiveFilter("All");
                    setSelectedRowKeys([]);
                  }}
                  className="user-tabs-glass"
                  items={[
                    { label: "All Users", key: "all" },
                    { label: "Referrals", key: "referrals" },
                    { label: "Photographers", key: "photographers" },
                  ]}
                />

                <div className="smart-filter-row">
                  {filterOptions.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={`smart-chip ${activeFilter === filter ? "active" : ""}`}
                      onClick={() => setActiveFilter(filter)}
                    >
                      <span>{filter}</span>
                      <b>{filterCounts[filter] || 0}</b>
                    </button>
                  ))}
                </div>

                <div className="review-toolbar user-toolbar-inline">
                  <Space size="middle" wrap>
                    <Input
                      placeholder="Search by name, email, or phone..."
                      prefix={<SearchOutlined />}
                      className="review-search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      allowClear
                    />

                    <Popover
                      open={filterOpen}
                      onOpenChange={setFilterOpen}
                      content={filterMenu}
                      trigger="click"
                      placement="bottomLeft"
                    >
                      <Button type="text" icon={<FilterOutlined />} className="icon-btn-glass" />
                    </Popover>

                    <Button
                      type="text"
                      icon={<ReloadOutlined spin={isLoading} />}
                      onClick={handleRefresh}
                      className="icon-btn-glass"
                    />
                  </Space>

                  <Space wrap>
                    {activeTab === "photographers" && selectedRowKeys.length > 0 && (
                      <div className="bulk-action-bar">
                        <span>{selectedRowKeys.length} selected</span>

                        <Tooltip title="Mark active">
                          <Button
                            type="text"
                            icon={<CheckCircleOutlined />}
                            className="bulk-icon-btn active-bulk"
                            onClick={() => handleBulkStatus("Active")}
                          />
                        </Tooltip>

                        <Tooltip title="Mark inactive">
                          <Button
                            type="text"
                            icon={<CloseCircleOutlined />}
                            className="bulk-icon-btn inactive-bulk"
                            onClick={() => handleBulkStatus("Inactive")}
                          />
                        </Tooltip>

                        <Tooltip title="Mark invited">
                          <Button
                            type="text"
                            icon={<SendOutlined />}
                            className="bulk-icon-btn invite-bulk"
                            onClick={handleBulkSignup}
                          />
                        </Tooltip>

                        <Tooltip title="Delete selected">
                          <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            className="bulk-icon-btn delete-bulk"
                            onClick={() => setBulkDeleteOpen(true)}
                          />
                        </Tooltip>
                      </div>
                    )}

                    <Button
                      type="primary"
                      icon={<UserAddOutlined />}
                      className="invite-btn-styled"
                      onClick={() => setInviteOpen(true)}
                    >
                      Invite User
                    </Button>
                  </Space>
                </div>

                <Table
                  columns={columns}
                  dataSource={filteredData}
                  pagination={false}
                  className={`review-table user-table-custom ${
                    activeTab === "photographers" ? "photographers-hover-table" : ""
                  }`}
                  rowKey="id"
                  rowSelection={
                    activeTab === "photographers"
                      ? {
                          selectedRowKeys,
                          onChange: setSelectedRowKeys,
                        }
                      : undefined
                  }
                  scroll={{ x: activeTab === "photographers" ? 1520 : 1540 }}
                  locale={{
                    emptyText: <Empty description="No data" />,
                  }}
                />
              </div>

              <div className="footer-copyright">
                <Text>© PSP</Text>
              </div>
            </Content>
          </Layout>
        </div>

        <Modal
          open={!!viewUser}
          onCancel={() => setViewUser(null)}
          footer={null}
          width={760}
          title={null}
          className="creative-modal view-modal"
          centered
        >
          {viewUser && (
            <div className="modal-shell">
              <div className="modal-orbit modal-orbit-blue" />

              <div className="profile-modal-hero">
                <Avatar size={82} className="modal-profile-avatar">
                  {viewUser.name.charAt(0)}
                </Avatar>

                <div>
                  <Title level={3}>{viewUser.name}</Title>
                  <Text>{viewUser.role}</Text>
                  <div className="modal-tags">
                    {renderStatusTag(viewUser.status)}
                    {renderSignupTag(viewUser.signupType)}
                  </div>
                </div>
              </div>

              <Divider />

              <div className="modal-info-grid">
                <div className="modal-info-card">
                  <MailOutlined />
                  <span>Email</span>
                  <strong>{viewUser.email}</strong>
                </div>

                <div className="modal-info-card">
                  <PhoneOutlined />
                  <span>Phone</span>
                  <strong>{viewUser.phone}</strong>
                </div>

                <div className="modal-info-card">
                  <CalendarOutlined />
                  <span>Created</span>
                  <strong>{viewUser.created}</strong>
                </div>

                <div className="modal-info-card">
                  <EnvironmentOutlined />
                  <span>Location</span>
                  <strong>{viewUser.location || viewUser.studio || "Wave Studios"}</strong>
                </div>

                <div className="modal-info-card">
                  <UserSwitchOutlined />
                  <span>Shoots</span>
                  <strong>{viewUser.shoots ?? "-"}</strong>
                </div>

                <div className="modal-info-card wide-card">
                  <EditOutlined />
                  <span>Notes</span>
                  <strong>{viewUser.notes || "No notes added"}</strong>
                </div>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          open={!!editUser}
          onCancel={() => setEditUser(null)}
          footer={null}
          width={620}
          title={null}
          className="creative-modal edit-modal"
          centered
        >
          {editUser && (
            <div className="modal-shell">
              <div className="modal-orbit modal-orbit-violet" />

              <div className="modal-title-row">
                <Avatar className="modal-small-avatar">
                  {editUser.name.charAt(0)}
                </Avatar>
                <div>
                  <Title level={3}>Edit User</Title>
                  <Text>Update profile details and save changes.</Text>
                </div>
              </div>

              <Form form={editForm} layout="vertical" onFinish={handleEditSave}>
                <div className="edit-form-grid">
                  <Form.Item name="name" label="Name" rules={[{ required: true, message: "Enter name" }]}>
                    <Input />
                  </Form.Item>

                  <Form.Item name="email" label="Email" rules={[{ required: true, message: "Enter email" }, { type: "email", message: "Enter a valid email" }]}>
                    <Input />
                  </Form.Item>

                  <Form.Item name="phone" label="Phone" rules={[{ required: true, message: "Enter phone" }]}>
                    <Input />
                  </Form.Item>

                  <Form.Item name="role" label="Role">
                    <Select
                      options={[
                        { value: "Studio Admin", label: "Studio Admin" },
                        { value: "Freelance Photographer", label: "Freelance Photographer" },
                        { value: "Photographer", label: "Photographer" },
                        { value: "Editor", label: "Editor" },
                        { value: "Lead Photographer", label: "Lead Photographer" },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item name="status" label="Status">
                    <Select
                      options={[
                        { value: "Active", label: "Active" },
                        { value: "Inactive", label: "Inactive" },
                        { value: "Pending", label: "Pending" },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item name="signupType" label="Signup type">
                    <Select
                      options={[
                        { value: "Registered", label: "Registered" },
                        { value: "Invited", label: "Invited" },
                        { value: "Google", label: "Google" },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item name="location" label="Location">
                    <Input />
                  </Form.Item>

                  <Form.Item name="shoots" label="Shoots">
                    <Input type="number" />
                  </Form.Item>

                  <Form.Item name="notes" label="Notes" className="edit-notes-field">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                </div>

                <div className="modal-action-row">
                  <Button onClick={() => setEditUser(null)}>Cancel</Button>
                  <Button htmlType="submit" type="primary" icon={<SaveOutlined />} className="invite-btn-styled">
                    Save Changes
                  </Button>
                </div>
              </Form>
            </div>
          )}
        </Modal>

        <Modal
          open={inviteOpen}
          onCancel={() => setInviteOpen(false)}
          footer={null}
          width={560}
          title={null}
          className="creative-modal edit-modal"
          centered
        >
          <div className="modal-shell">
            <div className="modal-title-row">
              <Avatar className="modal-small-avatar">
                <UserAddOutlined />
              </Avatar>
              <div>
                <Title level={3}>Invite User</Title>
                <Text>Add a new invited user to the current tab.</Text>
              </div>
            </div>

            <Form form={inviteForm} layout="vertical" onFinish={handleInvite}>
              <div className="edit-form-grid">
                <Form.Item name="name" label="Name" rules={[{ required: true, message: "Enter name" }]}>
                  <Input />
                </Form.Item>

                <Form.Item name="email" label="Email" rules={[{ required: true, message: "Enter email" }, { type: "email", message: "Enter a valid email" }]}>
                  <Input />
                </Form.Item>

                <Form.Item name="phone" label="Phone" rules={[{ required: true, message: "Enter phone" }]}>
                  <Input />
                </Form.Item>

                <Form.Item name="role" label="Role" initialValue="Photographer">
                  <Select
                    options={[
                      { value: "Studio Admin", label: "Studio Admin" },
                      { value: "Photographer", label: "Photographer" },
                      { value: "Editor", label: "Editor" },
                    ]}
                  />
                </Form.Item>

                <Form.Item name="location" label="Location" className="edit-notes-field">
                  <Input />
                </Form.Item>
              </div>

              <div className="modal-action-row">
                <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button htmlType="submit" type="primary" icon={<SendOutlined />} className="invite-btn-styled">
                  Send Invite
                </Button>
              </div>
            </Form>
          </div>
        </Modal>

        <Modal
          open={!!deleteUser}
          onCancel={() => setDeleteUser(null)}
          footer={null}
          width={460}
          title={null}
          className="creative-modal delete-modal"
          centered
        >
          {deleteUser && (
            <div className="modal-shell delete-modal-shell">
              <div className="delete-warning-icon">
                <WarningOutlined />
              </div>

              <Title level={3}>Delete User?</Title>
              <Text>
                This will remove the user from the table. This action cannot be undone in the current session.
              </Text>

              <div className="delete-profile-line">
                <Avatar>{deleteUser.name.charAt(0)}</Avatar>
                <div>
                  <strong>{deleteUser.name}</strong>
                  <span>{deleteUser.email}</span>
                </div>
              </div>

              <div className="modal-action-row delete-actions-row">
                <Button onClick={() => setDeleteUser(null)}>Cancel</Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleDeleteConfirm}>
                  Delete
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          open={bulkDeleteOpen}
          onCancel={() => setBulkDeleteOpen(false)}
          footer={null}
          width={460}
          title={null}
          className="creative-modal delete-modal"
          centered
        >
          <div className="modal-shell delete-modal-shell">
            <div className="delete-warning-icon">
              <WarningOutlined />
            </div>

            <Title level={3}>Delete Selected?</Title>
            <Text>
              This will remove {selectedRowKeys.length} selected photographers from the table.
            </Text>

            <div className="modal-action-row delete-actions-row">
              <Button onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
                Delete Selected
              </Button>
            </div>
          </div>
        </Modal>
      </Layout>
    </ConfigProvider>
  );
};

export default UsersPage;
