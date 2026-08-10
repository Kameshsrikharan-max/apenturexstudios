import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import {Layout,Typography,Table,Input,Button,Space,ConfigProvider,Tag,Tooltip,Popover,Select,DatePicker,Empty,Badge,message,Dropdown,} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import {SearchOutlined,ReloadOutlined,FilterOutlined,EyeOutlined,DownloadOutlined,MoreOutlined,WalletOutlined,CheckCircleOutlined,ClockCircleOutlined,RollbackOutlined,CalendarOutlined,CreditCardOutlined,MobileOutlined,BankOutlined,SwapOutlined,CloseOutlined,ExportOutlined,DollarCircleOutlined,} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import rootReducer from "../../../redux/rootReducer";
import {fetchTransactionsRequest,refundTransactionRequest,exportTransactionsRequest,resetTransactionError,} from "../../../redux/actions/transactionActions";
import type {StoredTransaction,TransactionStatus,PaymentMethod,} from "../../../redux/types/transactiontypes";
// NEW — same-tab event fired by utils/transactionStore.ts whenever a
// transaction is written from PaymentPage (or anywhere else)
import { TRANSACTIONS_UPDATED_EVENT } from "../../../utils/transactionStore";
import "./Transactionpage.css";

type RootState = ReturnType<typeof rootReducer>;

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;


/*  Types   */

type StatusFilterKey = "All" | TransactionStatus;

interface TransactionRecord extends StoredTransaction {}


/*  Constants / helpers  */


const statusIconMap: Record<StatusFilterKey, ReactNode> = {
  All: <WalletOutlined />,
  Paid: <CheckCircleOutlined />,
  Partial: <ClockCircleOutlined />,
  Pending: <ClockCircleOutlined />,
  Refunded: <RollbackOutlined />,
};

const methodIconMap: Record<PaymentMethod, ReactNode> = {
  UPI: <MobileOutlined />,
  Card: <CreditCardOutlined />,
  "Net Banking": <BankOutlined />,
  Cash: <DollarCircleOutlined />,
  "Bank Transfer": <SwapOutlined />,
};

const formatINR = (value: number) => `₹ ${value.toLocaleString("en-IN")}`;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


/*  CustomModal — matches AXS neon-glass modal pattern                        */


interface CustomModalProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}

const CustomModal = ({ open, onClose, width = 560, children }: CustomModalProps) => {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm-panel creative-modal" style={{ maxWidth: width }}>
        <button className="cm-close" onClick={onClose} aria-label="Close">
          <CloseOutlined />
        </button>
        {children}
      </div>
    </div>
  );
};


/*  TransactionPage                                                            */


const TransactionPage = () => {
  const dispatch = useDispatch<any>();

  // ── Redux state (replaces local transactionStore + useState) ──
  const {
    list: transactions,
    loading: isLoading,
    error,
    refundLoadingId,
    exporting,
  } = useSelector((state: RootState) => state.transaction);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("All");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<any>(null);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [viewTransaction, setViewTransaction] = useState<TransactionRecord | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const PAGE_SIZE = 10;

  const statusOptions: StatusFilterKey[] = ["All", "Paid", "Partial", "Pending", "Refunded"];

  
  useEffect(() => {
    dispatch(fetchTransactionsRequest());
  }, [dispatch]);

  // NEW — refetch whenever PaymentPage (or any other component) writes a
  // transaction to localStorage while this page is mounted, so the table
  // reflects new/edited payments without a manual refresh.
  useEffect(() => {
    const handleUpdate = () => dispatch(fetchTransactionsRequest());
    window.addEventListener(TRANSACTIONS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(TRANSACTIONS_UPDATED_EVENT, handleUpdate);
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(resetTransactionError());
    }
  }, [error, dispatch]);

  const statusCounts = useMemo<Record<string, number>>(() => {
    return statusOptions.reduce((acc: Record<string, number>, status) => {
      acc[status] =
        status === "All"
          ? transactions.length
          : transactions.filter((item) => item.status === status).length;
      return acc;
    }, {});
  }, [transactions]);

  const filteredData = useMemo<TransactionRecord[]>(() => {
    const term = searchTerm.trim().toLowerCase();
    return transactions.filter((row) => {
      const matchesSearch =
        !term ||
        row.eventName.toLowerCase().includes(term) ||
        row.clientName.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      const matchesMethod = methodFilter === "all" || row.method.toLowerCase() === methodFilter;
      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [transactions, searchTerm, statusFilter, methodFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, methodFilter]);

  const highlightText = (value: string | number): ReactNode => {
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
    dispatch(fetchTransactionsRequest());
  };

  const handleExport = () => {
    dispatch(exportTransactionsRequest());
  };

  const handleRefund = (record: TransactionRecord) => {
    if (record.status === "Refunded") {
      message.info("This transaction is already refunded");
      return;
    }
    dispatch(refundTransactionRequest(record.id));
  };

  const totals = useMemo(() => {
    const total = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const successful = transactions
      .filter((t) => t.status === "Paid")
      .reduce((sum, t) => sum + t.amountPaid, 0);
    const pending = transactions
      .filter((t) => t.status === "Pending" || t.status === "Partial")
      .reduce((sum, t) => sum + t.balanceAmount, 0);
    const refunded = transactions
      .filter((t) => t.status === "Refunded")
      .reduce((sum, t) => sum + t.balanceAmount, 0);
    return { total, successful, pending, refunded };
  }, [transactions]);

  const advancedFilterPanel = (
    <div className="filter-adv-panel">
      <div className="filter-adv-title">Filter Transactions</div>
      <div className="filter-adv-grid">
        <div className="filter-adv-item">
          <label>Date Range</label>
          <RangePicker
            className="tx-range-picker"
            popupClassName="tx-range-dropdown"
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
        <div className="filter-adv-item">
          <label>Payment Method</label>
          <Select
            value={methodFilter}
            onChange={setMethodFilter}
            classNames={{ popup: { root: "dark-select-dropdown" } }}
            options={[
              { value: "all", label: "All Methods" },
              { value: "upi", label: "UPI" },
              { value: "card", label: "Card" },
              { value: "net banking", label: "Net Banking" },
              { value: "cash", label: "Cash" },
              { value: "bank transfer", label: "Bank Transfer" },
            ]}
          />
        </div>
      </div>
      <div className="filter-adv-footer">
        <Button
          className="modal-cancel-btn"
          onClick={() => {
            setMethodFilter("all");
            setDateRange(null);
            setStatusFilter("All");
            setFilterOpen(false);
          }}
        >
          Clear Filters
        </Button>
        <Button type="primary" className="invite-btn-styled tx-apply-btn" onClick={() => setFilterOpen(false)}>
          Apply Filters
        </Button>
      </div>
    </div>
  );

  const renderStatusTag = (status: TransactionStatus) => (
    <Tooltip title={`Status: ${status}`}>
      <Tag className={`tx-status-dot tx-status-${status.toLowerCase()}`}>{status}</Tag>
    </Tooltip>
  );

  const renderRowActionsOverlay = (record: TransactionRecord) => {
    const menuItems: MenuProps["items"] = [
      {
        key: "refund",
        label: record.status === "Refunded" ? "Already Refunded" : "Mark as Refunded",
        icon: <RollbackOutlined />,
        disabled: record.status === "Refunded" || refundLoadingId === record.id,
        onClick: () => handleRefund(record),
      },
    ];

    return (
      <div className="tx-row-actions-overlay">
        <Tooltip title="View transaction">
          <Button
            type="text"
            icon={<EyeOutlined />}
            className="tx-action-btn view"
            onClick={(e) => {
              e.stopPropagation();
              setViewTransaction(record);
            }}
          />
        </Tooltip>
        <Tooltip title="Download invoice / receipt">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            className="tx-action-btn download"
            onClick={(e) => {
              e.stopPropagation();
              message.success("Downloading receipt...");
            }}
          />
        </Tooltip>
        <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
          <Tooltip title="More options">
            <Button
              type="text"
              icon={<MoreOutlined />}
              className="tx-action-btn more"
              loading={refundLoadingId === record.id}
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
        </Dropdown>
      </div>
    );
  };

  const columns: ColumnsType<TransactionRecord> = [
    {
      title: "S.No",
      key: "sNo",
      width: 60,
      align: "center",
      render: (_, __, index) => (
        <span className="tx-soft-cell">{(currentPage - 1) * PAGE_SIZE + index + 1}</span>
      ),
    },
    {
      title: "Event Name",
      dataIndex: "eventName",
      key: "eventName",
      width: 220,
      render: (text: string, record) => (
        <button type="button" className="tx-name-cell" onClick={() => setViewTransaction(record)}>
          <span className="tx-name-icon">
            <WalletOutlined />
          </span>
          <span>
            <strong>{highlightText(text)}</strong>
            <small>{record.method}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Client Name",
      dataIndex: "clientName",
      key: "clientName",
      width: 160,
      render: (text: string) => <span className="tx-soft-cell">{highlightText(text)}</span>,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (text: string) => (
        <Tag className="tx-pipeline-tag">
          <CalendarOutlined /> {text}
        </Tag>
      ),
    },
    {
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 130,
      align: "right",
      render: (value: number) => <span className="tx-soft-cell">{formatINR(value)}</span>,
    },
    {
      title: "Amount Paid",
      dataIndex: "amountPaid",
      key: "amountPaid",
      width: 130,
      align: "right",
      render: (value: number) => <span className="tx-cell-paid">{formatINR(value)}</span>,
    },
    {
      title: "Balance",
      dataIndex: "balanceAmount",
      key: "balanceAmount",
      width: 120,
      align: "right",
      render: (value: number) =>
        value > 0 ? (
          <span className="tx-cell-balance">{formatINR(value)}</span>
        ) : (
          <span className="tx-soft-cell tx-muted">—</span>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      align: "center",
      render: (status: TransactionStatus) => renderStatusTag(status),
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      align: "center",
      fixed: "right",
      className: "tx-actions-anchor-cell",
      render: (_, record) => renderRowActionsOverlay(record),
    },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#38bdf8", borderRadius: 14 } }}>
      <Layout className="dashboard-page dashboard-dark review-page transaction-visual-page">
        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell transaction-shell">
            <Header className="dashboard-navbar review-navbar transaction-navbar" />

            <Content className="dashboard-content review-content transaction-content">
              <div className="transaction-page-heading">
                <Title level={2}>Transaction Management</Title>
              </div>

              <div className="table-wrapper animated-panel transaction-panel-container">
                <div className="tx-hero-strip">
                  <div>
                    <span className="hero-mini-pill">
                      <WalletOutlined /> Payment Records
                    </span>
                    <Title level={2}>Transaction Management</Title>
                    <Text>
                      Manage all event payment transactions, balances, and payment history.
                    </Text>
                  </div>

                  <div className="tx-summary-grid">
                    <div className="tx-summary-card tx-summary-total">
                      <span className="tx-summary-icon">
                        <WalletOutlined />
                      </span>
                      <div>
                        <small>Total Payments</small>
                        <strong>{formatINR(totals.total)}</strong>
                      </div>
                    </div>
                    <div className="tx-summary-card tx-summary-success">
                      <span className="tx-summary-icon">
                        <CheckCircleOutlined />
                      </span>
                      <div>
                        <small>Successful</small>
                        <strong>{formatINR(totals.successful)}</strong>
                      </div>
                    </div>
                    <div className="tx-summary-card tx-summary-pending">
                      <span className="tx-summary-icon">
                        <ClockCircleOutlined />
                      </span>
                      <div>
                        <small>Pending</small>
                        <strong>{formatINR(totals.pending)}</strong>
                      </div>
                    </div>
                    <div className="tx-summary-card tx-summary-refund">
                      <span className="tx-summary-icon">
                        <RollbackOutlined />
                      </span>
                      <div>
                        <small>Refunded</small>
                        <strong>{formatINR(totals.refunded)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="smart-filter-row">
                  <div className="smart-filter-row">
                    {statusOptions.map((status) => (
                      <Tooltip title={status} key={status}>
                        <button
                          type="button"
                          className={`smart-chip ${statusFilter === status ? "active" : ""}`}
                          onClick={() => setStatusFilter(status)}
                        >
                          {statusIconMap[status]}
                          <b>{statusCounts[status] || 0}</b>
                        </button>
                      </Tooltip>
                    ))}
                  </div>

                  <div className="review-toolbar transaction-toolbar-inline">
                    <Space size="middle" wrap>
                      <Input
                        placeholder="Search transactions..."
                        prefix={<SearchOutlined />}
                        className="review-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        allowClear
                      />
                      <Popover
                        open={filterOpen}
                        onOpenChange={setFilterOpen}
                        content={advancedFilterPanel}
                        trigger="click"
                        placement="bottomLeft"
                        overlayClassName="filter-popover-overlay"
                        zIndex={3000}
                      >
                        <Tooltip title="Filter">
                          <Badge dot={methodFilter !== "all" || !!dateRange} offset={[-4, 4]}>
                            <Button type="text" icon={<FilterOutlined />} className="icon-btn-glass" />
                          </Badge>
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
                      <Tooltip title="Export transactions">
                        <Button
                          icon={<ExportOutlined />}
                          className="tx-export-btn"
                          loading={exporting}
                          onClick={handleExport}
                        >
                          Export
                        </Button>
                      </Tooltip>
                    </Space>
                  </div>

                  <Table
                    columns={columns}
                    dataSource={filteredData}
                    className="user-table-custom tx-table-custom"
                    rowKey="id"
                    tableLayout="fixed"
                    loading={isLoading}
                    scroll={{ x: 1280 }}
                    locale={{
                      emptyText: (
                        <Empty
                          description="No transactions recorded yet — payments entered in Payment Details will appear here"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ),
                    }}
                    pagination={{
                      current: currentPage,
                      pageSize: PAGE_SIZE,
                      total: filteredData.length,
                      onChange: (page) => setCurrentPage(page),
                      showSizeChanger: false,
                      hideOnSinglePage: false,
                      showTotal: (total, range) =>
                        total > 0 ? `${range[0]}–${range[1]} of ${total} transactions` : "",
                      className: "user-table-pagination",
                    }}
                  />
                </div>
              </div>
            </Content>
          </Layout>
        </div>

        <CustomModal open={!!viewTransaction} onClose={() => setViewTransaction(null)} width={520}>
          {viewTransaction && (
            <div className="modal-shell tx-view-modal">
              <div className="modal-title-row">
                <span className="tx-modal-icon">
                  <WalletOutlined />
                </span>
                <Title level={3}>{viewTransaction.eventName}</Title>
              </div>

              <div className="tx-view-grid">
                <div className="tx-view-item">
                  <small>Client</small>
                  <strong>{viewTransaction.clientName}</strong>
                </div>
                <div className="tx-view-item">
                  <small>Date</small>
                  <strong>{viewTransaction.date}</strong>
                </div>
                <div className="tx-view-item">
                  <small>Payment Method</small>
                  <strong>
                    {methodIconMap[viewTransaction.method]} {viewTransaction.method}
                  </strong>
                </div>
                <div className="tx-view-item">
                  <small>Status</small>
                  <strong>{renderStatusTag(viewTransaction.status)}</strong>
                </div>
                <div className="tx-view-item">
                  <small>Total Amount</small>
                  <strong>{formatINR(viewTransaction.totalAmount)}</strong>
                </div>
                <div className="tx-view-item">
                  <small>Amount Paid</small>
                  <strong className="tx-cell-paid">{formatINR(viewTransaction.amountPaid)}</strong>
                </div>
                <div className="tx-view-item tx-view-item-full">
                  <small>Balance Amount</small>
                  <strong className="tx-cell-balance">{formatINR(viewTransaction.balanceAmount)}</strong>
                </div>
              </div>

              <div className="modal-action-row">
                <Tooltip title="Close">
                  <Button className="modal-cancel-btn" onClick={() => setViewTransaction(null)}>
                    Close
                  </Button>
                </Tooltip>
                <Tooltip title="Download receipt">
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    className="invite-btn-styled"
                    onClick={() => message.success("Downloading receipt...")}
                  />
                </Tooltip>
              </div>
            </div>
          )}
        </CustomModal>
      </Layout>
    </ConfigProvider>
  );
};

export default TransactionPage;