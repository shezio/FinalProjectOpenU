import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from '../axiosConfig';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { showErrorToast } from '../components/toastUtils';
import logo from '../assets/logo.png';
import '../styles/voucherquestionnaire.css';
import '../styles/activityquestionnaire.css';

// Mirrors activity_views.py's _validate_activity_data (server is the authority;
// this just gives instant feedback). Israeli phone = 10 digits starting with 0.
const ISRAELI_PHONE_RE = /^0\d{9}$/;
const FIELD_MAX_LENGTHS = {
  child_name: 255, child_gender: 20, child_age: 10, parent_name: 255,
  parent_phone: 20, city: 255, treating_hospital: 255,
  full_address: 255, preferred_days: 255,
};
const TEXT_FIELD_MAX_LENGTH = 4000; // notes / limitations / favorite_activities
const PHONE_INPUT_MAX_LENGTH = 10;

// A real YYYY-MM-DD calendar date. Guards against a manually-crafted/rolled-over
// value (e.g. 2026-02-30) that a native date input would never produce but a
// direct POST could — mirrors the server's _parse_date check.
const isValidDateStr = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, day] = s.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
};

// Days of the week (RTL, Israeli order) for the "ימים מועדפים" checkboxes. Stored
// back into preferred_days as a comma-joined string (the DB column is a CharField).
const WEEK_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];

// PUBLIC page — no login required, mirrors VoucherQuestionnaire.js's "action of
// a non-user" precedent. Reached via a stable per-round link, e.g.
// /activity-questionnaire/5. ONE form, a fun-day / house-visit toggle at the top
// reveals the type-specific fields (Liam's Q1).
const ActivityQuestionnaire = () => {
  const { roundId } = useParams();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null); // { name, status, is_open }
  const [notAvailable, setNotAvailable] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    activity_type: 'fun_day', // default; the toggle switches to house_visit
    requested_date: '',
    child_name: '', child_gender: 'זכר', child_age: '',
    parent_name: '', parent_phone: '', city: '', treating_hospital: '',
    notes: '',
    // fun-day only
    limitations: '', favorite_activities: '',
    // house-visit only
    num_siblings: '', full_address: '', preferred_days: '', has_safe_room: false,
    website: '', // honeypot — kept visually hidden, real visitors never fill this
  };
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    axios.get(`/api/activities/public/${roundId}/`)
      .then(res => setInfo(res.data))
      .catch(() => setNotAvailable(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  const isFunDay = formData.activity_type === 'fun_day';

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'parent_phone') {
      const hasNonDigit = value !== '' && /\D/.test(value);
      const digitsOnly = value.replace(/\D/g, '').slice(0, PHONE_INPUT_MAX_LENGTH);
      setFormData(prev => ({ ...prev, parent_phone: digitsOnly }));
      setFormErrors(prev => ({ ...prev, parent_phone: hasNonDigit ? 'מספר טלפון - ספרות בלבד, ללא מקפים או רווחים' : '' }));
      return;
    }

    const maxLen = FIELD_MAX_LENGTHS[name] ?? (['notes', 'limitations', 'favorite_activities'].includes(name) ? TEXT_FIELD_MAX_LENGTH : null);
    const clamped = maxLen != null ? value.slice(0, maxLen) : value;
    setFormData(prev => ({ ...prev, [name]: clamped }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const setActivityType = (type) => {
    setFormData(prev => ({ ...prev, activity_type: type }));
  };

  // preferred_days is stored as a comma-joined string (DB CharField) — toggle a
  // day in/out while keeping the canonical week order.
  const selectedDays = formData.preferred_days
    ? formData.preferred_days.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const togglePreferredDay = (day) => {
    setFormData(prev => {
      const days = prev.preferred_days ? prev.preferred_days.split(',').map(s => s.trim()).filter(Boolean) : [];
      const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
      return { ...prev, preferred_days: WEEK_DAYS.filter(d => next.includes(d)).join(', ') };
    });
  };

  const validate = () => {
    const errs = {};
    if (!formData.activity_type) errs.activity_type = 'יש לבחור סוג פעילות';
    if (!formData.requested_date) errs.requested_date = 'שדה חובה';
    else if (!isValidDateStr(formData.requested_date)) errs.requested_date = 'תאריך לא תקין';
    if (!formData.child_name.trim()) errs.child_name = 'שדה חובה';
    if (!String(formData.child_age).trim()) errs.child_age = 'שדה חובה';
    if (!formData.city.trim()) errs.city = 'שדה חובה';
    if (!formData.parent_phone.trim()) errs.parent_phone = 'שדה חובה';
    else if (!ISRAELI_PHONE_RE.test(formData.parent_phone)) errs.parent_phone = 'מספר טלפון לא תקין (לדוגמה: 0541234567)';
    if (formData.activity_type === 'house_visit' && !formData.full_address.trim()) errs.full_address = 'שדה חובה';
    if (formData.num_siblings !== '' && (Number(formData.num_siblings) < 0 || Number(formData.num_siblings) > 30)) {
      errs.num_siblings = 'מספר אחים לא תקין';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    setSubmitting(true);
    axios.post(`/api/activities/public/${roundId}/submit/`, formData)
      .then(() => setSubmitted(true))
      .catch(err => showErrorToast(t, '', { message: err.response?.data?.error || 'שגיאה בשליחת הטופס' }))
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return <div className="voucher-form-page"><div className="voucher-form-card"><p>טוען...</p></div></div>;
  }

  if (notAvailable || !info) {
    return (
      <div className="voucher-form-page">
        <div className="voucher-form-card">
          <img src={logo} alt="לוגו" className="voucher-form-logo" />
          <h2>הטופס אינו זמין</h2>
          <p>הקישור אינו תקין, או שאין רישום פעיל כרגע.</p>
        </div>
      </div>
    );
  }

  if (!info.is_open) {
    return (
      <div className="voucher-form-page">
        <div className="voucher-form-card">
          <img src={logo} alt="לוגו" className="voucher-form-logo" />
          <h2>{info.name}</h2>
          <p>הרישום סגור כרגע. תודה על ההתעניינות!</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="voucher-form-page">
        <div className="voucher-form-card">
          <img src={logo} alt="לוגו" className="voucher-form-logo" />
          <h2>תודה!</h2>
          <p>הבקשה שלך נשלחה בהצלחה ותטופל בהקדם. נשמח לשמח את הילד/ה 🩷</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voucher-form-page">
      <ToastContainer rtl />
      <form className="voucher-form-card" onSubmit={handleSubmit}>
        <img src={logo} alt="לוגו" className="voucher-form-logo" />
        <h2>{info.name}</h2>
        <p className="voucher-form-subtitle">בקשה לפעילות — אנא מלאו את הפרטים</p>

        {/* Activity type toggle (Liam's Q1: one form, a toggle) */}
        <div className="activity-type-toggle">
          <button type="button" className={`activity-type-btn${isFunDay ? ' active' : ''}`} onClick={() => setActivityType('fun_day')}>
            🎉 יום כיף
          </button>
          <button type="button" className={`activity-type-btn${!isFunDay ? ' active' : ''}`} onClick={() => setActivityType('house_visit')}>
            🏠 ביקור בית
          </button>
        </div>

        <div className="voucher-form-group">
          <label>תאריך מבוקש *</label>
          <input type="date" name="requested_date" value={formData.requested_date} onChange={handleChange} />
          {formErrors.requested_date && <div className="voucher-form-error">{formErrors.requested_date}</div>}
        </div>

        <div className="voucher-form-group">
          <label>שם מלא של המטופל/ת *</label>
          <input type="text" name="child_name" maxLength={FIELD_MAX_LENGTHS.child_name} value={formData.child_name} onChange={handleChange} />
          {formErrors.child_name && <div className="voucher-form-error">{formErrors.child_name}</div>}
        </div>

        <div className="voucher-form-group">
          <label>מין</label>
          <label className="activity-switch">
            <input type="checkbox" name="child_gender" checked={formData.child_gender === 'נקבה'}
              onChange={e => setFormData(prev => ({ ...prev, child_gender: e.target.checked ? 'נקבה' : 'זכר' }))} />
            <span className="activity-switch-slider"></span>
            <span className="activity-switch-text">{formData.child_gender === 'נקבה' ? 'נקבה' : 'זכר'}</span>
          </label>
        </div>

        <div className="voucher-form-group">
          <label>גיל *</label>
          <input type="text" inputMode="decimal" name="child_age" maxLength={FIELD_MAX_LENGTHS.child_age} value={formData.child_age} onChange={handleChange} placeholder="לדוגמה: 7" />
          {formErrors.child_age && <div className="voucher-form-error">{formErrors.child_age}</div>}
        </div>

        <div className="voucher-form-group">
          <label>שם הורה</label>
          <input type="text" name="parent_name" maxLength={FIELD_MAX_LENGTHS.parent_name} value={formData.parent_name} onChange={handleChange} />
        </div>

        <div className="voucher-form-group">
          <label>טלפון הורה *</label>
          <input type="tel" inputMode="numeric" name="parent_phone" maxLength={PHONE_INPUT_MAX_LENGTH} value={formData.parent_phone} onChange={handleChange} placeholder="0541234567" />
          {formErrors.parent_phone && <div className="voucher-form-error">{formErrors.parent_phone}</div>}
        </div>

        <div className="voucher-form-group">
          <label>עיר מגורים *</label>
          <input type="text" name="city" maxLength={FIELD_MAX_LENGTHS.city} value={formData.city} onChange={handleChange} />
          {formErrors.city && <div className="voucher-form-error">{formErrors.city}</div>}
        </div>

        <div className="voucher-form-group">
          <label>בית חולים מטפל</label>
          <input type="text" name="treating_hospital" maxLength={FIELD_MAX_LENGTHS.treating_hospital} value={formData.treating_hospital} onChange={handleChange} />
        </div>

        {/* Fun-day-only fields */}
        {isFunDay && (
          <>
            <div className="voucher-form-group full-width">
              <label>מגבלות שכדאי שנדע</label>
              <textarea name="limitations" maxLength={TEXT_FIELD_MAX_LENGTH} value={formData.limitations} onChange={handleChange} />
            </div>
            <div className="voucher-form-group full-width">
              <label>פעילויות אהובות על הילד/ה</label>
              <textarea name="favorite_activities" maxLength={TEXT_FIELD_MAX_LENGTH} value={formData.favorite_activities} onChange={handleChange} />
            </div>
          </>
        )}

        {/* House-visit-only fields */}
        {!isFunDay && (
          <>
            <div className="voucher-form-group">
              <label>מספר אחים</label>
              <input type="number" min="0" max="30" name="num_siblings" value={formData.num_siblings} onChange={handleChange} />
              {formErrors.num_siblings && <div className="voucher-form-error">{formErrors.num_siblings}</div>}
            </div>
            <div className="voucher-form-group">
              <label>יש מרחב מוגן קרוב (ממ״ד)?</label>
              <label className="activity-switch">
                <input type="checkbox" name="has_safe_room" checked={!!formData.has_safe_room}
                  onChange={e => setFormData(prev => ({ ...prev, has_safe_room: e.target.checked }))} />
                <span className="activity-switch-slider"></span>
                <span className="activity-switch-text">{formData.has_safe_room ? 'כן' : 'לא'}</span>
              </label>
            </div>
            <div className="voucher-form-group full-width">
              <label>כתובת מלאה *</label>
              <input type="text" name="full_address" maxLength={FIELD_MAX_LENGTHS.full_address} value={formData.full_address} onChange={handleChange} />
              {formErrors.full_address && <div className="voucher-form-error">{formErrors.full_address}</div>}
            </div>
            <div className="voucher-form-group full-width">
              <label>ימים מועדפים בשבוע</label>
              <div className="activity-days-grid">
                {WEEK_DAYS.map(day => (
                  <label key={day} className={`activity-day-chip${selectedDays.includes(day) ? ' selected' : ''}`}>
                    <input type="checkbox" checked={selectedDays.includes(day)} onChange={() => togglePreferredDay(day)} />
                    <span>{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="voucher-form-group full-width">
          <label>הערות / הארות</label>
          <textarea name="notes" maxLength={TEXT_FIELD_MAX_LENGTH} value={formData.notes} onChange={handleChange} />
        </div>

        {/* Honeypot — visually hidden; bots that fill every field trip it */}
        <div className="voucher-form-honeypot" aria-hidden="true">
          <label htmlFor="website">אתר אינטרנט</label>
          <input type="text" id="website" name="website" tabIndex="-1" autoComplete="off" value={formData.website} onChange={handleChange} />
        </div>

        <button type="submit" className="voucher-form-submit" disabled={submitting}>
          {submitting ? 'שולח...' : 'שליחה'}
        </button>
      </form>
    </div>
  );
};

export default ActivityQuestionnaire;
