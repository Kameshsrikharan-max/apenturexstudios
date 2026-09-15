import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Layout, Table, DatePicker, Switch, Tooltip, ConfigProvider, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { QRCodeSVG } from "qrcode.react"; // already a project dependency (used in EventQRModal)
import {
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  SendOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  CameraOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import Sidebar from "../../../components/UI/Sidebar";
import rootReducer from "../../../redux/rootReducer";
import { fetchTransactionsRequest } from "../../../redux/actions/transactionActions";
import type { StoredTransaction } from "../../../redux/types/transactiontypes";
import {
  getAllInvoices,
  getInvoiceForTransaction,
  generateInvoice,
  updateInvoice,
  markInvoiceSent,
  refreshOverdueStatuses,
  INVOICES_UPDATED_EVENT,
  type StoredInvoice,
  type InvoiceStatus,
} from "../../../utils/invoiceStore";
import "./AutoInvoicePage.css";

type RootState = ReturnType<typeof rootReducer>;
const { Content } = Layout;

interface InvoiceRow extends StoredInvoice {
  txn: StoredTransaction;
}

// ---- Studio letterhead + payment details -----------------------------
// Replace these with the studio's real details (or wire up to a settings
// page later) — kept as constants so the invoice always renders correctly
// even before that exists.
const STUDIO = {
  name: "Apenturexstudios",
  tagline: "Photography & Films",
  address: "12, Lakeview Avenue, Chennai, Tamil Nadu 600028",
  phone: "+91 98765 43210",
  email: "hello@apenturexstudios.com",
  gstin: "33AAAAA0000A1Z5",
  upiId: "apenturexstudios@okhdfcbank",
};

const DEFAULT_NOTE =
  "Payment is due within 7 days of the invoice date. Late payments may attract additional charges. For any queries about this invoice, reach out using the contact details above.";

const NOTES_STORAGE_KEY = "axs_invoice_notes_v1";

const formatINR = (v: number) => `₹ ${v.toLocaleString("en-IN")}`;

const STATUS_META: Record<InvoiceStatus, { icon: React.ReactNode; color: string }> = {
  Draft: { icon: <FileTextOutlined />, color: "var(--inv-slate)" },
  Sent: { icon: <ClockCircleOutlined />, color: "var(--inv-cyan)" },
  Paid: { icon: <CheckCircleOutlined />, color: "var(--inv-green)" },
  Overdue: { icon: <ExclamationCircleOutlined />, color: "var(--inv-danger)" },
};

const STATUS_ORDER: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue"];

function loadNotes(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(NOTES_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function AutoInvoicePage() {
  const dispatch = useDispatch<any>();
  const { list: transactions, loading } = useSelector((state: RootState) => state.transaction);

  const [invoiceVersion, setInvoiceVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"All" | InvoiceStatus>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewRow, setPreviewRow] = useState<InvoiceRow | null>(null);
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [printBatchRows, setPrintBatchRows] = useState<InvoiceRow[] | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>(() => loadNotes());

  useEffect(() => {
    dispatch(fetchTransactionsRequest());
  }, [dispatch]);

  useEffect(() => {
    const bump = () => setInvoiceVersion((v) => v + 1);
    window.addEventListener(INVOICES_UPDATED_EVENT, bump);
    return () => window.removeEventListener(INVOICES_UPDATED_EVENT, bump);
  }, []);

  useEffect(() => {
    const paidIds = new Set(transactions.filter((t) => t.status === "Paid").map((t) => t.id));
    refreshOverdueStatuses(paidIds);
  }, [transactions, invoiceVersion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewRow(null);
        setPrintBatchRows(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows: InvoiceRow[] = useMemo(() => {
    const invoices = getAllInvoices();
    return transactions
      .map((txn) => {
        const inv = invoices.find((i) => i.transactionId === txn.id);
        return inv ? { ...inv, txn } : null;
      })
      .filter(Boolean) as InvoiceRow[];
  }, [transactions, invoiceVersion]);

  const uninvoicedCount = transactions.length - rows.length;

  const computeAmounts = (row: InvoiceRow) => {
    const subtotal = row.txn.totalAmount;
    const gst = row.gstEnabled ? Math.round(subtotal * (row.gstRate / 100)) : 0;
    return { subtotal, gst, total: subtotal + gst };
  };

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        !term ||
        r.txn.eventName.toLowerCase().includes(term) ||
        r.txn.clientName.toLowerCase().includes(term) ||
        r.invoiceNumber.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    const base: Record<string, number> = { All: rows.length };
    STATUS_ORDER.forEach((s) => {
      base[s] = rows.filter((r) => r.status === s).length;
    });
    return base;
  }, [rows]);

  const collectionStats = useMemo(() => {
    let invoiced = 0;
    let collected = 0;
    rows.forEach((r) => {
      const total = computeAmounts(r).total;
      invoiced += total;
      if (r.status === "Paid") collected += total;
    });
    const pct = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0;
    return { invoiced, collected, pct };
  }, [rows]);

  const overdueRows = useMemo(
    () =>
      rows
        .filter((r) => r.status === "Overdue")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 8),
    [rows]
  );

  const handleGenerateAll = () => {
    let count = 0;
    transactions.forEach((t) => {
      if (!getInvoiceForTransaction(t.id)) {
        generateInvoice(t.id);
        count++;
      }
    });
    message.success(count > 0 ? `Generated ${count} invoice(s)` : "Nothing to generate");
    setInvoiceVersion((v) => v + 1);
  };

  const handleSend = (row: InvoiceRow) => {
    markInvoiceSent(row.transactionId);
    message.success(`Invoice ${row.invoiceNumber} marked as sent`);
  };

  const handlePrint = (row: InvoiceRow) => {
    setPreviewRow(row);
    setTimeout(() => window.print(), 200);
  };

  const handleCopySummary = (row: InvoiceRow) => {
    const { total } = computeAmounts(row);
    const summary = `${row.invoiceNumber} — ${row.txn.eventName} — ${formatINR(total)} — due ${row.dueDate} — ${row.status}`;
    navigator.clipboard
      .writeText(summary)
      .then(() => message.success("Invoice summary copied"))
      .catch(() => message.error("Couldn't copy — try again"));
  };

  const handleNoteChange = (transactionId: string, value: string) => {
    setNotesMap((prev) => {
      const next = { ...prev, [transactionId]: value };
      window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedKeys.includes(r.transactionId)),
    [rows, selectedKeys]
  );

  const handleBulkSend = () => {
    const drafts = selectedRows.filter((r) => r.status === "Draft");
    if (drafts.length === 0) {
      message.info("No draft invoices in your selection");
      return;
    }
    drafts.forEach((r) => markInvoiceSent(r.transactionId));
    message.success(`Sent ${drafts.length} invoice(s)`);
    setSelectedKeys([]);
  };

  const handleBulkPrint = () => {
    if (selectedRows.length === 0) return;
    setPrintBatchRows(selectedRows);
    setTimeout(() => {
      window.print();
      setPrintBatchRows(null);
    }, 250);
  };

  const collectionRingStyle = {
    background: `conic-gradient(var(--inv-green) ${collectionStats.pct * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
  };

  const columns: ColumnsType<InvoiceRow> = [
    {
      title: "Invoice #",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 140,
      render: (text, row) => (
        <button type="button" className="inv-name-cell" onClick={() => setPreviewRow(row)}>
          <FileTextOutlined />
          <strong>{text}</strong>
        </button>
      ),
    },
    {
      title: "Event / Client",
      key: "event",
      width: 200,
      render: (_, row) => (
        <span className="inv-soft-cell">
          <strong>{row.txn.eventName}</strong>
          <small>{row.txn.clientName || "No client on file"}</small>
        </span>
      ),
    },
    {
      title: "Amount",
      key: "amount",
      width: 120,
      align: "right",
      sorter: (a, b) => computeAmounts(a).total - computeAmounts(b).total,
      render: (_, row) => <span>{formatINR(computeAmounts(row).total)}</span>,
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 150,
      sorter: (a, b) => a.dueDate.localeCompare(b.dueDate),
      render: (text, row) =>
        editingDueDate === row.transactionId ? (
          <DatePicker
            size="small"
            defaultValue={dayjs(text)}
            onChange={(d) => {
              if (d) updateInvoice(row.transactionId, { dueDate: d.format("YYYY-MM-DD") });
              setEditingDueDate(null);
              setInvoiceVersion((v) => v + 1);
            }}
            onBlur={() => setEditingDueDate(null)}
            autoFocus
            open
          />
        ) : (
          <button
            type="button"
            className="inv-due-date-cell"
            onClick={() => setEditingDueDate(row.transactionId)}
          >
            {text} <EditOutlined />
          </button>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      align: "center",
      filters: STATUS_ORDER.map((s) => ({ text: s, value: s })),
      onFilter: (value, row) => row.status === value,
      render: (status: InvoiceStatus) => (
        <span
          className="inv-status-tag"
          style={{ ["--inv-chip-color" as string]: STATUS_META[status].color }}
        >
          {STATUS_META[status].icon} {status}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      align: "center",
      render: (_, row) => (
        <div className="inv-row-actions">
          <Tooltip title="Preview">
            <button type="button" className="inv-icon-btn" onClick={() => setPreviewRow(row)}>
              <FileTextOutlined />
            </button>
          </Tooltip>
          <Tooltip title={row.status === "Draft" ? "Send invoice" : "Already sent"}>
            <button
              type="button"
              className="inv-icon-btn"
              disabled={row.status !== "Draft"}
              onClick={() => handleSend(row)}
            >
              <SendOutlined />
            </button>
          </Tooltip>
          <Tooltip title="Print / Download PDF">
            <button type="button" className="inv-icon-btn" onClick={() => handlePrint(row)}>
              <PrinterOutlined />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  // ---- Shared invoice document markup (single preview + batch print) ---
  const renderInvoiceSheet = (row: InvoiceRow, interactive: boolean) => {
    const amounts = computeAmounts(row);
    const note = notesMap[row.transactionId] ?? DEFAULT_NOTE;
    const showQr = row.status !== "Paid";

    return (
      <div
        className={`inv-invoice-sheet ${!interactive ? "inv-invoice-sheet--batch" : ""}`}
        key={row.transactionId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {interactive ? (
          <button
            className="inv-print-close no-print"
            onClick={() => setPreviewRow(null)}
            aria-label="Close"
          >
            <CloseOutlined />
          </button>
        ) : null}

        <span
          className={`inv-watermark inv-watermark--${row.status.toLowerCase()}`}
          aria-hidden="true"
        >
          {row.status}
        </span>

        <div className="inv-letterhead">
          <div className="inv-letterhead-brand">
            <span className="inv-brand-mark">
              <CameraOutlined />
            </span>
            <div>
              <strong>{STUDIO.name}</strong>
              <span>{STUDIO.tagline}</span>
            </div>
          </div>
          <div className="inv-letterhead-contact">
            <span>{STUDIO.address}</span>
            <span>
              {STUDIO.phone} · {STUDIO.email}
            </span>
            <span>GSTIN {STUDIO.gstin}</span>
          </div>
        </div>

        <div className="inv-invoice-head">
          <div>
            <h1>INVOICE</h1>
            <p className="inv-invoice-number">{row.invoiceNumber}</p>
          </div>
          <span
            className="inv-status-tag"
            style={{ ["--inv-chip-color" as string]: STATUS_META[row.status].color }}
          >
            {STATUS_META[row.status].icon} {row.status}
          </span>
        </div>

        <div className="inv-invoice-meta">
          <div>
            <span>Billed to</span>
            <strong>{row.txn.clientName || "—"}</strong>
          </div>
          <div>
            <span>Event</span>
            <strong>{row.txn.eventName}</strong>
          </div>
          <div>
            <span>Event Date</span>
            <strong>{row.txn.date}</strong>
          </div>
          <div>
            <span>Due Date</span>
            <strong>{row.dueDate}</strong>
          </div>
        </div>

        <table className="inv-invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Photography services — {row.txn.eventName}</td>
              <td>{formatINR(amounts.subtotal)}</td>
            </tr>
            {row.gstEnabled ? (
              <tr>
                <td>GST ({row.gstRate}%)</td>
                <td>{formatINR(amounts.gst)}</td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr>
              <td>Total Due</td>
              <td>{formatINR(amounts.total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="inv-invoice-lower">
          <div className="inv-invoice-notes">
            <span className="inv-invoice-lower-label">Notes</span>
            {interactive ? (
              <textarea
                className="inv-notes-input no-print"
                value={note}
                onChange={(e) => handleNoteChange(row.transactionId, e.target.value)}
                rows={3}
              />
            ) : null}
            <p className="inv-notes-print">{note}</p>
            <div className="inv-signature">
              <span>Authorized Signatory</span>
              <em>{STUDIO.name}</em>
            </div>
          </div>

          {showQr ? (
            <div className="inv-invoice-payment">
              <span className="inv-invoice-lower-label">Scan to pay</span>
              <div className="inv-qr-wrap">
                <QRCodeSVG
                  value={`upi://pay?pa=${STUDIO.upiId}&pn=${encodeURIComponent(
                    STUDIO.name
                  )}&am=${amounts.total}&tn=${encodeURIComponent(row.invoiceNumber)}`}
                  size={104}
                  fgColor="#0a1120"
                  bgColor="#ffffff"
                />
              </div>
              <span className="inv-upi-id">{STUDIO.upiId}</span>
            </div>
          ) : null}
        </div>

        {interactive ? (
          <div className="inv-invoice-footer no-print">
            <label className="inv-gst-toggle">
              <Switch
                checked={row.gstEnabled}
                onChange={(v) => {
                  updateInvoice(row.transactionId, { gstEnabled: v });
                  setInvoiceVersion((n) => n + 1);
                  setPreviewRow((r) => (r ? { ...r, gstEnabled: v } : r));
                }}
              />
              Include GST ({row.gstRate}%)
            </label>
            <div className="inv-invoice-footer-actions">
              <button
                type="button"
                className="inv-secondary-button"
                onClick={() => handleCopySummary(row)}
              >
                <CopyOutlined /> Copy summary
              </button>
              <button
                type="button"
                className="inv-secondary-button"
                onClick={() => handleSend(row)}
                disabled={row.status !== "Draft"}
              >
                <SendOutlined /> Mark Sent
              </button>
              <button type="button" className="inv-primary-button" onClick={() => window.print()}>
                <PrinterOutlined /> Print / Save PDF
              </button>
            </div>
          </div>
        ) : null}

        <p className="inv-invoice-thanks">Thank you for choosing us for your special moments.</p>
      </div>
    );
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#38d5ff", borderRadius: 12 } }}>
      <Layout className="dashboard-page dashboard-dark inv-page">
        <div className="dashboard-frame">
          <Sidebar dark />
          <Layout className="dashboard-shell inv-shell">
            <Content className="dashboard-content inv-content">
              <div className="auto-invoice-page">
                <div className="inv-header">
                  <div className="inv-header-text">
                    <span className="inv-eyebrow">Billing</span>
                    <h1>Auto Invoice</h1>
                    <p>
                      Every event transaction becomes a print-ready invoice, with GST handled
                      automatically.
                    </p>
                  </div>

                  <div className="inv-header-actions">
                    {uninvoicedCount > 0 && (
                      <span className="inv-uninvoiced-pill">
                        {uninvoicedCount} not yet invoiced
                      </span>
                    )}
                    <button type="button" className="inv-generate-all-btn" onClick={handleGenerateAll}>
                      <ThunderboltOutlined /> Generate All
                    </button>
                  </div>
                </div>

                <div className="inv-toolbar">
                  <div className="inv-search">
                    <SearchOutlined />
                    <input
                      type="text"
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="inv-status-filters">
                    {(["All", ...STATUS_ORDER] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`inv-status-chip ${statusFilter === s ? "is-active" : ""}`}
                        style={
                          s !== "All"
                            ? ({ ["--inv-chip-color" as string]: STATUS_META[s as InvoiceStatus].color } as React.CSSProperties)
                            : undefined
                        }
                        onClick={() => setStatusFilter(s)}
                      >
                        {s !== "All" ? STATUS_META[s as InvoiceStatus].icon : <FileTextOutlined />}
                        {s}
                        <em>{statusCounts[s] || 0}</em>
                      </button>
                    ))}
                  </div>

                  <Tooltip title="Refresh">
                    <button
                      type="button"
                      className="inv-icon-btn inv-refresh-btn"
                      onClick={() => dispatch(fetchTransactionsRequest())}
                    >
                      <ReloadOutlined spin={loading} />
                    </button>
                  </Tooltip>
                </div>

                {selectedKeys.length > 0 ? (
                  <div className="inv-bulk-bar">
                    <span>{selectedKeys.length} selected</span>
                    <div className="inv-bulk-actions">
                      <button type="button" className="inv-secondary-button" onClick={handleBulkSend}>
                        <SendOutlined /> Send selected
                      </button>
                      <button type="button" className="inv-secondary-button" onClick={handleBulkPrint}>
                        <PrinterOutlined /> Print selected
                      </button>
                      <button
                        type="button"
                        className="inv-icon-btn"
                        onClick={() => setSelectedKeys([])}
                        aria-label="Clear selection"
                      >
                        <CloseOutlined />
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="inv-layout">
                  <div className="inv-table-card">
                    <div className="inv-table-wrap">
                      <Table
                        columns={columns}
                        dataSource={filteredRows}
                        rowKey="transactionId"
                        loading={loading}
                        scroll={{ x: 900 }}
                        rowSelection={{
                          selectedRowKeys: selectedKeys,
                          onChange: (keys) => setSelectedKeys(keys as string[]),
                        }}
                        onRow={(row) => ({
                          style: {
                            ["--inv-row-accent" as string]: STATUS_META[row.status].color,
                          } as React.CSSProperties,
                        })}
                        locale={{
                          emptyText: (
                            <div className="inv-empty">
                              {uninvoicedCount > 0
                                ? "No invoices generated yet — click Generate All to create them"
                                : "No invoices match this filter"}
                            </div>
                          ),
                        }}
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                      />
                    </div>
                  </div>

                  <div className="inv-side">
                    <div className="inv-collection-card">
                      <h3>Collections</h3>
                      <div className="inv-stats-row">
                        <div className="inv-ring" style={collectionRingStyle}>
                          <div className="inv-ring-inner">
                            <strong>{collectionStats.pct}%</strong>
                            <span>collected</span>
                          </div>
                        </div>
                        <div className="inv-progress-text">
                          <div className="inv-summary-row">
                            <span>Invoiced</span>
                            <strong>{formatINR(collectionStats.invoiced)}</strong>
                          </div>
                          <div className="inv-summary-row">
                            <span>Collected</span>
                            <strong>{formatINR(collectionStats.collected)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="inv-watchlist-card">
                      <h3>
                        <ExclamationCircleOutlined /> Needs attention
                      </h3>
                      {overdueRows.length > 0 ? (
                        <div className="inv-watchlist">
                          {overdueRows.map((row) => (
                            <div className="inv-watchlist-item" key={row.transactionId}>
                              <div>
                                <div className="inv-watchlist-heading">
                                  <strong>{row.invoiceNumber}</strong>
                                  <span>{row.txn.clientName}</span>
                                </div>
                                <p>
                                  Due {row.dueDate} · {formatINR(computeAmounts(row).total)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPreviewRow(row)}
                                aria-label="Preview invoice"
                              >
                                <FileTextOutlined />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="inv-watchlist-empty">No overdue invoices right now.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Content>
          </Layout>
        </div>
      </Layout>

      {previewRow && (
        <div className="inv-panel-overlay" onMouseDown={() => setPreviewRow(null)}>
          {renderInvoiceSheet(previewRow, true)}
        </div>
      )}

      {printBatchRows ? (
        <div className="inv-print-batch">
          {printBatchRows.map((row) => renderInvoiceSheet(row, false))}
        </div>
      ) : null}
    </ConfigProvider>
  );
}