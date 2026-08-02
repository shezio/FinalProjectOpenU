import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/exportperiodpicker.css';

// Hebrew month names (full) — index 0 = January.
const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

// Self-contained "ייצוא לאקסל" control. The trigger button opens a small modal
// (month + year pickers, then Export / Cancel), reusing the app's existing modal
// pattern (see .pettycash-modal). The pickers default to "all" (empty), so an
// export without choosing a period includes everything. On export the chosen
// year/month are handed to the parent via onExport(year, month) — the parent
// does the actual filtering + XLSX write.
const ExportPeriodPicker = ({ onExport, years, label = 'ייצוא לאקסל', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');

  const currentYear = new Date().getFullYear();
  const yearOptions = (years && years.length)
    ? years
    : Array.from({ length: 6 }, (_, i) => currentYear - i);

  const handleExport = () => {
    onExport(year, month);
    setOpen(false);
  };

  return (
    <>
      <button className="export-period-trigger" disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && createPortal(
        <div className="export-period-modal-overlay" onClick={() => setOpen(false)}>
          <div className="export-period-modal" onClick={e => e.stopPropagation()}>
            <button className="export-period-modal-close" onClick={() => setOpen(false)}>✕</button>
            <h2>ייצוא לאקסל</h2>
            <p className="export-period-modal-hint">בחר חודש ושנה לייצוא, או השאר “הכל” לייצוא כל הנתונים.</p>

            <div className="export-period-field">
              <label>חודש</label>
              <select value={month} onChange={e => setMonth(e.target.value)}>
                <option value="">כל החודשים</option>
                {HE_MONTHS.map((nm, i) => <option key={i + 1} value={i + 1}>{nm}</option>)}
              </select>
            </div>

            <div className="export-period-field">
              <label>שנה</label>
              <select value={year} onChange={e => setYear(e.target.value)}>
                <option value="">כל השנים</option>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="export-period-modal-actions">
              <button className="btn-primary" onClick={handleExport}>ייצוא</button>
              <button className="btn-secondary" onClick={() => setOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ExportPeriodPicker;
