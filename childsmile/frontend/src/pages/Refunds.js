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
// Up to 3 files per refund (see ExpenseRefund.file_url/_2/_3 in models.py) —
// MAX_FILE_SIZE_MB is the COMBINED total across however many files are attached,
// same overall cap the single-file version always used (not per-file).
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 3;

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
  // Already dd/mm/yyyy (no time) — just return
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  // YYYY-MM-DD
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr;
};

// Format UTC datetime string (dd/mm/yyyy HH:MM from server) → local time
const fmtDateTime = (dateStr) => {
  if (!dateStr) return '—';
  // dd/mm/yyyy HH:MM — treat as UTC, convert to local
  const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
  if (m) {
    const utc = new Date(Date.UTC(Number(m[3]), Number(m[2])-1, Number(m[1]), Number(m[4]), Number(m[5])));
    const dd = String(utc.getDate()).padStart(2, '0');
    const mo = String(utc.getMonth()+1).padStart(2, '0');
    const hh = String(utc.getHours()).padStart(2, '0');
    const mi = String(utc.getMinutes()).padStart(2, '0');
    return `${dd}/${mo}/${utc.getFullYear()} ${hh}:${mi}`;
  }
  return fmtDate(dateStr);
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

  // ── Staff list (for "submit as another user" — fetched from /api/staff/) ──
  const [staffList, setStaffList] = useState([]);
  const [staffPhoneMap, setStaffPhoneMap] = useState({}); // "FirstName LastName" → phone
  const [staffSearch, setStaffSearch] = useState('');
  const [staffDropOpen, setStaffDropOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(''); // dedicated — never inside formData

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
  // Volunteers / tutors (non-staff) may only VIEW refund requests, never edit.
  const [isNonStaffUser, setIsNonStaffUser] = useState(false);

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
    status: 'ממתין',
    refund_method: '',
    phone_number: '',
    use_hint_phone: true,
    save_phone_for_future: false,
  };
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  // ── File upload ── up to MAX_FILES (3) per refund, combined size ≤ MAX_FILE_SIZE_MB ──
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);   // File[] — picked, not yet uploaded
  const [existingFiles, setExistingFiles] = useState([]);  // [{slot, file_url, file_name, file_size}] — already on the refund (edit/view)
  const [removedSlots, setRemovedSlots] = useState([]);    // slot numbers marked for removal this edit session (not yet saved)
  const fileInputRef = useRef(null);

  // ── Fetch data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    fetchRefunds();
    fetchPhoneHint();
    detectAdminRole();
    // Staff list for "submit on behalf of" dropdown (admin only)
    axios.get('/api/staff/')
      .then(res => {
        const sorted = (res.data.staff || []).sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'he')
        );
        setStaffList(sorted);
      })
      .catch(() => {});
    // SignedUp table has guaranteed phone for every volunteer — build a name→phone map
    axios.get('/api/get_signedup/')
      .then(res => {
        const map = {};
        (res.data.signedup_users || []).forEach(u => {
          const key = `${u.first_name} ${u.surname}`;
          if (u.phone) map[key] = u.phone;
          // also key by email for fallback lookup
          if (u.email && u.phone) map[u.email] = u.phone;
        });
        setStaffPhoneMap(map);
      })
      .catch(() => {});
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
    setIsAdminUser(roles.includes('System Administrator') || roles.includes('Viewer'));
    // Non-staff = a volunteer or tutor with no elevated (staff) role. These
    // users may only VIEW refund requests, never edit them.
    const hasVolunteerOrTutor = roles.includes('Tutor') || roles.includes('General Volunteer');
    const hasStaffRole =
      roles.includes('System Administrator') ||
      roles.includes('Reviewer') ||
      roles.includes('Viewer') ||
      roles.some(r => typeof r === 'string' && r.includes('Coordinator'));
    setIsNonStaffUser(hasVolunteerOrTutor && !hasStaffRole);
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
    const matchesStatus = !statusFilter
      ? true
      : statusFilter === 'ממתינות לתשלום'
        ? ['אושר', 'אושר חלקית'].includes(r.status)
        : r.status === statusFilter;
    return matchesSearch && matchesStatus;
  })).slice().sort((a, b) => {
    let va = a[sortField] || '';
    let vb = b[sortField] || '';
    // Parse dd/mm/yyyy HH:MM or dd/mm/yyyy → sortable value
    const parseDateVal = (v) => {
      const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?/);
      if (m) return new Date(m[3], m[2]-1, m[1], m[4]||0, m[5]||0).getTime();
      return new Date(v).getTime() || v;
    };
    if (sortField === 'expense_date' || sortField === 'created_at' || sortField === 'updated_at') {
      va = parseDateVal(va);
      vb = parseDateVal(vb);
    }
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
    const remainingExisting = existingFiles.filter(f => !removedSlots.includes(f.slot));
    if (remainingExisting.length === 0 && pendingFiles.length === 0) errs.file = 'יש לצרף קבלה / אסמכתא אחת';
    if (['אושר', 'אושר חלקית'].includes(data.status) && !data.approved_amount)
      errs.approved_amount = 'סכום שאושר נדרש בעת אישור (מלא או חלקי)';
    if (['אושר', 'אושר חלקית', 'שולם'].includes(data.status) && !data.refund_method)
      errs.refund_method = 'אמצעי תשלום נדרש בעת אישור';
    if (data.status === 'שולם') {
      if (!data.approved_amount) errs.approved_amount = 'סכום שאושר נדרש כאשר הסטטוס הוא שולם';
    }

    const effectivePhone = data.use_hint_phone ? phoneHint : data.phone_number;
    if (!data.use_hint_phone && data.phone_number && !ISRAELI_PHONE_REGEX.test(normalizePhone(data.phone_number)))
      errs.phone_number = 'מספר טלפון ישראלי לא תקין (לדוגמה: 0541234567)';

    return errs;
  };

  // ── File upload helpers ───────────────────────────────────────────────────

  // Select file(s) locally — DO NOT upload yet. Enforces MAX_FILES (existing kept
  // + pending + new) and MAX_FILE_SIZE_MB as a COMBINED total (not per-file).
  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    const remainingExisting = existingFiles.filter(f => !removedSlots.includes(f.slot));
    const totalCount = remainingExisting.length + pendingFiles.length + newFiles.length;
    if (totalCount > MAX_FILES) {
      showErrorToast(t, `ניתן לצרף עד ${MAX_FILES} קבצים בסך הכל`, '');
      e.target.value = '';
      return;
    }

    const existingBytes = remainingExisting.reduce((s, f) => s + (f.file_size || 0), 0);
    const pendingBytes = pendingFiles.reduce((s, f) => s + f.size, 0);
    const newBytes = newFiles.reduce((s, f) => s + f.size, 0);
    if (existingBytes + pendingBytes + newBytes > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showErrorToast(t, `הגודל הכולל של כל הקבצים חורג מהמותר. מקסימום כולל: ${MAX_FILE_SIZE_MB}MB`, '');
      e.target.value = '';
      return;
    }

    setPendingFiles(prev => [...prev, ...newFiles]);
    setFormErrors(prev => ({ ...prev, file: '' }));
    e.target.value = ''; // allow re-selecting the same file name
  };

  const removePendingFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Mark/unmark an already-saved file for removal — no API call happens until
  // Save is clicked (sent as remove_slots in the same update_refund PUT that
  // can also add new files, i.e. how "replace a receipt" works).
  const toggleRemoveExistingSlot = (slot) => {
    setRemovedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  };

  // Actually upload every pending file to Azure — called just before POST/PUT.
  // Returns [{file_url, file_name, file_size}, ...] for whatever's newly picked.
  const uploadPendingFilesIfNeeded = async () => {
    if (pendingFiles.length === 0) return [];

    setUploadingFile(true);
    try {
      const uploaded = [];
      for (const file of pendingFiles) {
        const urlRes = await axios.get('/api/refunds/upload-url/', {
          params: { filename: file.name }
        });
        const { upload_url, blob_url } = urlRes.data;

        const isAzure = upload_url.includes('blob.core.windows.net');
        const uploadHeaders = { 'Content-Type': file.type };
        if (isAzure) uploadHeaders['x-ms-blob-type'] = 'BlockBlob';

        await fetch(upload_url, {
          method: 'PUT',
          headers: uploadHeaders,
          body: file,
        });

        uploaded.push({ file_url: blob_url, file_name: file.name, file_size: file.size });
      }
      return uploaded;
    } catch (err) {
      showErrorToast(t, 'שגיאה בהעלאת הקבצים', '');
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
    setPendingFiles([]);
    setExistingFiles([]);
    setRemovedSlots([]);
    setStaffSearch('');
    setSelectedStaffId('');
    setIsCreateModalOpen(true);
  };

  const handleCreate = async () => {
    const errs = validateForm(formData);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    let attachments;
    try {
      attachments = await uploadPendingFilesIfNeeded();
    } catch { return; }

    const payload = {
      ...formData,
      on_behalf_of_staff_id: selectedStaffId || '',
      attachments,
      phone_number: normalizePhone(formData.use_hint_phone ? phoneHint : formData.phone_number),
    };

    axios.post('/api/refunds/create/', payload)
      .then(() => {
        toast.success('בקשת ההחזר נוצרה בהצלחה');
        setIsCreateModalOpen(false);
        setPendingFiles([]);
        fetchRefunds();
        fetchPhoneHint();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה ביצירת הבקשה', ''));
  };

  // ── EDIT ───────────────────────────────────────────────────────────────────
  const openEditModal = (refund) => {
    // Safety net: non-staff users (volunteers / tutors) can never reach the
    // edit form — fall back to the read-only view modal instead.
    if (isNonStaffUser) { openViewModal(refund); return; }
    setSelectedRefund(refund);
    setFormData({
      expense_date: refund.expense_date,
      requested_amount: refund.requested_amount,
      approved_amount: refund.approved_amount || '',
      description: refund.description,
      volunteer_comment: refund.volunteer_comment || '',
      admin_comment: refund.admin_comment || '',
      approved_by: refund.approved_by || '',
      status: refund.status,
      refund_method: refund.refund_method || '',
      phone_number: refund.phone_number || '',
      use_hint_phone: !!refund.phone_number,
      save_phone_for_future: false,
      on_behalf_of_staff_id: refund.staff_id ? Number(refund.staff_id) : '',
    });
    setFormErrors({});
    setPendingFiles([]);
    setExistingFiles(refund.attachments || []);
    setRemovedSlots([]);
    setStaffSearch('');
    setSelectedStaffId(refund.staff_id ? Number(refund.staff_id) : '');
    setIsEditModalOpen(true);
  };

  const handleEdit = async () => {
    const errs = validateForm(formData, isAdminUser);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    let attachments;
    try {
      attachments = await uploadPendingFilesIfNeeded();
    } catch { return; }

    const payload = {
      ...formData,
      on_behalf_of_staff_id: selectedStaffId || '',
      attachments,
      remove_slots: removedSlots,
      phone_number: normalizePhone(formData.use_hint_phone ? (selectedRefund.phone_number || phoneHint) : formData.phone_number),
    };

    axios.put(`/api/refunds/update/${selectedRefund.id}/`, payload)
      .then(() => {
        toast.success('בקשת ההחזר עודכנה בהצלחה');
        setIsEditModalOpen(false);
        setPendingFiles([]);
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
    setFormData({
      expense_date: refund.expense_date,
      requested_amount: refund.requested_amount,
      approved_amount: refund.approved_amount || '',
      description: refund.description,
      volunteer_comment: refund.volunteer_comment || '',
      admin_comment: refund.admin_comment || '',
      approved_by: refund.approved_by || '',
      status: refund.status,
      refund_method: refund.refund_method || '',
      phone_number: refund.phone_number || '',
      use_hint_phone: false,
      save_phone_for_future: false,
    });
    setExistingFiles(refund.attachments || []);
    setRemovedSlots([]);
    setIsViewModalOpen(true);
  };

  // ── Shared form fields JSX ─────────────────────────────────────────────────
  const renderFormFields = (readOnly = false, isCreate = false) => (
    <div className="refund-modal-body">
      {/* Row 1: staff selector (admin only) + date + requested amount */}
      {isAdminUser && (
      <div className="refund-form-group">
        <label>עבור מתנדב</label>
        {readOnly ? (
          <div className="refund-readonly-value">
            {selectedRefund?.staff_full_name || '—'}
          </div>
        ) : (
          <div className="refund-staff-combobox" style={{ position: 'relative' }}>
            <input
              type="text"
              autoComplete="off"
              placeholder=""
              value={staffSearch}
              onFocus={() => { setStaffDropOpen(true); setStaffSearch(''); }}
              onBlur={() => setTimeout(() => {
                setStaffDropOpen(false);
                if (!selectedStaffId) setStaffSearch('');
              }, 150)}
              onChange={e => {
                setStaffSearch(e.target.value);
                setStaffDropOpen(true);
                if (!e.target.value) setSelectedStaffId('');
              }}
            />
            {!staffSearch && !staffDropOpen && (
              <span className="refund-staff-placeholder">
                {(() => {
                  const sid = Number(selectedStaffId);
                  if (!sid) return 'אני';
                  const found = staffList.find(s => Number(s.id) === sid);
                  if (found) return `${found.first_name} ${found.last_name}`;
                  return selectedRefund?.staff_full_name || 'אני';
                })()}
              </span>
            )}
            {staffDropOpen && (
              <div className="refund-staff-dropdown">
                <div
                  className={`refund-staff-option refund-staff-option--self${!selectedStaffId ? ' selected' : ''}`}
                  onMouseDown={() => {
                    setSelectedStaffId('');
                    setStaffSearch('');
                    setStaffDropOpen(false);
                    // Reset phone to current user's hint
                    setFormData(prev => ({ ...prev, phone_number: '', use_hint_phone: !!phoneHint }));
                  }}
                >
                  אני
                </div>
                {staffList
                  .filter(s => !staffSearch || `${s.first_name} ${s.last_name}`.includes(staffSearch))
                  .map(s => (
                    <div
                      key={s.id}
                      className={`refund-staff-option${Number(selectedStaffId) === Number(s.id) ? ' selected' : ''}`}
                      onMouseDown={() => {
                        setSelectedStaffId(Number(s.id));
                        setStaffSearch('');
                        setStaffDropOpen(false);
                        // Look up phone: 1) SignedUp by name, 2) SignedUp by email, 3) staff_phone from Staff table
                        const fullName = `${s.first_name} ${s.last_name}`;
                        const phone = staffPhoneMap[fullName] || staffPhoneMap[s.email] || s.staff_phone || '';
                        setFormData(prev => ({
                          ...prev,
                          phone_number: phone,
                          use_hint_phone: false,
                        }));
                      }}
                    >
                      {s.first_name} {s.last_name}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Row 1 cont: date + requested amount + status (hidden on create — always ממתין) */}
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

      {/* Full-width: receipt upload (up to MAX_FILES total, combined size ≤ MAX_FILE_SIZE_MB) */}
      {!readOnly && (
        <div className="refund-form-group full-width">
          <label>קבלה / אסמכתה (עד {MAX_FILES} קבצים, עד {MAX_FILE_SIZE_MB}MB בסך הכל) *</label>
          {(() => {
            const remainingExisting = existingFiles.filter(f => !removedSlots.includes(f.slot));
            const atLimit = remainingExisting.length + pendingFiles.length >= MAX_FILES;
            return (
              <>
                <div
                  className={`refund-upload-zone ${remainingExisting.length + pendingFiles.length > 0 ? 'has-file' : ''}`}
                  onClick={() => { if (!atLimit) fileInputRef.current?.click(); }}
                  style={atLimit ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                >
                  {uploadingFile
                    ? 'מעלה קבצים...'
                    : atLimit
                      ? `צורפו ${MAX_FILES} קבצים (המקסימום)`
                      : 'לחץ לבחירת קובץ (PDF / תמונה)'}
                </div>
                {formErrors.file && <div className="refund-field-error">{formErrors.file}</div>}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="refund-file-input-hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                />
                {(remainingExisting.length > 0 || pendingFiles.length > 0 || removedSlots.length > 0) && (
                  <div className="refund-attachments-list">
                    {remainingExisting.map(f => (
                      <div key={f.slot} className="refund-attachment-chip">
                        <a href={f.file_url} target="_blank" rel="noopener noreferrer">📎 {f.file_name || 'קובץ קיים'}</a>
                        <button type="button" onClick={() => toggleRemoveExistingSlot(f.slot)} title="הסר">✕</button>
                      </div>
                    ))}
                    {existingFiles.filter(f => removedSlots.includes(f.slot)).map(f => (
                      <div key={f.slot} className="refund-attachment-chip refund-attachment-chip--removed">
                        <span>🗑️ {f.file_name || 'קובץ קיים'} — יימחק עם השמירה</span>
                        <button type="button" onClick={() => toggleRemoveExistingSlot(f.slot)} title="בטל מחיקה">↩️</button>
                      </div>
                    ))}
                    {pendingFiles.map((file, i) => (
                      <div key={`pending-${i}`} className="refund-attachment-chip refund-attachment-chip--pending">
                        <span>📎 {file.name} — יועלה עם שמירת הבקשה</span>
                        <button type="button" onClick={() => removePendingFile(i)} title="הסר">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Full-width: receipt list (read-only view modal) */}
      {readOnly && existingFiles.length > 0 && (
        <div className="refund-form-group full-width">
          <label>קבלות / אסמכתאות</label>
          <div className="refund-attachments-list">
            {existingFiles.map(f => (
              <div key={f.slot} className="refund-attachment-chip">
                <a className="refund-receipt-preview" href={f.file_url} target="_blank" rel="noopener noreferrer">📎 {f.file_name || 'צפה בקבלה בדפדפן'}</a>
              </div>
            ))}
          </div>
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
          <option value="ממתינות לתשלום" style={{ background: '#fff', color: '#c2410c' }}>ממתינות לתשלום</option>
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
          {(() => {
            const pendingPaymentCount = refunds.filter(r => ['אושר', 'אושר חלקית'].includes(r.status)).length;
            return (
              <div
                className={`refunds-total-chip refunds-total-chip--pending-payment${statusFilter === 'ממתינות לתשלום' ? ' active-filter' : ''}`}
                onClick={() => { setStatusFilter(f => f === 'ממתינות לתשלום' ? '' : 'ממתינות לתשלום'); setCurrentPage(1); }}
                title="לחץ לסינון ממתינות לתשלום"
              >
                ממתינות לתשלום: <strong>{pendingPaymentCount}</strong>
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
                        <td>{fmtDateTime(r.created_at)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="refund-row-actions">
                            {isNonStaffUser ? (
                              <span title="צפה בפרטי הבקשה" className="refund-action-btn" onClick={() => openViewModal(r)}>צפה בפרטי הבקשה</span>
                            ) : (
                              <span title="ערוך" className="refund-action-btn" onClick={() => openEditModal(r)}>ערוך</span>
                            )}
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
              {!isNonStaffUser && (
                <button className="btn-primary" onClick={() => { setIsViewModalOpen(false); openEditModal(selectedRefund); }}>ערוך</button>
              )}
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
