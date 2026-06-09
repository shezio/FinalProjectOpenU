import React, { useEffect, useState, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/notificationMessages.css';
import axios from '../axiosConfig';
import { toast } from 'react-toastify';
import { showErrorToast } from '../components/toastUtils';
import EmojiPicker from 'emoji-picker-react';

const TYPE_LABELS = {
  birthday_today:     '🎂 יום הולדת היום',
  birthday_this_week: '🎂 יום הולדת השבוע',
  birthday_next_week: '🎂 יום הולדת השבוע הבא',
  custom_auto:        '⚡ אוטומטית',
  manual:             '✏️ ידנית',
};

const TYPE_BADGE_CLASS = {
  birthday_today:     'badge-birthday-today',
  birthday_this_week: 'badge-birthday-this-week',
  birthday_next_week: 'badge-birthday-week',
  custom_auto:        'badge-custom',
  manual:             'badge-manual',
};

const EMPTY_FORM = { title: '', text: '', message_type: 'manual' };
const PAGE_SIZE = 3;

const NotificationMessages = () => {
  const staff    = JSON.parse(localStorage.getItem('staff') || '[]');
  const origUser = localStorage.getItem('origUsername') || '';
  const current  = staff.find(s => s.username === origUser);
  const roles    = current?.roles || [];
  const isAdmin  = roles.includes('System Administrator');

  const [messages,     setMessages]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [editingId,    setEditingId]    = useState(null);
  const [editForm,     setEditForm]     = useState({});
  const [showCreate,   setShowCreate]   = useState(false);
  const [createForm,   setCreateForm]   = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filterType,   setFilterType]   = useState('');
  const [filterActive, setFilterActive] = useState('true');
  const [search,       setSearch]       = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);

  // Insert emoji at cursor position inside the create-form textarea
  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji;
    const el = textareaRef.current;
    if (!el) { setCreateForm(f => ({ ...f, text: f.text + emoji })); return; }
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    const newText = el.value.slice(0, start) + emoji + el.value.slice(end);
    setCreateForm(f => ({ ...f, text: newText }));
    // restore cursor right after the inserted emoji
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      // Management page uses /templates/ — only the DB rows, no virtual per-child rows
      const res = await axios.get('/api/notifications/templates/');
      setMessages(res.data.results || []);
    } catch (err) {
      showErrorToast('שגיאה בטעינת הודעות');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const visible = messages.filter(m => {
    if (filterType   && m.message_type !== filterType)   return false;
    if (filterActive === 'true'  && !m.is_active)        return false;
    if (filterActive === 'false' &&  m.is_active)        return false;
    if (search && !m.title.includes(search) && !m.text.includes(search)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = () => setCurrentPage(1);

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.text.trim()) { toast.warn('יש למלא כותרת ותוכן'); return; }
    setSaving(true);
    try {
      await axios.post('/api/notifications/create/', createForm);
      toast.success('הודעה נוצרה בהצלחה');
      setShowCreate(false); setCreateForm(EMPTY_FORM); fetchMessages();
    } catch (err) { showErrorToast(err.response?.data?.error || 'שגיאה ביצירת הודעה'); }
    finally { setSaving(false); }
  };

  const startEdit  = (msg) => { setEditingId(msg.id); setEditForm({ title: msg.title, text: msg.text, is_active: msg.is_active }); };
  const cancelEdit = ()    => { setEditingId(null); setEditForm({}); };

  const handleSave = async (id) => {
    setSaving(true);
    try {
      await axios.put(`/api/notifications/update/${id}/`, editForm);
      toast.success('הודעה עודכנה'); setEditingId(null); fetchMessages();
    } catch (err) { showErrorToast(err.response?.data?.error || 'שגיאה בעדכון'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('למחוק הודעה זו לצמיתות?')) return;
    try {
      await axios.delete(`/api/notifications/delete/${id}/`);
      toast.success('הודעה נמחקה'); fetchMessages();
    } catch (err) { showErrorToast(err.response?.data?.error || 'שגיאה במחיקה'); }
  };

  const handleRefreshBirthdays = async () => {
    setRefreshing(true);
    try {
      await fetchMessages();
    } catch (err) { showErrorToast('שגיאה ברענון'); }
    finally { setRefreshing(false); }
  };

  const renderRow = (msg) => {
    const isEditing = editingId === msg.id;
    return (
      <tr key={msg.id} className={`notif-row${msg.is_active ? '' : ' notif-row-inactive'}`}>
        <td><span className={`notif-badge ${TYPE_BADGE_CLASS[msg.message_type] || ''}`}>{TYPE_LABELS[msg.message_type] || msg.message_type}</span></td>
        <td>
          {isEditing
            ? <input className="notif-edit-input" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            : <span style={{ whiteSpace: 'pre-wrap' }}>{msg.title}</span>}
        </td>
        <td className="notif-col-text">
          {isEditing
            ? <textarea className="notif-edit-textarea" value={editForm.text} onChange={e => setEditForm(f => ({ ...f, text: e.target.value }))} />
            : <span className="notif-text-full">{msg.text}</span>}
        </td>
        <td>
          {isEditing
            ? <select value={editForm.is_active ? 'true' : 'false'} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                <option value="true">פעיל</option><option value="false">לא פעיל</option>
              </select>
            : <span className={`notif-status ${msg.is_active ? 'notif-status-active' : 'notif-status-inactive'}`}>{msg.is_active ? 'פעיל' : 'לא פעיל'}</span>}
        </td>
        <td className="notif-date-col">
          {msg.created_at ? new Date(msg.created_at).toLocaleString('he-IL') : '—'}
        </td>
        {isAdmin && (
          <td className="notif-actions-col">
            {isEditing ? (
              <><button className="notif-btn notif-btn-save" onClick={() => handleSave(msg.id)} disabled={saving}>שמור</button>
                <button className="notif-btn notif-btn-cancel" onClick={cancelEdit}>ביטול</button></>
            ) : (
              <>{!msg.is_auto && <button className="notif-btn notif-btn-edit" onClick={() => startEdit(msg)}>עריכה</button>}
                <button className="notif-btn notif-btn-delete" onClick={() => handleDelete(msg.id)}>מחיקה</button></>
            )}
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="notif-main-content">
      <Sidebar />
      <InnerPageHeader title="מרכז העדכונים" />

      <div className="notif-controls">
        {isAdmin && (
          <>
            <button className="notif-create-btn" onClick={() => setShowCreate(true)}>+ הודעה חדשה</button>
            <button className="notif-refresh-btn" onClick={handleRefreshBirthdays} disabled={refreshing}
              title="רענן ימי הולדת (מתבצע אוטומטית כל שעה)">
              {refreshing ? 'מרענן…' : 'רענן'}
            </button>
          </>
        )}
        <select value={filterType} onChange={e => { setFilterType(e.target.value); resetPage(); }} className="notif-filter-select">
          <option value="">כל הסוגים</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterActive} onChange={e => { setFilterActive(e.target.value); resetPage(); }} className="notif-filter-select">
          <option value="">כל הסטטוסים</option>
          <option value="true">פעיל</option>
          <option value="false">לא פעיל</option>
        </select>
        <input type="text" placeholder="חיפוש…" value={search} onChange={e => { setSearch(e.target.value); resetPage(); }} className="notif-search-input" />
      </div>

      <div className="notif-summary">סה״כ {visible.length} הודעות{filterType || filterActive !== '' || search ? ' (מסוננות)' : ''}</div>

      {showCreate && (
        <div className="notif-modal-overlay" onClick={() => { setShowCreate(false); setShowEmojiPicker(false); }}>
          <div className="notif-modal" onClick={e => e.stopPropagation()}>
            <button className="notif-modal-close" onClick={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); setShowEmojiPicker(false); }}>✕</button>
            <h3>הודעה חדשה</h3>
            <div className="notif-form-row">
              <label>סוג הודעה</label>
              <select value={createForm.message_type} onChange={e => setCreateForm(f => ({ ...f, message_type: e.target.value }))}>
                <option value="manual">✏️ ידנית</option>
                <option value="custom_auto">⚡ אוטומטית מותאמת</option>
              </select>
            </div>
            <div className="notif-form-row">
              <label>כותרת *</label>
              <input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="כותרת הודעה" />
            </div>
            <div className="notif-form-row">
              <label>תוכן *</label>
              <div className="notif-text-input-wrap">
                <textarea
                  ref={textareaRef}
                  value={createForm.text}
                  onChange={e => setCreateForm(f => ({ ...f, text: e.target.value }))}
                  onClick={() => setShowEmojiPicker(false)}
                  placeholder="תוכן ההודעה"
                  rows={4}
                />
                <button
                  type="button"
                  className="notif-emoji-toggle"
                  onClick={() => setShowEmojiPicker(v => !v)}
                  title="הוסף אמוג׳י"
                >😊</button>
                {showEmojiPicker && (
                  <div className="notif-emoji-picker-wrap">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      searchPlaceholder="חיפוש…"
                      locale="he"
                      height={380}
                      width={460}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="notif-modal-actions">
              <button className="notif-btn notif-btn-save" onClick={handleCreate} disabled={saving}>{saving ? 'שומר…' : 'צור הודעה'}</button>
              <button className="notif-btn notif-btn-cancel" onClick={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); setShowEmojiPicker(false); }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="notif-loading">טוען הודעות…</div>
      ) : visible.length === 0 ? (
        <div className="notif-empty">אין הודעות להצגה</div>
      ) : (
        <div className="notif-table-wrapper">
          <table className="notif-table">
            <thead>
              <tr>
                <th>סוג</th><th>כותרת</th><th className="notif-col-text">תוכן</th><th>סטטוס</th><th>תאריך יצירה</th>
                {isAdmin && <th>פעולות</th>}
              </tr>
            </thead>
            <tbody>{paginated.map(renderRow)}</tbody>
          </table>

          {/* Pagination — always visible */}
          <div className="pagination">
              <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} className="pagination-arrow">&laquo;</button>
              <button onClick={() => setCurrentPage(safePage - 1)} disabled={safePage === 1} className="pagination-arrow">&lsaquo;</button>
              {Array.from({ length: totalPages }, (_, i) => {
                const pageNum = i + 1;
                const maxButtons = 5;
                const halfRange = Math.floor(maxButtons / 2);
                let start = Math.max(1, safePage - halfRange);
                let end = Math.min(totalPages, start + maxButtons - 1);
                if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
                return pageNum >= start && pageNum <= end ? (
                  <button key={pageNum} className={safePage === pageNum ? 'active' : ''} onClick={() => setCurrentPage(pageNum)}>
                    {pageNum}
                  </button>
                ) : null;
              })}
              <button onClick={() => setCurrentPage(safePage + 1)} disabled={safePage === totalPages} className="pagination-arrow">&rsaquo;</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} className="pagination-arrow">&raquo;</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMessages;
