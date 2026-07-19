import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import axios from '../axiosConfig';
import { toast } from 'react-toastify';
import { showErrorToast } from '../components/toastUtils';
import { exportOngoingExpensesToExcel } from '../components/export_utils';
import { useTranslation } from 'react-i18next';
import { hasAllPermissions } from '../components/utils';
import '../i18n';
import '../styles/common.css';
import '../styles/ongoingexpenses.css';

// ADMIN-ONLY page for now (System Administrator / Viewer — see add_ongoing_expenses_table.sql).
// Same requiredPermissions + hasAllPermissions pattern as SystemManagement.js / AuditLog.js / PettyCash.js.
const requiredPermissions = [
  { resource: 'childsmile_app_ongoingexpense', action: 'VIEW' },
  { resource: 'childsmile_app_ongoingexpense', action: 'CREATE' },
  { resource: 'childsmile_app_ongoingexpense', action: 'UPDATE' },
  { resource: 'childsmile_app_ongoingexpense', action: 'DELETE' },
];

const PAGE_SIZE = 8;

// Format any date string to dd/mm/yyyy
const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr;
};

// ── Component ──────────────────────────────────────────────────────────────────
const OngoingExpenses = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // ADMIN-ONLY page for now (System Administrator / Viewer — see add_ongoing_expenses_table.sql)
  const hasPermissionOnOngoingExpenses = hasAllPermissions(requiredPermissions);

  // ── Data state ────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState('expense_date');
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };
  const sortArrow = (field) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅';

  // ── Modal state ───────────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const emptyForm = {
    expense_date: '',
    expense_name: '',
    category: '',
    amount: '',
    invoice_number: '',
    notes: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  // ── Fetch data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (hasPermissionOnOngoingExpenses) fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEntries = () => {
    setLoading(true);
    axios.get('/api/ongoing-expenses/')
      .then(res => {
        setEntries(res.data.ongoing_expenses || []);
        setCurrentPage(1);
      })
      .catch(err => {
        showErrorToast(t, err.response?.data?.error || 'שגיאה בטעינת הנתונים', '');
      })
      .finally(() => setLoading(false));
  };

  // ── Category autocomplete — distinct previously-used values, newest first ──
  const categorySuggestions = Array.from(
    new Set(entries.map(e => e.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'he'));

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filteredEntries = entries.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.trim();
    return (
      (e.expense_name || '').includes(q) ||
      (e.category || '').includes(q) ||
      (e.invoice_number || '').includes(q) ||
      (e.notes || '').includes(q)
    );
  }).slice().sort((a, b) => {
    let va = a[sortField] || '';
    let vb = b[sortField] || '';
    if (sortField === 'expense_date') {
      va = new Date(va).getTime();
      vb = new Date(vb).getTime();
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalAmount = filteredEntries.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const highestAmount = filteredEntries.reduce((m, e) => Math.max(m, parseFloat(e.amount || 0)), 0);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = (data) => {
    const errs = {};
    if (!data.expense_date) errs.expense_date = 'תאריך נדרש';
    if (!data.expense_name?.trim()) errs.expense_name = 'תיאור ההוצאה נדרש';
    if (!data.amount || isNaN(data.amount) || parseFloat(data.amount) <= 0)
      errs.amount = 'סכום חייב להיות מספר חיובי';
    return errs;
  };

  // ── CREATE ─────────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setFormData(emptyForm);
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const handleCreate = () => {
    const errs = validateForm(formData);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    axios.post('/api/ongoing-expenses/create/', formData)
      .then(() => {
        toast.success('ההוצאה נוספה בהצלחה');
        setIsCreateModalOpen(false);
        fetchEntries();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה בהוספת ההוצאה', ''));
  };

  // ── EDIT ───────────────────────────────────────────────────────────────────
  const openEditModal = (entry) => {
    setSelectedEntry(entry);
    setFormData({
      expense_date: entry.expense_date,
      expense_name: entry.expense_name,
      category: entry.category || '',
      amount: entry.amount,
      invoice_number: entry.invoice_number || '',
      notes: entry.notes || '',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleEdit = () => {
    const errs = validateForm(formData);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    axios.put(`/api/ongoing-expenses/update/${selectedEntry.id}/`, formData)
      .then(() => {
        toast.success('ההוצאה עודכנה בהצלחה');
        setIsEditModalOpen(false);
        fetchEntries();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה בעדכון ההוצאה', ''));
  };

  // ── DELETE ─────────────────────────────────────────────────────────────────
  const openDeleteModal = (entry) => {
    setSelectedEntry(entry);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = () => {
    axios.delete(`/api/ongoing-expenses/delete/${selectedEntry.id}/`)
      .then(() => {
        toast.success('ההוצאה נמחקה');
        setIsDeleteModalOpen(false);
        fetchEntries();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה במחיקת ההוצאה', ''));
  };

  // ── Shared form fields JSX ─────────────────────────────────────────────────
  const renderFormFields = () => (
    <div className="ongoing-expense-modal-body">
      <div className="ongoing-expense-form-group">
        <label>תאריך *</label>
        <input type="date" name="expense_date" value={formData.expense_date} onChange={handleFormChange} />
        {formErrors.expense_date && <div className="ongoing-expense-field-error">{formErrors.expense_date}</div>}
      </div>
      <div className="ongoing-expense-form-group">
        <label>סכום (₪) *</label>
        <input type="number" name="amount" value={formData.amount} onChange={handleFormChange} min="0" step="0.01" />
        {formErrors.amount && <div className="ongoing-expense-field-error">{formErrors.amount}</div>}
      </div>
      <div className="ongoing-expense-form-group">
        <label>קטגוריה</label>
        <input
          type="text"
          name="category"
          list="ongoing-expense-category-suggestions"
          value={formData.category}
          onChange={handleFormChange}
          placeholder="לדוגמה: רכב, תפעול..."
        />
        <datalist id="ongoing-expense-category-suggestions">
          {categorySuggestions.map(c => <option key={c} value={c} />)}
        </datalist>
      </div>
      <div className="ongoing-expense-form-group">
        <label>מספר חשבונית</label>
        <input type="text" name="invoice_number" value={formData.invoice_number} onChange={handleFormChange} />
      </div>
      <div className="ongoing-expense-form-group full-width">
        <label>הוצאה *</label>
        <input type="text" name="expense_name" value={formData.expense_name} onChange={handleFormChange} placeholder="לדוגמה: דלק, כביש 6, שכירות מחסן..." />
        {formErrors.expense_name && <div className="ongoing-expense-field-error">{formErrors.expense_name}</div>}
      </div>
      <div className="ongoing-expense-form-group full-width">
        <label>הערות</label>
        <textarea name="notes" value={formData.notes} onChange={handleFormChange} />
      </div>
    </div>
  );

  // ── No-permission screen (admin-only page) ──────────────────────────────────
  if (!hasPermissionOnOngoingExpenses) {
    return (
      <div className="ongoing-expense-main-content">
        <Sidebar />
        <InnerPageHeader title="הוצאות שוטפות" />
        <div className="no-permission">
          <h2>עמוד זה מיועד למנהלי מערכת בלבד</h2>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ongoing-expense-main-content">
      <Sidebar />
      <InnerPageHeader title="הוצאות שוטפות" />

      {/* Controls */}
      <div className="ongoing-expense-controls">
        <button onClick={() => navigate('/finance-overview')}>← לסקירה כללית</button>
        <button onClick={openCreateModal}>+ הוצאה חדשה</button>
        <button onClick={fetchEntries}>רענן</button>
        <button onClick={() => exportOngoingExpensesToExcel(filteredEntries, t)}>ייצוא לאקסל</button>
        <input
          type="text"
          className="tutorship-search-bar"
          placeholder="חיפוש לפי הוצאה, קטגוריה, חשבונית, הערות..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
        />
        {searchQuery && (
          <span className="filter-chip filter-chip--inline">
            מסנן לפי: <strong>{searchQuery}</strong>
            <button className="filter-chip-close" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}>✕</button>
          </span>
        )}
      </div>

      {/* Totals bar */}
      {entries.length > 0 && (
        <div className="ongoing-expense-totals-bar">
          <div className="ongoing-expense-total-chip">
            סה"כ: <strong>{totalAmount.toFixed(2)} ₪</strong>
          </div>
          <div className="ongoing-expense-total-chip">
            עסקאות: <strong>{filteredEntries.length}</strong>
          </div>
          <div className="ongoing-expense-total-chip">
            הגבוהה ביותר: <strong>{highestAmount.toFixed(2)} ₪</strong>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="ongoing-expense-loading">טוען נתונים...</div>
      ) : entries.length === 0 ? (
        <div className="ongoing-expense-empty">אין הוצאות שוטפות להציג</div>
      ) : filteredEntries.length === 0 ? (
        <div className="ongoing-expense-empty">לא נמצאו תוצאות לחיפוש</div>
      ) : (
        <div className="ongoing-expense-table-wrapper">
          {(() => {
            const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
            const safePage = Math.min(currentPage, totalPages);
            const paginated = filteredEntries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
            return (
              <>
                <table className="ongoing-expense-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th className="sortable-th" onClick={() => toggleSort('expense_date')}>תאריך{sortArrow('expense_date')}</th>
                      <th>הוצאה</th>
                      <th>קטגוריה</th>
                      <th>סכום</th>
                      <th>מס' חשבונית</th>
                      <th>הערות</th>
                      <th>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(e => (
                      <tr key={e.id}>
                        <td>{e.id}</td>
                        <td>{fmtDate(e.expense_date)}</td>
                        <td>{e.expense_name}</td>
                        <td>{e.category
                          ? <span className="ongoing-expense-category-badge">{e.category}</span>
                          : '—'}</td>
                        <td>{parseFloat(e.amount).toFixed(2)} ₪</td>
                        <td>{e.invoice_number || '—'}</td>
                        <td className="ongoing-expense-desc-cell">{e.notes || '—'}</td>
                        <td>
                          <div className="ongoing-expense-row-actions">
                            <span title="ערוך" className="ongoing-expense-action-btn" onClick={() => openEditModal(e)}>ערוך</span>
                            <span title="מחק" className="ongoing-expense-action-btn" onClick={() => openDeleteModal(e)}>מחק</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="pagination">
                  <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} className="pagination-arrow">&laquo;</button>
                  <button onClick={() => setCurrentPage(safePage - 1)} disabled={safePage === 1} className="pagination-arrow">&lsaquo;</button>
                  {Array.from({ length: totalPages }, (_, i) => {
                    const pageNum = i + 1;
                    const maxButtons = 3;
                    const halfRange = Math.floor(maxButtons / 2);
                    let start = Math.max(1, safePage - halfRange);
                    let end = Math.min(totalPages, start + maxButtons - 1);
                    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
                    return pageNum >= start && pageNum <= end ? (
                      <button
                        key={pageNum}
                        className={safePage === pageNum ? 'active' : ''}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ) : null;
                  })}
                  <button onClick={() => setCurrentPage(safePage + 1)} disabled={safePage === totalPages} className="pagination-arrow">&rsaquo;</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} className="pagination-arrow">&raquo;</button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── CREATE MODAL ───────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="ongoing-expense-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="ongoing-expense-modal" onClick={e => e.stopPropagation()}>
            <button className="ongoing-expense-modal-close" onClick={() => setIsCreateModalOpen(false)}>✕</button>
            <h2>הוצאה שוטפת חדשה</h2>
            {renderFormFields()}
            <div className="ongoing-expense-modal-actions">
              <button className="btn-primary" onClick={handleCreate}>שמור</button>
              <button className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ─────────────────────────────────────────────────────── */}
      {isEditModalOpen && selectedEntry && (
        <div className="ongoing-expense-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="ongoing-expense-modal" onClick={e => e.stopPropagation()}>
            <button className="ongoing-expense-modal-close" onClick={() => setIsEditModalOpen(false)}>✕</button>
            <h2>עריכת הוצאה #{selectedEntry.id}</h2>
            {renderFormFields()}
            <div className="ongoing-expense-modal-actions">
              <button className="btn-primary" onClick={handleEdit}>שמור שינויים</button>
              <button className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ───────────────────────────────────────────── */}
      {isDeleteModalOpen && selectedEntry && (
        <div className="ongoing-expense-modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="ongoing-expense-modal ongoing-expense-modal--narrow" onClick={e => e.stopPropagation()}>
            <button className="ongoing-expense-modal-close" onClick={() => setIsDeleteModalOpen(false)}>✕</button>
            <h2>מחיקת הוצאה</h2>
            <p>האם אתה בטוח שברצונך למחוק את ההוצאה "{selectedEntry.expense_name}"?</p>
            <p className="ongoing-expense-delete-hint">פעולה זו תמחק את הרשומה לצמיתות ולא ניתן לשחזרה.</p>
            <div className="ongoing-expense-modal-actions">
              <button className="btn-primary danger" onClick={handleDelete}>כן, מחק</button>
              <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OngoingExpenses;
