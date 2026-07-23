import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import axios from '../axiosConfig';
import { toast } from 'react-toastify';
import { showErrorToast } from '../components/toastUtils';
import { hasAllPermissions } from '../components/utils';
import Select from 'react-select';
import '../styles/common.css';
import '../styles/refunds.css';
import '../styles/activityboard.css';

// Coordinator / admin board. Governed by the 'activityrequest' resource, granted
// to System Administrator + Volunteer Coordinator (+ Viewer) — see add_activity_tables.sql.
const requiredPermissions = [
  { resource: 'childsmile_app_activityrequest', action: 'VIEW' },
  { resource: 'childsmile_app_activityrequest', action: 'CREATE' },
  { resource: 'childsmile_app_activityrequest', action: 'UPDATE' },
  { resource: 'childsmile_app_activityrequest', action: 'DELETE' },
];

const PAGE_SIZE = 8;
const ROUND_STATUS_LABELS = { open: 'פתוח', closed: 'סגור' };
const ACTIVITY_TYPE_LABELS = { fun_day: 'יום כיף', house_visit: 'ביקור בית' };
const REQUEST_STATUS_LABELS = { open: 'ממתין לשיבוץ', assigned: 'משובץ', completed: 'הושלם', cancelled: 'בוטל' };
const REQUEST_STATUS_OPTIONS = ['open', 'assigned', 'completed', 'cancelled'];

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr;
};

const ActivityBoard = () => {
  const navigate = useNavigate();
  const hasPermissionOnBoard = hasAllPermissions(requiredPermissions);

  const [view, setView] = useState('rounds'); // 'rounds' | 'requests'
  const [selectedRound, setSelectedRound] = useState(null);

  // ── Rounds ────────────────────────────────────────────────────────────────
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roundSearch, setRoundSearch] = useState('');
  const [roundPage, setRoundPage] = useState(1);
  const emptyRoundForm = { name: '', status: 'open', start_date: '', end_date: '', notes: '' };
  const [roundForm, setRoundForm] = useState(emptyRoundForm);
  const [roundErrors, setRoundErrors] = useState({});
  const [isCreateRoundOpen, setIsCreateRoundOpen] = useState(false);
  const [isEditRoundOpen, setIsEditRoundOpen] = useState(false);
  const [isDeleteRoundOpen, setIsDeleteRoundOpen] = useState(false);

  // ── Requests ──────────────────────────────────────────────────────────────
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reqSearch, setReqSearch] = useState('');
  const [reqTypeFilter, setReqTypeFilter] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState('');
  const [reqPage, setReqPage] = useState(1);
  // Assignment-only form. The board ASSIGNS a TEAM of volunteers to a
  // questionnaire-submitted request — it does NOT create fun days / house visits
  // (that's the public form's job). Several volunteers can be on one activity.
  const [reqForm, setReqForm] = useState({ assigned_staff_ids: [], status: 'open' });
  const [selectedReq, setSelectedReq] = useState(null);
  const [isEditReqOpen, setIsEditReqOpen] = useState(false);
  const [isDeleteReqOpen, setIsDeleteReqOpen] = useState(false);
  // All tutors + volunteers for the "מתנדב משובץ" picker (same source as Feedbacks).
  const [people, setPeople] = useState([]);

  useEffect(() => {
    if (hasPermissionOnBoard) { fetchRounds(); fetchPeople(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPeople = () => {
    axios.get('/api/staff/')
      .then(res => {
        const list = (res.data.staff || [])
          .filter(s => (s.roles || []).some(role => role === 'General Volunteer' || role === 'Tutor'))
          .map(s => ({ staff_id: s.id, name: `${s.first_name} ${s.last_name}` }))
          .sort((a, b) => a.name.localeCompare(b.name, 'he'));
        setPeople(list);
      })
      .catch(() => { /* non-fatal — the assignment dropdown just stays empty */ });
  };

  const fetchRounds = () => {
    setLoading(true);
    axios.get('/api/activities/rounds/')
      .then(res => setRounds(res.data.rounds || []))
      .catch(err => showErrorToast(null, err.response?.data?.error || 'שגיאה בטעינת המחזורים', ''))
      .finally(() => setLoading(false));
  };

  const fetchRequests = (roundId) => {
    setRequestsLoading(true);
    axios.get(`/api/activities/requests/?round_id=${roundId}`)
      .then(res => setRequests(res.data.requests || []))
      .catch(err => showErrorToast(null, err.response?.data?.error || 'שגיאה בטעינת הבקשות', ''))
      .finally(() => setRequestsLoading(false));
  };

  const openRequests = (round) => {
    setSelectedRound(round);
    setView('requests');
    setReqPage(1);
    setReqSearch(''); setReqTypeFilter(''); setReqStatusFilter('');
    fetchRequests(round.id);
  };

  const backToRounds = () => { setView('rounds'); setSelectedRound(null); setRequests([]); };

  const copyPublicLink = (round) => {
    // Prod uses HashRouter (see index.js) so the shareable link must include '/#',
    // otherwise the static host returns a 404. Dev uses BrowserRouter (no hash).
    const isProd = process.env.NODE_ENV === 'production';
    const url = `${window.location.origin}${isProd ? '/#' : ''}/activity-questionnaire/${round.id}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('הקישור לשאלון הועתק'))
      .catch(() => showErrorToast(null, 'שגיאה בהעתקת הקישור', ''));
  };

  // De-identified WhatsApp summary of the OPEN (unassigned) requests, in the same
  // "עיר גיל מין" shape the coordinators post in the group today.
  const copyWhatsappSummary = () => {
    const open = requests.filter(r => r.status === 'open');
    if (open.length === 0) { toast.info('אין בקשות פנויות לשיבוץ'); return; }
    const lines = open.map(r => [r.city || '', r.child_age || '', r.child_gender || ''].filter(Boolean).join(' '));
    const header = 'בוקר טוב חברים 🩷\nמצרפת רשימה מעודכנת — מי שיכול בבקשה לכתוב כאן 🙏\n';
    const text = `${header}\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text)
      .then(() => toast.success('הרשימה למתנדבים הועתקה'))
      .catch(() => showErrorToast(null, 'שגיאה בהעתקה', ''));
  };

  // ── Round form ──────────────────────────────────────────────────────────────
  const openCreateRound = () => { setRoundForm(emptyRoundForm); setRoundErrors({}); setIsCreateRoundOpen(true); };
  const openEditRound = (r) => {
    setSelectedRound(r);
    setRoundForm({ name: r.name || '', status: r.status || 'open', start_date: r.start_date || '', end_date: r.end_date || '', notes: r.notes || '' });
    setRoundErrors({});
    setIsEditRoundOpen(true);
  };
  const handleRoundChange = (e) => {
    const { name, value } = e.target;
    setRoundForm(prev => ({ ...prev, [name]: value }));
    setRoundErrors(prev => ({ ...prev, [name]: '' }));
  };
  const submitCreateRound = () => {
    if (!roundForm.name.trim()) { setRoundErrors({ name: 'שם המחזור נדרש' }); return; }
    axios.post('/api/activities/rounds/create/', roundForm)
      .then(() => { toast.success('המחזור נוצר בהצלחה'); setIsCreateRoundOpen(false); fetchRounds(); })
      .catch(err => showErrorToast(null, err.response?.data?.error || 'שגיאה ביצירת המחזור', ''));
  };
  const submitEditRound = () => {
    if (!roundForm.name.trim()) { setRoundErrors({ name: 'שם המחזור נדרש' }); return; }
    axios.put(`/api/activities/rounds/update/${selectedRound.id}/`, roundForm)
      .then(() => { toast.success('המחזור עודכן בהצלחה'); setIsEditRoundOpen(false); fetchRounds(); })
      .catch(err => showErrorToast(null, err.response?.data?.error || 'שגיאה בעדכון המחזור', ''));
  };
  const submitDeleteRound = () => {
    axios.delete(`/api/activities/rounds/delete/${selectedRound.id}/`)
      .then(() => { toast.success('המחזור נמחק בהצלחה'); setIsDeleteRoundOpen(false); fetchRounds(); })
      .catch(err => showErrorToast(null, err.response?.data?.error || 'שגיאה במחיקת המחזור', ''));
  };

  // ── Request form ────────────────────────────────────────────────────────────
  const openEditReq = (r) => {
    setSelectedReq(r);
    setReqForm({
      assigned_staff_ids: (r.assigned_volunteers || []).map(v => v.staff_id),
      status: r.status || 'open',
    });
    setIsEditReqOpen(true);
  };
  const submitEditReq = () => {
    axios.put(`/api/activities/requests/update/${selectedReq.id}/`, reqForm)
      .then(() => { toast.success('השיבוץ נשמר בהצלחה'); setIsEditReqOpen(false); fetchRequests(selectedRound.id); })
      .catch(err => showErrorToast(null, err.response?.data?.error || 'שגיאה בשמירת השיבוץ', ''));
  };
  const submitDeleteReq = () => {
    axios.delete(`/api/activities/requests/delete/${selectedReq.id}/`)
      .then(() => { toast.success('הבקשה נמחקה בהצלחה'); setIsDeleteReqOpen(false); fetchRequests(selectedRound.id); })
      .catch(err => showErrorToast(null, err.response?.data?.error || 'שגיאה במחיקת הבקשה', ''));
  };

  if (!hasPermissionOnBoard) {
    return (
      <div className="refunds-main-content">
        <Sidebar />
        <InnerPageHeader title="ימי כיף וביקורי בית" />
        <div className="no-permission"><h2>אין לך הרשאה לצפות בעמוד זה</h2></div>
      </div>
    );
  }

  const filteredRounds = rounds.filter(r => !roundSearch || (r.name || '').includes(roundSearch.trim()));
  const filteredReqs = requests.filter(r => {
    if (reqTypeFilter && r.activity_type !== reqTypeFilter) return false;
    if (reqStatusFilter && r.status !== reqStatusFilter) return false;
    if (reqSearch) {
      const q = reqSearch.trim();
      return (r.child_name || '').includes(q) || (r.city || '').includes(q) || (r.assigned_volunteer || '').includes(q);
    }
    return true;
  });

  return (
    <div className="refunds-main-content">
      <Sidebar />
      <InnerPageHeader title="ימי כיף וביקורי בית" />

      {view === 'rounds' ? (
        <>
          <div className="refunds-controls">
            <button onClick={openCreateRound}>+ מחזור חדש</button>
            <button onClick={fetchRounds}>רענן</button>
            <input type="text" className="tutorship-search-bar" placeholder="חיפוש מחזור..."
              value={roundSearch} onChange={e => { setRoundSearch(e.target.value); setRoundPage(1); }} />
          </div>

          {loading ? (
            <div className="refunds-loading">טוען נתונים...</div>
          ) : filteredRounds.length === 0 ? (
            <div className="refunds-empty">אין מחזורים להצגה</div>
          ) : (
            <div className="refunds-table-wrapper">
              {(() => {
                const totalPages = Math.max(1, Math.ceil(filteredRounds.length / PAGE_SIZE));
                const safePage = Math.min(roundPage, totalPages);
                const paginated = filteredRounds.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
                return (
                  <>
                    <table className="refunds-table activity-board-grid">
                      <thead>
                        <tr>
                          <th>שם המחזור</th><th>סטטוס</th><th>מתאריך</th><th>עד תאריך</th><th>בקשות</th><th>פעולות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map(r => (
                          <tr key={r.id}>
                            <td>{r.name}</td>
                            <td><span className={`activity-badge activity-badge--${r.status}`}>{ROUND_STATUS_LABELS[r.status] || r.status}</span></td>
                            <td>{fmtDate(r.start_date)}</td>
                            <td>{fmtDate(r.end_date)}</td>
                            <td>{r.requests_count}</td>
                            <td className="activity-actions">
                              <button className="btn-report" onClick={() => openRequests(r)}>בקשות</button>
                              <span title="העתק קישור לשאלון" className="activity-icon-btn" onClick={() => copyPublicLink(r)}>🔗</span>
                              <span title="עריכה" className="activity-icon-btn" onClick={() => openEditRound(r)}>✏️</span>
                              <span title="מחיקה" className="activity-icon-btn" onClick={() => { setSelectedRound(r); setIsDeleteRoundOpen(true); }}>🗑️</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="pagination">
                      <button onClick={() => setRoundPage(1)} disabled={safePage === 1} className="pagination-arrow">&laquo;</button>
                      <button onClick={() => setRoundPage(safePage - 1)} disabled={safePage === 1} className="pagination-arrow">&lsaquo;</button>
                      <span className="pagination-info">{safePage} / {totalPages}</span>
                      <button onClick={() => setRoundPage(safePage + 1)} disabled={safePage === totalPages} className="pagination-arrow">&rsaquo;</button>
                      <button onClick={() => setRoundPage(totalPages)} disabled={safePage === totalPages} className="pagination-arrow">&raquo;</button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="refunds-controls">
            <button onClick={backToRounds}>← חזרה למחזורים</button>
            <button onClick={() => fetchRequests(selectedRound.id)}>רענן</button>
            <button className="btn-report" onClick={copyWhatsappSummary}>📋 העתקה לווטסאפ</button>
            <button className="btn-report" onClick={() => copyPublicLink(selectedRound)}>🔗 קישור לשאלון</button>
            <select className="refunds-status-filter" value={reqTypeFilter} onChange={e => { setReqTypeFilter(e.target.value); setReqPage(1); }}>
              <option value="">כל הסוגים</option>
              <option value="fun_day">יום כיף</option>
              <option value="house_visit">ביקור בית</option>
            </select>
            <select className="refunds-status-filter" value={reqStatusFilter} onChange={e => { setReqStatusFilter(e.target.value); setReqPage(1); }}>
              <option value="">כל הסטטוסים</option>
              {REQUEST_STATUS_OPTIONS.map(s => <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>)}
            </select>
            <input type="text" className="tutorship-search-bar" placeholder="חיפוש לפי שם, עיר, מתנדב..."
              value={reqSearch} onChange={e => { setReqSearch(e.target.value); setReqPage(1); }} />
          </div>
          <div className="activity-round-title">מחזור: <strong>{selectedRound?.name}</strong></div>

          {requestsLoading ? (
            <div className="refunds-loading">טוען נתונים...</div>
          ) : filteredReqs.length === 0 ? (
            <div className="refunds-empty">אין בקשות להצגה</div>
          ) : (
            <div className="refunds-table-wrapper">
              {(() => {
                const totalPages = Math.max(1, Math.ceil(filteredReqs.length / PAGE_SIZE));
                const safePage = Math.min(reqPage, totalPages);
                const paginated = filteredReqs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
                return (
                  <>
                    <table className="refunds-table">
                      <thead>
                        <tr>
                          <th>שם המטופל/ת</th><th>סוג</th><th>תאריך מבוקש</th><th>עיר</th><th>גיל</th><th>מין</th>
                          <th>סטטוס</th><th>מתנדבים משובצים</th><th>פעולות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map(r => (
                          <tr key={r.id}>
                            <td>{r.child_name}</td>
                            <td>{ACTIVITY_TYPE_LABELS[r.activity_type] || r.activity_type}</td>
                            <td>{fmtDate(r.requested_date)}</td>
                            <td>{r.city || '—'}</td>
                            <td>{r.child_age || '—'}</td>
                            <td>{r.child_gender || '—'}</td>
                            <td><span className={`activity-badge activity-badge--${r.status}`}>{REQUEST_STATUS_LABELS[r.status] || r.status}</span></td>
                            <td>{(r.assigned_volunteers && r.assigned_volunteers.length)
                              ? `${r.assigned_volunteers.map(v => v.name).join(', ')} (${r.assigned_volunteers.length})`
                              : (r.assigned_volunteer || '—')}</td>
                            <td className="activity-actions">
                              <span title="עריכה" className="activity-icon-btn" onClick={() => openEditReq(r)}>✏️</span>
                              <span title="מחיקה" className="activity-icon-btn" onClick={() => { setSelectedReq(r); setIsDeleteReqOpen(true); }}>🗑️</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="pagination">
                      <button onClick={() => setReqPage(1)} disabled={safePage === 1} className="pagination-arrow">&laquo;</button>
                      <button onClick={() => setReqPage(safePage - 1)} disabled={safePage === 1} className="pagination-arrow">&lsaquo;</button>
                      <span className="pagination-info">{safePage} / {totalPages}</span>
                      <button onClick={() => setReqPage(safePage + 1)} disabled={safePage === totalPages} className="pagination-arrow">&rsaquo;</button>
                      <button onClick={() => setReqPage(totalPages)} disabled={safePage === totalPages} className="pagination-arrow">&raquo;</button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* ── Round create/edit modal ── */}
      {(isCreateRoundOpen || isEditRoundOpen) && (
        <div className="refund-modal-overlay" onClick={() => { setIsCreateRoundOpen(false); setIsEditRoundOpen(false); }}>
          <div className="refund-modal refund-modal--narrow" onClick={e => e.stopPropagation()}>
            <button className="refund-modal-close" onClick={() => { setIsCreateRoundOpen(false); setIsEditRoundOpen(false); }}>✕</button>
            <h2>{isCreateRoundOpen ? 'מחזור חדש' : 'עריכת מחזור'}</h2>
            <div className="refund-form-group">
              <label>שם המחזור *</label>
              <input type="text" name="name" value={roundForm.name} onChange={handleRoundChange} />
              {roundErrors.name && <div className="voucher-form-error">{roundErrors.name}</div>}
            </div>
            <div className="refund-form-group">
              <label>סטטוס</label>
              <select name="status" value={roundForm.status} onChange={handleRoundChange}>
                <option value="open">פתוח</option>
                <option value="closed">סגור</option>
              </select>
            </div>
            <div className="refund-form-group">
              <label>מתאריך</label>
              <input type="date" name="start_date" value={roundForm.start_date} onChange={handleRoundChange} />
            </div>
            <div className="refund-form-group">
              <label>עד תאריך</label>
              <input type="date" name="end_date" value={roundForm.end_date} onChange={handleRoundChange} />
            </div>
            <div className="refund-form-group full-width">
              <label>הערות</label>
              <textarea name="notes" value={roundForm.notes} onChange={handleRoundChange} />
            </div>
            <button className="refund-submit-btn" onClick={isCreateRoundOpen ? submitCreateRound : submitEditRound}>שמירה</button>
          </div>
        </div>
      )}

      {/* ── Assign-volunteer modal (assignment only — requests come from the public form) ── */}
      {isEditReqOpen && selectedReq && (
        <div className="refund-modal-overlay" onClick={() => setIsEditReqOpen(false)}>
          <div className="refund-modal refund-modal--narrow" onClick={e => e.stopPropagation()}>
            <button className="refund-modal-close" onClick={() => setIsEditReqOpen(false)}>✕</button>
            <h2>שיבוץ מתנדב</h2>

            <div className="activity-request-summary">
              <div className="activity-summary-row"><span>סוג פעילות</span><strong>{ACTIVITY_TYPE_LABELS[selectedReq.activity_type] || '—'}</strong></div>
              <div className="activity-summary-row"><span>שם המטופל/ת</span><strong>{selectedReq.child_name || '—'}</strong></div>
              <div className="activity-summary-row"><span>מין · גיל</span><strong>{`${selectedReq.child_gender || '—'} · ${selectedReq.child_age || '—'}`}</strong></div>
              <div className="activity-summary-row"><span>עיר מגורים</span><strong>{selectedReq.city || '—'}</strong></div>
              <div className="activity-summary-row"><span>תאריך מבוקש</span><strong>{fmtDate(selectedReq.requested_date)}</strong></div>
              {selectedReq.parent_name && <div className="activity-summary-row"><span>שם הורה</span><strong>{selectedReq.parent_name}</strong></div>}
              {selectedReq.parent_phone && <div className="activity-summary-row"><span>טלפון הורה</span><strong>{selectedReq.parent_phone}</strong></div>}
              {selectedReq.treating_hospital && <div className="activity-summary-row"><span>בית חולים מטפל</span><strong>{selectedReq.treating_hospital}</strong></div>}
              {selectedReq.activity_type === 'house_visit' && (
                <>
                  {(selectedReq.num_siblings !== null && selectedReq.num_siblings !== '' && selectedReq.num_siblings !== undefined) &&
                    <div className="activity-summary-row"><span>מספר אחים</span><strong>{selectedReq.num_siblings}</strong></div>}
                  <div className="activity-summary-row"><span>ממ״ד קרוב</span><strong>{selectedReq.has_safe_room === true ? 'כן' : selectedReq.has_safe_room === false ? 'לא' : '—'}</strong></div>
                  {selectedReq.full_address && <div className="activity-summary-row"><span>כתובת מלאה</span><strong>{selectedReq.full_address}</strong></div>}
                  {selectedReq.preferred_days && <div className="activity-summary-row"><span>ימים מועדפים</span><strong>{selectedReq.preferred_days}</strong></div>}
                </>
              )}
              {selectedReq.activity_type === 'fun_day' && (
                <>
                  {selectedReq.limitations && <div className="activity-summary-row"><span>מגבלות</span><strong>{selectedReq.limitations}</strong></div>}
                  {selectedReq.favorite_activities && <div className="activity-summary-row"><span>פעילויות אהובות</span><strong>{selectedReq.favorite_activities}</strong></div>}
                </>
              )}
              {selectedReq.notes && <div className="activity-summary-row"><span>הערות</span><strong>{selectedReq.notes}</strong></div>}
            </div>

            <div className="refund-form-group">
              <label>מתנדבים משובצים (צוות)</label>
              <Select
                classNamePrefix="activity-select"
                isMulti
                options={people.map(p => ({ value: p.staff_id, label: p.name }))}
                value={people.filter(p => reqForm.assigned_staff_ids.includes(p.staff_id)).map(p => ({ value: p.staff_id, label: p.name }))}
                onChange={opts => setReqForm(prev => {
                  const ids = (opts || []).map(o => o.value);
                  return {
                    ...prev,
                    assigned_staff_ids: ids,
                    status: ids.length && prev.status === 'open' ? 'assigned' : (!ids.length && prev.status === 'assigned' ? 'open' : prev.status),
                  };
                })}
                isClearable
                placeholder="בחר מתנדבים/חונכים..."
                noOptionsMessage={() => 'לא נמצאו מתנדבים'}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                maxMenuHeight={260}
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>
            <div className="refund-form-group">
              <label>סטטוס</label>
              <select value={reqForm.status} onChange={e => setReqForm(prev => ({ ...prev, status: e.target.value }))}>
                {REQUEST_STATUS_OPTIONS.map(s => <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <button className="refund-submit-btn" onClick={submitEditReq}>שמירה</button>
          </div>
        </div>
      )}

      {/* ── Delete confirmations ── */}
      {isDeleteRoundOpen && (
        <div className="refund-modal-overlay" onClick={() => setIsDeleteRoundOpen(false)}>
          <div className="refund-modal refund-modal--small" onClick={e => e.stopPropagation()}>
            <button className="refund-modal-close" onClick={() => setIsDeleteRoundOpen(false)}>✕</button>
            <h2>מחיקת מחזור</h2>
            <p>למחוק את המחזור "{selectedRound?.name}" וכל הבקשות שבו?</p>
            <button className="refund-submit-btn refund-delete-btn" onClick={submitDeleteRound}>מחיקה</button>
          </div>
        </div>
      )}
      {isDeleteReqOpen && (
        <div className="refund-modal-overlay" onClick={() => setIsDeleteReqOpen(false)}>
          <div className="refund-modal refund-modal--small" onClick={e => e.stopPropagation()}>
            <button className="refund-modal-close" onClick={() => setIsDeleteReqOpen(false)}>✕</button>
            <h2>מחיקת בקשה</h2>
            <p>למחוק את הבקשה של "{selectedReq?.child_name}"?</p>
            <button className="refund-submit-btn refund-delete-btn" onClick={submitDeleteReq}>מחיקה</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityBoard;
