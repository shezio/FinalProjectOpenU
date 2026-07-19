import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import axios from '../axiosConfig';
import { toast } from 'react-toastify';
import { showErrorToast } from '../components/toastUtils';
import { exportFinancialAidToExcel } from '../components/export_utils';
import { useTranslation } from 'react-i18next';
import { hasAllPermissions } from '../components/utils';
import Select from 'react-select';
import '../i18n';
import '../styles/common.css';
import '../styles/financialaid.css';

// ADMIN-ONLY page (System Administrator / Viewer — see add_financial_aid_table.sql).
// Same requiredPermissions + hasAllPermissions pattern as SystemManagement.js / PettyCash.js.
// Sensitive personal/financial data about supported families — no coordinator/volunteer access.
const requiredPermissions = [
  { resource: 'childsmile_app_financialaid', action: 'VIEW' },
  { resource: 'childsmile_app_financialaid', action: 'CREATE' },
  { resource: 'childsmile_app_financialaid', action: 'UPDATE' },
  { resource: 'childsmile_app_financialaid', action: 'DELETE' },
];

const PAGE_SIZE = 8;
const MAX_FILE_SIZE_MB = 10;
const METHOD_OPTIONS = ['העברה בנקאית', 'מזומן', 'אחר'];

// Format any date string to dd/mm/yyyy
const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr;
};

// ── Component ──────────────────────────────────────────────────────────────────
const FinancialAid = () => {
  const { t } = useTranslation();
  const hasPermissionOnFinancialAid = hasAllPermissions(requiredPermissions);

  // ── Data state ────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState([]);
  const [familyOptions, setFamilyOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState('aid_date');
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
    family_name: '',
    linked_child_id: '',
    aid_date: '',
    amount: '',
    method: '',
    notes: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  // Family combo picker — search existing families, or free-type a name if the
  // family isn't registered. Same pattern as Feedbacks.js's volunteer/tutor picker.
  const [familyInput, setFamilyInput] = useState('');
  const familySelectRef = useRef(null);

  // File uploads — supports MULTIPLE documents per record (מכתב בקשה ומסמכים).
  // Files are only actually uploaded to Azure right before save (same 2-step
  // pattern as Refunds.js: pick now, upload on submit).
  const [pendingFiles, setPendingFiles] = useState([]); // File[]
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState([]); // already-saved attachments (edit only)
  const fileInputRef = useRef(null);

  // ── Fetch data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (hasPermissionOnFinancialAid) {
      fetchEntries();
      fetchFamilyOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEntries = () => {
    setLoading(true);
    axios.get('/api/financial-aid/')
      .then(res => {
        setEntries(res.data.financial_aid || []);
        setCurrentPage(1);
      })
      .catch(err => {
        showErrorToast(t, err.response?.data?.error || 'שגיאה בטעינת הנתונים', '');
      })
      .finally(() => setLoading(false));
  };

  const fetchFamilyOptions = () => {
    axios.get('/api/financial-aid/family-options/')
      .then(res => setFamilyOptions(res.data.families || []))
      .catch(() => setFamilyOptions([]));
  };

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filteredEntries = entries.filter(e => {
    if (methodFilter && e.method !== methodFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.trim();
    return (
      (e.family_name || '').includes(q) ||
      (e.notes || '').includes(q)
    );
  }).slice().sort((a, b) => {
    let va = a[sortField] || '';
    let vb = b[sortField] || '';
    if (sortField === 'aid_date') {
      va = new Date(va).getTime();
      vb = new Date(vb).getTime();
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalAmount = filteredEntries.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const familiesCount = new Set(filteredEntries.map(e => e.family_name)).size;

  // ── Form helpers ──────────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = (data) => {
    const errs = {};
    if (!data.family_name?.trim()) errs.family_name = 'שם משפחה נדרש';
    if (!data.aid_date) errs.aid_date = 'תאריך נדרש';
    if (!data.amount || isNaN(data.amount) || parseFloat(data.amount) <= 0)
      errs.amount = 'סכום חייב להיות מספר חיובי';
    if (!data.method) errs.method = 'אופן ביצוע נדרש';
    return errs;
  };

  // ── File helpers ──────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const tooBig = files.find(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (tooBig) {
      showErrorToast(t, `קובץ גדול מדי. מקסימום ${MAX_FILE_SIZE_MB}MB`, '');
      return;
    }
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = ''; // allow re-selecting the same file name
  };

  const removePendingFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (attachmentId) => {
    axios.delete(`/api/financial-aid/attachment/delete/${attachmentId}/`)
      .then(() => {
        setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
        toast.success('הקובץ נמחק');
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה במחיקת הקובץ', ''));
  };

  // Upload every pending file to Azure and return [{file_url, file_name}, ...]
  const uploadPendingFilesIfNeeded = async () => {
    if (pendingFiles.length === 0) return [];
    setUploadingFiles(true);
    try {
      const uploaded = [];
      for (const file of pendingFiles) {
        const urlRes = await axios.get('/api/financial-aid/upload-url/', {
          params: { filename: file.name }
        });
        const { upload_url, blob_url } = urlRes.data;
        const isAzure = upload_url.includes('blob.core.windows.net');
        const uploadHeaders = { 'Content-Type': file.type };
        if (isAzure) uploadHeaders['x-ms-blob-type'] = 'BlockBlob';
        await fetch(upload_url, { method: 'PUT', headers: uploadHeaders, body: file });
        uploaded.push({ file_url: blob_url, file_name: file.name });
      }
      return uploaded;
    } catch (err) {
      showErrorToast(t, 'שגיאה בהעלאת הקבצים', '');
      throw err;
    } finally {
      setUploadingFiles(false);
    }
  };

  // ── Family picker helpers ─────────────────────────────────────────────────
  const familyPickerValue = formData.linked_child_id
    ? familyOptions.find(f => String(f.id) === String(formData.linked_child_id)) || null
    : (formData.family_name ? { id: '__custom__', name: formData.family_name } : null);

  // ── CREATE ─────────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setFormData(emptyForm);
    setFormErrors({});
    setPendingFiles([]);
    setExistingAttachments([]);
    setFamilyInput('');
    setIsCreateModalOpen(true);
  };

  const handleCreate = async () => {
    const errs = validateForm(formData);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    let attachments = [];
    try {
      attachments = await uploadPendingFilesIfNeeded();
    } catch { return; }

    axios.post('/api/financial-aid/create/', { ...formData, attachments })
      .then(() => {
        toast.success('רישום הסיוע נוסף בהצלחה');
        setIsCreateModalOpen(false);
        setPendingFiles([]);
        fetchEntries();
        fetchFamilyOptions();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה בהוספת רישום הסיוע', ''));
  };

  // ── EDIT ───────────────────────────────────────────────────────────────────
  const openEditModal = (entry) => {
    setSelectedEntry(entry);
    setFormData({
      family_name: entry.family_name,
      linked_child_id: entry.linked_child_id || '',
      aid_date: entry.aid_date,
      amount: entry.amount,
      method: entry.method,
      notes: entry.notes || '',
    });
    setFormErrors({});
    setPendingFiles([]);
    setExistingAttachments(entry.attachments || []);
    setFamilyInput('');
    setIsEditModalOpen(true);
  };

  const handleEdit = async () => {
    const errs = validateForm(formData);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    let attachments = [];
    try {
      attachments = await uploadPendingFilesIfNeeded();
    } catch { return; }

    axios.put(`/api/financial-aid/update/${selectedEntry.id}/`, { ...formData, attachments })
      .then(() => {
        toast.success('רישום הסיוע עודכן בהצלחה');
        setIsEditModalOpen(false);
        setPendingFiles([]);
        fetchEntries();
        fetchFamilyOptions();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה בעדכון רישום הסיוע', ''));
  };

  // ── DELETE ─────────────────────────────────────────────────────────────────
  const openDeleteModal = (entry) => {
    setSelectedEntry(entry);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = () => {
    axios.delete(`/api/financial-aid/delete/${selectedEntry.id}/`)
      .then(() => {
        toast.success('רישום הסיוע נמחק');
        setIsDeleteModalOpen(false);
        fetchEntries();
      })
      .catch(err => showErrorToast(t, err.response?.data?.error || 'שגיאה במחיקת רישום הסיוע', ''));
  };

  // ── Shared form fields JSX ─────────────────────────────────────────────────
  const renderFormFields = () => (
    <div className="financial-aid-modal-body">
      <div className="financial-aid-form-group full-width">
        <label>משפחה *</label>
        <Select
          ref={familySelectRef}
          inputValue={familyInput}
          onInputChange={(val, meta) => {
            if (meta.action === 'input-change') setFamilyInput(val);
            else if (meta.action === 'menu-close' || meta.action === 'input-blur') setFamilyInput('');
          }}
          value={familyPickerValue}
          onChange={(option) => {
            if (!option) {
              setFormData(prev => ({ ...prev, linked_child_id: '', family_name: '' }));
            } else {
              setFormData(prev => ({ ...prev, linked_child_id: option.id, family_name: option.name }));
            }
            setFamilyInput('');
            setFormErrors(prev => ({ ...prev, family_name: '' }));
          }}
          options={familyOptions}
          getOptionLabel={(option) => `${option.name}${option.city ? ` (${option.city})` : ''}`}
          getOptionValue={(option) => option.id}
          placeholder="חפש משפחה רשומה או הקלד שם..."
          isClearable
          classNamePrefix="financial-aid-select"
          noOptionsMessage={({ inputValue }) =>
            inputValue && inputValue.trim() ? (
              <div className="financial-aid-freetext-prompt" onMouseDown={e => e.preventDefault()}>
                <span className="financial-aid-freetext-question">להשתמש בשם זה?</span>
                <span className="financial-aid-freetext-value">"{inputValue.trim()}"</span>
                <button
                  type="button"
                  className="financial-aid-freetext-btn financial-aid-freetext-confirm"
                  title="השתמש בשם זה"
                  onClick={() => {
                    const name = inputValue.trim();
                    setFormData(prev => ({ ...prev, linked_child_id: '', family_name: name }));
                    setFamilyInput('');
                    setFormErrors(prev => ({ ...prev, family_name: '' }));
                    familySelectRef.current?.blur();
                  }}
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="financial-aid-freetext-btn financial-aid-freetext-cancel"
                  title="ביטול"
                  onClick={() => setFamilyInput('')}
                >
                  ✗
                </button>
              </div>
            ) : 'הקלד לחיפוש...'
          }
        />
        {formData.linked_child_id && (
          <div className="financial-aid-linked-hint">✅ מקושר לתיק משפחה קיים במערכת</div>
        )}
        {formErrors.family_name && <div className="financial-aid-field-error">{formErrors.family_name}</div>}
      </div>
      <div className="financial-aid-form-group">
        <label>תאריך סיוע *</label>
        <input type="date" name="aid_date" value={formData.aid_date} onChange={handleFormChange} />
        {formErrors.aid_date && <div className="financial-aid-field-error">{formErrors.aid_date}</div>}
      </div>
      <div className="financial-aid-form-group">
        <label>סכום (₪) *</label>
        <input type="number" name="amount" value={formData.amount} onChange={handleFormChange} min="0" step="0.01" />
        {formErrors.amount && <div className="financial-aid-field-error">{formErrors.amount}</div>}
      </div>
      <div className="financial-aid-form-group full-width">
        <label>אופן ביצוע *</label>
        <select name="method" value={formData.method} onChange={handleFormChange}>
          <option value="">בחר אופן ביצוע</option>
          {METHOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {formErrors.method && <div className="financial-aid-field-error">{formErrors.method}</div>}
      </div>
      <div className="financial-aid-form-group full-width">
        <label>הערות</label>
        <textarea name="notes" value={formData.notes} onChange={handleFormChange} />
      </div>

      {/* Supporting documents — multiple files (מכתב בקשה ומסמכים) */}
      <div className="financial-aid-form-group full-width">
        <label>מכתב בקשה ומסמכים (עד {MAX_FILE_SIZE_MB}MB לקובץ)</label>
        <div className="financial-aid-upload-zone" onClick={() => fileInputRef.current?.click()}>
          {uploadingFiles ? 'מעלה קבצים...' : '➕ לחץ להוספת קובץ (PDF / תמונה)'}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="financial-aid-file-input-hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileSelect}
        />
        {(existingAttachments.length > 0 || pendingFiles.length > 0) && (
          <div className="financial-aid-attachments-list">
            {existingAttachments.map(att => (
              <div key={att.id} className="financial-aid-attachment-chip">
                <a href={att.file_url} target="_blank" rel="noopener noreferrer">📎 {att.file_name || 'קובץ'}</a>
                <button type="button" onClick={() => removeExistingAttachment(att.id)} title="מחק קובץ">✕</button>
              </div>
            ))}
            {pendingFiles.map((file, i) => (
              <div key={`pending-${i}`} className="financial-aid-attachment-chip financial-aid-attachment-chip--pending">
                <span>📎 {file.name} — יועלה עם השמירה</span>
                <button type="button" onClick={() => removePendingFile(i)} title="הסר">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── No-permission screen (admin-only page) ──────────────────────────────────
  if (!hasPermissionOnFinancialAid) {
    return (
      <div className="financial-aid-main-content">
        <Sidebar />
        <InnerPageHeader title="סיוע כספי" />
        <div className="no-permission">
          <h2>עמוד זה מיועד למנהלי מערכת בלבד</h2>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="financial-aid-main-content">
      <Sidebar />
      <InnerPageHeader title="סיוע כספי" />

      {/* Controls */}
      <div className="financial-aid-controls">
        <button onClick={openCreateModal}>+ רישום סיוע</button>
        <button onClick={fetchEntries}>רענן</button>
        <button onClick={() => exportFinancialAidToExcel(filteredEntries, t)}>ייצוא לאקסל</button>
        <input
          type="text"
          className="tutorship-search-bar"
          placeholder="חיפוש לפי שם משפחה, הערות..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
        />
        <select
          className="financial-aid-method-filter"
          value={methodFilter}
          onChange={e => { setMethodFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="">כל אופני הביצוע</option>
          {METHOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {searchQuery && (
          <span className="filter-chip filter-chip--inline">
            מסנן לפי: <strong>{searchQuery}</strong>
            <button className="filter-chip-close" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}>✕</button>
          </span>
        )}
      </div>

      {/* Totals bar */}
      {entries.length > 0 && (
        <div className="financial-aid-totals-bar">
          <div className="financial-aid-total-chip">
            סה"כ סיוע: <strong>{totalAmount.toFixed(2)} ₪</strong>
          </div>
          <div className="financial-aid-total-chip">
            מספר משפחות: <strong>{familiesCount}</strong>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="financial-aid-loading">טוען נתונים...</div>
      ) : entries.length === 0 ? (
        <div className="financial-aid-empty">אין רישומי סיוע כספי להציג</div>
      ) : filteredEntries.length === 0 ? (
        <div className="financial-aid-empty">לא נמצאו תוצאות לחיפוש</div>
      ) : (
        <div className="financial-aid-table-wrapper">
          {(() => {
            const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
            const safePage = Math.min(currentPage, totalPages);
            const paginated = filteredEntries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
            return (
              <>
                <table className="financial-aid-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>שם משפחה</th>
                      <th className="sortable-th" onClick={() => toggleSort('aid_date')}>תאריך{sortArrow('aid_date')}</th>
                      <th>סכום</th>
                      <th>אופן ביצוע</th>
                      <th>מסמכים</th>
                      <th>הערות</th>
                      <th>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(e => (
                      <tr key={e.id}>
                        <td>{e.id}</td>
                        <td>
                          {e.family_name}
                          {e.linked_child_id && <span className="financial-aid-linked-badge" title="מקושר לתיק משפחה קיים">🔗</span>}
                        </td>
                        <td>{fmtDate(e.aid_date)}</td>
                        <td>{parseFloat(e.amount).toFixed(2)} ₪</td>
                        <td>{e.method}</td>
                        <td>{(e.attachments || []).length > 0 ? `📎 ${e.attachments.length}` : '—'}</td>
                        <td className="financial-aid-desc-cell">{e.notes || '—'}</td>
                        <td>
                          <div className="financial-aid-row-actions">
                            <span title="ערוך" className="financial-aid-action-btn" onClick={() => openEditModal(e)}>ערוך</span>
                            <span title="מחק" className="financial-aid-action-btn" onClick={() => openDeleteModal(e)}>מחק</span>
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
        <div className="financial-aid-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="financial-aid-modal" onClick={e => e.stopPropagation()}>
            <button className="financial-aid-modal-close" onClick={() => setIsCreateModalOpen(false)}>✕</button>
            <h2>רישום סיוע חדש</h2>
            {renderFormFields()}
            <div className="financial-aid-modal-actions">
              <button className="btn-primary" onClick={handleCreate} disabled={uploadingFiles}>שמור</button>
              <button className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ─────────────────────────────────────────────────────── */}
      {isEditModalOpen && selectedEntry && (
        <div className="financial-aid-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="financial-aid-modal" onClick={e => e.stopPropagation()}>
            <button className="financial-aid-modal-close" onClick={() => setIsEditModalOpen(false)}>✕</button>
            <h2>עריכת רישום סיוע #{selectedEntry.id}</h2>
            {renderFormFields()}
            <div className="financial-aid-modal-actions">
              <button className="btn-primary" onClick={handleEdit} disabled={uploadingFiles}>שמור שינויים</button>
              <button className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ───────────────────────────────────────────── */}
      {isDeleteModalOpen && selectedEntry && (
        <div className="financial-aid-modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="financial-aid-modal financial-aid-modal--narrow" onClick={e => e.stopPropagation()}>
            <button className="financial-aid-modal-close" onClick={() => setIsDeleteModalOpen(false)}>✕</button>
            <h2>מחיקת רישום סיוע</h2>
            <p>האם אתה בטוח שברצונך למחוק את רישום הסיוע עבור "{selectedEntry.family_name}"?</p>
            <p className="financial-aid-delete-hint">פעולה זו תמחק את הרשומה וכל המסמכים המצורפים לצמיתות ולא ניתן לשחזרה.</p>
            <div className="financial-aid-modal-actions">
              <button className="btn-primary danger" onClick={handleDelete}>כן, מחק</button>
              <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialAid;
