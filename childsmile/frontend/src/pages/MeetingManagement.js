import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/meetingManagement.css';
import axios from '../axiosConfig';
import { toast } from 'react-toastify';
import { showErrorToast } from '../components/toastUtils';

// ── helpers ────────────────────────────────────────────────────
const HEBREW_DAYS  = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const HEBREW_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

const formatDate = (isoDate) => {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

const isSaturday = (isoDate) => {
  if (!isoDate) return false;
  return new Date(`${isoDate}T12:00:00`).getDay() === 6;
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// Build a 6-row × 7-col grid for the given year/month (0-based month)
const buildCalendarGrid = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  const cells = [];
  // leading cells from previous month
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ date: `${year}-${String(month).padStart(2,'0')}-${String(daysInPrev - i).padStart(2,'0')}`, current: false });
  // current month
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, current: true });
  // trailing cells
  const trailing = 42 - cells.length;
  for (let d = 1; d <= trailing; d++)
    cells.push({ date: `${year}-${String(month+2).padStart(2,'0')}-${String(d).padStart(2,'0')}`, current: false });
  return cells;
};

// Group meetings by ISO date
const groupByDate = (meetings) => {
  const map = {};
  meetings.forEach(m => {
    if (!map[m.meeting_date]) map[m.meeting_date] = [];
    map[m.meeting_date].push(m);
  });
  return map;
};

// ── sub-components ─────────────────────────────────────────────
const ReminderPills = ({ meeting }) => {
  const pills = [];
  if (meeting.reminder_week_sent_at)     pills.push('שבוע לפני ✓');
  if (meeting.reminder_two_days_sent_at) pills.push('יומיים לפני ✓');
  if (meeting.reminder_same_day_sent_at) pills.push('יום הפגישה ✓');
  if (!pills.length) return <span className="reminder-pill-empty">—</span>;
  return (
    <div className="reminder-pills">
      {pills.map(p => <span key={p} className="reminder-pill">{p}</span>)}
    </div>
  );
};

const EMPTY_FORM = {
  title: 'פגישת צוות',
  meeting_date: '',
  meeting_time: '10:00',
  location: '',
  notes: '',
  invited_staff_ids: [],   // [] = all (will be pre-filled with all IDs)
  send_whatsapp: true,
};

// ── main component ─────────────────────────────────────────────
const MeetingManagement = () => {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based

  const [meetings,   setMeetings]   = useState([]);
  const [recipients, setRecipients] = useState([]); // all potential invitees (flat)
  const [coordinators, setCoordinators] = useState([]); // coordinators + admins
  const [otherStaff,   setOtherStaff]   = useState([]); // other staff
  const [loading,    setLoading]    = useState(true);
  const [modalMode,  setModalMode]  = useState(null); // null | 'create' | 'edit' | 'detail' | 'cancel' | 'remind'
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [remindTarget, setRemindTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [staffSearch, setStaffSearch] = useState('');

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const [meetRes, recRes] = await Promise.all([
        axios.get('/api/meetings/'),
        axios.get('/api/meetings/recipients/'),
      ]);
      setMeetings(meetRes.data.meetings || []);
      const allRecipients = recRes.data.recipients || [];
      setRecipients(allRecipients);
      setCoordinators(recRes.data.coordinators || []);
      setOtherStaff(recRes.data.other_staff || []);
    } catch {
      showErrorToast('שגיאה בטעינת הפגישות');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  // navigation
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // open modals
  const openCreate = (preDate = '') => {
    setSelectedMeeting(null);
    setStaffSearch('');
    // Start with nobody selected — CEO picks manually
    setForm({ ...EMPTY_FORM, meeting_date: preDate, invited_staff_ids: [] });
    setModalMode('create');
  };
  const openDetail = (meeting) => {
    setSelectedMeeting(meeting);
    setModalMode('detail');
  };
  const openEdit = (meeting) => {
    setSelectedMeeting(meeting);
    setStaffSearch('');
    const invitedIds = meeting.invited_staff_ids || [];
    setForm({
      title: meeting.title,
      meeting_date: meeting.meeting_date,
      meeting_time: meeting.meeting_time,
      location: meeting.location || '',
      notes: meeting.notes || '',
      invited_staff_ids: invitedIds,
      send_whatsapp: meeting.send_whatsapp !== false,
    });
    setModalMode('edit');
  };
  const closeModal = () => { setModalMode(null); setSelectedMeeting(null); };

  const handleSave = async () => {
    if (!form.meeting_date || !form.meeting_time) { toast.error('תאריך ושעה הם שדות חובה'); return; }
    if (isSaturday(form.meeting_date)) { toast.error('לא ניתן לקבוע פגישה בשבת'); return; }
    setSaving(true);
    try {
      if (modalMode === 'edit' && selectedMeeting) {
        await axios.put(`/api/meetings/${selectedMeeting.id}/`, form);
        toast.success('הפגישה עודכנה בהצלחה');
      } else {
        await axios.post('/api/meetings/', form);
        toast.success('הפגישה נוצרה בהצלחה');
      }
      closeModal(); fetchMeetings();
    } catch { showErrorToast('שגיאה בשמירת הפגישה'); }
    finally { setSaving(false); }
  };

  const handleCancel = (meeting) => {
    setCancelTarget(meeting);
    setModalMode('cancel');
  };

  const confirmCancel = async () => {
    try {
      await axios.delete(`/api/meetings/${cancelTarget.id}/`);
      toast.success('הפגישה בוטלה');
      setCancelTarget(null);
      closeModal();
      fetchMeetings();
    } catch { showErrorToast('שגיאה בביטול הפגישה'); }
  };

  const handleSendReminders = (meeting) => {
    setRemindTarget(meeting);
    setModalMode('remind');
  };

  const handleHardDelete = (meeting) => {
    setDeleteTarget(meeting);
    setModalMode('delete');
  };

  const confirmHardDelete = async () => {
    try {
      await axios.delete(`/api/meetings/${deleteTarget.id}/delete/`);
      toast.success('הפגישה נמחקה לצמיתות');
      setDeleteTarget(null);
      closeModal();
      fetchMeetings();
    } catch { showErrorToast('שגיאה במחיקת הפגישה'); }
  };

  const confirmSendReminders = async () => {
    try {
      const res = await axios.post(`/api/meetings/${remindTarget.id}/send-reminders/`);
      const sent = res.data.sent || [];
      toast.success(sent.length ? `נשלחו ${sent.length} תזכורות` : 'לא היו תזכורות חדשות לשליחה');
      setRemindTarget(null);
      closeModal();
      fetchMeetings();
    } catch { showErrorToast('שגיאה בשליחת תזכורות'); }
  };

  // calendar data
  const cells   = buildCalendarGrid(viewYear, viewMonth);
  const byDate  = groupByDate(meetings);
  const isoToday = todayISO();

  return (
    <div className="page-container" dir="rtl">
      <Sidebar />
      <div className="content-area">
        <InnerPageHeader title="ניהול פגישות צוות" />
        <div className="meeting-page-content">

          {/* Calendar card */}
          <div className="calendar-card">

            {/* Month navigation header */}
            <div className="calendar-header">
              <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
              <span className="calendar-header-title">
                {HEBREW_MONTHS[viewMonth]} {viewYear}
              </span>
              <button className="cal-nav-btn" onClick={nextMonth}>›</button>
            </div>

            {/* Day name row — Sun first (Israeli week) */}
            <div className="calendar-day-names">
              {HEBREW_DAYS.map((d, i) => (
                <div key={d} className={`calendar-day-name${i === 6 ? ' shabbat' : ''}`}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            {loading ? (
              <div className="meeting-loader">טוען...</div>
            ) : (
              <div className="calendar-grid">
                {cells.map((cell, idx) => {
                  const dayMeetings = byDate[cell.date] || [];
                  const isToday     = cell.date === isoToday;
                  const classes = [
                    'cal-day',
                    !cell.current ? 'other-month' : '',
                    isToday ? 'today' : '',
                    cell.current && cell.date < isoToday ? 'past-day' : '',
                    dayMeetings.length ? 'has-meetings' : '',
                  ].filter(Boolean).join(' ');

                  return (
                    <div
                      key={idx}
                      className={classes}
                      onClick={() => cell.current && !isSaturday(cell.date) && cell.date >= isoToday && openCreate(cell.date)}
                    >
                      <span className="cal-day-num">{Number(cell.date.split('-')[2])}</span>
                      {dayMeetings.slice(0, 2).map(m => (
                        <span
                          key={m.id}
                          className={`cal-meeting-chip${m.is_cancelled ? ' cancelled' : ''}`}
                          onClick={e => { e.stopPropagation(); openDetail(m); }}
                          title={`${m.title} – ${m.meeting_time}`}
                        >
                          {m.meeting_time.slice(0,5)} {m.title}
                        </span>
                      ))}
                      {dayMeetings.length > 2 && (
                        <span className="cal-more" onClick={e => { e.stopPropagation(); openDetail(dayMeetings[0]); }}>
                          +{dayMeetings.length - 2} עוד
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail modal ── */}
      {modalMode === 'detail' && selectedMeeting && (
        <div className="meeting-modal-overlay" onClick={closeModal}>
          <div className="meeting-modal-box" onClick={e => e.stopPropagation()}>
            <button className="meeting-modal-close" onClick={closeModal}>&times;</button>
            <h2 className="meeting-modal-title">📋 {selectedMeeting.title}</h2>

            <div className="meeting-detail-row">
              <span className="meeting-detail-label">תאריך</span>
              <span className="meeting-detail-value">{formatDate(selectedMeeting.meeting_date)}</span>
            </div>
            <div className="meeting-detail-row">
              <span className="meeting-detail-label">שעה</span>
              <span className="meeting-detail-value">{selectedMeeting.meeting_time.slice(0,5)}</span>
            </div>
            <div className="meeting-detail-row">
              <span className="meeting-detail-label">מיקום</span>
              <span className="meeting-detail-value">{selectedMeeting.location || '—'}</span>
            </div>
            {selectedMeeting.notes && (
              <div className="meeting-detail-row">
                <span className="meeting-detail-label">הערות</span>
                <span className="meeting-detail-value">{selectedMeeting.notes}</span>
              </div>
            )}
            <div className="meeting-detail-row">
              <span className="meeting-detail-label">סטטוס</span>
              <span className="meeting-detail-value">
                {selectedMeeting.is_cancelled
                  ? <span className="badge-cancelled">בוטלה</span>
                  : <span className="badge-active">פעילה</span>}
              </span>
            </div>
            <div className="meeting-detail-row">
              <span className="meeting-detail-label">תזכורות</span>
              <span className="meeting-detail-value"><ReminderPills meeting={selectedMeeting} /></span>
            </div>
            <div className="meeting-detail-row">
              <span className="meeting-detail-label">וואטסאפ</span>
              <span className="meeting-detail-value">
                {selectedMeeting.send_whatsapp ? '✅ כן' : '❌ לא'}
              </span>
            </div>
            {(() => {
              const invitedIds = selectedMeeting.invited_staff_ids || [];
              const shown = invitedIds.length > 0
                ? recipients.filter(r => invitedIds.includes(r.id))
                : recipients;
              return shown.length > 0 ? (
                <div className="meeting-detail-row" style={{alignItems:'flex-start'}}>
                  <span className="meeting-detail-label">משתתפים</span>
                  <div className="detail-invitees-list">
                    {shown.map(r => (
                      <div key={r.id} className="detail-invitee-row">
                        <span className="invitee-name">{r.name}</span>
                        {r.email && <span className="invitee-email">✉️ {r.email}</span>}
                        {r.phone && <span className="invitee-phone">📞 {r.phone}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            <hr className="meeting-detail-divider" />

            {!selectedMeeting.is_cancelled && (
              <div className="meeting-modal-actions">
                <button className="meeting-edit-modal-btn"
                  onClick={() => openEdit(selectedMeeting)}
                  disabled={selectedMeeting.meeting_date < isoToday}
                  title={selectedMeeting.meeting_date < isoToday ? 'לא ניתן לערוך פגישה שעברה' : ''}
                  style={selectedMeeting.meeting_date < isoToday ? {opacity:0.45, cursor:'not-allowed'} : {}}>
                  ✏️ עריכה
                </button>
                <button className="meeting-remind-modal-btn" onClick={() => handleSendReminders(selectedMeeting)}>📨 שלח תזכורות</button>
                <button className="meeting-cancel-modal-btn" onClick={() => handleCancel(selectedMeeting)}>🗑 ביטול פגישה</button>
              </div>
            )}
            {selectedMeeting.is_cancelled && (
              <div className="meeting-modal-actions" style={{ justifyContent: 'center' }}>
                <button className="meeting-hard-delete-btn" onClick={() => handleHardDelete(selectedMeeting)}>
                  🗑 מחק לצמיתות
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="meeting-modal-overlay" onClick={closeModal}>
          <div className="meeting-modal-box" onClick={e => e.stopPropagation()}>
            <button className="meeting-modal-close" onClick={closeModal}>&times;</button>
            <h2 className="meeting-modal-title">
              {modalMode === 'edit' ? '✏️ עריכת פגישה' : '📅 פגישה חדשה'}
            </h2>

            <div className="meeting-form-row">
              <label>כותרת</label>
              <input type="text" value={form.title} placeholder="פגישת צוות"
                onChange={e => setForm({...form, title: e.target.value})} />
            </div>

            <div className="meeting-form-row">
              <label>תאריך *</label>
              <input type="date" value={form.meeting_date}
                min={todayISO()}
                onChange={e => setForm({...form, meeting_date: e.target.value})} />
            </div>
            {form.meeting_date && isSaturday(form.meeting_date) && (
              <div className="meeting-saturday-warning">⚠️ לא ניתן לקבוע פגישה בשבת</div>
            )}

            <div className="meeting-form-row">
              <label>שעה *</label>
              <input type="time" value={form.meeting_time}
                onChange={e => setForm({...form, meeting_time: e.target.value})} />
            </div>

            <div className="meeting-form-row">
              <label>מיקום</label>
              <input type="text" value={form.location} placeholder="כתובת / חדר ישיבות"
                onChange={e => setForm({...form, location: e.target.value})} />
            </div>

            <div className="meeting-form-row">
              <label>הערות</label>
              <textarea rows={3} value={form.notes} placeholder="נושאים לדיון, הנחיות וכד׳"
                onChange={e => setForm({...form, notes: e.target.value})} />
            </div>

            {/* ── Invitees ── */}
            <div className="meeting-invitees-section">
              <div className="meeting-invitees-header">
                <span className="meeting-invitees-title">👥 משתתפים מוזמנים</span>
                <button type="button" className="meeting-toggle-all-btn meeting-toggle-none-btn"
                  onClick={() => setForm({...form, invited_staff_ids: []})}>
                  נקה הכל
                </button>
              </div>

              {/* Selected chips */}
              {form.invited_staff_ids.length > 0 && (
                <div className="other-staff-chips">
                  {form.invited_staff_ids
                    .map(id => recipients.find(r => r.id === id))
                    .filter(Boolean)
                    .map(r => (
                      <span key={r.id} className="other-staff-chip">
                        {r.name}
                        <button type="button" className="chip-remove-btn"
                          onClick={() => setForm(f => ({
                            ...f,
                            invited_staff_ids: f.invited_staff_ids.filter(id => id !== r.id)
                          }))}>✕</button>
                      </span>
                    ))
                  }
                </div>
              )}

              {/* Unified search */}
              <div className="other-staff-search-wrap">
                <input
                  type="text"
                  className="other-staff-search-input"
                  placeholder="🔍 חפש משתתף להוספה..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                />
                {staffSearch.trim() && (() => {
                  const q = staffSearch.trim().toLowerCase();
                  const results = recipients.filter(r =>
                    r.name.toLowerCase().includes(q) ||
                    (r.email && r.email.toLowerCase().includes(q))
                  ).slice(0, 8);
                  return results.length > 0 ? (
                    <div className="other-staff-dropdown">
                      {results.map(r => {
                        const already = form.invited_staff_ids.includes(r.id);
                        const isCoord = coordinators.some(c => c.id === r.id);
                        return (
                          <div key={r.id}
                            className={`other-staff-option${already ? ' already-added' : ''}`}
                            onClick={() => {
                              if (!already) setForm(f => ({...f, invited_staff_ids: [...f.invited_staff_ids, r.id]}));
                              setStaffSearch('');
                            }}>
                            <span>{r.name}</span>
                            {isCoord
                              ? <span className="option-role-badge coord-badge">רכז/ית</span>
                              : <span className="option-role-badge other-badge">צוות</span>
                            }
                            {r.email && <span className="option-email">{r.email}</span>}
                            {already && <span className="option-added-badge">✓ נוסף</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="other-staff-dropdown">
                      <div className="other-staff-option" style={{color:'#aaa',cursor:'default'}}>לא נמצאו תוצאות</div>
                    </div>
                  );
                })()}
              </div>
              {form.invited_staff_ids.length === 0 && (
                <p className="invitees-empty">חפש והוסף משתתפים...</p>
              )}
            </div>

            {/* ── WhatsApp toggle ── */}
            <label className="meeting-whatsapp-toggle">
              <input
                type="checkbox"
                checked={form.send_whatsapp}
                onChange={e => setForm({...form, send_whatsapp: e.target.checked})}
              />
              <span>💬 שלח גם תזכורת וואטסאפ</span>
            </label>

            <div className="meeting-modal-actions">
              <button className="meeting-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
              <button className="meeting-discard-btn" onClick={closeModal}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send reminders confirmation modal ── */}
      {modalMode === 'remind' && remindTarget && (() => {
        const invitedIds = remindTarget.invited_staff_ids || [];
        const invitees = invitedIds.length > 0
          ? recipients.filter(r => invitedIds.includes(r.id))
          : recipients;
        const coordIdSet = new Set(coordinators.map(r => r.id));
        const hasNonCoord = invitees.some(r => !coordIdSet.has(r.id));
        return (
          <div className="meeting-modal-overlay" onClick={() => setModalMode('detail')}>
            <div className="meeting-modal-box" onClick={e => e.stopPropagation()}
                 style={{ maxWidth: '520px' }}>
              <h2 className="meeting-modal-title">📨 שליחת תזכורות</h2>
              <p style={{ fontSize: '20px', color: '#444', marginBottom: '6px', textAlign: 'center' }}>
                תזכורות יישלחו למשתתפים הבאים:
              </p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#5a3d8c', marginBottom: '14px', textAlign: 'center' }}>
                {remindTarget.title} — {formatDate(remindTarget.meeting_date)} {remindTarget.meeting_time?.slice(0,5)}
              </p>

              <div className="remind-invitees-list">
                {invitees.length === 0
                  ? <p style={{ color: '#aaa', textAlign: 'center', fontSize: '18px' }}>אין משתתפים</p>
                  : invitees.map(r => {
                    const isCoord = coordIdSet.has(r.id);
                    return (
                      <div key={r.id} className="detail-invitee-row">
                        <span className="invitee-name">{r.name}</span>
                        {r.email && <span className="invitee-email">✉️ {r.email}</span>}
                        {r.phone && remindTarget.send_whatsapp && isCoord && (
                          <span className="invitee-phone">💬 {r.phone}</span>
                        )}
                        {!isCoord && (
                          <span className="invitee-email-only-badge" title="צוות נוסף מקבל אימייל בלבד — ללא WhatsApp">
                            ⚠️ אימייל בלבד
                          </span>
                        )}
                      </div>
                    );
                  })
                }
              </div>

              {remindTarget.send_whatsapp && (
                <p style={{ fontSize: '17px', color: '#059669', marginTop: '12px', textAlign: 'center' }}>
                  💬 תישלח הודעת וואטסאפ לרכזים ומנהלים בלבד
                </p>
              )}
              {hasNonCoord && (
                <p style={{ fontSize: '15px', color: '#b45309', marginTop: '6px', textAlign: 'center' }}>
                  ⚠️ צוות נוסף יקבל אימייל בלבד (ללא WhatsApp)
                </p>
              )}

              <div className="meeting-modal-actions" style={{ justifyContent: 'center', marginTop: '20px' }}>
                <button className="meeting-remind-modal-btn" onClick={confirmSendReminders}>שלח עכשיו</button>
                <button className="meeting-discard-btn" onClick={() => setModalMode('detail')}>חזור</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Cancel confirmation modal ── */}
      {modalMode === 'cancel' && cancelTarget && (
        <div className="meeting-modal-overlay" onClick={() => setModalMode('detail')}>
          <div className="meeting-modal-box" onClick={e => e.stopPropagation()}
               style={{ maxWidth: '440px', textAlign: 'center' }}>
            <h2 className="meeting-modal-title">🗑 ביטול פגישה</h2>
            <p style={{ fontSize: '20px', color: '#444', marginBottom: '8px' }}>
              האם לבטל את הפגישה:
            </p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: '#5a3d8c', marginBottom: '8px' }}>
              {cancelTarget.title}
            </p>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '24px' }}>
              {formatDate(cancelTarget.meeting_date)} בשעה {cancelTarget.meeting_time?.slice(0, 5)}
            </p>
            <div className="meeting-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="meeting-cancel-modal-btn" onClick={confirmCancel}>כן, בטל</button>
              <button className="meeting-discard-btn" onClick={() => setModalMode('detail')}>חזור</button>
            </div>
          </div>
        </div>
      )}
      {/* ── Hard delete confirmation modal ── */}
      {modalMode === 'delete' && deleteTarget && (
        <div className="meeting-modal-overlay" onClick={() => setModalMode('detail')}>
          <div className="meeting-modal-box" onClick={e => e.stopPropagation()}
               style={{ maxWidth: '440px', textAlign: 'center' }}>
            <h2 className="meeting-modal-title">🗑 מחיקה לצמיתות</h2>
            <p style={{ fontSize: '20px', color: '#444', marginBottom: '8px' }}>
              האם למחוק לצמיתות את הפגישה:
            </p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: '#dc2626', marginBottom: '8px' }}>
              {deleteTarget.title}
            </p>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '8px' }}>
              {formatDate(deleteTarget.meeting_date)} בשעה {deleteTarget.meeting_time?.slice(0, 5)}
            </p>
            <p style={{ fontSize: '16px', color: '#b45309', background: '#fef3c7', borderRadius: '10px', padding: '8px 14px', marginBottom: '20px' }}>
              ⚠️ פעולה זו אינה ניתנת לביטול
            </p>
            <div className="meeting-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="meeting-hard-delete-btn" onClick={confirmHardDelete}>כן, מחק לצמיתות</button>
              <button className="meeting-discard-btn" onClick={() => setModalMode('detail')}>חזור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingManagement;
