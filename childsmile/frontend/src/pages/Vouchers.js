import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import axios from '../axiosConfig';
import { toast } from 'react-toastify';
import { showErrorToast } from '../components/toastUtils';
import { exportVoucherDistributionsToExcel, exportVoucherRecipientsToExcel } from '../components/export_utils';
import { useTranslation } from 'react-i18next';
import { hasAllPermissions } from '../components/utils';
import Select from 'react-select';
import '../i18n';
import '../styles/common.css';
import '../styles/vouchers.css';

// ADMIN-ONLY page (System Administrator / Viewer — see add_vouchers_table.sql).
// Same requiredPermissions + hasAllPermissions pattern as PettyCash.js/FinancialAid.js.
const requiredPermissions = [
  { resource: 'childsmile_app_voucherdistribution', action: 'VIEW' },
  { resource: 'childsmile_app_voucherdistribution', action: 'CREATE' },
  { resource: 'childsmile_app_voucherdistribution', action: 'UPDATE' },
  { resource: 'childsmile_app_voucherdistribution', action: 'DELETE' },
];

const PAGE_SIZE = 8;
const VOUCHER_TYPES = ['רמי לוי', 'תו פלוס - קרפור', 'אחר'];
const QUESTIONNAIRE_TYPES = ['עמותה', 'כללי', 'ללא'];
const QUESTIONNAIRE_TYPE_LABELS = { 'עמותה': 'שאלון עמותה', 'כללי': 'שאלון כללי', 'ללא': 'ללא שאלון (פנימי)' };
// Must match Children.status's real choices exactly (models.py) - NOT invented values.
const CHILD_TREATMENT_STATUSES = ['טיפולים', 'מעקבים', 'אחזקה', 'ז״ל', 'בריא', 'עזב'];
const DELIVERED_OPTIONS = ['כן', 'איסוף עצמי', 'לא'];

// Must mirror voucher_views.py's _validate_recipient_data exactly (server-side
// is the real authority, this just gives instant feedback in the admin form too).
const ISRAELI_PHONE_RE = /^0[2-9]\d{7,8}$/;
const RECIPIENT_FIELD_MAX_LENGTHS = {
  full_name: 255, parent_id_number: 20, phone: 20, child_name: 255,
  child_id_number: 20, city: 255, street_address: 255, referral_source: 255,
};

// Real Israeli ת"ז checksum (standard Luhn-style algorithm) - mirrors
// voucher_views.py's _is_valid_israeli_id exactly. child_id on Children IS
// the real government ת"ז (imported from the "תעודת זהות ילד/ה" column).
const isValidIsraeliId = (idNumber) => {
  const s = String(idNumber).trim();
  if (!/^\d{5,9}$/.test(s)) return false;
  const padded = s.padStart(9, '0');
  let total = 0;
  for (let i = 0; i < padded.length; i++) {
    const d = Number(padded[i]) * (i % 2 === 0 ? 1 : 2);
    total += d > 9 ? d - 9 : d;
  }
  return total % 10 === 0;
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr;
};

const Vouchers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasPermissionOnVouchers = hasAllPermissions(requiredPermissions);

  // ── View state: distributions list <-> recipients list for one distribution ──
  const [view, setView] = useState('distributions'); // 'distributions' | 'recipients'
  const [selectedDistribution, setSelectedDistribution] = useState(null);

  // ── Distributions ─────────────────────────────────────────────────────────
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [distSearch, setDistSearch] = useState('');
  const [distCurrentPage, setDistCurrentPage] = useState(1);

  const emptyDistForm = {
    name: '', voucher_type: '', initial_amount: '', start_date: '', end_date: '',
    is_completed: false, questionnaire_type: 'ללא', notes: '',
  };
  const [distFormData, setDistFormData] = useState(emptyDistForm);
  const [distFormErrors, setDistFormErrors] = useState({});
  const [isCreateDistOpen, setIsCreateDistOpen] = useState(false);
  const [isEditDistOpen, setIsEditDistOpen] = useState(false);
  const [isDeleteDistOpen, setIsDeleteDistOpen] = useState(false);

  // ── Recipients (for the currently selected distribution) ─────────────────
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientCurrentPage, setRecipientCurrentPage] = useState(1);
  const [familyOptions, setFamilyOptions] = useState([]);

  const emptyRecipientForm = {
    full_name: '', parent_id_number: '', phone: '', child_name: '', child_treatment_status: '',
    child_id_number: '', num_children_at_home: '', city: '', street_address: '',
    case_description: '', referral_source: '', approved_amount: '', ready: false,
    assigned_volunteer: '', delivered: '', notes: '', linked_child_id: '',
  };
  const [recipientFormData, setRecipientFormData] = useState(emptyRecipientForm);
  const [recipientFormErrors, setRecipientFormErrors] = useState({});
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [isCreateRecipientOpen, setIsCreateRecipientOpen] = useState(false);
  const [isEditRecipientOpen, setIsEditRecipientOpen] = useState(false);
  const [isDeleteRecipientOpen, setIsDeleteRecipientOpen] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasPermissionOnVouchers) {
      fetchDistributions();
      fetchFamilyOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDistributions = () => {
    setLoading(true);
    axios.get('/api/vouchers/distributions/')
      .then(res => setDistributions(res.data.distributions || []))
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה בטעינת הנתונים', ''))
      .finally(() => setLoading(false));
  };

  const fetchFamilyOptions = () => {
    axios.get('/api/financial-aid/family-options/')
      .then(res => setFamilyOptions(res.data.families || []))
      .catch(() => setFamilyOptions([]));
  };

  const fetchRecipients = (distributionId) => {
    setRecipientsLoading(true);
    axios.get('/api/vouchers/recipients/', { params: { distribution_id: distributionId } })
      .then(res => setRecipients(res.data.recipients || []))
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה בטעינת מקבלים', ''))
      .finally(() => setRecipientsLoading(false));
  };

  // ── Navigate to a distribution's recipients ───────────────────────────────
  const openDistributionRecipients = (dist) => {
    setSelectedDistribution(dist);
    setRecipientSearch('');
    setRecipientCurrentPage(1);
    setView('recipients');
    fetchRecipients(dist.id);
  };

  const backToDistributions = () => {
    setView('distributions');
    setSelectedDistribution(null);
    setRecipients([]);
    fetchDistributions(); // refresh computed totals (distributed_amount) after any recipient edits
  };

  const copyPublicLink = (dist) => {
    const url = `${window.location.origin}/voucher-questionnaire/${dist.id}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('הקישור לשאלון הועתק'))
      .catch(() => showErrorToast(t, 'שגיאה בהעתקת הקישור', ''));
  };

  // ── Distribution filter ────────────────────────────────────────────────────
  const filteredDistributions = distributions.filter(d =>
    !distSearch || (d.name || '').includes(distSearch)
  );

  // ── Distribution form ──────────────────────────────────────────────────────
  const validateDistForm = (data) => {
    const errs = {};
    if (!data.name?.trim()) errs.name = 'שם החלוקה נדרש';
    if (!data.voucher_type) errs.voucher_type = 'סוג תו נדרש';
    if (!data.initial_amount || isNaN(data.initial_amount) || parseFloat(data.initial_amount) <= 0)
      errs.initial_amount = 'סכום התחלתי חייב להיות מספר חיובי';
    return errs;
  };

  const openCreateDistModal = () => {
    setDistFormData(emptyDistForm);
    setDistFormErrors({});
    setIsCreateDistOpen(true);
  };

  const handleCreateDist = () => {
    const errs = validateDistForm(distFormData);
    if (Object.keys(errs).length > 0) { setDistFormErrors(errs); return; }
    axios.post('/api/vouchers/distributions/create/', distFormData)
      .then(() => {
        toast.success('החלוקה נוספה בהצלחה');
        setIsCreateDistOpen(false);
        fetchDistributions();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה בהוספת החלוקה', ''));
  };

  const openEditDistModal = (dist) => {
    setSelectedDistribution(dist);
    setDistFormData({
      name: dist.name, voucher_type: dist.voucher_type, initial_amount: dist.initial_amount,
      start_date: dist.start_date || '', end_date: dist.end_date || '',
      is_completed: dist.is_completed, questionnaire_type: dist.questionnaire_type,
      notes: dist.notes || '',
    });
    setDistFormErrors({});
    setIsEditDistOpen(true);
  };

  const handleEditDist = () => {
    const errs = validateDistForm(distFormData);
    if (Object.keys(errs).length > 0) { setDistFormErrors(errs); return; }
    axios.put(`/api/vouchers/distributions/update/${selectedDistribution.id}/`, distFormData)
      .then(() => {
        toast.success('החלוקה עודכנה בהצלחה');
        setIsEditDistOpen(false);
        fetchDistributions();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה בעדכון החלוקה', ''));
  };

  const openDeleteDistModal = (dist) => {
    setSelectedDistribution(dist);
    setIsDeleteDistOpen(true);
  };

  const handleDeleteDist = () => {
    axios.delete(`/api/vouchers/distributions/delete/${selectedDistribution.id}/`)
      .then(() => {
        toast.success('החלוקה נמחקה');
        setIsDeleteDistOpen(false);
        fetchDistributions();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה במחיקת החלוקה', ''));
  };

  // ── Recipient filter ────────────────────────────────────────────────────────
  const filteredRecipients = recipients.filter(r =>
    !recipientSearch || (r.full_name || '').includes(recipientSearch) || (r.phone || '').includes(recipientSearch)
  );
  const recipientsApprovedTotal = filteredRecipients.reduce((s, r) => s + parseFloat(r.approved_amount || 0), 0);
  const recipientsReadyCount = filteredRecipients.filter(r => r.ready).length;

  // ── Recipient form ──────────────────────────────────────────────────────────
  const validateRecipientForm = (data) => {
    const errs = {};
    if (!data.full_name?.trim()) errs.full_name = 'שם מלא נדרש';
    else if (data.full_name.length > RECIPIENT_FIELD_MAX_LENGTHS.full_name) errs.full_name = `מקסימום ${RECIPIENT_FIELD_MAX_LENGTHS.full_name} תווים`;

    if (data.phone?.trim() && !ISRAELI_PHONE_RE.test(data.phone.replace(/[-\s]/g, ''))) {
      errs.phone = 'מספר טלפון לא תקין (לדוגמה: 0541234567)';
    }
    if (data.parent_id_number?.trim() && !isValidIsraeliId(data.parent_id_number)) {
      errs.parent_id_number = 'תעודת זהות אינה תקינה - נא לבדוק שוב';
    }

    if (selectedDistribution?.questionnaire_type === 'עמותה') {
      if (!data.child_name?.trim()) errs.child_name = 'שם הילד נדרש';
      if (data.child_id_number?.trim() && !isValidIsraeliId(data.child_id_number)) {
        errs.child_id_number = 'תעודת זהות אינה תקינה - נא לבדוק שוב';
      }
    }

    if (data.num_children_at_home !== '' && data.num_children_at_home !== undefined && data.num_children_at_home !== null &&
      (Number(data.num_children_at_home) < 0 || Number(data.num_children_at_home) > 30)) {
      errs.num_children_at_home = 'מספר ילדים בבית לא תקין';
    }

    return errs;
  };

  const openCreateRecipientModal = () => {
    setRecipientFormData(emptyRecipientForm);
    setRecipientFormErrors({});
    setIsCreateRecipientOpen(true);
  };

  const handleCreateRecipient = () => {
    const errs = validateRecipientForm(recipientFormData);
    if (Object.keys(errs).length > 0) { setRecipientFormErrors(errs); return; }
    axios.post('/api/vouchers/recipients/create/', { ...recipientFormData, distribution_id: selectedDistribution.id })
      .then(() => {
        toast.success('הנתמך נוסף בהצלחה');
        setIsCreateRecipientOpen(false);
        fetchRecipients(selectedDistribution.id);
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה בהוספת הנתמך', ''));
  };

  const openEditRecipientModal = (r) => {
    setSelectedRecipient(r);
    setRecipientFormData({
      full_name: r.full_name || '', parent_id_number: r.parent_id_number || '', phone: r.phone || '',
      child_name: r.child_name || '', child_treatment_status: r.child_treatment_status || '',
      child_id_number: r.child_id_number || '', num_children_at_home: r.num_children_at_home ?? '',
      city: r.city || '', street_address: r.street_address || '', case_description: r.case_description || '',
      referral_source: r.referral_source || '', approved_amount: r.approved_amount || '', ready: !!r.ready,
      assigned_volunteer: r.assigned_volunteer || '', delivered: r.delivered || '', notes: r.notes || '',
      linked_child_id: r.linked_child_id || '',
    });
    setRecipientFormErrors({});
    setIsEditRecipientOpen(true);
  };

  const handleEditRecipient = () => {
    const errs = validateRecipientForm(recipientFormData);
    if (Object.keys(errs).length > 0) { setRecipientFormErrors(errs); return; }
    axios.put(`/api/vouchers/recipients/update/${selectedRecipient.id}/`, recipientFormData)
      .then(() => {
        toast.success('פרטי הנתמך עודכנו בהצלחה');
        setIsEditRecipientOpen(false);
        fetchRecipients(selectedDistribution.id);
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה בעדכון פרטי הנתמך', ''));
  };

  const openDeleteRecipientModal = (r) => {
    setSelectedRecipient(r);
    setIsDeleteRecipientOpen(true);
  };

  const handleDeleteRecipient = () => {
    axios.delete(`/api/vouchers/recipients/delete/${selectedRecipient.id}/`)
      .then(() => {
        toast.success('הנתמך נמחק');
        setIsDeleteRecipientOpen(false);
        fetchRecipients(selectedDistribution.id);
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה במחיקת הנתמך', ''));
  };

  // ── Shared recipient form fields JSX ─────────────────────────────────────
  const renderRecipientFormFields = () => {
    const qType = selectedDistribution?.questionnaire_type;
    return (
      <div className="vouchers-modal-body">
        <div className="vouchers-form-group">
          <label>שם מלא *</label>
          <input type="text" maxLength={RECIPIENT_FIELD_MAX_LENGTHS.full_name} value={recipientFormData.full_name}
            onChange={e => setRecipientFormData(p => ({ ...p, full_name: e.target.value }))} />
          {recipientFormErrors.full_name && <div className="vouchers-field-error">{recipientFormErrors.full_name}</div>}
        </div>
        <div className="vouchers-form-group">
          <label>טלפון</label>
          <input type="text" inputMode="tel" maxLength={RECIPIENT_FIELD_MAX_LENGTHS.phone} value={recipientFormData.phone}
            onChange={e => setRecipientFormData(p => ({ ...p, phone: e.target.value }))} />
          {recipientFormErrors.phone && <div className="vouchers-field-error">{recipientFormErrors.phone}</div>}
        </div>
        <div className="vouchers-form-group">
          <label>ת"ז הורה</label>
          <input type="text" inputMode="numeric" maxLength={9} value={recipientFormData.parent_id_number}
            onChange={e => setRecipientFormData(p => ({ ...p, parent_id_number: e.target.value }))} />
          {recipientFormErrors.parent_id_number && <div className="vouchers-field-error">{recipientFormErrors.parent_id_number}</div>}
        </div>
        <div className="vouchers-form-group">
          <label>מספר ילדים בבית</label>
          <input type="number" min="0" max="30" value={recipientFormData.num_children_at_home}
            onChange={e => setRecipientFormData(p => ({ ...p, num_children_at_home: e.target.value }))} />
          {recipientFormErrors.num_children_at_home && <div className="vouchers-field-error">{recipientFormErrors.num_children_at_home}</div>}
        </div>

        {qType !== 'כללי' && (
          <>
            <div className="vouchers-form-group">
              <label>שם הילד{qType === 'עמותה' ? ' *' : ''}</label>
              <input type="text" maxLength={RECIPIENT_FIELD_MAX_LENGTHS.child_name} value={recipientFormData.child_name}
                onChange={e => setRecipientFormData(p => ({ ...p, child_name: e.target.value }))} />
              {recipientFormErrors.child_name && <div className="vouchers-field-error">{recipientFormErrors.child_name}</div>}
            </div>
            <div className="vouchers-form-group">
              <label>מצב טיפול של הילד</label>
              <select value={recipientFormData.child_treatment_status}
                onChange={e => setRecipientFormData(p => ({ ...p, child_treatment_status: e.target.value }))}>
                <option value="">בחר מצב</option>
                {CHILD_TREATMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="vouchers-form-group">
              <label>ת"ז הילד</label>
              <input type="text" inputMode="numeric" maxLength={9} value={recipientFormData.child_id_number}
                onChange={e => setRecipientFormData(p => ({ ...p, child_id_number: e.target.value }))} />
              {recipientFormErrors.child_id_number && <div className="vouchers-field-error">{recipientFormErrors.child_id_number}</div>}
            </div>
          </>
        )}

        {qType !== 'עמותה' && (
          <div className="vouchers-form-group">
            <label>גורם מפנה</label>
            <input type="text" maxLength={RECIPIENT_FIELD_MAX_LENGTHS.referral_source} value={recipientFormData.referral_source}
              onChange={e => setRecipientFormData(p => ({ ...p, referral_source: e.target.value }))} />
          </div>
        )}

        <div className="vouchers-form-group">
          <label>עיר</label>
          <input type="text" maxLength={RECIPIENT_FIELD_MAX_LENGTHS.city} value={recipientFormData.city}
            onChange={e => setRecipientFormData(p => ({ ...p, city: e.target.value }))} />
        </div>
        <div className="vouchers-form-group full-width">
          <label>כתובת מלאה (רחוב, מספר, קומה, דירה)</label>
          <input type="text" maxLength={RECIPIENT_FIELD_MAX_LENGTHS.street_address} value={recipientFormData.street_address}
            onChange={e => setRecipientFormData(p => ({ ...p, street_address: e.target.value }))} />
        </div>
        <div className="vouchers-form-group full-width">
          <label>תיאור המקרה</label>
          <textarea value={recipientFormData.case_description}
            onChange={e => setRecipientFormData(p => ({ ...p, case_description: e.target.value }))} />
        </div>

        <div className="vouchers-modal-divider full-width">שדות עיבוד (למילוי הצוות)</div>

        <div className="vouchers-form-group">
          <label>סכום מאושר (₪)</label>
          <input type="number" min="0" step="0.01" value={recipientFormData.approved_amount}
            onChange={e => setRecipientFormData(p => ({ ...p, approved_amount: e.target.value }))} />
        </div>
        <div className="vouchers-form-group">
          <label>מוכן למסירה</label>
          <label className="vouchers-checkbox-label">
            <input type="checkbox" checked={recipientFormData.ready}
              onChange={e => setRecipientFormData(p => ({ ...p, ready: e.target.checked }))} />
            מוכן
          </label>
        </div>
        <div className="vouchers-form-group">
          <label>מתנדב מטפל</label>
          <input type="text" value={recipientFormData.assigned_volunteer}
            onChange={e => setRecipientFormData(p => ({ ...p, assigned_volunteer: e.target.value }))} />
        </div>
        <div className="vouchers-form-group">
          <label>נמסר</label>
          <select value={recipientFormData.delivered}
            onChange={e => setRecipientFormData(p => ({ ...p, delivered: e.target.value }))}>
            <option value="">בחר</option>
            {DELIVERED_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="vouchers-form-group full-width">
          <label>משפחה רשומה במערכת (אופציונלי — אם לא נמצאת, הנתמך יישאר "לא רשומה")</label>
          <Select
            value={familyOptions.find(f => String(f.id) === String(recipientFormData.linked_child_id)) || null}
            onChange={(option) => setRecipientFormData(p => ({ ...p, linked_child_id: option ? option.id : '' }))}
            options={familyOptions}
            getOptionLabel={(option) => `${option.name}${option.city ? ` (${option.city})` : ''}`}
            getOptionValue={(option) => option.id}
            placeholder="חפש משפחה רשומה..."
            isClearable
            classNamePrefix="vouchers-select"
            noOptionsMessage={() => 'לא נמצאו תוצאות'}
          />
        </div>
        <div className="vouchers-form-group full-width">
          <label>הערות</label>
          <textarea value={recipientFormData.notes}
            onChange={e => setRecipientFormData(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </div>
    );
  };

  // ── No-permission screen ─────────────────────────────────────────────────
  if (!hasPermissionOnVouchers) {
    return (
      <div className="vouchers-main-content">
        <Sidebar />
        <InnerPageHeader title="חלוקת תלושים" />
        <div className="no-permission">
          <h2>עמוד זה מיועד למנהלי מערכת בלבד</h2>
        </div>
      </div>
    );
  }

  // ── Render: DISTRIBUTIONS LIST ──────────────────────────────────────────────
  if (view === 'distributions') {
    const totalPages = Math.max(1, Math.ceil(filteredDistributions.length / PAGE_SIZE));
    const safePage = Math.min(distCurrentPage, totalPages);
    const paginated = filteredDistributions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
      <div className="vouchers-main-content">
        <Sidebar />
        <InnerPageHeader title="חלוקת תלושים" />

        <div className="vouchers-controls">
          <button onClick={() => navigate('/finance-overview')}>← לסקירה כללית</button>
          <button onClick={openCreateDistModal}>+ חלוקה חדשה</button>
          <button onClick={fetchDistributions}>רענן</button>
          <button onClick={() => exportVoucherDistributionsToExcel(filteredDistributions, t)}>ייצוא לאקסל</button>
          <input
            type="text"
            className="tutorship-search-bar"
            placeholder="חיפוש לפי שם חלוקה..."
            value={distSearch}
            onChange={e => { setDistSearch(e.target.value); setDistCurrentPage(1); }}
          />
        </div>

        {loading ? (
          <div className="vouchers-loading">טוען נתונים...</div>
        ) : distributions.length === 0 ? (
          <div className="vouchers-empty">אין חלוקות תלושים להציג</div>
        ) : filteredDistributions.length === 0 ? (
          <div className="vouchers-empty">לא נמצאו תוצאות לחיפוש</div>
        ) : (
          <div className="vouchers-table-wrapper">
            <table className="vouchers-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>שם החלוקה</th>
                  <th>סוג תו</th>
                  <th>סכום התחלתי</th>
                  <th>חולק</th>
                  <th>נשאר</th>
                  <th>מקבלים</th>
                  <th>שאלון</th>
                  <th>סטטוס</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(d => (
                  <tr key={d.id}>
                    <td>{d.id}</td>
                    <td>{d.name}</td>
                    <td>{d.voucher_type}</td>
                    <td>{parseFloat(d.initial_amount).toFixed(2)} ₪</td>
                    <td>{parseFloat(d.distributed_amount).toFixed(2)} ₪</td>
                    <td>{parseFloat(d.remaining_amount).toFixed(2)} ₪</td>
                    <td>
                      <span className="vouchers-link" onClick={() => openDistributionRecipients(d)}>
                        {d.recipients_count} מקבלים
                      </span>
                    </td>
                    <td>{QUESTIONNAIRE_TYPE_LABELS[d.questionnaire_type]}</td>
                    <td>
                      <span className={`vouchers-status-badge ${d.is_completed ? 'vouchers-status-badge--done' : 'vouchers-status-badge--progress'}`}>
                        {d.is_completed ? 'הושלם' : 'בתהליך'}
                      </span>
                    </td>
                    <td>
                      <div className="vouchers-row-actions">
                        <span title="ניהול מקבלים" className="vouchers-action-btn" onClick={() => openDistributionRecipients(d)}>מקבלים</span>
                        {d.questionnaire_type !== 'ללא' && (
                          <span title="העתק קישור לשאלון" className="vouchers-action-btn vouchers-action-btn--link" onClick={() => copyPublicLink(d)}>🔗</span>
                        )}
                        <span title="ערוך" className="vouchers-action-btn" onClick={() => openEditDistModal(d)}>ערוך</span>
                        <span title="מחק" className="vouchers-action-btn" onClick={() => openDeleteDistModal(d)}>מחק</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button onClick={() => setDistCurrentPage(1)} disabled={safePage === 1} className="pagination-arrow">&laquo;</button>
              <button onClick={() => setDistCurrentPage(safePage - 1)} disabled={safePage === 1} className="pagination-arrow">&lsaquo;</button>
              {Array.from({ length: totalPages }, (_, i) => {
                const pageNum = i + 1;
                const maxButtons = 3;
                const halfRange = Math.floor(maxButtons / 2);
                let start = Math.max(1, safePage - halfRange);
                let end = Math.min(totalPages, start + maxButtons - 1);
                if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
                return pageNum >= start && pageNum <= end ? (
                  <button key={pageNum} className={safePage === pageNum ? 'active' : ''} onClick={() => setDistCurrentPage(pageNum)}>{pageNum}</button>
                ) : null;
              })}
              <button onClick={() => setDistCurrentPage(safePage + 1)} disabled={safePage === totalPages} className="pagination-arrow">&rsaquo;</button>
              <button onClick={() => setDistCurrentPage(totalPages)} disabled={safePage === totalPages} className="pagination-arrow">&raquo;</button>
            </div>
          </div>
        )}

        {/* ── CREATE DISTRIBUTION MODAL ─────────────────────────────────── */}
        {isCreateDistOpen && (
          <div className="vouchers-modal-overlay" onClick={() => setIsCreateDistOpen(false)}>
            <div className="vouchers-modal" onClick={e => e.stopPropagation()}>
              <button className="vouchers-modal-close" onClick={() => setIsCreateDistOpen(false)}>✕</button>
              <h2>חלוקה חדשה</h2>
              <div className="vouchers-modal-body">
                <div className="vouchers-form-group full-width">
                  <label>שם החלוקה *</label>
                  <input type="text" value={distFormData.name} onChange={e => setDistFormData(p => ({ ...p, name: e.target.value }))} placeholder="לדוגמה: חלוקת חג הפסח 2026" />
                  {distFormErrors.name && <div className="vouchers-field-error">{distFormErrors.name}</div>}
                </div>
                <div className="vouchers-form-group">
                  <label>סוג תו *</label>
                  <select value={distFormData.voucher_type} onChange={e => setDistFormData(p => ({ ...p, voucher_type: e.target.value }))}>
                    <option value="">בחר סוג תו</option>
                    {VOUCHER_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  {distFormErrors.voucher_type && <div className="vouchers-field-error">{distFormErrors.voucher_type}</div>}
                </div>
                <div className="vouchers-form-group">
                  <label>סכום התחלתי (₪) *</label>
                  <input type="number" min="0" step="0.01" value={distFormData.initial_amount} onChange={e => setDistFormData(p => ({ ...p, initial_amount: e.target.value }))} />
                  {distFormErrors.initial_amount && <div className="vouchers-field-error">{distFormErrors.initial_amount}</div>}
                </div>
                <div className="vouchers-form-group">
                  <label>תאריך התחלה</label>
                  <input type="date" value={distFormData.start_date} onChange={e => setDistFormData(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div className="vouchers-form-group">
                  <label>תאריך סיום</label>
                  <input type="date" value={distFormData.end_date} onChange={e => setDistFormData(p => ({ ...p, end_date: e.target.value }))} />
                </div>
                <div className="vouchers-form-group">
                  <label>שאלון ציבורי</label>
                  <select value={distFormData.questionnaire_type} onChange={e => setDistFormData(p => ({ ...p, questionnaire_type: e.target.value }))}>
                    {QUESTIONNAIRE_TYPES.map(q => <option key={q} value={q}>{QUESTIONNAIRE_TYPE_LABELS[q]}</option>)}
                  </select>
                </div>
                <div className="vouchers-form-group">
                  <label>הושלם</label>
                  <label className="vouchers-checkbox-label">
                    <input type="checkbox" checked={distFormData.is_completed} onChange={e => setDistFormData(p => ({ ...p, is_completed: e.target.checked }))} />
                    החלוקה הושלמה
                  </label>
                </div>
                <div className="vouchers-form-group full-width">
                  <label>הערות</label>
                  <textarea value={distFormData.notes} onChange={e => setDistFormData(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div className="vouchers-modal-actions">
                <button className="btn-primary" onClick={handleCreateDist}>שמור</button>
                <button className="btn-secondary" onClick={() => setIsCreateDistOpen(false)}>ביטול</button>
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT DISTRIBUTION MODAL ───────────────────────────────────── */}
        {isEditDistOpen && selectedDistribution && (
          <div className="vouchers-modal-overlay" onClick={() => setIsEditDistOpen(false)}>
            <div className="vouchers-modal" onClick={e => e.stopPropagation()}>
              <button className="vouchers-modal-close" onClick={() => setIsEditDistOpen(false)}>✕</button>
              <h2>עריכת חלוקה #{selectedDistribution.id}</h2>
              <div className="vouchers-modal-body">
                <div className="vouchers-form-group full-width">
                  <label>שם החלוקה *</label>
                  <input type="text" value={distFormData.name} onChange={e => setDistFormData(p => ({ ...p, name: e.target.value }))} />
                  {distFormErrors.name && <div className="vouchers-field-error">{distFormErrors.name}</div>}
                </div>
                <div className="vouchers-form-group">
                  <label>סוג תו *</label>
                  <select value={distFormData.voucher_type} onChange={e => setDistFormData(p => ({ ...p, voucher_type: e.target.value }))}>
                    {VOUCHER_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="vouchers-form-group">
                  <label>סכום התחלתי (₪) *</label>
                  <input type="number" min="0" step="0.01" value={distFormData.initial_amount} onChange={e => setDistFormData(p => ({ ...p, initial_amount: e.target.value }))} />
                </div>
                <div className="vouchers-form-group">
                  <label>תאריך התחלה</label>
                  <input type="date" value={distFormData.start_date} onChange={e => setDistFormData(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div className="vouchers-form-group">
                  <label>תאריך סיום</label>
                  <input type="date" value={distFormData.end_date} onChange={e => setDistFormData(p => ({ ...p, end_date: e.target.value }))} />
                </div>
                <div className="vouchers-form-group">
                  <label>שאלון ציבורי</label>
                  <select value={distFormData.questionnaire_type} onChange={e => setDistFormData(p => ({ ...p, questionnaire_type: e.target.value }))}>
                    {QUESTIONNAIRE_TYPES.map(q => <option key={q} value={q}>{QUESTIONNAIRE_TYPE_LABELS[q]}</option>)}
                  </select>
                </div>
                <div className="vouchers-form-group">
                  <label>הושלם</label>
                  <label className="vouchers-checkbox-label">
                    <input type="checkbox" checked={distFormData.is_completed} onChange={e => setDistFormData(p => ({ ...p, is_completed: e.target.checked }))} />
                    החלוקה הושלמה
                  </label>
                </div>
                <div className="vouchers-form-group full-width">
                  <label>הערות</label>
                  <textarea value={distFormData.notes} onChange={e => setDistFormData(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div className="vouchers-modal-actions">
                <button className="btn-primary" onClick={handleEditDist}>שמור שינויים</button>
                <button className="btn-secondary" onClick={() => setIsEditDistOpen(false)}>ביטול</button>
              </div>
            </div>
          </div>
        )}

        {/* ── DELETE DISTRIBUTION MODAL ─────────────────────────────────── */}
        {isDeleteDistOpen && selectedDistribution && (
          <div className="vouchers-modal-overlay" onClick={() => setIsDeleteDistOpen(false)}>
            <div className="vouchers-modal vouchers-modal--narrow" onClick={e => e.stopPropagation()}>
              <button className="vouchers-modal-close" onClick={() => setIsDeleteDistOpen(false)}>✕</button>
              <h2>מחיקת חלוקה</h2>
              <p>האם אתה בטוח שברצונך למחוק את החלוקה "{selectedDistribution.name}"?</p>
              <p className="vouchers-delete-hint">פעולה זו תמחק גם את כל רשימת המקבלים של החלוקה, לצמיתות.</p>
              <div className="vouchers-modal-actions">
                <button className="btn-primary danger" onClick={handleDeleteDist}>כן, מחק</button>
                <button className="btn-secondary" onClick={() => setIsDeleteDistOpen(false)}>ביטול</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render: RECIPIENTS LIST (for selectedDistribution) ─────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredRecipients.length / PAGE_SIZE));
  const safePage = Math.min(recipientCurrentPage, totalPages);
  const paginatedRecipients = filteredRecipients.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="vouchers-main-content">
      <Sidebar />
      <InnerPageHeader title={`מקבלים — ${selectedDistribution?.name || ''}`} />

      <div className="vouchers-controls">
        <button onClick={backToDistributions}>&rarr; חזרה לחלוקות</button>
        <button onClick={openCreateRecipientModal}>+ הוספת מקבל</button>
        <button onClick={() => fetchRecipients(selectedDistribution.id)}>רענן</button>
        <button onClick={() => exportVoucherRecipientsToExcel(filteredRecipients, t)}>ייצוא לאקסל</button>
        {selectedDistribution?.questionnaire_type !== 'ללא' && (
          <button onClick={() => copyPublicLink(selectedDistribution)}>🔗 העתק קישור לשאלון</button>
        )}
        <input
          type="text"
          className="tutorship-search-bar"
          placeholder="חיפוש לפי שם או טלפון..."
          value={recipientSearch}
          onChange={e => { setRecipientSearch(e.target.value); setRecipientCurrentPage(1); }}
        />
      </div>

      {recipients.length > 0 && (
        <div className="vouchers-totals-bar">
          <div className="vouchers-total-chip">סה"כ מאושר: <strong>{recipientsApprovedTotal.toFixed(2)} ₪</strong></div>
          <div className="vouchers-total-chip">מוכנים למסירה: <strong>{recipientsReadyCount} / {filteredRecipients.length}</strong></div>
        </div>
      )}

      {recipientsLoading ? (
        <div className="vouchers-loading">טוען נתונים...</div>
      ) : recipients.length === 0 ? (
        <div className="vouchers-empty">אין מקבלים בחלוקה זו עדיין</div>
      ) : filteredRecipients.length === 0 ? (
        <div className="vouchers-empty">לא נמצאו תוצאות לחיפוש</div>
      ) : (
        <div className="vouchers-table-wrapper">
          <table className="vouchers-table">
            <thead>
              <tr>
                <th>#</th>
                <th>שם מלא</th>
                <th>טלפון</th>
                <th>עיר</th>
                <th>סכום מאושר</th>
                <th>מוכן</th>
                <th>מתנדב</th>
                <th>נמסר</th>
                <th>משפחה</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecipients.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.full_name}</td>
                  <td>{r.phone || '—'}</td>
                  <td>{r.city || '—'}</td>
                  <td>{r.approved_amount ? `${parseFloat(r.approved_amount).toFixed(2)} ₪` : '—'}</td>
                  <td>{r.ready ? '✅' : '—'}</td>
                  <td>{r.assigned_volunteer || '—'}</td>
                  <td>{r.delivered || '—'}</td>
                  <td>
                    {r.linked_child_id
                      ? <span className="vouchers-linked-badge" title="מקושר לתיק משפחה קיים">🔗 {r.linked_child_name}</span>
                      : <span className="vouchers-unregistered-badge">לא רשומה</span>}
                    {r.linked_child_id && r.child_treatment_status && r.linked_child_status && r.child_treatment_status !== r.linked_child_status && (
                      <span
                        className="vouchers-status-mismatch"
                        title={`המשפחה דיווחה מצב טיפול "${r.child_treatment_status}" אך הסטטוס במערכת הוא "${r.linked_child_status}" - יש לבדוק`}
                      >
                        ⚠️
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="vouchers-row-actions">
                      <span title="ערוך" className="vouchers-action-btn" onClick={() => openEditRecipientModal(r)}>ערוך</span>
                      <span title="מחק" className="vouchers-action-btn" onClick={() => openDeleteRecipientModal(r)}>מחק</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button onClick={() => setRecipientCurrentPage(1)} disabled={safePage === 1} className="pagination-arrow">&laquo;</button>
            <button onClick={() => setRecipientCurrentPage(safePage - 1)} disabled={safePage === 1} className="pagination-arrow">&lsaquo;</button>
            {Array.from({ length: totalPages }, (_, i) => {
              const pageNum = i + 1;
              const maxButtons = 3;
              const halfRange = Math.floor(maxButtons / 2);
              let start = Math.max(1, safePage - halfRange);
              let end = Math.min(totalPages, start + maxButtons - 1);
              if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
              return pageNum >= start && pageNum <= end ? (
                <button key={pageNum} className={safePage === pageNum ? 'active' : ''} onClick={() => setRecipientCurrentPage(pageNum)}>{pageNum}</button>
              ) : null;
            })}
            <button onClick={() => setRecipientCurrentPage(safePage + 1)} disabled={safePage === totalPages} className="pagination-arrow">&rsaquo;</button>
            <button onClick={() => setRecipientCurrentPage(totalPages)} disabled={safePage === totalPages} className="pagination-arrow">&raquo;</button>
          </div>
        </div>
      )}

      {/* ── CREATE RECIPIENT MODAL ─────────────────────────────────────── */}
      {isCreateRecipientOpen && (
        <div className="vouchers-modal-overlay" onClick={() => setIsCreateRecipientOpen(false)}>
          <div className="vouchers-modal" onClick={e => e.stopPropagation()}>
            <button className="vouchers-modal-close" onClick={() => setIsCreateRecipientOpen(false)}>✕</button>
            <h2>הוספת מקבל</h2>
            {renderRecipientFormFields()}
            <div className="vouchers-modal-actions">
              <button className="btn-primary" onClick={handleCreateRecipient}>שמור</button>
              <button className="btn-secondary" onClick={() => setIsCreateRecipientOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT RECIPIENT MODAL ───────────────────────────────────────── */}
      {isEditRecipientOpen && selectedRecipient && (
        <div className="vouchers-modal-overlay" onClick={() => setIsEditRecipientOpen(false)}>
          <div className="vouchers-modal" onClick={e => e.stopPropagation()}>
            <button className="vouchers-modal-close" onClick={() => setIsEditRecipientOpen(false)}>✕</button>
            <h2>עריכת מקבל #{selectedRecipient.id}</h2>
            {renderRecipientFormFields()}
            <div className="vouchers-modal-actions">
              <button className="btn-primary" onClick={handleEditRecipient}>שמור שינויים</button>
              <button className="btn-secondary" onClick={() => setIsEditRecipientOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE RECIPIENT MODAL ─────────────────────────────────────── */}
      {isDeleteRecipientOpen && selectedRecipient && (
        <div className="vouchers-modal-overlay" onClick={() => setIsDeleteRecipientOpen(false)}>
          <div className="vouchers-modal vouchers-modal--narrow" onClick={e => e.stopPropagation()}>
            <button className="vouchers-modal-close" onClick={() => setIsDeleteRecipientOpen(false)}>✕</button>
            <h2>מחיקת מקבל</h2>
            <p>האם אתה בטוח שברצונך למחוק את "{selectedRecipient.full_name}" מרשימת המקבלים?</p>
            <div className="vouchers-modal-actions">
              <button className="btn-primary danger" onClick={handleDeleteRecipient}>כן, מחק</button>
              <button className="btn-secondary" onClick={() => setIsDeleteRecipientOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vouchers;
