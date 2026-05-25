import { useEffect, useMemo, useState } from "react";
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
  Tooltip,
  Popover,
  Modal,
  Form,
  Select,
  message,
  Empty,
  Divider,
  Progress,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  UserAddOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  UserSwitchOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  SaveOutlined,
  TeamOutlined,
  LinkOutlined,
  CameraOutlined,
  AppstoreOutlined,
  GoogleOutlined,
  ClockCircleOutlined,
  StarOutlined,
} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import "./UsersPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const fallbackImage =
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=900&q=80";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const filterIconMap = {
  All: <AppstoreOutlined />,
  Active: <CheckCircleOutlined />,
  Inactive: <CloseCircleOutlined />,
  Pending: <ClockCircleOutlined />,
  Registered: <UserSwitchOutlined />,
  Google: <GoogleOutlined />,
  Invited: <SendOutlined />,
};

const tabItems = [
  {
    key: "all",
    label: (
      <Tooltip title="All users">
        <span className="tab-icon-label">
          <TeamOutlined />
        </span>
      </Tooltip>
    ),
  },
  {
    key: "referrals",
    label: (
      <Tooltip title="Referrals">
        <span className="tab-icon-label">
          <LinkOutlined />
        </span>
      </Tooltip>
    ),
  },
  {
    key: "photographers",
    label: (
      <Tooltip title="Photographers">
        <span className="tab-icon-label">
          <CameraOutlined />
        </span>
      </Tooltip>
    ),
  },
];

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
    {
      id: "1",
      name: "Kamesh Srikharan.T",
      email: "kameshsrikharan.t@gmail.com",
      phone: "8888888888",
      studio: "Wave Studios",
      role: "Studio Admin",
      status: "Active",
      signupType: "Registered",
      created: "06 May 2026",
      location: "Chennai",
      score: 92,
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
      notes: "Manages studio users and booking activity.",
    },
    {
      id: "2",
      name: "Arun Kumar",
      email: "arun.photography@gmail.com",
      phone: "9840123456",
      studio: "Wave Studios",
      role: "Photographer",
      status: "Active",
      signupType: "Google",
      created: "05 May 2026",
      location: "Coimbatore",
      score: 84,
      image:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80",
      notes: "Strong candid photography profile.",
    },
    {
      id: "3",
      name: "Priya",
      email: "priya.sharma@outlook.com",
      phone: "9123456789",
      studio: "Wave Studios",
      role: "Editor",
      status: "Inactive",
      signupType: "Registered",
      created: "04 May 2026",
      location: "Bangalore",
      score: 61,
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
      notes: "Editing access currently inactive.",
    },
    {
      id: "4",
      name: "John",
      email: "john.d@wavestudios.com",
      phone: "8056123987",
      studio: "Wave Studios",
      role: "Photographer",
      status: "Active",
      signupType: "Registered",
      created: "03 May 2026",
      location: "Madurai",
      score: 76,
      image:
        "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=900&q=80",
      notes: "Event photographer.",
    },
    {
      id: "5",
      name: "Meera",
      email: "meera.reddy@gmail.com",
      phone: "7012345678",
      studio: "Wave Studios",
      role: "Studio Admin",
      status: "Active",
      signupType: "Google",
      created: "02 May 2026",
      location: "Salem",
      score: 88,
      image:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
      notes: "Handles booking operations.",
    },
    {
      id: "6",
      name: "Vikram",
      email: "vikram.seth@live.com",
      phone: "9944556677",
      studio: "Wave Studios",
      role: "Photographer",
      status: "Pending",
      signupType: "Registered",
      created: "01 May 2026",
      location: "Trichy",
      score: 45,
      image:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80",
      notes: "Pending approval.",
    },
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
      location: "Chennai",
      score: 70,
      image:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
      notes: "Referral contact.",
    },
  ]);

  const [photographersData, setPhotographersData] = useState([
    {
      id: "p1",
      name: "Srikharan Kamesh",
      email: "srikharankamesh@gmail.com",
      phone: "8888888888",
      role: "Freelance Photographer",
      status: "Active",
      signupType: "Registered",
      created: "06 May 2026",
      shoots: 18,
      location: "Chennai",
      score: 94,
      image:
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
      notes: "Reliable for wedding and event shoots.",
    },
    {
      id: "p2",
      name: "photo grapher(user-2)",
      email: "tolewi9752@pertok.com",
      phone: "8383838383",
      role: "Freelance Photographer",
      status: "Active",
      signupType: "Invited",
      created: "05 May 2026",
      shoots: 4,
      location: "Bangalore",
      score: 52,
      image:
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
      notes: "Invite opened, profile pending.",
    },
    {
      id: "p3",
      name: "photo grapher(user-1)",
      email: "velafe9699@mugstock.com",
      phone: "8569742356",
      role: "Freelance Photographer",
      status: "Active",
      signupType: "Invited",
      created: "04 May 2026",
      shoots: 6,
      location: "Coimbatore",
      score: 64,
      image:
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=900&q=80",
      notes: "Good candid photographer.",
    },
    {
      id: "p4",
      name: "photographer-chan dran",
      email: "tosaf14628@soppat.com",
      phone: "5457452158",
      role: "Freelance Photographer",
      status: "Active",
      signupType: "Registered",
      created: "03 May 2026",
      shoots: 24,
      location: "Madurai",
      score: 89,
      image:
        "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=900&q=80",
      notes: "Preferred for outdoor shoots.",
    },
    {
      id: "p5",
      name: "photographer chandran",
      email: "netimil194@bmoar.com",
      phone: "3838383678",
      role: "Freelance Photographer",
      status: "Inactive",
      signupType: "Invited",
      created: "02 May 2026",
      shoots: 2,
      location: "Trichy",
      score: 35,
      image:
        "https://images.unsplash.com/photo-1528892952291-009c663ce843?auto=format&fit=crop&w=900&q=80",
      notes: "Needs follow up.",
    },
    {
      id: "p6",
      name: "ley opo",
      email: "leyopoj378@spotshops.com",
      phone: "9840203148",
      role: "Freelance Photographer",
      status: "Pending",
      signupType: "Registered",
      created: "01 May 2026",
      shoots: 0,
      location: "Salem",
      score: 25,
      image:
        "https://images.unsplash.com/photo-1554080353-a576cf803bda?auto=format&fit=crop&w=900&q=80",
      notes: "New profile under review.",
    },
  ]);

  useEffect(() => {
    if (editUser) editForm.setFieldsValue(editUser);
  }, [editUser, editForm]);

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

  const handleRefresh = () => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      message.success("Users refreshed");
    }, 800);
  };

  const handleEditSave = (values) => {
    const updatedValues = {
      ...values,
      shoots: values.shoots === undefined ? values.shoots : Number(values.shoots),
      score: values.score === undefined ? values.score : Number(values.score),
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
    message.success("Saved");
  };

  const handleDeleteConfirm = () => {
    if (deleteUser.id.startsWith("p")) {
      setPhotographersData((prev) =>
        prev.filter((item) => item.id !== deleteUser.id)
      );
    } else {
      setUsersData((prev) => prev.filter((item) => item.id !== deleteUser.id));
    }

    setSelectedRowKeys((prev) => prev.filter((key) => key !== deleteUser.id));
    message.success("Deleted");
    setDeleteUser(null);
  };

  const handleBulkDelete = () => {
    setPhotographersData((prev) =>
      prev.filter((item) => !selectedRowKeys.includes(item.id))
    );

    message.success("Deleted");
    setSelectedRowKeys([]);
    setBulkDeleteOpen(false);
  };

  const handleBulkStatus = (status) => {
    setPhotographersData((prev) =>
      prev.map((item) =>
        selectedRowKeys.includes(item.id) ? { ...item, status } : item
      )
    );

    message.success("Updated");
  };

  const handleBulkSignup = () => {
    setPhotographersData((prev) =>
      prev.map((item) =>
        selectedRowKeys.includes(item.id)
          ? { ...item, signupType: "Invited" }
          : item
      )
    );

    message.success("Invited");
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
      score: 10,
      image: values.image || fallbackImage,
      notes: "Invited from users page.",
    };

    if (isPhotographer) setPhotographersData((prev) => [newUser, ...prev]);
    else setUsersData((prev) => [newUser, ...prev]);

    inviteForm.resetFields();
    setInviteOpen(false);
    message.success("Invite sent");
  };

  const renderStatusTag = (status) => (
    <Tooltip title={`Status: ${status}`}>
      <Tag className={`status-dot status-${status.toLowerCase()}`}>
        {filterIconMap[status]}
      </Tag>
    </Tooltip>
  );

  const renderSignupTag = (text) => (
    <Tooltip title={`Signup: ${text}`}>
      <Tag className={text === "Invited" ? "signup-dot invited" : "signup-dot"}>
        {filterIconMap[text] || <UserSwitchOutlined />}
      </Tag>
    </Tooltip>
  );

  const compactTitle = (title, icon) => (
    <Tooltip title={title}>
      <span className="column-icon-title">{icon}</span>
    </Tooltip>
  );

  const quickActions = (record) => (
    <div className="quick-action-panel">
      <Tooltip title="View">
        <button onClick={() => setViewUser(record)}>
          <EyeOutlined />
        </button>
      </Tooltip>

      <Tooltip title="Edit">
        <button onClick={() => setEditUser(record)}>
          <EditOutlined />
        </button>
      </Tooltip>

      <Tooltip title="Delete">
        <button className="danger" onClick={() => setDeleteUser(record)}>
          <DeleteOutlined />
        </button>
      </Tooltip>
    </div>
  );

  const commonColumns = [
    {
      title: compactTitle("Name", <UserSwitchOutlined />),
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: 250,
      render: (text, record) => (
        <Popover
          content={quickActions(record)}
          placement="right"
          trigger={["hover", "click"]}
          overlayClassName="quick-action-popover"
        >
          <div className="clean-user-cell">
            <Avatar className="name-avatar">{text.charAt(0)}</Avatar>

            <div>
              <Tooltip title={record.name}>
                <strong>{highlightText(text)}</strong>
              </Tooltip>

              <span>
                {activeTab === "photographers" ? <CameraOutlined /> : <TeamOutlined />}
                {record.role}
              </span>
            </div>
          </div>
        </Popover>
      ),
    },
    {
      title: compactTitle("Email", <MailOutlined />),
      dataIndex: "email",
      key: "email",
      width: 245,
      render: (text) => (
        <Tooltip title={text}>
          <span className="muted-cell">{highlightText(text)}</span>
        </Tooltip>
      ),
    },
    {
      title: compactTitle("Phone", <PhoneOutlined />),
      dataIndex: "phone",
      key: "phone",
      width: 150,
      render: (text) => (
        <Tooltip title={text}>
          <span className="muted-cell">{highlightText(text)}</span>
        </Tooltip>
      ),
    },
  ];

  const actionColumn = {
    title: compactTitle("Actions", <AppstoreOutlined />),
    key: "actions",
    fixed: "right",
    width: 132,
    render: (_, record) => (
      <Space size={6} className="photographer-actions">
        <Tooltip title="View profile">
          <Button
            type="text"
            icon={<EyeOutlined />}
            className="circle-action view-action"
            onClick={() => setViewUser(record)}
          />
        </Tooltip>

        <Tooltip title="Edit profile">
          <Button
            type="text"
            icon={<EditOutlined />}
            className="circle-action edit-action"
            onClick={() => setEditUser(record)}
          />
        </Tooltip>

        <Tooltip title="Delete profile">
          <Button
            type="text"
            icon={<DeleteOutlined />}
            className="circle-action delete-action"
            onClick={() => setDeleteUser(record)}
          />
        </Tooltip>
      </Space>
    ),
  };

  const usersColumns = [
    ...commonColumns,
    {
      title: compactTitle("Studio", <EnvironmentOutlined />),
      dataIndex: "studio",
      key: "studio",
      width: 90,
      render: (text) => (
        <Tooltip title={text}>
          <Tag className="icon-pill">
            <EnvironmentOutlined />
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: compactTitle("Status", <CheckCircleOutlined />),
      dataIndex: "status",
      key: "status",
      width: 80,
      render: renderStatusTag,
    },
    {
      title: compactTitle("Signup", <SendOutlined />),
      dataIndex: "signupType",
      key: "signupType",
      width: 80,
      render: renderSignupTag,
    },
    {
      title: compactTitle("Score", <StarOutlined />),
      dataIndex: "score",
      key: "score",
      width: 130,
      render: (score) => (
        <Tooltip title={`Profile score ${score || 0}%`}>
          <Progress percent={score || 0} size="small" showInfo={false} />
        </Tooltip>
      ),
    },
    {
      title: compactTitle("Created", <CalendarOutlined />),
      dataIndex: "created",
      key: "created",
      sorter: true,
      width: 95,
      render: (text) => (
        <Tooltip title={text}>
          <Tag className="icon-pill">
            <CalendarOutlined />
          </Tag>
        </Tooltip>
      ),
    },
    actionColumn,
  ];

  const photographersColumns = [
    ...commonColumns,
    {
      title: compactTitle("Shoots", <CameraOutlined />),
      dataIndex: "shoots",
      key: "shoots",
      width: 95,
      render: (shoots) => (
        <Tooltip title={`${shoots ?? 0} shoots`}>
          <Tag className="shoot-chip">
            <CameraOutlined /> {shoots ?? 0}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: compactTitle("Status", <CheckCircleOutlined />),
      dataIndex: "status",
      key: "status",
      width: 80,
      render: renderStatusTag,
    },
    {
      title: compactTitle("Signup", <SendOutlined />),
      dataIndex: "signupType",
      key: "signupType",
      width: 80,
      render: renderSignupTag,
    },
    {
      title: compactTitle("Score", <StarOutlined />),
      dataIndex: "score",
      key: "score",
      width: 130,
      render: (score) => (
        <Tooltip title={`Photographer score ${score || 0}%`}>
          <Progress percent={score || 0} size="small" showInfo={false} />
        </Tooltip>
      ),
    },
    {
      title: compactTitle("Created", <CalendarOutlined />),
      dataIndex: "created",
      key: "created",
      sorter: true,
      width: 95,
      render: (text) => (
        <Tooltip title={text}>
          <Tag className="icon-pill">
            <CalendarOutlined />
          </Tag>
        </Tooltip>
      ),
    },
    actionColumn,
  ];

  const filterMenu = (
    <div className="filter-popover-panel">
      <div className="filter-popover-list">
        {filterOptions.map((filter) => (
          <Tooltip title={filter} key={filter}>
            <Button
              type={activeFilter === filter ? "primary" : "text"}
              icon={filterIconMap[filter]}
              onClick={() => {
                setActiveFilter(filter);
                setFilterOpen(false);
              }}
            >
              {filterCounts[filter] || 0}
            </Button>
          </Tooltip>
        ))}
      </div>
    </div>
  );

  const columns = activeTab === "photographers" ? photographersColumns : usersColumns;

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#3b82f6", borderRadius: 14 } }}>
      <Layout className="dashboard-page dashboard-dark review-page user-visual-page">
        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell user-shell">
            <Header className="dashboard-navbar review-navbar user-navbar">
              <div className="dashboard-brand">
                <Title level={3} className="dashboard-title review-title user-page-title">
                  <TeamOutlined />
                </Title>
              </div>

              <div className="user-mini-stats">
                <Tooltip title="Visible users">
                  <span>
                    <TeamOutlined /> {filteredData.length}
                  </span>
                </Tooltip>

                <Tooltip title="Active users">
                  <span>
                    <CheckCircleOutlined /> {filterCounts.Active || 0}
                  </span>
                </Tooltip>
              </div>
            </Header>

            <Content className="dashboard-content review-content user-content">
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
                  items={tabItems}
                />

                <div className="user-hero-strip">
                  <div>
                    <span className="hero-mini-pill">
                      <TeamOutlined /> Studio People Board
                    </span>

                    <Title level={2}>Users</Title>

                    <Text>
                      Manage users, referrals and photographers with clean rows,
                      icon headers, smart filters and visual profile details.
                    </Text>
                  </div>

                  <div className="hero-face-stack">
                    {filteredData.slice(0, 4).map((item) => (
                      <Tooltip title={item.name} key={item.id}>
                        <img
                          src={item.image || fallbackImage}
                          alt={item.name}
                          onError={(e) => {
                            e.currentTarget.src = fallbackImage;
                          }}
                        />
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <div className="smart-filter-row">
                  {filterOptions.map((filter) => (
                    <Tooltip title={filter} key={filter}>
                      <button
                        type="button"
                        className={`smart-chip ${activeFilter === filter ? "active" : ""}`}
                        onClick={() => setActiveFilter(filter)}
                      >
                        {filterIconMap[filter]}
                        <b>{filterCounts[filter] || 0}</b>
                      </button>
                    </Tooltip>
                  ))}
                </div>

                <div className="review-toolbar user-toolbar-inline">
                  <Space size="middle" wrap>
                    <Input
                      placeholder="Search"
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
                      <Tooltip title="Filter">
                        <Button
                          type="text"
                          icon={<FilterOutlined />}
                          className="icon-btn-glass"
                        />
                      </Tooltip>
                    </Popover>

                    <Tooltip title="Refresh">
                      <Button
                        type="text"
                        icon={<ReloadOutlined spin={isLoading} />}
                        onClick={handleRefresh}
                        className="icon-btn-glass"
                      />
                    </Tooltip>
                  </Space>

                  <Space wrap>
                    {activeTab === "photographers" && selectedRowKeys.length > 0 && (
                      <div className="bulk-action-bar">
                        <b>{selectedRowKeys.length}</b>

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

                    <Tooltip title="Invite user">
                      <Button
                        type="primary"
                        icon={<UserAddOutlined />}
                        className="invite-btn-styled"
                        onClick={() => setInviteOpen(true)}
                      />
                    </Tooltip>
                  </Space>
                </div>

                <Table
                  columns={columns}
                  dataSource={filteredData}
                  pagination={false}
                  className="review-table user-table-custom photographers-hover-table"
                  rowKey="id"
                  rowSelection={
                    activeTab === "photographers"
                      ? { selectedRowKeys, onChange: setSelectedRowKeys }
                      : undefined
                  }
                  scroll={{ x: activeTab === "photographers" ? 1180 : 1220 }}
                  locale={{
                    emptyText: (
                      <Empty
                        description="No matching users"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ),
                  }}
                />
              </div>

              <div className="footer-copyright">
                <Text>© AXS</Text>
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
              <div className="profile-cover">
                <img
                  src={viewUser.image || fallbackImage}
                  alt={viewUser.name}
                  onError={(e) => {
                    e.currentTarget.src = fallbackImage;
                  }}
                />

                <div className="profile-cover-info">
                  <Avatar size={86} className="modal-profile-avatar">
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
              </div>

              <Divider />

              <div className="modal-info-grid">
                {[
                  [<MailOutlined />, "Email", viewUser.email],
                  [<PhoneOutlined />, "Phone", viewUser.phone],
                  [<CalendarOutlined />, "Created", viewUser.created],
                  [
                    <EnvironmentOutlined />,
                    "Location",
                    viewUser.location || viewUser.studio || "Wave Studios",
                  ],
                  [<CameraOutlined />, "Shoots", viewUser.shoots ?? "-"],
                  [<StarOutlined />, "Score", `${viewUser.score ?? 0}%`],
                  [<EditOutlined />, "Notes", viewUser.notes || "-"],
                ].map(([icon, label, value]) => (
                  <Tooltip title={label} key={label}>
                    <div className={`modal-info-card ${label === "Notes" ? "wide-card" : ""}`}>
                      {icon}
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </Modal>

        <Modal
          open={!!editUser}
          onCancel={() => setEditUser(null)}
          footer={null}
          width={660}
          title={null}
          className="creative-modal edit-modal"
          centered
        >
          {editUser && (
            <div className="modal-shell">
              <div className="modal-title-row">
                <Avatar className="modal-small-avatar">
                  <EditOutlined />
                </Avatar>
                <Title level={3}>Edit</Title>
              </div>

              <Form form={editForm} layout="vertical" onFinish={handleEditSave}>
                <div className="edit-form-grid">
                  <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[{ required: true }, { type: "email" }]}
                  >
                    <Input />
                  </Form.Item>

                  <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>

                  <Form.Item name="role" label="Role">
                    <Select
                      options={[
                        { value: "Studio Admin", label: "Studio Admin" },
                        {
                          value: "Freelance Photographer",
                          label: "Freelance Photographer",
                        },
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

                  <Form.Item name="signupType" label="Signup">
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

                  <Form.Item name="score" label="Score">
                    <Input type="number" min={0} max={100} />
                  </Form.Item>

                  <Form.Item name="image" label="Image URL" className="edit-notes-field">
                    <Input />
                  </Form.Item>

                  <Form.Item name="notes" label="Notes" className="edit-notes-field">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                </div>

                <div className="modal-action-row">
                  <Button onClick={() => setEditUser(null)}>Cancel</Button>
                  <Button
                    htmlType="submit"
                    type="primary"
                    icon={<SaveOutlined />}
                    className="invite-btn-styled"
                  />
                </div>
              </Form>
            </div>
          )}
        </Modal>

        <Modal
          open={inviteOpen}
          onCancel={() => setInviteOpen(false)}
          footer={null}
          width={580}
          title={null}
          className="creative-modal edit-modal"
          centered
        >
          <div className="modal-shell">
            <div className="modal-title-row">
              <Avatar className="modal-small-avatar">
                <UserAddOutlined />
              </Avatar>
              <Title level={3}>Invite</Title>
            </div>

            <Form form={inviteForm} layout="vertical" onFinish={handleInvite}>
              <div className="edit-form-grid">
                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>

                <Form.Item
                  name="email"
                  label="Email"
                  rules={[{ required: true }, { type: "email" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
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

                <Form.Item name="location" label="Location">
                  <Input />
                </Form.Item>

                <Form.Item name="image" label="Image URL">
                  <Input />
                </Form.Item>
              </div>

              <div className="modal-action-row">
                <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button
                  htmlType="submit"
                  type="primary"
                  icon={<SendOutlined />}
                  className="invite-btn-styled"
                />
              </div>
            </Form>
          </div>
        </Modal>

        <Modal
          open={!!deleteUser}
          onCancel={() => setDeleteUser(null)}
          footer={null}
          width={430}
          title={null}
          className="creative-modal delete-modal"
          centered
        >
          {deleteUser && (
            <div className="modal-shell delete-modal-shell">
              <div className="delete-warning-icon">
                <WarningOutlined />
              </div>

              <Avatar size={58} className="delete-avatar">
                {deleteUser.name.charAt(0)}
              </Avatar>

              <Title level={3}>{deleteUser.name}</Title>

              <div className="modal-action-row delete-actions-row">
                <Button onClick={() => setDeleteUser(null)}>Cancel</Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleDeleteConfirm} />
              </div>
            </div>
          )}
        </Modal>

        <Modal
          open={bulkDeleteOpen}
          onCancel={() => setBulkDeleteOpen(false)}
          footer={null}
          width={430}
          title={null}
          className="creative-modal delete-modal"
          centered
        >
          <div className="modal-shell delete-modal-shell">
            <div className="delete-warning-icon">
              <WarningOutlined />
            </div>

            <Title level={3}>{selectedRowKeys.length} selected</Title>

            <div className="modal-action-row delete-actions-row">
              <Button onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete} />
            </div>
          </div>
        </Modal>
      </Layout>
    </ConfigProvider>
  );
};

export default UsersPage;