import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import InnerPageHeader from '../../components/InnerPageHeader';
import axios from '../../axiosConfig';
import { showErrorToast } from '../../components/toastUtils';
import { exportRefundsReportToExcel, exportRefundsReportToPDF } from '../../components/export_utils';
import '../../styles/common.css';
import '../../styles/refunds.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTHS_HE = [
  '', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

const QUARTER_LABELS = ['', 'Q1 (ינואר–מרץ)', 'Q2 (אפריל–יוני)', 'Q3 (יולי–ספטמבר)', 'Q4 (אוקטובר–דצמבר)'];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// Parse "YYYY-MM-DD" → { year, month }
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m] = dateStr.split('-').map(Number);
  return { year: y, month: m };
};

const fmt = (num) => Number(num || 0).toFixed(2);
const pct = (approved, requested) =>
  requested > 0 ? `${((approved / requested) * 100).toFixed(0)}%` : '—';

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr;
};

const STATUS_BADGE_CLASS = {
  'ממתין': 'ממתין', 'אושר': 'אושר', 'אושר חלקית': 'אושר-חלקית',
  'שולם': 'שולם', 'בוטל/נדחה': 'בוטל-נדחה',
};

// ── Component ──────────────────────────────────────────────────────────────────
const RefundsReport = () => {
  const navigate = useNavigate();

  // ── Auth guard — admin only ──────────────────────────────────────────────
  const [isAdminUser, setIsAdminUser] = useState(false);
  useEffect(() => {
    const staff = JSON.parse(localStorage.getItem('staff') || '[]');
    const origUsername = localStorage.getItem('origUsername') || '';
    const currentStaff = staff.find(s => s.username === origUsername);
    const roles = currentStaff?.roles || [];
    if (!roles.includes('System Administrator')) {
      navigate('/refunds');
    } else {
      setIsAdminUser(true);
    }
  }, [navigate]);

  // ── All refunds (fetched once) ───────────────────────────────────────────
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = () => {
    setLoading(true);
    axios.get('/api/refunds/')
      .then(res => setRefunds(res.data.refunds || []))
      .catch(() => showErrorToast('שגיאה בטעינת נתוני ההחזרים'))
      .finally(() => setLoading(false));
  };

  // ── Filter controls ──────────────────────────────────────────────────────
  const [period, setPeriod] = useState('monthly'); // monthly | quarterly | annual
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // ── Drill-down state ─────────────────────────────────────────────────────
  const [drillLabel, setDrillLabel] = useState(null);
  const [drillRows, setDrillRows]   = useState([]);
  const [drillPage, setDrillPage]   = useState(1);
  const [drillSortField, setDrillSortField] = useState('expense_date');
  const [drillSortDir,   setDrillSortDir]   = useState('asc');
  const DRILL_PAGE_SIZE = 3;

  const toggleDrillSort = (field) => {
    if (drillSortField === field) setDrillSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setDrillSortField(field); setDrillSortDir('asc'); }
    setDrillPage(1);
  };
  const drillSortArrow = (field) => drillSortField === field ? (drillSortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅';

  const openDrill = (rowLabel, rowIndex) => {
    const filtered = refunds.filter(r => {
      const d = parseDate(r.expense_date);
      if (!d) return false;
      if (period === 'annual') return String(d.year) === rowLabel;
      if (d.year !== selectedYear) return false;
      if (period === 'monthly') return d.month === rowIndex + 1;
      if (period === 'quarterly') return Math.ceil(d.month / 3) === rowIndex + 1;
      return false;
    });
    setDrillLabel(rowLabel);
    setDrillRows(filtered);
    setDrillPage(1);
  };

  const closeDrill = () => { setDrillLabel(null); setDrillRows([]); setDrillPage(1); };

  // ── Computed report data ─────────────────────────────────────────────────
  const computeRows = () => {
    const filtered = refunds.filter(r => {
      const d = parseDate(r.expense_date);
      return d && d.year === selectedYear;
    });

    if (period === 'monthly') {
      const map = {};
      for (let m = 1; m <= 12; m++) map[m] = { label: MONTHS_HE[m], requested: 0, approved: 0, count: 0 };
      filtered.forEach(r => {
        const d = parseDate(r.expense_date);
        if (!d) return;
        map[d.month].requested += parseFloat(r.requested_amount || 0);
        map[d.month].approved += parseFloat(r.approved_amount || 0);
        map[d.month].count += 1;
      });
      return Object.values(map);
    }

    if (period === 'quarterly') {
      const map = { 1: { label: QUARTER_LABELS[1], requested: 0, approved: 0, count: 0 },
                    2: { label: QUARTER_LABELS[2], requested: 0, approved: 0, count: 0 },
                    3: { label: QUARTER_LABELS[3], requested: 0, approved: 0, count: 0 },
                    4: { label: QUARTER_LABELS[4], requested: 0, approved: 0, count: 0 } };
      filtered.forEach(r => {
        const d = parseDate(r.expense_date);
        if (!d) return;
        const q = Math.ceil(d.month / 3);
        map[q].requested += parseFloat(r.requested_amount || 0);
        map[q].approved += parseFloat(r.approved_amount || 0);
        map[q].count += 1;
      });
      return Object.values(map);
    }

    // annual — one row per year across all years
    const allYears = {};
    refunds.forEach(r => {
      const d = parseDate(r.expense_date);
      if (!d) return;
      const y = d.year;
      if (!allYears[y]) allYears[y] = { label: String(y), requested: 0, approved: 0, count: 0 };
      allYears[y].requested += parseFloat(r.requested_amount || 0);
      allYears[y].approved += parseFloat(r.approved_amount || 0);
      allYears[y].count += 1;
    });
    return Object.entries(allYears)
      .sort(([a], [b]) => b - a)
      .map(([, v]) => v);
  };

  const rows = computeRows();
  const totals = rows.reduce(
    (acc, r) => ({ requested: acc.requested + r.requested, approved: acc.approved + r.approved, count: acc.count + r.count }),
    { requested: 0, approved: 0, count: 0 }
  );
  const pendingCount = refunds.filter(r => r.status === 'ממתין').length;

  if (!isAdminUser) return null;

  return (
    <div className="refunds-main-content">
      <Sidebar />
      <InnerPageHeader title="החזרים לפי תקופה" />

      {/* Controls: back + export + filters — all in one row */}
      <div className="refunds-controls back-controls">
        <button onClick={() => navigate('/refunds')}>← חזרה לרשימת ההחזרים</button>
        <button onClick={fetchRefunds}>🔄 רענן</button>

        <label className="report-filter-label">
          תצוגה:
          <select value={period} onChange={e => { setPeriod(e.target.value); setDrillLabel(null); setDrillRows([]); }} className="report-filter-select">
            <option value="monthly">חודשי</option>
            <option value="quarterly">רבעוני</option>
            <option value="annual">שנתי</option>
          </select>
        </label>

        {period !== 'annual' && (
          <label className="report-filter-label">
            שנה:
            <select value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setDrillLabel(null); setDrillRows([]); }} className="report-filter-select">
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        )}

        <button
          className="export-button excel-button"
          onClick={() => exportRefundsReportToExcel(refunds, period, selectedYear)}
        >
          <img src="/assets/excel-icon.png" alt="Excel" />
        </button>
        <button
          className="export-button pdf-button"
          onClick={() => exportRefundsReportToPDF(refunds, period, selectedYear)}
        >
          <img src="/assets/pdf-icon.png" alt="PDF" />
        </button>
      </div>

      {loading ? (
        <div className="refunds-loading">טוען נתונים...</div>
      ) : (
        <>
          {/* ── Totals chips ──────────────────────────────────────────────── */}
          <div className="refunds-totals-bar">
            <div className="refunds-total-chip">
              סה"כ מבוקש: <strong>{fmt(totals.requested)} ₪</strong>
            </div>
            <div className="refunds-total-chip">
              סה"כ אושר: <strong>{fmt(totals.approved)} ₪</strong>
            </div>
            <div className="refunds-total-chip">
              רשומות: <strong>{totals.count}</strong>
            </div>
            <div className={`refunds-total-chip${pendingCount > 0 ? ' refunds-total-chip--pending' : ''}`}>
              ממתינות לטיפול: <strong className={pendingCount > 0 ? 'pending-count' : ''}>{pendingCount}</strong>
            </div>
          </div>

          {/* ── Period summary table ───────────────────────────────────────── */}
          <div className="refunds-table-wrapper report-section">
            <h3 className="report-section-title">
              📅 סיכום לפי {period === 'monthly' ? `חודש — ${selectedYear}` : period === 'quarterly' ? `רבעון — ${selectedYear}` : 'שנה'}
            </h3>
            <table className="refunds-table">
              <thead>
                <tr>
                  <th>תקופה</th>
                  <th>מס׳ בקשות</th>
                  <th>סה"כ מבוקש (₪)</th>
                  <th>סה"כ אושר (₪)</th>
                  <th>% אושר</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`${row.count === 0 ? 'empty-period' : ''}`}
                  >
                    <td>
                      {row.label}
                      {row.count > 0 && (
                        <button
                          className="drill-open-btn"
                          onClick={() => openDrill(row.label, i)}
                          title="פירוט בקשות"
                        >
                          פירוט
                        </button>
                      )}
                    </td>
                    <td>{row.count}</td>
                    <td>{fmt(row.requested)}</td>
                    <td>{fmt(row.approved)}</td>
                    <td>{pct(row.approved, row.requested)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>סה"כ</td>
                  <td>{totals.count}</td>
                  <td>{fmt(totals.requested)}</td>
                  <td>{fmt(totals.approved)}</td>
                  <td>{pct(totals.approved, totals.requested)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Drill-down modal ──────────────────────────────────────────── */}
          {drillLabel && (
            <div className="refund-modal-overlay" onClick={closeDrill}>
              <div className="refund-modal drill-modal" onClick={e => e.stopPropagation()}>
                <button className="refund-modal-close" onClick={closeDrill}>✕</button>
                <h2>🔍 פירוט בקשות — {drillLabel}</h2>
                {drillRows.length === 0 ? (
                  <div className="refunds-empty">אין בקשות לתקופה זו</div>
                ) : (
                  <>
                    {/* mini totals */}
                    <div className="refunds-totals-bar drill-totals-bar">
                      <div className="refunds-total-chip">
                        בקשות: <strong>{drillRows.length}</strong>
                      </div>
                      <div className="refunds-total-chip">
                        סה"כ מבוקש: <strong>{fmt(drillRows.reduce((s, r) => s + parseFloat(r.requested_amount || 0), 0))} ₪</strong>
                      </div>
                      <div className="refunds-total-chip">
                        סה"כ אושר: <strong>{fmt(drillRows.reduce((s, r) => s + parseFloat(r.approved_amount || 0), 0))} ₪</strong>
                      </div>
                      {(() => {
                        const pending = drillRows.filter(r => r.status === 'ממתין').length;
                        return (
                          <div className={`refunds-total-chip${pending > 0 ? ' refunds-total-chip--pending' : ''}`}>
                            ממתינות לטיפול: <strong className={pending > 0 ? 'pending-count' : ''}>{pending}</strong>
                          </div>
                        );
                      })()}
                    </div>

                    {/* table */}
                    {(() => {
                      const sorted = drillRows.slice().sort((a, b) => {
                        const va = a[drillSortField] || '';
                        const vb = b[drillSortField] || '';
                        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
                        return drillSortDir === 'asc' ? cmp : -cmp;
                      });
                      const totalPages = Math.max(1, Math.ceil(sorted.length / DRILL_PAGE_SIZE));
                      const safePage   = Math.min(drillPage, totalPages);
                      const paginated  = sorted.slice((safePage - 1) * DRILL_PAGE_SIZE, safePage * DRILL_PAGE_SIZE);
                      return (
                        <>
                          <div className="refunds-table-wrapper drill-table-wrapper">
                            <table className="refunds-table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>שם מלא</th>
                                  <th className="sortable-th" onClick={() => toggleDrillSort('expense_date')}>תאריך הוצאה{drillSortArrow('expense_date')}</th>
                                  <th>סכום מבוקש</th>
                                  <th>סכום אושר</th>
                                  <th>סטטוס</th>
                                  <th>אמצעי תשלום</th>
                                  <th>אושר ע"י</th>
                                  <th className="sortable-th" onClick={() => toggleDrillSort('created_at')}>תאריך יצירה{drillSortArrow('created_at')}</th>
                                  <th>תיאור</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginated.map(r => (
                                  <tr key={r.id}>
                                    <td>{r.id}</td>
                                    <td>{r.staff_full_name}</td>
                                    <td>{fmtDate(r.expense_date)}</td>
                                    <td>{parseFloat(r.requested_amount).toFixed(2)} ₪</td>
                                    <td>{r.approved_amount ? `${parseFloat(r.approved_amount).toFixed(2)} ₪` : '—'}</td>
                                    <td>
                                      <span className={`refund-status-badge ${STATUS_BADGE_CLASS[r.status] || ''}`}>
                                        {r.status}
                                      </span>
                                    </td>
                                    <td>{r.refund_method || '—'}</td>
                                    <td>{r.approved_by || '—'}</td>
                                    <td>{fmtDate(r.created_at)}</td>
                                    <td className="refund-desc-cell">{r.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="pagination drill-pagination">
                              <button onClick={() => setDrillPage(1)} disabled={safePage === 1} className="pagination-arrow">&laquo;</button>
                              <button onClick={() => setDrillPage(safePage - 1)} disabled={safePage === 1} className="pagination-arrow">&lsaquo;</button>
                              {Array.from({ length: totalPages }, (_, idx) => {
                                const p = idx + 1;
                                const start = Math.max(1, safePage - 2);
                                const end   = Math.min(totalPages, start + 4);
                                return p >= start && p <= end ? (
                                  <button key={p} className={safePage === p ? 'active' : ''} onClick={() => setDrillPage(p)}>{p}</button>
                                ) : null;
                              })}
                              <button onClick={() => setDrillPage(safePage + 1)} disabled={safePage === totalPages} className="pagination-arrow">&rsaquo;</button>
                              <button onClick={() => setDrillPage(totalPages)} disabled={safePage === totalPages} className="pagination-arrow">&raquo;</button>
                            </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RefundsReport;
