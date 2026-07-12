import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css';
import '../styles/auditlog.css'; // Special CSS for this page
import axios from '../axiosConfig';
import { toast } from 'react-toastify';
import { hasAllPermissions } from '../components/utils';
import { useTranslation } from 'react-i18next'; // Translation hook
import { showErrorToast } from '../components/toastUtils'; // Toast utility
import { exportAuditToCSV, exportAuditToPDF } from '../components/export_utils'; // Export utilities
const requiredPermissions = [
  { resource: 'childsmile_app_staff', action: 'VIEW' },
  { resource: 'childsmile_app_staff', action: 'CREATE' },
  { resource: 'childsmile_app_staff', action: 'UPDATE' },
  { resource: 'childsmile_app_staff', action: 'DELETE' },
];

// Arrow the backend uses to denote "old value → new value" in descriptions.
const CHANGE_ARROW = '\u2192'; // →

// Hebrew translations for the English LABELS the backend writes in audit
// descriptions (the text before the first ":" on each line). Used to translate
// the whole description in the UI and in exports.
const AUDIT_LABEL_HE = {
  'Timestamp': 'חותמת זמן',
  'User': 'משתמש',
  'Email': 'אימייל',
  'Action': 'פעולה',
  'Method': 'שיטה',
  'Attempts used': 'ניסיונות שבוצעו',
  'Roles': 'תפקידים',
  'Type': 'סוג',
  'Session duration': 'משך התחברות',
  'Status': 'סטטוס',
  'Error': 'שגיאה',
  'Admin': 'מנהל',
  'Target email': 'אימייל יעד',
  'Target': 'יעד',
  'Assigned roles': 'תפקידים שהוקצו',
  'Admin roles': 'תפקידי מנהל',
  'Username': 'שם משתמש',
  'Created on': 'נוצר בתאריך',
  'ID': 'מזהה',
  'Report': 'דוח',
  'Format': 'פורמט',
  'Records': 'רשומות',
  'Contains PII': 'מכיל מידע אישי',
  'Entity': 'ישות',
  'Record ID': 'מזהה רשומה',
  'Deleted record ID': 'מזהה רשומה שנמחקה',
  'Child ID': 'מזהה ילד',
  'Family': 'משפחה',
  'Family name': 'שם משפחה',
  'Family names': 'שמות משפחה',
  'Family phones': 'טלפוני משפחה',
  'Location': 'מיקום',
  'Phone': 'טלפון',
  'Hospital': 'בית חולים',
  'Diagnosis': 'אבחנה',
  'Medical state': 'מצב רפואי',
  'Changes': 'שינויים',
  'Attempted changes': 'שינויים שנוסו',
  'Task type': 'סוג משימה',
  'Assigned to': 'משוייך ל',
  'Volunteer': 'מתנדב',
  'Volunteer email': 'אימייל מתנדב',
  'Volunteer Email': 'אימייל מתנדב',
  'Tutor': 'חונך',
  'Tutor email': 'אימייל חונך',
  'Tutor Email': 'אימייל חונך',
  'Child': 'ילד',
  'Comments': 'הערות',
  'Changed': 'שונה',
  'Field': 'שדה',
  'Approval counter': 'מונה אישורים',
  'Number of Approvers': 'מספר מאשרים',
  'Existing ID': 'מזהה קיים',
  'Counter': 'מונה',
  'Tutor status': 'סטטוס חונך',
  'Child status': 'סטטוס ילד',
  'Reason': 'סיבה',
  'Task ID': 'מזהה משימה',
  'Staff name': 'שם איש צוות',
  'Staff email': 'אימייל איש צוות',
  'Staff ID': 'מזהה איש צוות',
  'Previous roles': 'תפקידים קודמים',
  'New role': 'תפקיד חדש',
  'Removed role': 'תפקיד שהוסר',
  'Restored roles': 'תפקידים ששוחזרו',
  'Staff roles': 'תפקידי איש צוות',
  'Deactivation reason': 'סיבת כיבוי',
  'Tutorships affected': 'חונכויות מושפעות',
  'Attempted': 'נוסו',
  'Attempted assign': 'ניסיון שיוך',
  'Attempted status': 'סטטוס שניסו',
  'Date': 'תאריך',
  'Source IP': 'כתובת IP',
  'Old Value': 'ערך קודם',
  'New Value': 'ערך חדש',
  'Staff name of attempted deletion': 'שם איש צוות שניסו למחוק',
  'Staff email of attempted deletion': 'אימייל איש צוות שניסו למחוק',
  'Staff ID of attempted deletion': 'מזהה איש צוות שניסו למחוק',
  'Timestamp of attempted deletion': 'זמן ניסיון המחיקה',
  'Staff Roles of attempted Deletion': 'תפקידי איש צוות שניסו למחוק',

  // Field-change labels emitted by the backend (family / task / staff / tutor
  // updates). Both the friendly Title-Case labels and the raw DB column names.
  'First Name': 'שם פרטי',
  'Last Name': 'שם משפחה',
  'Gender': 'מין',
  'City': 'עיר',
  'Medical Diagnosis': 'אבחנה רפואית',
  'Marital Status': 'מצב משפחתי',
  'Siblings': 'מספר אחים',
  'Responsible Coordinator (manual)': 'רכז אחראי (שינוי ידני)',
  'Tutoring Details': 'פרטי חונכות',
  'Additional Info': 'מידע נוסף',
  'Tutoring Status': 'סטטוס חונכות',
  'Medical State': 'מצב רפואי',
  'Father Name': 'שם האב',
  'Father Phone': 'טלפון האב',
  'Mother Name': 'שם האם',
  'Mother Phone': 'טלפון האם',
  'Address': 'כתובת',
  'Completed Treatments': 'טיפולים הושלמו',
  'In Frame': 'במסגרת',
  'Coordinator Comments': 'הערות רכז',
  'Last Review Call Conducted': 'שיחת ביקורת אחרונה בוצעה',
  'Birth Date': 'תאריך לידה',
  'Registration Date': 'תאריך רישום',
  'Diagnosis Date': 'תאריך אבחון',
  'Treatment End': 'סיום טיפול',
  'Expected End': 'סיום צפוי לפי פרוטוקול',
  'Responsible Coordinator (auto-updated)': 'רכז אחראי (עודכן אוטומטית)',
  'Due date': 'תאריך יעד',
  // Raw DB column names (tutor / volunteer updates)
  'first_name': 'שם פרטי',
  'surname': 'שם משפחה',
  'birth_date': 'תאריך לידה',
  'age': 'גיל',
  'gender': 'מין',
  'phone': 'טלפון',
  'city': 'עיר',
  'comment': 'הערה',
  'comments': 'הערות',
  'email': 'אימייל',
  'want_tutor': 'מעוניין בחונך',
};

// Hebrew translations for the static English VALUE phrases (or whole lines
// without a ":") the backend writes. Dynamic data (names, emails, dates) is not
// listed here and is therefore left untouched.
const AUDIT_PHRASE_HE = {
  'Verified identity': 'זהות אומתה',
  'Successfully logged in': 'התחברות הצליחה',
  'Login attempt failed': 'ניסיון התחברות נכשל',
  'Anonymous login attempt': 'ניסיון התחברות אנונימי',
  'Successfully registered': 'נרשם בהצלחה',
  'Registration failed': 'ההרשמה נכשלה',
  'Anonymous registration': 'הרשמה אנונימית',
  'Created staff account': 'נוצר חשבון איש צוות',
  'Verification code sent': 'קוד אימות נשלח',
  'Create staff failed': 'יצירת איש צוות נכשלה',
  'Exported report': 'דוח יוצא',
  'Created family': 'משפחה נוצרה',
  'Updated family': 'משפחה עודכנה',
  'Deleted family': 'משפחה נמחקה',
  'Failed create family': 'יצירת משפחה נכשלה',
  'Failed update family': 'עדכון משפחה נכשל',
  'Failed delete family': 'מחיקת משפחה נכשלה',
  'Deleted initial family': 'פרטי משפחה ראשוניים נמחקו',
  'Failed delete initial': 'מחיקת פרטים ראשוניים נכשלה',
  'Marked family added': 'משפחה סומנה כהתווספה',
  'Failed mark family': 'סימון משפחה נכשל',
  'Created new task': 'נוצרה משימה חדשה',
  'Failed create task': 'יצירת משימה נכשלה',
  'Currently unassigned': 'כרגע לא משויך',
  'Updated task': 'משימה עודכנה',
  'Failed update task': 'עדכון משימה נכשל',
  'Deleted task': 'משימה נמחקה',
  'Task unassigned': 'המשימה בוטלה מהקצאה',
  'Failed delete task': 'מחיקת משימה נכשלה',
  'Updated general volunteer': 'מתנדב כללי עודכן',
  'Failed update volunteer': 'עדכון מתנדב נכשל',
  'Updated tutor': 'חונך עודכן',
  'Updated volunteer': 'מתנדב עודכן',
  'Failed update tutor': 'עדכון חונך נכשל',
  'Created tutorship': 'נוצרה חונכות',
  'Failed create tutorship': 'יצירת חונכות נכשלה',
  'Updated tutorship': 'חונכות עודכנה',
  'Failed update tutorship': 'עדכון חונכות נכשל',
  'Deleted tutorship': 'חונכות נמחקה',
  'Failed delete tutorship': 'מחיקת חונכות נכשלה',
  'Deleted pending tutor': 'מועמד לחונכות נמחק',
  'Successfully promoted': 'קודם בהצלחה',
  'Updated staff member': 'איש צוות עודכן',
  'Failed update staff': 'עדכון איש צוות נכשל',
  'Deactivated staff member': 'איש צוות כובה',
  'Reactivated staff member': 'איש צוות הופעל מחדש',
  'Deleted staff member': 'איש צוות נמחק',
  'Failed delete staff': 'מחיקת איש צוות נכשלה',
  'Duplicate exists': 'קיימת כפילות',
  'Role added': 'תפקיד נוסף',
  'Fully approved': 'אושר במלואו',
  'Already approved': 'כבר אושר',
  'Default statuses': 'סטטוסים ברירת מחדל',
  'GDPR deletion complete': 'מחיקת GDPR הושלמה',
  'Security verification': 'אימות אבטחה',
  'Account created': 'חשבון נוצר',
  'Account setup completed': 'הגדרת החשבון הושלמה',
  'OAuth verified': 'OAuth אומת',
  'Inactive': 'לא פעיל',
  'None': 'ללא',
  'No roles': 'ללא תפקידים',
  'Not provided': 'לא סופק',
  'Unknown': 'לא ידוע',
  'Unknown error': 'שגיאה לא ידועה',
  'Yes': 'כן',
  'No': 'לא',
  'New Volunteer': 'מתנדב חדש',
  'New Pending Tutor': 'מועמד לחונכות חדש',
  'Failed to create': 'נכשל ביצירה',
  'Volunteer account for': 'חשבון מתנדב עבור',
  'Pending Tutor account for': 'חשבון מועמד לחונכות עבור',
  'General Volunteer': 'מתנדב כללי',
  'Pending Tutor': 'מועמד לחונכות',
  // Whole-line change phrases (no arrow) and common English values
  'Description changed': 'התיאור שונה',
  'Task type changed': 'סוג המשימה שונה',
  'True': 'כן',
  'False': 'לא',
  'Male': 'זכר',
  'Female': 'נקבה',
};

// Labels whose value is a comma-separated list of ROLE names to translate one by one.
const AUDIT_ROLE_LABELS = new Set([
  'Roles', 'Admin roles', 'Assigned roles', 'Staff roles',
  'Previous roles', 'Restored roles', 'Staff Roles of attempted Deletion',
]);

const AuditLog = () => {
  const { t } = useTranslation(); // Initialize translation
  const hasPermissionOnAuditLog = hasAllPermissions(requiredPermissions);

  // State for audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('desc'); // 'asc' or 'desc'
  const [page, setPage] = useState(1);
  const [pageSize] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageJumpInput, setPageJumpInput] = useState('');
  const [timeJumpInput, setTimeJumpInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [actionTranslations, setActionTranslations] = useState({}); // Store action translations
  
  // Purge modal state
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeData, setPurgeData] = useState(null);
  const [purgeCheckboxChecked, setPurgeCheckboxChecked] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);

  // Fetch audit logs on component mount
  useEffect(() => {
    if (hasPermissionOnAuditLog) {
      fetchAuditLogs();
    } else {
      setLoading(false);
    }
  }, [hasPermissionOnAuditLog]);

  // Fetch audit logs and extract unique actions
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/audit-logs/');
      const logs = response.data.audit_logs || [];
      const translations = response.data.action_translations || {};
      
      setAuditLogs(logs);
      setFilteredLogs(logs);
      setTotalCount(logs.length);
      setSelectedLogs(new Set()); // Clear selections on refresh
      setActionTranslations(translations); // Store translations
      
      // Extract unique actions from logs
      const uniqueActions = [...new Set(logs.map(log => log.action))].sort();
      setActions(uniqueActions);
      
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      showErrorToast(t, t('Failed to fetch audit logs'), error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to translate description keys
  const translateDescription = (description) => {
    if (!description) return description;

    // 1) Replace [BRACKET_KEY] placeholders via i18n (existing behaviour).
    let translated = description;
    const keys = description.match(/\[([^\]]+)\]/g) || [];
    keys.forEach(key => {
      translated = translated.replace(key, t(key));
    });

    // Translate a single free value: static phrase → "N field(s)" → "N hours".
    const translateValue = (value) => {
      const v = value.trim();
      if (v === '') return value;
      if (v === 'None' || v === 'null' || v === 'N/A') return '—';
      if (AUDIT_PHRASE_HE[v]) return AUDIT_PHRASE_HE[v];
      const fieldsMatch = v.match(/^(\d+)\s*field\(s\)$/i);
      if (fieldsMatch) return `${fieldsMatch[1]} שדות`;
      const hoursMatch = v.match(/^(\d+)\s*hours?$/i);
      if (hoursMatch) return `${hoursMatch[1]} שעות`;
      return value;
    };

    // 2) Translate each line: the label (before first ":") and known values.
    translated = translated.split('\n').map((line) => {
      // Preserve leading whitespace + optional "• " bullet so change lines and
      // indentation still render/parse correctly.
      const pm = line.match(/^(\s*(?:\u2022\s*)?)([\s\S]*)$/);
      const prefix = pm ? pm[1] : '';
      const rest = pm ? pm[2] : line;
      if (rest === '') return line;

      const colonIdx = rest.indexOf(':');
      if (colonIdx === -1) {
        // Whole-line phrase (e.g. "Account setup completed", "New Volunteer").
        return prefix + (AUDIT_PHRASE_HE[rest.trim()] || rest);
      }

      const label = rest.slice(0, colonIdx).trim();
      const value = rest.slice(colonIdx + 1).replace(/^\s/, ''); // drop the single space after ':'
      // Audit map first, then fall back to the app's i18n so any labelled field
      // (First Name, City, …) that already has an app translation is covered too.
      const heLabel = AUDIT_LABEL_HE[label] || t(label, { nsSeparator: false, keySeparator: false });

      let heValue;
      if (value.indexOf(CHANGE_ARROW) !== -1) {
        // Field-change line ("old → new"): keep the value; the table renderer
        // and export handle old/new. Only the label is translated.
        heValue = value;
      } else if (AUDIT_ROLE_LABELS.has(label)) {
        heValue = value
          .split(',')
          .map(r => {
            const role = r.trim();
            if (role === '') return role;
            return AUDIT_PHRASE_HE[role] || t(role, { nsSeparator: false, keySeparator: false });
          })
          .join(', ');
      } else {
        heValue = translateValue(value);
      }

      return `${prefix}${heLabel}: ${heValue}`;
    }).join('\n');

    return translated;
  };

  // Parse a single "label: 'old' → 'new'" token into structured parts.
  const parseChangeToken = (token) => {
    if (!token || token.indexOf(CHANGE_ARROW) === -1) return null;

    // Strip leading bullets / dashes / whitespace ("  • ", "- ", "* ").
    const clean = token.replace(/^[\s\u2022\-*]+/, '').trim();
    const arrowIdx = clean.indexOf(CHANGE_ARROW);
    const left = clean.slice(0, arrowIdx).trim();
    let newValue = clean.slice(arrowIdx + CHANGE_ARROW.length).trim();

    // Separate the field label (before the first colon) from the old value.
    let field = '';
    let oldValue = left;
    const colonIdx = left.indexOf(':');
    if (colonIdx !== -1) {
      field = left.slice(0, colonIdx).trim();
      oldValue = left.slice(colonIdx + 1).trim();
    }

    const stripQuotes = (s) => s.replace(/^['"]+|['"]+$/g, '').trim();
    oldValue = stripQuotes(oldValue);
    newValue = stripQuotes(newValue);

    // Translate a change value: empty / "None" / "null" / "N/A" → em dash; a known
    // English phrase (Yes/No/True/False/Male/…) → Hebrew; otherwise leave the data
    // (names, dates, Hebrew enums) as-is.
    const translateChangeValue = (val) => {
      const v = String(val).trim();
      if (v === '' || v === 'None' || v === 'null' || v === 'N/A') return '—';
      return AUDIT_PHRASE_HE[v] || val;
    };

    // Translate the field label (it may already be Hebrew if translateDescription
    // ran first). Disable i18next separators so labels with ':' or '.' are safe.
    const translatedField = field
      ? (AUDIT_LABEL_HE[field] || t(field, { nsSeparator: false, keySeparator: false }))
      : '';

    return {
      field: translatedField,
      oldValue: translateChangeValue(oldValue),
      newValue: translateChangeValue(newValue),
    };
  };

  // Split a translated description into ordered segments: plain-text blocks and
  // groups of field changes (lines containing the "→" arrow).
  const parseDescriptionSegments = (translatedText) => {
    const lines = String(translatedText).split('\n');
    const segments = [];
    let textBuffer = [];
    let changeBuffer = [];

    const flushText = () => {
      if (textBuffer.length) {
        segments.push({ type: 'text', content: textBuffer.join('\n') });
        textBuffer = [];
      }
    };
    const flushChanges = () => {
      if (changeBuffer.length) {
        segments.push({ type: 'changes', items: changeBuffer });
        changeBuffer = [];
      }
    };

    lines.forEach((line) => {
      const arrowCount = (line.match(/\u2192/g) || []).length;
      if (arrowCount > 0) {
        flushText();
        // The backend joins multiple changes with "; ". Only split when there
        // is more than one arrow, so a semicolon inside a single value (e.g. a
        // free-text comment) does not corrupt the parse.
        const tokens = arrowCount > 1 ? line.split(';') : [line];
        tokens.forEach((token) => {
          const parsed = parseChangeToken(token);
          if (parsed) changeBuffer.push(parsed);
        });
      } else {
        flushChanges();
        textBuffer.push(line);
      }
    });
    flushText();
    flushChanges();
    return segments;
  };

  // Render the description cell. Logs WITHOUT a "→" change keep the original
  // plain-text rendering; logs WITH changes show them as an old/new value table.
  const renderDescriptionCell = (log) => {
    const translated = translateDescription(log.description);
    if (!translated || translated.indexOf(CHANGE_ARROW) === -1) {
      return translated;
    }

    const segments = parseDescriptionSegments(translated);
    return (
      <div className="audit-desc">
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            const text = seg.content.trim();
            if (text === '') return null;
            return (
              <div className="audit-desc-text" key={i}>{text}</div>
            );
          }
          return (
            <table className="audit-changes-table" key={i}>
              <thead>
                <tr>
                  <th>{t('Field')}</th>
                  <th>{t('Old Value')}</th>
                  <th>{t('New Value')}</th>
                </tr>
              </thead>
              <tbody>
                {seg.items.map((item, j) => (
                  <tr key={j}>
                    <td className="audit-change-field">{item.field || '—'}</td>
                    <td className="audit-old-value">{item.oldValue}</td>
                    <td className="audit-new-value">{item.newValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
    );
  };

  // Apply filters and sorting
  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedAction, startDate, endDate, sortBy, auditLogs]);

  // Apply all filters and sorting
  const applyFilters = () => {
    let filtered = auditLogs;

    // Filter by search query (description)
    if (searchQuery.trim()) {
      filtered = filtered.filter(log =>
        log.description && log.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by action
    if (selectedAction) {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate <= end;
      });
    }

    // Sort by timestamp
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return sortBy === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredLogs(filtered);
    setTotalCount(filtered.length);
    setPage(1); // Reset to page 1 when filters change
    setSelectedLogs(new Set()); // Clear selections when filtering
  };

  // Handle checkbox change
  const handleCheckboxChange = (logId) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  // Handle select all checkbox (header). pageSize is 1, so a per-page "select
  // all" would be a single row — select every filtered row across all pages so
  // this also arms the monthly regulatory export + purge dialog.
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const allLogIds = new Set();
      filteredLogs.forEach((log, globalIndex) => {
        const pageNum = Math.floor(globalIndex / pageSize) + 1;
        const indexInPage = globalIndex % pageSize;
        allLogIds.add(`${pageNum}-${indexInPage}`);
      });
      setSelectedLogs(allLogIds);
    } else {
      setSelectedLogs(new Set());
    }
  };

  // Handle refresh - reset filters and selections
  const handleRefresh = () => {
    setSearchQuery('');
    setSelectedAction('');
    setStartDate('');
    setEndDate('');
    setSortBy('desc');
    setPage(1);
    setSelectedLogs(new Set());
    fetchAuditLogs();
  };

  // Map the cross-page selection (a Set of `${page}-${index}` keys) back to the
  // actual logs in filtered order, so a selection made across several pages is
  // exported in full — not just the rows on the current page.
  const getSelectedLogsInOrder = () =>
    filteredLogs.filter((log, globalIndex) => {
      const pageNum = Math.floor(globalIndex / pageSize) + 1;
      const indexInPage = globalIndex % pageSize;
      return selectedLogs.has(`${pageNum}-${indexInPage}`);
    });

  // Build the CSV description: the general (translated) text, plus the field
  // changes as a pipe-delimited mini-table inside the cell. A CSV/Excel cell
  // cannot hold a real table, so this aligned text is the closest readable
  // equivalent — instead of the "field: 'old' → 'new'" arrow lines.
  const formatDescriptionForCsv = (log) => {
    const translated = translateDescription(log.description);
    if (!translated || translated.indexOf(CHANGE_ARROW) === -1) return translated;
    const parts = [];
    parseDescriptionSegments(translated).forEach((seg) => {
      if (seg.type === 'text') {
        const txt = seg.content.trim();
        if (txt) parts.push(txt);
      } else {
        const header = `${t('Field')} | ${t('Old Value')} | ${t('New Value')}`;
        const rowsTxt = seg.items.map(it => `${it.field} | ${it.oldValue} | ${it.newValue}`);
        parts.push([`${t('Field Changes')}:`, header, ...rowsTxt].join('\n'));
      }
    });
    return parts.join('\n');
  };

  // Handle export to CSV
  const handleExportCSV = async () => {
    try {
      // "Select all rows" was used when EVERY filtered row is selected → this is
      // the monthly regulatory backup, so the export is followed by the purge dialog.
      const isSelectAllClickExport = selectedLogs.size > 0 && selectedLogs.size === filteredLogs.length;

      // Logs to export = the full cross-page selection (persists between pages).
      let logsToExport = selectedLogs.size > 0 ? getSelectedLogsInOrder() : [];

      // Generate filename only if we have logs
      let filename = `audit_log_${new Date().getTime()}`;
      if (logsToExport.length > 0) {
        const sortedLogs = [...logsToExport].sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        const firstDate = new Date(sortedLogs[0].timestamp);
        const lastDate = new Date(sortedLogs[sortedLogs.length - 1].timestamp);
        
        const now = new Date();
        const timeStamp = now.getHours().toString().padStart(2, '0') + 
                          now.getMinutes().toString().padStart(2, '0') + 
                          now.getSeconds().toString().padStart(2, '0');
        
        const firstDateStr = `${String(firstDate.getMonth() + 1).padStart(2, '0')}_${firstDate.getFullYear()}`;
        const lastDateStr = `${String(lastDate.getMonth() + 1).padStart(2, '0')}_${lastDate.getFullYear()}`;
        
        filename = `audit_log_${firstDateStr}_to_${lastDateStr}_${timeStamp}`;
      }

      // Format logs for export
      const formattedLogs = logsToExport.map(log => ({
        Timestamp: new Date(log.timestamp).toLocaleString('he-IL'),
        Description: formatDescriptionForCsv(log),
        'User Email': log.user_email,
        'User Roles': Array.isArray(log.user_roles)
          ? log.user_roles.map(role => t(role)).join(', ')
          : t(log.user_roles || ''),
        Action: actionTranslations[log.action] || t(log.action) || log.action,
        'Source IP': log.ip_address,
        Status: log.success ? t('Success') : t('Failed'),
      }));

      // Call export utility - ALWAYS show success toast from util (never skip)
      const exportSuccess = await exportAuditToCSV(formattedLogs, t, filename, false);
      
      // ONLY if export was successful AND user clicked "Select all rows", check for purge
      if (exportSuccess && isSelectAllClickExport && selectedLogs.size === filteredLogs.length) {
        // Just get cutoff info to show in the modal, don't actually call purge API yet
        const cutoffDate = new Date(new Date().getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
        const oldLogs = auditLogs.filter(log => new Date(log.timestamp) < cutoffDate);
        
        if (oldLogs.length === 0) {
          // Show info toast ONCE - no purge needed
          setTimeout(() => {
            toast.dismiss('audit-no-old-logs');
            toast.info(
              `ℹ️ אין רשומות ישנות מ-90 ימים למחיקה. תאריך יום סף: ${cutoffDate.toLocaleDateString('he-IL')}`,
              { toastId: 'audit-no-old-logs', autoClose: 4000 }
            );
          }, 100);
        } else {
          // Set purge data and show modal - NO API CALL YET
          setPurgeData({
            record_count: oldLogs.length,
            cutoff_date: cutoffDate.toLocaleDateString('he-IL'),
            first_log_date: oldLogs.length > 0 ? new Date(oldLogs[0].timestamp).toLocaleDateString('he-IL') : 'N/A',
            last_log_date: oldLogs.length > 0 ? new Date(oldLogs[oldLogs.length - 1].timestamp).toLocaleDateString('he-IL') : 'N/A',
            logsToExport: oldLogs,
            filename: filename
          });
          setShowPurgeModal(true);
          setPurgeCheckboxChecked(false);
        }
      }
      
    } catch (error) {
      console.error('Error in handleExportCSV:', error);
      // Don't show error toast here - let export_utils.js handle all error messages
    }
  };

  // Split a raw (English) description into its non-change text and the parsed
  // field changes, so the PDF can render the changes as a real table instead of
  // the "field: 'old' → 'new'" text lines.
  const splitDescriptionForPdf = (description) => {
    const lines = String(description || '').split('\n');
    const textLines = [];
    const changes = [];
    const strip = (s) => s.replace(/^['"]+|['"]+$/g, '').trim();
    lines.forEach((line) => {
      if (line.indexOf(CHANGE_ARROW) === -1) { textLines.push(line); return; }
      const arrowCount = (line.match(/\u2192/g) || []).length;
      const tokens = arrowCount > 1 ? line.split(';') : [line];
      tokens.forEach((tok) => {
        if (tok.indexOf(CHANGE_ARROW) === -1) return;
        const clean = tok.replace(/^[\s\u2022\-*]+/, '').trim();
        const ai = clean.indexOf(CHANGE_ARROW);
        const left = clean.slice(0, ai).trim();
        const newV = clean.slice(ai + CHANGE_ARROW.length).trim();
        let field = '';
        let oldV = left;
        const ci = left.indexOf(':');
        if (ci !== -1) { field = left.slice(0, ci).trim(); oldV = left.slice(ci + 1).trim(); }
        changes.push({ field, oldValue: strip(oldV), newValue: strip(newV) });
      });
    });
    return { text: textLines.join('\n'), changes };
  };

  // Handle export to PDF
  const handleExportPDF = () => {
    try {
      // Export the full cross-page selection (persists between pages).
      const logsToExport = selectedLogs.size > 0 ? getSelectedLogsInOrder() : [];

      // Collect all field changes (keyed by row number) for the appended table.
      const changesForPdf = [];
      const selectedData = logsToExport.map((log, index) => {
        const ts = new Date(log.timestamp).toLocaleString(navigator.language || 'he-IL');
        const { text, changes } = splitDescriptionForPdf(log.description);
        changes.forEach(c => changesForPdf.push({ rowNum: index + 1, ...c }));
        return {
          // Raw (English-labelled) description without the change lines: jsPDF has no
          // RTL/bidi support, so English renders cleanly (how it worked originally);
          // the changes are shown as their own Field/Old/New table below, keyed by row #.
          [t('Timestamp')]: ts,
          [t('Description')]: text,
          [t('Action')]: actionTranslations[log.action] || t(log.action) || log.action,
          [t('User Roles')]: Array.isArray(log.user_roles) ? log.user_roles.map(role => t(role)).join(', ') : t(log.user_roles),
          [t('User Email')]: log.user_email,
          [t('IP Address')]: log.ip_address,
        };
      });

      exportAuditToPDF(selectedData, t, changesForPdf);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      showErrorToast(t, t('Failed to export to PDF'), error);
    }
  };

  // Handle select all rows across all pages
  const handleSelectAllRows = () => {
    const allLogIds = new Set();
    // Iterate through ALL filtered logs and create IDs for each page
    filteredLogs.forEach((log, globalIndex) => {
      // Calculate which page this log would be on
      const pageNum = Math.floor(globalIndex / pageSize) + 1;
      // Calculate the index within that page
      const indexInPage = globalIndex % pageSize;
      allLogIds.add(`${pageNum}-${indexInPage}`);
    });
    setSelectedLogs(allLogIds);
    // Don't show toast here - export will show success toast
  };

  // Handle confirm purge (after checkbox is checked) - performs CSV export + ZIP
  const handleConfirmPurge = async () => {
    if (!purgeCheckboxChecked) {
      toast.warning(t('Please check the safety checkbox to confirm'));
      return;
    }

    try {
      setPurgeLoading(true);
      
      // Step 1: Export logs to CSV/ZIP (skip success toast since purge has its own success message)
      if (purgeData && purgeData.logsToExport && purgeData.logsToExport.length > 0) {
        const formattedLogs = purgeData.logsToExport.map(log => ({
          Timestamp: new Date(log.timestamp).toLocaleString('he-IL'),
          Description: formatDescriptionForCsv(log),
          'User Email': log.user_email,
          'User Roles': Array.isArray(log.user_roles)
            ? log.user_roles.map(role => t(role)).join(', ')
            : t(log.user_roles || ''),
          Action: actionTranslations[log.action] || t(log.action) || log.action,
          'Source IP': log.ip_address,
          Status: log.success ? t('Success') : t('Failed'),
        }));
        
        // Use export utility with custom filename - skip success toast for purge
        const exportSuccess = await exportAuditToCSV(formattedLogs, t, purgeData.filename, true);
        if (!exportSuccess) {
          // Export failed, don't continue with purge
          setPurgeLoading(false);
          return;
        }
      }

      // Step 2: NOW call the backend to DELETE the old logs
      const purgeResponse = await axios.post('/api/purge-old-audit-logs/');
      
      if (purgeResponse.data.success) {
        // Show success message with deletion confirmation
        toast.success(
          <div>
            <div>✅ {purgeResponse.data.deleted_count} {t('audit logs exported and DELETED')}</div>
            <div style={{ marginTop: '8px' }}>📁 {t('Backup file')}: {purgeData.filename}.zip</div>
            <div style={{ marginTop: '8px' }}>�️ {t('Old records permanently removed from database')}</div>
          </div>
        );
      } else {
        showErrorToast(t, t('Purge failed'), new Error(purgeResponse.data.message || 'Unknown error'));
        return; // Don't close modal if purge failed
      }

      // Close modal and refresh
      setShowPurgeModal(false);
      setPurgeCheckboxChecked(false);
      setPurgeData(null);
      fetchAuditLogs();
      
    } catch (error) {
      console.error('Error during purge:', error);
      showErrorToast(t, t('Error during purge process'), error);
    } finally {
      setPurgeLoading(false);
    }
  };

  // Handle cancel purge
  const handleCancelPurge = () => {
    setShowPurgeModal(false);
    setPurgeCheckboxChecked(false);
    setPurgeData(null);
  };

  // Paginate filtered logs
  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(totalCount / pageSize);

  // Get page numbers to display (1, 2, 3 or 2, 3, 4, etc.)
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 3;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, page - 1);
      const endPage = Math.min(totalPages, page + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  // Jump straight to a page number (pageSize is 1, so page N == entry N).
  // Called live from the input's onChange, so it takes the raw value.
  const handleJumpToPage = (value) => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return;
    setPage(Math.min(Math.max(1, n), totalPages || 1));
  };

  // Jump the pagination to the log entry closest to a chosen time TODAY,
  // within the currently filtered + sorted set. value is "HH:MM".
  const handleJumpToTime = (value) => {
    if (!value || filteredLogs.length === 0) return;
    const [hh, mm] = value.split(':').map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return;
    const targetDate = new Date();
    targetDate.setHours(hh, mm, 0, 0);
    const target = targetDate.getTime();
    let closestIdx = 0;
    let closestDiff = Infinity;
    filteredLogs.forEach((log, i) => {
      const diff = Math.abs(new Date(log.timestamp).getTime() - target);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = i;
      }
    });
    setPage(closestIdx + 1);
  };

  if (!hasPermissionOnAuditLog) {
    return (
      <div className="audit-log-main-content">
        <Sidebar />
        <InnerPageHeader title={t('Audit Log')} />
        <div className="no-permission">
          <h2>{t('You do not have permission to view this page')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-log-main-content">
      <Sidebar />
      <InnerPageHeader title={t('Audit Log')} />

      {loading ? (
        <div className="loader">{t('Loading audit logs...')}</div>
      ) : (
        <>
          {/* Controls Section - Search and Filters */}
          <div className="filter-create-container">
            <div className="audit-log-actions">
              <button onClick={handleExportCSV} className="export-button excel-button" title={t('Export to CSV')}>
                <img src="/assets/excel-icon.png" alt="CSV" />
              </button>
              <button onClick={handleExportPDF} className="export-button pdf-button">
                <img src="/assets/pdf-icon.png" alt="PDF" />
              </button>
              <button onClick={handleSelectAllRows} className="select-all-button" title={t('Select all rows across all pages')}>
                {t('Select all rows')} <br/> {t('across all pages')}
              </button>
            </div>
            {/* Search Bar */}
            <div className="audit-log-search-group">
              <input
                type="text"
                placeholder={t('Search in description...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="audit-log-search-bar"
              />
            </div>

            {/* Filters */}
            <div className="audit-log-filters">
              <div className="filter-group">
                <label>{t('Filter by Action')}</label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="filter-select"
                >
                  <option value="">{t('All Actions')}</option>
                  {actions.map(action => (
                    <option key={action} value={action}>
                      {actionTranslations[action] || action}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>{t('Start Date')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
              </div>

              <div className="filter-group">
                <label>{t('End Date')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="audit-log-actions">
              <button onClick={handleRefresh} className="refresh-button">
                {t('Refresh')}
              </button>
            </div>
          </div>

          {/* Data Grid Section */}
          <div className="audit-log-grid-container">
            {filteredLogs.length === 0 ? (
              <div className="no-data">{t('No audit logs to display')}</div>
            ) : (
              <>
                {/* Jump controls live at the top of the grid card (between the
                    filter/actions panel above and the data rows below). They're a
                    child of the grid container, so they stretch to the table width
                    and never shift the grid's centered position. */}
                <div className="audit-jump-controls">
                  <div className="audit-jump-group">
                    <label>{t('Jump to page')}:</label>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={pageJumpInput}
                      onChange={e => { setPageJumpInput(e.target.value); handleJumpToPage(e.target.value); }}
                      className="audit-jump-input"
                    />
                  </div>
                  <div className="audit-jump-group">
                    <label>{t('Jump to time')}:</label>
                    <input
                      type="time"
                      value={timeJumpInput}
                      onChange={e => { setTimeJumpInput(e.target.value); handleJumpToTime(e.target.value); }}
                      className="audit-jump-time"
                    />
                  </div>
                </div>
                <table className="audit-log-data-grid">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox" className='audit-checkbox'
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          checked={selectedLogs.size > 0 && selectedLogs.size === filteredLogs.length}
                        />
                      </th>
                      <th>
                        {t('Timestamp')}
                        <button
                          className="sort-button"
                          onClick={() => setSortBy(sortBy === 'desc' ? 'asc' : 'desc')}
                        >
                          {sortBy === 'desc' ? '▼' : '▲'}
                        </button>
                      </th>
                      <th>{t('Description')}</th>
                      <th>{t('User Roles')}</th>
                      <th>{t('Source IP')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="checkbox" className='audit-checkbox'
                            checked={selectedLogs.has(`${page}-${index}`)}
                            onChange={() => handleCheckboxChange(`${page}-${index}`)}
                          />
                        </td>
                        <td className="timestamp-column">
                          {new Date(log.timestamp).toLocaleString(navigator.language || 'he-IL')}
                        </td>
                        <td className="description-column">{renderDescriptionCell(log)}</td>
                        <td className="description-column">
                          {Array.isArray(log.user_roles) 
                            ? log.user_roles.map(role => t(role)).join(', ')
                            : t(log.user_roles)
                          }
                        </td>
                        <td className="ip-column">{log.ip_address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="pagination">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1 || totalPages <= 1}
                    className="pagination-arrow"
                  >
                    &laquo;
                  </button>
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1 || totalPages <= 1}
                    className="pagination-arrow"
                  >
                    &lsaquo;
                  </button>

                  {getPageNumbers().map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={page === pageNum ? 'active' : ''}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages || totalPages <= 1}
                    className="pagination-arrow"
                  >
                    &rsaquo;
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages || totalPages <= 1}
                    className="pagination-arrow"
                  >
                    &raquo;
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Purge Modal */}
      {showPurgeModal && purgeData && (
        <div className="modal-overlay">
          <div className="modal-content purge-modal">
            <div className="modal-header">
              <h2>� {t('Export Old Audit Logs')}</h2>
              <button className="modal-close" onClick={handleCancelPurge}>✕</button>
            </div>

            <div className="modal-body">
              <div className="purge-info-section">
                <h3>{t('Data Summary')}</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">{t('Records to Export')}:</span>
                    <span className="value">{purgeData.record_count}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('Date Range')}:</span>
                    <span className="value">{purgeData.first_log_date} → {purgeData.last_log_date}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('Cutoff Date (90 days)')}:</span>
                    <span className="value highlight">{purgeData.cutoff_date}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('Export Filename')}:</span>
                    <span className="value filename">{purgeData.filename}</span>
                  </div>
                </div>
              </div>

              <div className="warning-section">
                <h3>⚠️ {t('Important Information')}</h3>
                <ul className="warning-list">
                  <li>{t('All data will be exported to CSV and zipped before deletion')}</li>
                  <li>{t('Check the 1st and last items in the CSV to verify the correct date range')}</li>
                  <li>{t('The exported dates MUST match the filename dates shown above')}</li>
                  <li>{t('Only logs OLDER than 90 days will be affected')}</li>
                  <li>
                    <strong>{t('Upload the exported ZIP to Google Drive immediately for backup')}</strong>
                  </li>
                  <li>{t('The filename includes the exact export timestamp for audit purposes')}</li>
                </ul>
              </div>

              <div className="checkbox-section">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={purgeCheckboxChecked}
                    onChange={(e) => setPurgeCheckboxChecked(e.target.checked)}
                    className="safety-checkbox"
                  />
                  <span className="checkbox-text">
                    {t('I understand that this action will permanently delete')} {purgeData.record_count} {t('audit log records older than 90 days. I have saved the exported CSV as backup.')}
                  </span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={handleCancelPurge}
                disabled={purgeLoading}
              >
                {t('Cancel')}
              </button>
              <button 
                className="btn audit-btn-danger"
                onClick={handleConfirmPurge}
                disabled={!purgeCheckboxChecked || purgeLoading}
              >
                {purgeLoading ? t('Processing...') : `✓ ${t('Export & Purge')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;