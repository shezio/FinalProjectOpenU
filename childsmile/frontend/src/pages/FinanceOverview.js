import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import axios from '../axiosConfig';
import { showErrorToast } from '../components/toastUtils';
import { useTranslation } from 'react-i18next';
import { hasAllPermissions } from '../components/utils';
import '../i18n';
import '../styles/common.css';
import '../styles/financeoverview.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ADMIN-ONLY page (aggregates Petty Cash + Ongoing Expenses, both admin-only —
// see add_petty_cash_table.sql / add_ongoing_expenses_table.sql). Same
// requiredPermissions + hasAllPermissions pattern as SystemManagement.js / AuditLog.js.
const requiredPermissions = [
  { resource: 'childsmile_app_pettycashexpense', action: 'VIEW' },
  { resource: 'childsmile_app_ongoingexpense', action: 'VIEW' },
];

const HEBREW_MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

// Extract "YYYY-MM" from an ISO-ish date string (expense_date is "YYYY-MM-DD")
const monthKeyOf = (dateStr) => {
  const m = String(dateStr || '').match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
};

// ── Component ──────────────────────────────────────────────────────────────────
const FinanceOverview = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasPermissionOnFinanceOverview = hasAllPermissions(requiredPermissions);

  const [refunds, setRefunds] = useState([]);
  const [pettyCash, setPettyCash] = useState([]);
  const [ongoingExpenses, setOngoingExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasPermissionOnFinanceOverview) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      axios.get('/api/refunds/'),
      axios.get('/api/petty-cash/'),
      axios.get('/api/ongoing-expenses/'),
    ])
      .then(([refundsRes, pettyCashRes, ongoingRes]) => {
        setRefunds(refundsRes.data.refunds || []);
        setPettyCash(pettyCashRes.data.petty_cash || []);
        setOngoingExpenses(ongoingRes.data.ongoing_expenses || []);
      })
      .catch(err => {
        showErrorToast(t, err.response?.data?.error || 'שגיאה בטעינת נתוני הסקירה', '');
      })
      .finally(() => setLoading(false));
  };

  // ── Aggregation ───────────────────────────────────────────────────────────
  // IMPORTANT: a paid refund ('שולם') auto-creates a linked Petty Cash row
  // (see refund_views.py::_sync_petty_cash_for_refund). To avoid double
  // counting that same money twice, the grand total only counts:
  //   - Refunds with status 'שולם' (their approved/requested amount)
  //   - Petty Cash rows WITHOUT a source_refund_id (manually entered ones)
  //   - All Ongoing Expenses
  // Each module's OWN card below still shows its own full ledger total
  // (e.g. Petty Cash's card includes the auto-synced rows too) — only the
  // combined grand total needs the de-duplication.
  const paidRefunds = refunds.filter(r => r.status === 'שולם');
  const pendingRefundsCount = refunds.filter(r => r.status === 'ממתין').length;
  const refundsPaidTotal = paidRefunds.reduce(
    (s, r) => s + parseFloat(r.approved_amount || r.requested_amount || 0), 0
  );

  const pettyCashManual = pettyCash.filter(p => !p.source_refund_id);
  const pettyCashTotal = pettyCash.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const pettyCashManualTotal = pettyCashManual.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  const ongoingTotal = ongoingExpenses.reduce((s, o) => s + parseFloat(o.amount || 0), 0);

  const grandTotal = refundsPaidTotal + pettyCashManualTotal + ongoingTotal;
  const totalTransactions = refunds.length + pettyCash.length + ongoingExpenses.length;

  const ACTIVE_MODULES = 3;
  const TOTAL_MODULES = 5;

  // ── Monthly trend (last 6 months, de-duplicated the same way as grandTotal) ─
  const buildMonthlyTrend = () => {
    const combined = [
      ...ongoingExpenses.map(o => ({ key: monthKeyOf(o.expense_date), amount: parseFloat(o.amount || 0) })),
      ...pettyCashManual.map(p => ({ key: monthKeyOf(p.expense_date), amount: parseFloat(p.amount || 0) })),
      ...paidRefunds.map(r => ({ key: monthKeyOf(r.expense_date), amount: parseFloat(r.approved_amount || r.requested_amount || 0) })),
    ];
    const totalsByMonth = {};
    combined.forEach(({ key, amount }) => {
      if (!key) return;
      totalsByMonth[key] = (totalsByMonth[key] || 0) + amount;
    });

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: `${HEBREW_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
    }
    return months.map(m => ({ ...m, total: totalsByMonth[m.key] || 0 }));
  };

  const monthlyTrend = buildMonthlyTrend();
  const chartData = {
    labels: monthlyTrend.map(m => m.label),
    datasets: [{
      label: 'הוצאות מאוחדות (₪)',
      data: monthlyTrend.map(m => m.total),
      backgroundColor: '#8b5cf6',
      borderRadius: 8,
    }],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { font: { size: 17, weight: 'bold' } } },
      tooltip: { bodyFont: { size: 16 }, titleFont: { size: 16, weight: 'bold' } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { font: { size: 15 } } },
      x: { ticks: { font: { size: 15 } } },
    },
  };

  // ── No-permission screen ─────────────────────────────────────────────────
  if (!hasPermissionOnFinanceOverview) {
    return (
      <div className="finance-overview-main-content">
        <Sidebar />
        <InnerPageHeader title="סקירה כללית" />
        <div className="no-permission">
          <h2>עמוד זה מיועד למנהלי מערכת בלבד</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="finance-overview-main-content">
      <Sidebar />
      <InnerPageHeader title="סקירה כללית" />

      <div className="finance-overview-inner">
      <div className="finance-overview-controls">
        <button onClick={fetchAll}>רענן</button>
      </div>

      {loading ? (
        <div className="finance-overview-loading">טוען נתונים...</div>
      ) : (
        <>
          {/* KPI chips — mirrors the concept mock's .kpis (4-col grid, colored left accents) */}
          <div className="finance-overview-kpis">
            <div className="finance-overview-kpi-chip">
              <div className="finance-overview-kpi-label"><span>💰</span> סה"כ הוצאות (מאוחד)</div>
              <div className="finance-overview-kpi-value">{grandTotal.toFixed(2)} ₪</div>
              <div className="finance-overview-kpi-sub">מאוחד מכל המקורות</div>
            </div>
            <div className="finance-overview-kpi-chip finance-overview-kpi-chip--green">
              <div className="finance-overview-kpi-label"><span>📁</span> מודולים פעילים</div>
              <div className="finance-overview-kpi-value">{ACTIVE_MODULES} מתוך {TOTAL_MODULES}</div>
              <div className="finance-overview-kpi-sub">מאוחדים למערכת אחת</div>
            </div>
            <div className={`finance-overview-kpi-chip finance-overview-kpi-chip--amber${pendingRefundsCount > 0 ? ' finance-overview-kpi-chip--active' : ''}`}>
              <div className="finance-overview-kpi-label"><span>⏳</span> ממתין לטיפול</div>
              <div className="finance-overview-kpi-value">{pendingRefundsCount}</div>
              <div className="finance-overview-kpi-sub">החזרים לאישור / תשלום</div>
            </div>
            <div className="finance-overview-kpi-chip finance-overview-kpi-chip--red">
              <div className="finance-overview-kpi-label"><span>🧾</span> עסקאות (סה"כ)</div>
              <div className="finance-overview-kpi-value">{totalTransactions}</div>
              <div className="finance-overview-kpi-sub">בכל המודולים הפעילים</div>
            </div>
          </div>

          {/* Two panels side-by-side — mirrors the concept mock's .grid2 (1.1fr / 1fr) */}
          <div className="finance-overview-grid2">
            <div className="finance-overview-panel">
              <h3>פילוח לפי מקור הוצאה</h3>
              <p className="finance-overview-panel-sub">לחיצה על כרטיס פותחת את המודול</p>
              <div className="finance-overview-modcards">
                <div className="finance-overview-modcard" onClick={() => navigate('/refunds')}>
                  <div className="finance-overview-modcard-ic">💰</div>
                  <div className="finance-overview-modcard-nm">החזרי הוצאות</div>
                  <div className="finance-overview-modcard-vv">{refundsPaidTotal.toFixed(2)} ₪</div>
                  <div className="finance-overview-modcard-cnt">{refunds.length} בקשות ({paidRefunds.length} שולמו)</div>
                </div>
                <div className="finance-overview-modcard" onClick={() => navigate('/petty-cash')}>
                  <div className="finance-overview-modcard-ic">💵</div>
                  <div className="finance-overview-modcard-nm">קופה קטנה</div>
                  <div className="finance-overview-modcard-vv">{pettyCashTotal.toFixed(2)} ₪</div>
                  <div className="finance-overview-modcard-cnt">{pettyCash.length} רשומות</div>
                </div>
                <div className="finance-overview-modcard" onClick={() => navigate('/ongoing-expenses')}>
                  <div className="finance-overview-modcard-ic">⛽</div>
                  <div className="finance-overview-modcard-nm">הוצאות שוטפות</div>
                  <div className="finance-overview-modcard-vv">{ongoingTotal.toFixed(2)} ₪</div>
                  <div className="finance-overview-modcard-cnt">{ongoingExpenses.length} רשומות</div>
                </div>
                <div className="finance-overview-modcard finance-overview-modcard--soon">
                  <div className="finance-overview-modcard-ic">🤝</div>
                  <div className="finance-overview-modcard-nm">סיוע כספי</div>
                  <span className="finance-overview-soon-badge">בקרוב</span>
                </div>
              </div>
            </div>

            <div className="finance-overview-panel">
              <h3>הוצאות לפי חודש</h3>
              <p className="finance-overview-panel-sub">מגמה מאוחדת — 6 חודשים אחרונים</p>
              <div className="finance-overview-chart-container">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Vouchers — coming soon, shown as its own compact strip (5th module, doesn't fit the 2x2 grid) */}
          <div className="finance-overview-soon-strip">
            <div className="finance-overview-modcard finance-overview-modcard--soon finance-overview-modcard--wide">
              <div className="finance-overview-modcard-ic">🎟️</div>
              <div className="finance-overview-modcard-nm">חלוקת תלושים</div>
              <span className="finance-overview-soon-badge">בקרוב</span>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default FinanceOverview;
