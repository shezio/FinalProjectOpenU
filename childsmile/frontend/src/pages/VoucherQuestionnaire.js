import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from '../axiosConfig';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { showErrorToast } from '../components/toastUtils';
import logo from '../assets/logo.png';
import '../styles/voucherquestionnaire.css';

// Must match Children.status's real choices exactly (models.py) - NOT invented values.
const CHILD_TREATMENT_STATUSES = ['טיפולים', 'מעקבים', 'אחזקה', 'ז״ל', 'בריא', 'עזב'];

// Must mirror voucher_views.py's _validate_recipient_data exactly (server-side
// is the real authority - a direct script/curl POST bypasses all of this -
// but matching it here gives instant feedback instead of a round-trip error).
const ISRAELI_PHONE_RE = /^0[2-9]\d{7,8}$/;
const FIELD_MAX_LENGTHS = {
  full_name: 255, parent_id_number: 20, phone: 20, child_name: 255,
  child_id_number: 20, city: 255, street_address: 255, referral_source: 255,
};
const TEXT_FIELD_MAX_LENGTH = 4000; // case_description

// Real Israeli ת"ז checksum (standard Luhn-style algorithm) - mirrors
// voucher_views.py's _is_valid_israeli_id exactly. child_id on Children IS
// the real government ת"ז (imported from the "תעודת זהות ילד/ה" column), so
// this catches typos/made-up numbers instantly instead of a round-trip 400.
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

// PUBLIC page — no login required, mirrors Registration.js's "action of a
// non-user" precedent. Reached via a direct link shared per distribution
// (see Vouchers.js's "עתק קישור לשאלון" button), e.g. /voucher-questionnaire/12.
const VoucherQuestionnaire = () => {
  const { distributionId } = useParams();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null); // { name, questionnaire_type, is_completed }
  const [notAvailable, setNotAvailable] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    full_name: '', parent_id_number: '', phone: '', num_children_at_home: '',
    city: '', street_address: '', case_description: '',
    child_name: '', child_treatment_status: '', child_id_number: '',
    referral_source: '',
    website: '', // honeypot — kept visually hidden, real visitors never fill this in
  };
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    axios.get(`/api/vouchers/public/${distributionId}/`)
      .then(res => setInfo(res.data))
      .catch(() => setNotAvailable(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distributionId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.full_name.trim()) errs.full_name = 'שדה חובה';
    if (formData.full_name.length > FIELD_MAX_LENGTHS.full_name) errs.full_name = `מקסימום ${FIELD_MAX_LENGTHS.full_name} תווים`;

    if (!formData.phone.trim()) errs.phone = 'שדה חובה';
    else if (!ISRAELI_PHONE_RE.test(formData.phone.replace(/[-\s]/g, ''))) errs.phone = 'מספר טלפון לא תקין (לדוגמה: 0541234567)';

    if (formData.parent_id_number.trim() && !isValidIsraeliId(formData.parent_id_number)) {
      errs.parent_id_number = 'תעודת זהות אינה תקינה - נא לבדוק שוב';
    }

    if (info?.questionnaire_type === 'עמותה') {
      if (!formData.child_name.trim()) errs.child_name = 'שדה חובה';
      else if (formData.child_name.length > FIELD_MAX_LENGTHS.child_name) errs.child_name = `מקסימום ${FIELD_MAX_LENGTHS.child_name} תווים`;

      if (!formData.child_id_number.trim()) errs.child_id_number = 'שדה חובה';
      else if (!isValidIsraeliId(formData.child_id_number)) errs.child_id_number = 'תעודת זהות אינה תקינה - נא לבדוק שוב';
    } else if (info?.questionnaire_type === 'כללי') {
      if (!formData.referral_source.trim()) errs.referral_source = 'שדה חובה';
      else if (formData.referral_source.length > FIELD_MAX_LENGTHS.referral_source) errs.referral_source = `מקסימום ${FIELD_MAX_LENGTHS.referral_source} תווים`;
    }

    if (formData.num_children_at_home !== '' && (Number(formData.num_children_at_home) < 0 || Number(formData.num_children_at_home) > 30)) {
      errs.num_children_at_home = 'מספר ילדים בבית לא תקין';
    }

    if (formData.city.length > FIELD_MAX_LENGTHS.city) errs.city = `מקסימום ${FIELD_MAX_LENGTHS.city} תווים`;
    if (formData.street_address.length > FIELD_MAX_LENGTHS.street_address) errs.street_address = `מקסימום ${FIELD_MAX_LENGTHS.street_address} תווים`;
    if (formData.case_description.length > TEXT_FIELD_MAX_LENGTH) errs.case_description = `מקסימום ${TEXT_FIELD_MAX_LENGTH} תווים`;

    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    setSubmitting(true);
    axios.post(`/api/vouchers/public/${distributionId}/submit/`, formData)
      .then(() => setSubmitted(true))
      .catch(err => showErrorToast(t, '', { message: err.response?.data?.error || 'שגיאה בשליחת הטופס' }))
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return <div className="voucher-form-page"><div className="voucher-form-card"><p>טוען...</p></div></div>;
  }

  if (notAvailable || !info || info.questionnaire_type === 'ללא') {
    return (
      <div className="voucher-form-page">
        <div className="voucher-form-card">
          <img src={logo} alt="לוגו" className="voucher-form-logo" />
          <h2>הטופס אינו זמין</h2>
          <p>הקישור אינו תקין, או שאין שאלון פעיל עבור חלוקה זו.</p>
        </div>
      </div>
    );
  }

  if (info.is_completed) {
    return (
      <div className="voucher-form-page">
        <div className="voucher-form-card">
          <img src={logo} alt="לוגו" className="voucher-form-logo" />
          <h2>{info.name}</h2>
          <p>החלוקה הסתיימה ואינה מקבלת פניות נוספות כרגע. תודה על ההתעניינות!</p>
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
          <p>הפנייה שלך נשלחה בהצלחה ותטופל בהקדם.</p>
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
        <p className="voucher-form-subtitle">אנא מלאו את הפרטים הבאים</p>

        <div className="voucher-form-group">
          <label>שם מלא *</label>
          <input type="text" name="full_name" maxLength={FIELD_MAX_LENGTHS.full_name} value={formData.full_name} onChange={handleChange} />
          {formErrors.full_name && <div className="voucher-form-error">{formErrors.full_name}</div>}
        </div>

        <div className="voucher-form-group">
          <label>מספר טלפון *</label>
          <input type="tel" inputMode="tel" name="phone" maxLength={FIELD_MAX_LENGTHS.phone} value={formData.phone} onChange={handleChange} placeholder="0541234567" />
          {formErrors.phone && <div className="voucher-form-error">{formErrors.phone}</div>}
        </div>

        <div className="voucher-form-group">
          <label>תעודת זהות (הורה)</label>
          <input type="text" inputMode="numeric" name="parent_id_number" maxLength={9} value={formData.parent_id_number} onChange={handleChange} />
          {formErrors.parent_id_number && <div className="voucher-form-error">{formErrors.parent_id_number}</div>}
        </div>

        <div className="voucher-form-group">
          <label>מספר ילדים בבית</label>
          <input type="number" min="0" max="30" name="num_children_at_home" value={formData.num_children_at_home} onChange={handleChange} />
          {formErrors.num_children_at_home && <div className="voucher-form-error">{formErrors.num_children_at_home}</div>}
        </div>

        {info.questionnaire_type === 'עמותה' && (
          <>
            <div className="voucher-form-group">
              <label>שם הילד *</label>
              <input type="text" name="child_name" maxLength={FIELD_MAX_LENGTHS.child_name} value={formData.child_name} onChange={handleChange} />
              {formErrors.child_name && <div className="voucher-form-error">{formErrors.child_name}</div>}
            </div>
            <div className="voucher-form-group">
              <label>מצב טיפול של הילד</label>
              <select name="child_treatment_status" value={formData.child_treatment_status} onChange={handleChange}>
                <option value="">בחר</option>
                {CHILD_TREATMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="voucher-form-group">
              <label>תעודת זהות הילד *</label>
              <input type="text" inputMode="numeric" name="child_id_number" maxLength={9} value={formData.child_id_number} onChange={handleChange} />
              {formErrors.child_id_number && <div className="voucher-form-error">{formErrors.child_id_number}</div>}
            </div>
          </>
        )}

        {info.questionnaire_type === 'כללי' && (
          <div className="voucher-form-group">
            <label>גורם מפנה *</label>
            <input type="text" name="referral_source" maxLength={FIELD_MAX_LENGTHS.referral_source} value={formData.referral_source} onChange={handleChange} placeholder="לדוגמה: עובדת סוציאלית, מוסד..." />
            {formErrors.referral_source && <div className="voucher-form-error">{formErrors.referral_source}</div>}
          </div>
        )}

        <div className="voucher-form-group">
          <label>עיר</label>
          <input type="text" name="city" maxLength={FIELD_MAX_LENGTHS.city} value={formData.city} onChange={handleChange} />
        </div>

        <div className="voucher-form-group full-width">
          <label>כתובת מלאה (רחוב, מספר, קומה, דירה)</label>
          <input type="text" name="street_address" maxLength={FIELD_MAX_LENGTHS.street_address} value={formData.street_address} onChange={handleChange} />
        </div>

        <div className="voucher-form-group full-width">
          <label>תיאור המקרה</label>
          <textarea name="case_description" maxLength={TEXT_FIELD_MAX_LENGTH} value={formData.case_description} onChange={handleChange} />
        </div>

        {/* Honeypot — visually hidden from real visitors, bots that fill every field trip it */}
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

export default VoucherQuestionnaire;
