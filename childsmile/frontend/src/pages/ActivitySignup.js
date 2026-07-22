import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import axios from '../axiosConfig';
import { toast } from 'react-toastify';
import { showErrorToast } from '../components/toastUtils';
import '../styles/common.css';
import '../styles/activitysignup.css';

const ACTIVITY_TYPE_LABELS = { fun_day: 'יום כיף', house_visit: 'ביקור בית' };
const ACTIVITY_TYPE_ICON = { fun_day: '🎉', house_visit: '🏠' };
const STATUS_LABELS = { open: 'ממתין לשיבוץ', assigned: 'משובץ', completed: 'הושלם', cancelled: 'בוטל' };

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr;
};

// Volunteer self-service page — DE-IDENTIFIED available list + self-assign +
// "my activities" (with the contact details the assigned volunteer needs).
const ActivitySignup = () => {
  const [tab, setTab] = useState('available'); // 'available' | 'mine'
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      axios.get('/api/activities/available/').then(res => setAvailable(res.data.activities || [])).catch(() => {}),
      axios.get('/api/activities/mine/').then(res => setMine(res.data.activities || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const assignSelf = (id) => {
    setAssigningId(id);
    axios.post(`/api/activities/assign-self/${id}/`)
      .then(res => { toast.success(res.data?.message || 'שובצת בהצלחה!'); fetchAll(); })
      .catch(err => showErrorToast(null, err.response?.data?.error || 'שגיאה בשיבוץ', ''))
      .finally(() => setAssigningId(null));
  };

  const leaveActivity = (id) => {
    setAssigningId(id);
    axios.delete(`/api/activities/leave/${id}/`)
      .then(res => { toast.success(res.data?.message || 'בוטל השיבוץ'); fetchAll(); })
      .catch(err => showErrorToast(null, err.response?.data?.error || 'שגיאה בביטול השיבוץ', ''))
      .finally(() => setAssigningId(null));
  };

  // Teammate list ("see who is already on it") — fellow volunteers already on an
  // activity. Shared by the available + mine cards.
  const renderTeam = (a, label) => (
    a.assigned_volunteers && a.assigned_volunteers.length > 0 ? (
      <div className="activity-card-team">
        <span className="activity-card-team-label">🙋 {label} ({a.assigned_volunteers.length})</span>
        <div className="activity-card-team-names">
          {a.assigned_volunteers.map(v => (
            <span key={v.staff_id} className="activity-team-chip">{v.name}</span>
          ))}
        </div>
      </div>
    ) : null
  );

  return (
    <div className="activity-signup-main-content">
      <Sidebar />
      <InnerPageHeader title="שיבוץ לפעילויות" />

      <div className="activity-signup-tabs">
        <button className={`activity-signup-tab${tab === 'available' ? ' active' : ''}`} onClick={() => setTab('available')}>
          פעילויות פנויות {available.length > 0 && <span className="activity-signup-count">{available.length}</span>}
        </button>
        <button className={`activity-signup-tab${tab === 'mine' ? ' active' : ''}`} onClick={() => setTab('mine')}>
          הפעילויות שלי {mine.length > 0 && <span className="activity-signup-count">{mine.length}</span>}
        </button>
        <button className="activity-signup-refresh" onClick={fetchAll}>🔄 רענן</button>
      </div>

      {loading ? (
        <div className="activity-signup-loading">טוען נתונים...</div>
      ) : tab === 'available' ? (
        available.length === 0 ? (
          <div className="activity-signup-empty">אין כרגע פעילויות פנויות לשיבוץ 🩷</div>
        ) : (
          <div className="activity-signup-grid">
            {available.map(a => (
              <div key={a.id} className={`activity-card activity-card--${a.activity_type}`}>
                <div className="activity-card-type">{ACTIVITY_TYPE_ICON[a.activity_type]} {ACTIVITY_TYPE_LABELS[a.activity_type]}</div>
                <div className="activity-card-body">
                  <div className="activity-card-row"><span>📍 עיר</span><strong>{a.city || '—'}</strong></div>
                  <div className="activity-card-row"><span>🎂 גיל</span><strong>{a.child_age || '—'}</strong></div>
                  <div className="activity-card-row"><span>👫 מין</span><strong>{a.child_gender || '—'}</strong></div>
                  <div className="activity-card-row"><span>📅 תאריך</span><strong>{fmtDate(a.requested_date)}</strong></div>
                  {renderTeam(a, 'כבר על הפעילות')}
                  {a.round_name && <div className="activity-card-round">{a.round_name}</div>}
                </div>
                <button className="activity-card-assign" disabled={assigningId === a.id} onClick={() => assignSelf(a.id)}>
                  {assigningId === a.id ? 'משבץ...' : 'אני משתבץ/ת 🙋'}
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        mine.length === 0 ? (
          <div className="activity-signup-empty">עדיין לא שובצת לפעילויות</div>
        ) : (
          <div className="activity-signup-grid">
            {mine.map(a => (
              <div key={a.id} className={`activity-card activity-card--${a.activity_type}`}>
                <div className="activity-card-type">{ACTIVITY_TYPE_ICON[a.activity_type]} {ACTIVITY_TYPE_LABELS[a.activity_type]}
                  <span className={`activity-badge activity-badge--${a.status}`}>{STATUS_LABELS[a.status] || a.status}</span>
                </div>
                <div className="activity-card-body">
                  <div className="activity-card-row"><span>👤 מטופל/ת</span><strong>{a.child_name || '—'}</strong></div>
                  <div className="activity-card-row"><span>📍 עיר</span><strong>{a.city || '—'}</strong></div>
                  <div className="activity-card-row"><span>📅 תאריך</span><strong>{fmtDate(a.requested_date)}</strong></div>
                  <div className="activity-card-row"><span>👪 הורה</span><strong>{a.parent_name || '—'}</strong></div>
                  <div className="activity-card-row"><span>📱 טלפון</span><strong>{a.parent_phone || '—'}</strong></div>
                  {a.full_address && <div className="activity-card-row"><span>🏠 כתובת</span><strong>{a.full_address}</strong></div>}
                  {a.treating_hospital && <div className="activity-card-row"><span>🏥 בית חולים</span><strong>{a.treating_hospital}</strong></div>}
                  {renderTeam(a, 'הצוות')}
                </div>
                <button className="activity-card-leave" disabled={assigningId === a.id} onClick={() => leaveActivity(a.id)}>
                  {assigningId === a.id ? 'מבטל...' : 'בטל שיבוץ'}
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default ActivitySignup;
