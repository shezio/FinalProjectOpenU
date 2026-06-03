import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import axios from '../axiosConfig';
import { toast } from 'react-toastify';
import { showErrorToast } from '../components/toastUtils';
import { useTranslation } from 'react-i18next';
import '../i18n';
import '../styles/common.css';
import '../styles/refunds.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const REFUND_STATUS_OPTIONS = ['ממתין', 'אושר', 'אושר חלקית', 'שולם', 'בוטל/נדחה'];
const PAYMENT_METHOD_OPTIONS = ['ביט', 'פייבוקס', 'העברה בנקאית', 'אשראי', 'מזומן'];
const COORDINATOR_OPTIONS = ['נעם', 'טל', 'נבו', 'אורי', 'ליאם'];
const ISRAELI_PHONE_REGEX = /^0[2-9]\d{7,8}$/;
const MAX_FILE_SIZE_MB = 10;

const normalizePhone = (phone) => phone ? phone.replace(/[\s\-().]/g, '') : phone;

const STATUS_BADGE_CLASS = {
  'ממתין': 'ממתין',
  'אושר': 'אושר',
  'אושר חלקית': 'אושר-חלקית',
  'שולם': 'שולם',
  'בוטל/נדחה': 'בוטל-נדחה',
};

const PAGE_SIZE = 5;

// Format any date string to dd/mm/yyyy
const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  // Already dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  // YYYY-MM-DD
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr;
};

// ── Component ──────────────────────────────────────────────────────────────────
const Refunds = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Data state ────────────────────────────────────────────────────────────
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState('expense_date');
  const [sortDir, setSortDir]     = useState('desc'); // 'asc' | 'desc'

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };
  const sortArrow = (field) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅';

  // ── Role flags ────────────────────────────────────────────────────────────
  const [isAdminUser, setIsAdminUser] = useState(false);

  // ── Phone hint (pre-fill) ─────────────────────────────────────────────────
  const [phoneHint, setPhoneHint] = useState('');

  // ── Modal state ───────────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);

  // ── Import state ──────────────────────────────────────────────────────────
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const emptyForm = {
    expense_date: '',
    requested_amount: '',
    approved_amount: '',
    description: '',
    volunteer_comment: '',
    admin_comment: '',
    approved_by: '',
    file_url: '',
    status: 'ממתין',
    refund_method: '',
    phone_number: '',
    use_hint_phone: true,
    save_phone_for_future: false,
  };
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  // ── File upload ───────────────────────────────────────────────────────────
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);       // File object, not yet uploaded
  const fileInputRef = useRef(null);

  // ── Fetch data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    fetchRefunds();
    fetchPhoneHint();
    detectAdminRole();
  }, []);

  // Pre-fill search if navigated from Tasks with a volunteer name
  useEffect(() => {
    if (location.state?.search) {
      setSearchQuery(location.state.search);
    }
  }, [location.state]);

  const detectAdminRole = () => {
    const staff = JSON.parse(localStorage.getItem('staff') || '[]');
    const origUsername = localStorage.getItem('origUsername') || '';
    const currentStaff = staff.find(s => s.username === origUsername);
    const roles = currentStaff?.roles || [];
    setIsAdminUser(roles.includes('System Administrator'));
  };

  const fetchRefunds = () => {
    setLoading(true);
    axios.get('/api/refunds/')
      .then(res => {
        setRefunds(res.data.refunds || []);
        setCurrentPage(1);
      })
      .catch(err => {
        showErrorToast(t, err.response?.data?.error || 'שגיאה בטעינת הנתונים', '');
      })
      .finally(() => setLoading(false));
  };

  const fetchPhoneHint = () => {
    axios.get('/api/refunds/phone-hint/')
      .then(res => {
        setPhoneHint(res.data.phone_hint || '');
      })
      .catch(() => {});
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const filteredRefunds = (refunds.filter(r => {
    const matchesSearch = !searchQuery || (
      (r.staff_full_name || '').includes(searchQuery) ||
      (r.description || '').includes(searchQuery) ||
      (r.status || '').includes(searchQuery)
    );
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  })).slice().sort((a, b) => {
    const va = a[sortField] || '';
    const vb = b[sortField] || '';
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });
  const totalRequested = filteredRefunds.reduce((s, r) => s + parseFloat(r.requested_amount || 0), 0);
  const totalApproved = filteredRefunds.reduce((s, r) => s + parseFloat(r.approved_amount || 0), 0);

  // ── Import from Excel ─────────────────────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const res = await axios.post('/api/refunds/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { created, skipped, errors: errs, message } = res.data;
      toast.success(message || `יובאו ${created} רשומות`);
      if (errs && errs.length > 0) {
        errs.forEach(e => showErrorToast(t, e, ''));
      }
      fetchRefunds();
    } catch (err) {
      showErrorToast(t, err.response?.data?.error || 'שגיאה בייבוא הקובץ', '');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = (data, isAdmin) => {
    const errs = {};
    if (!data.expense_date) errs.expense_date = 'תאריך הוצאה נדרש';
    if (!data.requested_amount || isNaN(data.requested_amount) || parseFloat(data.requested_amount) <= 0)
      errs.requested_amount = 'סכום מבוקש חייב להיות מספר חיובי';
    if (!data.description?.trim()) errs.description = 'תיאור נדרש';
    if (!data.file_url && !pendingFile) errs.file = 'יש לצרף קבלה / אסמכתה';
    if (['אושר', 'אושר חלקית'].includes(data.status) && !data.approved_amount)
      errs.approved_amount = 'סכום שאושר נדרש בעת אישור (מלא או חלקי)';
    if (data.status === 'שולם') {
      if (!data.refund_method) errs.refund_method = 'אמצעי תשלום נדרש כאשר הסטטוס הוא שולם';
      if (!data.approved_amount) errs.approved_amount = 'סכום שאושר נדרש כאשר הסטטוס הוא שולם';
    }

    const effectivePhone = data.use_hint_phone ? phoneHint : data.phone_number;
    if (!data.use_hint_phone && data.phone_number && !ISRAELI_PHONE_REGEX.test(normalizePhone(data.phone_number)))
      errs.phone_number = 'מספר טלפון ישראלי לא תקין (לדוגמה: 0541234567)';

    return errs;
  };

  // ── File upload helpers ───────────────────────────────────────────────────

  // Select file locally — DO NOT upload yet
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showErrorToast(t, `קובץ גדול מדי. מקסימום ${MAX_FILE_SIZE_MB}MB`, '');
      return;
    }
    setPendingFile(file);
    // Clear any previously stored URL so the user sees the pending file name
    setFormData(prev => ({ ...prev, file_url: '' }));
  };

  // Actually upload to Azure — called just before POST/PUT, only if a new file was picked
  const uploadPendingFileIfNeeded = async () => {
    if (!pendingFile) return null; // nothing new to upload

    setUploadingFile(true);
    try {
      const urlRes = await axios.get('/api/refunds/upload-url/', {
        params: { filename: pendingFile.name }
      });
      const { upload_url, blob_url } = urlRes.data;

      const isAzure = upload_url.includes('blob.core.windows.net');
      const uploadHeaders = { 'Content-Type': pendingFile.type };
      if (isAzure) uploadHeaders['x-ms-blob-type'] = 'BlockBlob';

      await fetch(upload_url, {
        method: 'PUT',
        headers: uploadHeaders,
        body: pendingFile,
      });

      return blob_url;
    } catch (err) {
      showErrorToast(t, 'שגיאה בהעלאת הקובץ', '');
      throw err;
    } finally {
      setUploadingFile(false);
    }
  };

  // ── CREATE ─────────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setFormData({
      ...emptyForm,
      use_hint_phone: !!phoneHint,
    });
    setFormErrors({});
    setPendingFile(null);
    setIsCreateModalOpen(true);
  };

  const handleCreate = async () => {
    const errs = validateForm(formData);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    let fileUrl = formData.file_url;
    try {
      const uploaded = await uploadPendingFileIfNeeded();
      if (uploaded) fileUrl = uploaded;
    } catch { return; }

    const payload = {
      ...formData,
      file_url: fileUrl,
      phone_number: normalizePhone(formData.use_hint_phone ? phoneHint : formData.phone_number),
    };

    axios.post('/api/refunds/create/', payload)
      .then(() => {
        toast.success('בקשת ההחזר נוצרה בהצלחה');
        setIsCreateModalOpen(false);
        setPendingFile(null);
        fetchRefunds();
        fetchPhoneHint();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה ביצירת הבקשה', ''));
  };

  // ── EDIT ───────────────────────────────────────────────────────────────────
  const openEditModal = (refund) => {
    setSelectedRefund(refund);
    setFormData({
      expense_date: refund.expense_date,
      requested_amount: refund.requested_amount,
      approved_amount: refund.approved_amount || '',
      description: refund.description,
      volunteer_comment: refund.volunteer_comment || '',
      admin_comment: refund.admin_comment || '',
      approved_by: refund.approved_by || '',
      file_url: refund.file_url || '',
      status: refund.status,
      refund_method: refund.refund_method || '',
      phone_number: refund.phone_number || '',
      use_hint_phone: !!refund.phone_number,
      save_phone_for_future: false,
    });
    setFormErrors({});
    setPendingFile(null);
    setIsEditModalOpen(true);
  };

  const handleEdit = async () => {
    const errs = validateForm(formData, isAdminUser);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    let fileUrl = formData.file_url;
    try {
      const uploaded = await uploadPendingFileIfNeeded();
      if (uploaded) fileUrl = uploaded;
    } catch { return; }

    const payload = {
      ...formData,
      file_url: fileUrl,
      phone_number: normalizePhone(formData.use_hint_phone ? (selectedRefund.phone_number || phoneHint) : formData.phone_number),
    };

    axios.put(`/api/refunds/update/${selectedRefund.id}/`, payload)
      .then(() => {
        toast.success('בקשת ההחזר עודכנה בהצלחה');
        setIsEditModalOpen(false);
        setPendingFile(null);
        fetchRefunds();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה בעדכון הבקשה', ''));
  };

  // ── DELETE ─────────────────────────────────────────────────────────────────
  const openDeleteModal = (refund) => {
    setSelectedRefund(refund);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = () => {
    axios.delete(`/api/refunds/delete/${selectedRefund.id}/`)
      .then(() => {
        toast.success('בקשת ההחזר נמחקה');
        setIsDeleteModalOpen(false);
        fetchRefunds();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה במחיקת הבקשה', ''));
  };

  // ── VIEW (detail) ──────────────────────────────────────────────────────────
  const openViewModal = (refund) => {
    setSelectedRefund(refund);
    setIsViewModalOpen(true);
  };

  // ── Shared form fields JSX ─────────────────────────────────────────────────
  const renderFormFields = (readOnly = false, isCreate = false) => (
    <div className="refund-modal-body">
      {/* Row 1: date + requested amount + status (hidden on create — always ממתין) */}
      <div className="refund-form-group">
        <label>תאריך הוצאה *</label>
        <input type="date" name="expense_date" value={formData.expense_date} onChange={handleFormChange} disabled={readOnly} />
        {formErrors.expense_date && <div className="refund-field-error">{formErrors.expense_date}</div>}
      </div>
      <div className="refund-form-group">
        <label>סכום מבוקש (₪) *</label>
        <input type="number" name="requested_amount" value={formData.requested_amount} onChange={handleFormChange} min="0" step="0.01" disabled={readOnly} />
        {formErrors.requested_amount && <div className="refund-field-error">{formErrors.requested_amount}</div>}
      </div>
      {!isCreate && (
        <div className="refund-form-group">
          <label>סטטוס</label>
          <select name="status" value={formData.status} onChange={handleFormChange} disabled={readOnly || !isAdminUser}>
            {REFUND_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Row 2: approved amount + payment method + approved by */}
      {!isCreate && (
        <div className="refund-form-group">
          <label>סכום שאושר (₪) {['אושר', 'אושר חלקית'].includes(formData.status) ? '*' : ''}</label>
          <input type="number" name="approved_amount" value={formData.approved_amount} onChange={handleFormChange} min="0" step="0.01" disabled={readOnly} />
          {formErrors.approved_amount && <div className="refund-field-error">{formErrors.approved_amount}</div>}
        </div>
      )}
      {!isCreate && (
        <div className="refund-form-group">
          <label>אמצעי תשלום {formData.status === 'שולם' ? '*' : ''}</label>
          <select name="refund_method" value={formData.refund_method} onChange={handleFormChange} disabled={readOnly || !isAdminUser}>
            <option value="">-- בחר --</option>
            {PAYMENT_METHOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {formErrors.refund_method && <div className="refund-field-error">{formErrors.refund_method}</div>}
        </div>
      )}
      <div className="refund-form-group">
        <label>אושר על ידי</label>
        <select name="approved_by" value={formData.approved_by} onChange={handleFormChange} disabled={readOnly}>
          <option value="">-- בחר --</option>
          {COORDINATOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Description — hidden in read-only/view mode (shown in header block above); wider+taller in edit */}
      {!readOnly && (
        <div className="refund-form-group full-width">
          <label>תיאור *</label>
          <textarea name="description" value={formData.description} onChange={handleFormChange} style={{ minHeight: '90px', resize: 'vertical' }} />
          {formErrors.description && <div className="refund-field-error">{formErrors.description}</div>}
        </div>
      )}

      {/* Full-width: phone */}
      <div className="refund-form-group full-width">
        <label>טלפון לתשלום</label>
        {phoneHint && (
          <>
            <label className="refund-phone-hint-label">
              <input type="checkbox" name="use_hint_phone" checked={formData.use_hint_phone} onChange={handleFormChange} disabled={readOnly} className="refund-phone-hint-checkbox" />
              השתמש במספר זה
            </label>
            <div className="refund-phone-hint">
              <strong>מספר שנשמר בעבר: {phoneHint}</strong>
            </div>
          </>
        )}
        {!formData.use_hint_phone && (
          <>
            <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleFormChange} placeholder="לדוגמה: 0541234567" disabled={readOnly} />
            {formErrors.phone_number && <div className="refund-field-error">{formErrors.phone_number}</div>}
            {!readOnly && (
              <label className="refund-save-phone-label">
                <input type="checkbox" name="save_phone_for_future" checked={formData.save_phone_for_future} onChange={handleFormChange} />
                שמור מספר זה לתשלומים עתידיים
              </label>
            )}
          </>
        )}
      </div>

      {/* Full-width: volunteer comment */}
      <div className="refund-form-group half-width">
        <label>הערת מתנדב</label>
        <textarea name="volunteer_comment" value={formData.volunteer_comment} onChange={handleFormChange} disabled={readOnly} />
      </div>

      {/* Admin comment — same row, second half */}
      {isAdminUser && !isCreate && (
        <div className="refund-form-group half-width">
          <label>הערת מנהל</label>
          <textarea name="admin_comment" value={formData.admin_comment} onChange={handleFormChange} disabled={readOnly} />
        </div>
      )}

      {/* Full-width: receipt upload */}
      {!readOnly && (
        <div className="refund-form-group full-width">
          <label>קבלה / אסמכתה (עד {MAX_FILE_SIZE_MB}MB) *</label>
          <div
            className={`refund-upload-zone ${pendingFile ? 'has-file' : formData.file_url ? 'has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingFile
              ? 'מעלה קובץ...'
              : pendingFile
                ? `📎 ${pendingFile.name} — יועלה עם שמירת הבקשה`
                : formData.file_url
                  ? '✅ קובץ קיים — לחץ להחלפה'
                  : 'לחץ לבחירת קובץ (PDF / תמונה)'}
          </div>
          {formErrors.file && <div className="refund-field-error">{formErrors.file}</div>}
          <input ref={fileInputRef} type="file" className="refund-file-input-hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileSelect} />
        </div>
      )}

      {/* Full-width: receipt preview */}
      {formData.file_url && (
        <div className="refund-form-group full-width">
          <a className="refund-receipt-preview" href={formData.file_url} target="_blank" rel="noopener noreferrer">צפה בקבלה בדפדפן</a>
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="refunds-main-content">
      <Sidebar />
      <InnerPageHeader title="החזרי הוצאות" />

      {/* Controls */}
      <div className="refunds-controls">
        <button onClick={openCreateModal}>+ הגש בקשת החזר</button>
        <button onClick={fetchRefunds}>רענן</button>
        {isAdminUser && (
          <>
            <button
              className="btn-report"
              onClick={() => navigate('/reports/refunds-report')}
            >
              דוח לפי תקופה
            </button>
            <button
              onClick={() => importFileRef.current?.click()}
              disabled={importing}
              style={{ display: 'none' }}
            >
              {importing ? 'מייבא...' : 'ייבוא מ-Excel'}
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx"
              className="refund-import-input-hidden"
              onChange={handleImportFile}
              style={{ display: 'none' }}
            />
          </>
        )}
        <select
          className="refunds-status-filter"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="" style={{ background: '#fff', color: '#333' }}>כל הסטטוסים</option>
          {REFUND_STATUS_OPTIONS.map(s => (
            <option key={s} value={s} style={{ background: '#fff', color: '#333' }}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          className="tutorship-search-bar"
          placeholder={isAdminUser ? 'חיפוש לפי שם, תיאור...' : 'חיפוש לפי תיאור...'}
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
      {refunds.length > 0 && (
        <div className="refunds-totals-bar">
          <div className="refunds-total-chip">
            סה"כ מבוקש: <strong>{totalRequested.toFixed(2)} ₪</strong>
          </div>
          <div className="refunds-total-chip">
            סה"כ אושר: <strong>{totalApproved.toFixed(2)} ₪</strong>
          </div>
          <div className="refunds-total-chip">
            רשומות: <strong>{filteredRefunds.length}</strong>
          </div>
          {(() => {
            const pendingCount = refunds.filter(r => r.status === 'ממתין').length;
            return (
              <div className={`refunds-total-chip${pendingCount > 0 ? ' refunds-total-chip--pending' : ''}`}>
                ממתינות לטיפול: <strong className={pendingCount > 0 ? 'pending-count' : ''}>{pendingCount}</strong>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── REPORTS VIEW (frontend-only) ─────────────────────────────────── */}

      {/* Table */}
      {loading ? (
        <div className="refunds-loading">טוען נתונים...</div>
      ) : refunds.length === 0 ? (
        <div className="refunds-empty">אין בקשות החזר להציג</div>
      ) : filteredRefunds.length === 0 ? (
        <div className="refunds-empty">לא נמצאו תוצאות לחיפוש</div>
      ) : (
        <div className="refunds-table-wrapper">
          {(() => {
            const totalPages = Math.max(1, Math.ceil(filteredRefunds.length / PAGE_SIZE));
            const safePage = Math.min(currentPage, totalPages);
            const paginated = filteredRefunds.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
            return (
              <>
                <table className="refunds-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {isAdminUser && <th>שם מלא</th>}
                      <th className="sortable-th" onClick={() => toggleSort('expense_date')}>תאריך הוצאה{sortArrow('expense_date')}</th>
                      <th>סכום מבוקש</th>
                      <th>סכום שאושר</th>
                      <th>סטטוס</th>
                      <th>אמצעי תשלום</th>
                      <th>אושר ע"י</th>
                      <th className="sortable-th" onClick={() => toggleSort('created_at')}>תאריך יצירה{sortArrow('created_at')}</th>
                      <th>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(r => (
                      <tr key={r.id} onClick={() => openViewModal(r)}>
                        <td>{r.id}</td>
                        {isAdminUser && <td>{r.staff_full_name}</td>}
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
                        <td onClick={e => e.stopPropagation()}>
                          <button className="refund-row-actions">
                            <span title="ערוך" className="refund-action-btn" onClick={() => openEditModal(r)}>ערוך</span>
                            {isAdminUser && (
                              <span title="מחק" className="refund-action-btn" onClick={() => openDeleteModal(r)}>מחק</span>
                            )}
                          </button>
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
                    const maxButtons = 5;
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
        <div className="refund-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="refund-modal" onClick={e => e.stopPropagation()}>
            <button className="refund-modal-close" onClick={() => setIsCreateModalOpen(false)}>✕</button>
            {renderFormFields(false, true)}
            <div className="refund-modal-actions">
              <button className="btn-primary" onClick={handleCreate}>שלח בקשה</button>
              <button className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ─────────────────────────────────────────────────────── */}
      {isEditModalOpen && selectedRefund && (
        <div className="refund-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="refund-modal" onClick={e => e.stopPropagation()}>
            <button className="refund-modal-close" onClick={() => setIsEditModalOpen(false)}>✕</button>
            <h2>עריכת בקשה #{selectedRefund.id}</h2>
            {renderFormFields(false)}
            <div className="refund-modal-actions">
              <button className="btn-primary" onClick={handleEdit}>שמור שינויים</button>
              <button className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ─────────────────────────────────────────────────────── */}
      {isViewModalOpen && selectedRefund && (
        <div className="refund-modal-overlay" onClick={() => setIsViewModalOpen(false)}>
          <div className="refund-modal" onClick={e => e.stopPropagation()}>
            <button className="refund-modal-close" onClick={() => setIsViewModalOpen(false)}>✕</button>
            <h2>פרטי בקשה #{selectedRefund.id} — {selectedRefund.staff_full_name}</h2>
            {selectedRefund.description && (
              <div className="refund-view-description">
                <strong>תיאור:</strong>
                <p>{selectedRefund.description}</p>
              </div>
            )}
            {/* Pre-fill form read-only */}
            {renderFormFields(true)}
            <div className="refund-modal-actions">
              <button className="btn-secondary" onClick={() => setIsViewModalOpen(false)}>סגור</button>
              <button className="btn-primary" onClick={() => { setIsViewModalOpen(false); openEditModal(selectedRefund); }}>ערוך</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ───────────────────────────────────────────── */}
      {isDeleteModalOpen && selectedRefund && (
        <div className="refund-modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="refund-modal refund-modal--narrow" onClick={e => e.stopPropagation()}>
            <button className="refund-modal-close" onClick={() => setIsDeleteModalOpen(false)}>✕</button>
            <h2>מחיקת בקשה</h2>
            <p>האם אתה בטוח שברצונך למחוק את בקשה #{selectedRefund.id}?</p>
            <p className="refund-delete-hint">פעולה זו תמחק את הבקשה לצמיתות ולא ניתן לשחזרה.</p>
            <div className="refund-modal-actions">
              <button className="btn-primary danger" onClick={handleDelete}>כן, מחק</button>
              <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Refunds;
