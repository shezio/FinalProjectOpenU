import React, { useState, useEffect, useCallback } from 'react';
import axios from '../axiosConfig';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { showErrorToast, showWarningToast } from '../components/toastUtils';
import { useTranslation } from 'react-i18next';
import { hasUpdatePermissionForTable, isGuestUser, hasAllPermissions } from '../components/utils';
import hospitals from '../components/hospitals.json';
import '../styles/common.css';
import '../styles/reviewer.css';
import '../i18n';
import { useNavigate, useLocation } from 'react-router-dom';

const REVIEW_TASK_TYPE_NAME = 'שיחת ביקורת';

const STATUS_OPTIONS = [
  { value: '', label: 'כל הסטטוסים' },
  { value: 'לא הושלמה', label: 'לא הושלמה' },
  { value: 'בביצוע',    label: 'בביצוע'    },
  { value: 'הושלמה',    label: 'הושלמה'    },
];

const STATUS_UPDATE_OPTIONS = [
  { value: 'לא הושלמה', label: 'לא הושלמה' },
  { value: 'בביצוע',    label: 'בביצוע'    },
  { value: 'הושלמה',   label: 'הושלמה'   },
];

const ReviewerPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const canEditFamily = hasUpdatePermissionForTable('children');
  const canUpdateTask = hasUpdatePermissionForTable('tasks');
  const isAdmin = hasAllPermissions([
    { resource: 'childsmile_app_staff', action: 'VIEW' },
    { resource: 'childsmile_app_staff', action: 'UPDATE' },
  ]);

  const incomingFamily = location.state?.family || '';

  const [tasks,           setTasks]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [childNameFilter, setChildNameFilter] = useState(incomingFamily);
  const [statusFilter,    setStatusFilter]    = useState('');

  // Clear nav state after reading it
  useEffect(() => {
    if (incomingFamily) {
      setChildNameFilter(incomingFamily);
      navigate(location.pathname, { replace: true, state: {} });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Status update modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [taskToUpdate,      setTaskToUpdate]      = useState(null);
  const [selectedStatus,    setSelectedStatus]    = useState('');

  // Family edit modal
  const [editFamily,   setEditFamily]   = useState(null);
  const [familyData,   setFamilyData]   = useState([]);
  const [newFamily,    setNewFamily]    = useState({});
  const [errors,       setErrors]       = useState({});
  const [maritalStatuses,  setMaritalStatuses]  = useState([]);
  const [tutoringStatuses, setTutoringStatuses] = useState([]);
  const statuses = ['טיפולים','מעקבים','אחזקה','ז״ל','בריא','עזב'];
  const [streets,               setStreets]               = useState([]);
  const [settlementsAndStreets, setSettlementsAndStreets] = useState({});
  const [availableCoordinators, setAvailableCoordinators] = useState([]);
  const [autoAssignedCoordinator, setAutoAssignedCoordinator] = useState(null);

  // Info modal for family details (read-only)
  const [selectedFamily, setSelectedFamily] = useState(null);

  // Assign task modal (admin only)
  const [isAssignModalOpen, setIsAssignModalOpen]   = useState(false);
  const [taskToAssign,      setTaskToAssign]         = useState(null);
  const [staffOptions,      setStaffOptions]         = useState([]);
  const [selectedAssignee,  setSelectedAssignee]     = useState(null);

  // ── Bulk selection (persists across pages) ───────────────────────────────
  const [selectedTaskIds,  setSelectedTaskIds]  = useState(new Set());
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkAssignee,     setBulkAssignee]     = useState(null);
  const [bulkProgress,     setBulkProgress]     = useState(null); // {done,total} or null

  const toggleTaskSelection = (id) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePageSelection = () => {
    const pageIds = paginatedTasks.map(t => t.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedTaskIds.has(id));
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (allSelected) { pageIds.forEach(id => next.delete(id)); }
      else             { pageIds.forEach(id => next.add(id)); }
      return next;
    });
  };

  const clearSelection = () => setSelectedTaskIds(new Set());

  // Send in small batches to avoid overwhelming the backend
  const BATCH_SIZE   = 3;
  const BATCH_DELAY  = 300; // ms between batches

  const handleBulkAssignConfirm = async () => {
    if (!bulkAssignee) return;
    const ids = [...selectedTaskIds];
    setBulkProgress({ done: 0, total: ids.length });
    let done = 0;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const rawDate = task.due_date || '';
        const formattedDueDate = /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)
          ? rawDate.split('/').reverse().join('-') : rawDate;
        try {
          await axios.put(`/api/tasks/update/${id}/`, {
            explanation: task.explanation || task.description || '',
            due_date:    formattedDueDate,
            assigned_to: bulkAssignee.value,
            type:        task.type,
            child:       task.child,
            tutor:       task.tutor,
          });
        } catch { /* silent — show final count */ }
      }));
      done += batch.length;
      setBulkProgress({ done, total: ids.length });
      if (i + BATCH_SIZE < ids.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY));
      }
    }
    toast.success(`שויכו ${done} משימות ל-${bulkAssignee.label}`);
    setIsBulkAssignOpen(false);
    setBulkAssignee(null);
    setBulkProgress(null);
    clearSelection();
    fetchTasks();
  };

  const fetchStaff = useCallback(async () => {
    try {
      const res = await axios.get('/api/get_all_staff/', { params: { page: 1, page_size: 10000 } });
      const list = (res.data.staff || [])
        .filter(u => u.is_active && u.username !== 'guest_demo')
        .map(u => ({ value: u.username, label: `${u.first_name} ${u.last_name}` }));
      setStaffOptions(list);
    } catch { /* ignore */ }
  }, []);

  const hospitalsList = hospitals.map(h => h.trim()).filter(Boolean);

  const preprocessSettlements = useCallback((data) => {
    if (!data || typeof data !== 'object') return {};
    const out = {};
    Object.keys(data).forEach(k => { out[k.trim()] = data[k]; });
    return out;
  }, []);

  const processedSettlementsAndStreets = preprocessSettlements(settlementsAndStreets);
  const cityOptions   = Object.keys(processedSettlementsAndStreets).map(c => ({ value: c, label: c }));
  const streetOptions = streets.map(s => ({ value: s, label: s }));

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/tasks/', {
        params: {
          date_field: 'created_at',
          start_date: '2000-01-01',
          end_date: new Date().toISOString().slice(0, 10),
        },
      });
      const allTasks = res.data?.tasks      || [];
      const allTypes = res.data?.task_types || [];
      const reviewTypeId = allTypes.find(ty => ty.name === REVIEW_TASK_TYPE_NAME)?.id;

      // 3 months ago threshold
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const reviewTasks = (reviewTypeId
        ? allTasks.filter(tk => tk.type === reviewTypeId)
        : allTasks.filter(tk => tk.type_name === REVIEW_TASK_TYPE_NAME)
      ).filter(tk => {
        // Include all completed tasks, or tasks where last conducted talk was 3+ months ago (or never)
        if (tk.status === 'הושלמה') return true;
        const dateStr = tk.child_last_review_talk_conducted;
        if (!dateStr) return true;
        // Parse DD/MM/YYYY or YYYY-MM-DD
        let d;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          const [day, month, year] = dateStr.split('/');
          d = new Date(`${year}-${month}-${day}`);
        } else {
          d = new Date(dateStr);
        }
        return isNaN(d.getTime()) || d <= threeMonthsAgo;
      });

      setTasks(reviewTasks);
    } catch (err) {
      showErrorToast(t, 'שגיאה בטעינת משימות', err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchFamilyData = useCallback(async () => {
    try {
      const res = await axios.get('/api/get_complete_family_details/');
      setFamilyData(res.data?.families || []);
      setMaritalStatuses((res.data?.marital_statuses  || []).map(i => i.status));
      setTutoringStatuses((res.data?.tutoring_statuses || []).map(i => i.status));
    } catch { /* ignore */ }
  }, []);

  const fetchCoordinators = useCallback(async () => {
    try {
      const res = await axios.get('/api/get_available_coordinators/');
      const all = [...(res.data?.families_coordinators || []), ...(res.data?.tutored_coordinators || [])];
      setAvailableCoordinators(all);
    } catch { /* ignore */ }
  }, []);

  const fetchSettlements = useCallback(async () => {
    try {
      const res = await axios.get('/api/settlements/');
      setSettlementsAndStreets(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchFamilyData();
    fetchCoordinators();
    fetchSettlements();
    if (isAdmin) fetchStaff();
  }, [fetchTasks, fetchFamilyData, fetchCoordinators, fetchSettlements, fetchStaff, isAdmin]);

  // Pagination
  const [page, setPage]           = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 3;

  // Filtered rows
  const filteredTasks = tasks.filter(tk => {
    const nameMatch = !childNameFilter.trim() ||
      (tk.child_name || tk.related_child_name || '').toLowerCase().includes(childNameFilter.trim().toLowerCase()) ||
      (tk.description || '').toLowerCase().includes(childNameFilter.trim().toLowerCase());
    const statusMatch = !statusFilter || tk.status === statusFilter;
    return nameMatch && statusMatch;
  });

  // Reset page when filters change
  useEffect(() => {
    setTotalCount(filteredTasks.length);
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childNameFilter, statusFilter, tasks]);

  const paginatedTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  // Status update
  const openStatusModal = (task) => {
    setTaskToUpdate(task);
    setSelectedStatus(task.status);
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedStatus || !taskToUpdate) return;
    try {
      await axios.put(`/api/tasks/update-status/${taskToUpdate.id}/`, { status: selectedStatus });
      toast.success('סטטוס עודכן');
      setIsStatusModalOpen(false);
      fetchTasks();
    } catch (err) {
      showErrorToast(t, 'שגיאה בעדכון סטטוס', err);
    }
  };

  // Assign task (admin only)
  const openAssignModal = (task) => {
    setTaskToAssign(task);
    const current = staffOptions.find(o => o.value === task.assignee) || null;
    setSelectedAssignee(current);
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedAssignee || !taskToAssign) return;
    try {
      const rawDate = taskToAssign.due_date || '';
      const formattedDueDate = /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)
        ? rawDate.split('/').reverse().join('-')
        : rawDate;
      await axios.put(`/api/tasks/update/${taskToAssign.id}/`, {
        explanation: taskToAssign.explanation || taskToAssign.description || '',
        due_date:    formattedDueDate,
        assigned_to: selectedAssignee.value,
        type:        taskToAssign.type,
        child:       taskToAssign.child,
        tutor:       taskToAssign.tutor,
      });
      toast.success('המשימה שויכה בהצלחה');
      setIsAssignModalOpen(false);
      fetchTasks();
    } catch (err) {
      showErrorToast(t, 'שגיאה בשיוך משימה', err);
    }
  };

  // Family edit modal helpers
  const formatDateForInput = (date) => {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [d, m, y] = date.split('/'); return `${y}-${m}-${d}`;
    }
    return '';
  };

  const handleAddFamilyChange = (e) => {
    const { name, value } = e.target;
    const TREATMENT_COMPLETION_STATUSES = ['מעקבים', 'אחזקה', 'בריא'];
    const todayStr = new Date().toISOString().split('T')[0];
    setNewFamily(prev => {
      const updates = { [name]: value };
      if (name === 'status' && TREATMENT_COMPLETION_STATUSES.includes(value) && prev.status === 'טיפולים') {
        updates.when_completed_treatments = todayStr;
      }
      return { ...prev, ...updates };
    });
    if (name === 'city') setStreets(processedSettlementsAndStreets[value.trim()] || []);
  };

  const openFamilyEditModal = (task) => {
    const childId = task.child;
    if (!childId) { showWarningToast(t, 'אין ילד משויך למשימה זו', ''); return; }
    const family = familyData.find(f => String(f.id) === String(childId));
    if (!family) { showWarningToast(t, 'לא נמצאו פרטי משפחה', ''); return; }
    const parts     = family.street_and_apartment_number ? family.street_and_apartment_number.split(' ') : ['',''];
    const aptNumber = parts.pop();
    const street    = parts.join(' ');
    setStreets(processedSettlementsAndStreets[(family.city || '').trim()] || []);
    setAutoAssignedCoordinator(null);
    setErrors({});
    setNewFamily({
      child_id:                          family.id?.toString() || '',
      childfirstname:                    family.first_name || '',
      childsurname:                      family.last_name  || '',
      gender:                            family.gender ? 'נקבה' : 'זכר',
      city:                              family.city || '',
      street,
      apartment_number:                  aptNumber || '',
      child_phone_number:                family.child_phone_number || '',
      treating_hospital:                 family.treating_hospital  || '',
      date_of_birth:                     formatDateForInput(family.date_of_birth),
      registration_date:                 formatDateForInput(family.registration_date),
      marital_status:                    family.marital_status || '',
      num_of_siblings:                   family.num_of_siblings !== undefined ? family.num_of_siblings.toString() : '0',
      details_for_tutoring:              family.details_for_tutoring || '',
      tutoring_status:                   family.tutoring_status || '',
      medical_diagnosis:                 family.medical_diagnosis || '',
      diagnosis_date:                    formatDateForInput(family.diagnosis_date),
      additional_info:                   family.additional_info || '',
      is_in_frame:                       family.is_in_frame || '',
      coordinator_comments:              family.coordinator_comments || '',
      current_medical_state:             family.current_medical_state || '',
      when_completed_treatments:         formatDateForInput(family.when_completed_treatments),
      father_name:                       family.father_name  || '',
      father_phone:                      family.father_phone || '',
      mother_name:                       family.mother_name  || '',
      mother_phone:                      family.mother_phone || '',
      expected_end_treatment_by_protocol: formatDateForInput(family.expected_end_treatment_by_protocol),
      has_completed_treatments:          family.has_completed_treatments || false,
      status:                            family.status || 'טיפולים',
      responsible_coordinator:           family.responsible_coordinator || '',
      need_review:                       family.need_review !== undefined ? family.need_review : true,
    });
    setEditFamily(family);
  };

  const closeEditModal = () => { setEditFamily(null); setErrors({}); };
  const formatStatus = (s) => (s || '---').replace(/_/g, ' ');

  // Info modal helpers
  const openFamilyInfoModal = (task) => {
    const childId = task.child;
    if (!childId) { showWarningToast(t, 'אין ילד משויך למשימה זו', ''); return; }
    const family = familyData.find(f => String(f.id) === String(childId));
    if (!family) { showWarningToast(t, 'לא נמצאו פרטי משפחה', ''); return; }
    setSelectedFamily(family);
  };

  const closeFamilyDetails = () => {
    setSelectedFamily(null);
  };

  const validateFamilyForm = () => {
    const errs = {};
    if (!newFamily.child_id || isNaN(newFamily.child_id) || newFamily.child_id.toString().length !== 9) errs.child_id = 'מספר זהות חייב להיות 9 ספרות';
    if (!newFamily.childfirstname) errs.childfirstname = 'שם פרטי הוא שדה חובה';
    if (!newFamily.childsurname)   errs.childsurname   = 'שם משפחה הוא שדה חובה';
    if (!newFamily.city)           errs.city           = 'עיר היא שדה חובה';
    if (!newFamily.street)         errs.street         = 'רחוב הוא שדה חובה';
    if (!newFamily.apartment_number?.toString().trim()) errs.apartment_number = 'מספר דירה הוא שדה חובה';
    if (!newFamily.treating_hospital) errs.treating_hospital = 'בית חולים הוא שדה חובה';
    if (!newFamily.date_of_birth)     errs.date_of_birth     = 'תאריך לידה הוא שדה חובה';
    if (!newFamily.marital_status)    errs.marital_status    = 'מצב משפחתי הוא שדה חובה';
    if (!newFamily.num_of_siblings || isNaN(newFamily.num_of_siblings)) errs.num_of_siblings = 'מספר אחים חייב להיות מספר';
    if (!newFamily.tutoring_status)   errs.tutoring_status   = 'סטטוס חונכות הוא שדה חובה';
    if (!newFamily.status)            errs.status            = 'סטטוס הוא שדה חובה';
    const fp = newFamily.father_phone ? newFamily.father_phone.replace(/\D/g,'') : '';
    const mp = newFamily.mother_phone ? newFamily.mother_phone.replace(/\D/g,'') : '';
    if (!fp && !mp) { errs.father_phone = 'יש לספק לפחות מספר טלפון אחד של הורה'; errs.mother_phone = 'יש לספק לפחות מספר טלפון אחד של הורה'; }
    if (!newFamily.responsible_coordinator) errs.responsible_coordinator = 'רכז אחראי הוא שדה חובה';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEditFamilySubmit = async (e) => {
    e.preventDefault();
    if (!validateFamilyForm()) return;
    const combinedStreet = `${newFamily.street} ${newFamily.apartment_number}`;
    const payload = { ...newFamily, street_and_apartment_number: combinedStreet };
    try {
      await axios.put(`/api/update_family/${editFamily.id}/`, payload);
      toast.success('פרטי המשפחה עודכנו בהצלחה');
      setEditFamily(null);
      fetchFamilyData();
    } catch (err) {
      showErrorToast(t, 'שגיאה בעדכון משפחה', err);
    }
  };

  // Helper: get child full name from familyData
  const getChildName = (task) => {
    if (task.child) {
      const fam = familyData.find(f => String(f.id) === String(task.child));
      if (fam) return `${fam.first_name || ''} ${fam.last_name || ''}`.trim();
    }
    return task.child_name || task.related_child_name || '---';
  };

  // Helper: get tutor name from task
  const getTutorName = (task) => {
    if (task.tutee_match_info?.tutor_name) return task.tutee_match_info.tutor_name;
    return '---';
  };

  const getRowBgColor = (dueDateStr, status) => {
    if (status === 'הושלמה') return '#eaf6ed';
    return '';
  };

  return (
    <div className="reviewers-main-content">
      <Sidebar />
      <div className="reviewers-content">
        <InnerPageHeader title="שיחות ביקורת" />

        {/* Filters */}
        <div className="reviewers-filter-bar">
          <input
            className="reviewers-search-input"
            type="text"
            placeholder="חיפוש לפי שם משפחה / ילד..."
            value={childNameFilter}
            onChange={e => setChildNameFilter(e.target.value)}
          />
          <select
            className="reviewers-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="reviewers-btn-refresh" onClick={() => fetchTasks()}>רענן</button>
        </div>

        {loading ? (
          <div className="loader">טוען נתונים...</div>
        ) : (
          <>
          {/* Bulk action bar — visible when tasks are selected */}
          {selectedTaskIds.size > 0 && isAdmin && (
            <div className="reviewer-bulk-bar">
              <span className="reviewer-bulk-bar__count">
                {selectedTaskIds.size} משימות נבחרו
              </span>
              <button
                className="reviewer-btn-action reviewer-btn-assign"
                onClick={() => { setBulkAssignee(null); setIsBulkAssignOpen(true); }}
              >
                שייך לעובד
              </button>
              <button
                className="reviewer-btn-action reviewer-btn-cancel"
                onClick={clearSelection}
              >
                בטל בחירה
              </button>
            </div>
          )}
          <div className="reviewers-grid-container">
            <table className="reviewers-data-grid">
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        title="בחר/בטל בחירה לכל הדף"
                        checked={paginatedTasks.length > 0 && paginatedTasks.every(t => selectedTaskIds.has(t.id))}
                        onChange={togglePageSelection}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                    </th>
                  )}
                  <th>שם ילד</th>
                  <th>פרטי משימה</th>
                  <th>לבצע עד</th>
                  <th>שיחה אחרונה</th>
                  <th>סטטוס</th>
                  <th>לביצוע ע"י</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr><td colSpan={7} className="reviewers-no-data">אין משימות להצגה</td></tr>
                ) : (
                  paginatedTasks.map(task => {
                    const childName = getChildName(task);
                    const isCompleted = task.status === 'הושלמה';
                    return (
                      <tr key={task.id}>
                        {isAdmin && (
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <input
                              type="checkbox"
                              checked={selectedTaskIds.has(task.id)}
                              onChange={() => toggleTaskSelection(task.id)}
                              style={{ width: 18, height: 18, cursor: 'pointer' }}
                            />
                          </td>
                        )}
                        <td>{childName}</td>
                        <td>
                          <div className="reviewer-task-details">
                            <div><strong>נוצרה:</strong> {task.created}</div>
                            <div><strong>עודכנה:</strong> {task.updated}</div>
                            {task.father_name && <div><strong>אב:</strong> {task.father_name}{task.father_phone ? ` | ${task.father_phone}` : ''}</div>}
                            {task.mother_name && <div><strong>אם:</strong> {task.mother_name}{task.mother_phone ? ` | ${task.mother_phone}` : ''}</div>}
                          </div>
                        </td>
                        <td>{task.due_date || '---'}</td>
                        <td>{task.child_last_review_talk_conducted || '---'}</td>
                        <td>
                          <span className={`reviewer-status-badge reviewer-status-${
                            isCompleted ? 'done' : task.status === 'בביצוע' ? 'inprog' : 'pending'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td>{(task.assignee || '').replace(/_/g, ' ')}</td>
                        <td className="reviewer-actions-cell">
                          {canUpdateTask && !isCompleted && (
                            <button
                              className="reviewer-btn-action reviewer-btn-status"
                              disabled={isGuestUser()}
                              onClick={() => openStatusModal(task)}
                            >
                              עדכן סטטוס
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="reviewer-btn-action reviewer-btn-assign"
                              onClick={() => openAssignModal(task)}
                            >
                              שייך משימה
                            </button>
                          )}
                          {canEditFamily && (
                            <button
                              className="reviewer-btn-action reviewer-btn-info"
                              onClick={() => openFamilyInfoModal(task)}
                            >
                              🔍 פרטים
                            </button>
                          )}
                          {canEditFamily && (
                            <button
                              className="reviewer-btn-action reviewer-btn-edit"
                              onClick={() => openFamilyEditModal(task)}
                            >
                              עריכת משפחה
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Pagination Controls */}
        {!loading && (
          <div className="pagination">
            <button onClick={() => setPage(1)} disabled={page === 1 || totalCount <= pageSize} className="pagination-arrow">&laquo;</button>
            <button onClick={() => setPage(page - 1)} disabled={page === 1 || totalCount <= pageSize} className="pagination-arrow">&lsaquo;</button>
            {(() => {
              const totalPages = Math.ceil(totalCount / pageSize);
              if (totalPages <= 1) return <button className="active">1</button>;
              const maxButtons = 5;
              let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
              let endPage   = Math.min(totalPages, startPage + maxButtons - 1);
              if (endPage - startPage + 1 < maxButtons) startPage = Math.max(1, endPage - maxButtons + 1);
              const pages = [];
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button key={i} onClick={() => setPage(i)} className={page === i ? 'active' : ''}>{i}</button>
                );
              }
              return pages;
            })()}
            <button onClick={() => setPage(page + 1)} disabled={page === Math.ceil(totalCount / pageSize) || totalCount <= pageSize} className="pagination-arrow">&rsaquo;</button>
            <button onClick={() => setPage(Math.ceil(totalCount / pageSize))} disabled={page === Math.ceil(totalCount / pageSize) || totalCount <= pageSize} className="pagination-arrow">&raquo;</button>
          </div>
        )}
      </div>

      {/* Assign task modal (admin only) */}
      {isAssignModalOpen && (
        <div className="reviewers-modal">
          <div className="reviewers-modal-content reviewer-assign-modal">
            <span className="reviewers-close" onClick={() => setIsAssignModalOpen(false)}>&times;</span>
            <h2>שיוך משימה</h2>
            <p style={{ marginBottom: '12px', color: '#444' }}>
              <strong>ילד:</strong> {getChildName(taskToAssign)} &nbsp;|&nbsp;
              <strong>תאריך ביצוע:</strong> {taskToAssign?.due_date || '---'}
            </p>
            <label style={{ display: 'block', marginBottom: '6px' }}>
              שייך לעובד:
            </label>
            <Select
              options={staffOptions}
              value={selectedAssignee}
              onChange={setSelectedAssignee}
              placeholder="בחר עובד..."
              isClearable
              noOptionsMessage={() => 'אין עובדים זמינים'}
              styles={{ menu: base => ({ ...base, direction: 'rtl', textAlign: 'right' }) }}
            />
            <div className="reviewers-form-actions" style={{ marginTop: '20px' }}>
              <button onClick={handleConfirmAssign} disabled={!selectedAssignee}>שייך</button>
              <button type="button" onClick={() => setIsAssignModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* Status update modal */}
      {isStatusModalOpen && (
        <div className="reviewers-modal">
          <div className="reviewers-modal-content" style={{ maxWidth: '380px' }}>
            <span className="reviewers-close" onClick={() => setIsStatusModalOpen(false)}>&times;</span>
            <h2>עדכון סטטוס משימה</h2>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '16px', fontSize: '16px' }}>
              {STATUS_UPDATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="reviewers-form-actions">
              <button onClick={handleConfirmStatusUpdate}>עדכן</button>
              <button type="button" onClick={() => setIsStatusModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit family modal */}
      {editFamily && (
        <div className="reviewers-modal">
          <div className="reviewers-modal-content">
            <span className="reviewers-close" onClick={closeEditModal}>&times;</span>
            <h2>{t('Edit Family')} {editFamily.last_name}</h2>
            <form onSubmit={handleEditFamilySubmit} className="reviewers-form-grid">
              <div className="reviewers-form-column">
                <label>{t('First Name')}</label>
                <input type="text" name="childfirstname" value={newFamily.childfirstname} onChange={handleAddFamilyChange} className={errors.childfirstname ? 'reviewers-input-error' : ''} />
                {errors.childfirstname && <span className="reviewers-error-msg">{errors.childfirstname}</span>}
                <label>{t('Last Name')}</label>
                <input type="text" name="childsurname" value={newFamily.childsurname} onChange={handleAddFamilyChange} className={errors.childsurname ? 'reviewers-input-error' : ''} />
                {errors.childsurname && <span className="reviewers-error-msg">{errors.childsurname}</span>}
                <label>{t('City')}</label>
                <Select options={cityOptions} value={cityOptions.find(o => o.value === newFamily.city)} onChange={sel => { const city = sel ? sel.value : ''; setStreets(processedSettlementsAndStreets[city] || []); setNewFamily(prev => ({ ...prev, city, street: '', apartment_number: '' })); }} placeholder={t('Select a city')} isClearable noOptionsMessage={() => t('No city available')} className={errors.city ? 'reviewers-input-error' : ''} />
                {errors.city && <span className="reviewers-error-msg">{errors.city}</span>}
                <label>{t('Street')}</label>
                <Select options={streetOptions} value={newFamily.street ? streetOptions.find(o => o.value === newFamily.street) : null} onChange={sel => setNewFamily(prev => ({ ...prev, street: sel ? sel.value : '' }))} placeholder={t('Select a street')} isClearable noOptionsMessage={() => t('No street available')} className={errors.street ? 'reviewers-input-error' : ''} />
                {errors.street && <span className="reviewers-error-msg">{errors.street}</span>}
              </div>
              <div className="reviewers-form-column">
                <label>{t('Apartment Number')}</label>
                <input type="text" name="apartment_number" value={newFamily.apartment_number} onChange={handleAddFamilyChange} className={errors.apartment_number ? 'reviewers-input-error' : ''} />
                {errors.apartment_number && <span className="reviewers-error-msg">{errors.apartment_number}</span>}
                <label>{t('Child Phone Number')}</label>
                <input type="text" name="child_phone_number" value={newFamily.child_phone_number} onChange={handleAddFamilyChange} maxLength="10" />
                <label>{t('Treating Hospital')}</label>
                <Select options={hospitalsList.map(h => ({ value: h, label: h }))} value={hospitalsList.map(h => ({ value: h, label: h })).find(o => o.value === newFamily.treating_hospital)} onChange={sel => setNewFamily(prev => ({ ...prev, treating_hospital: sel ? sel.value : '' }))} placeholder={t('Select a hospital')} isClearable noOptionsMessage={() => t('No hospital available')} className={errors.treating_hospital ? 'reviewers-input-error' : ''} />
                {errors.treating_hospital && <span className="reviewers-error-msg">{errors.treating_hospital}</span>}
                <label>{t('Date of Birth')}</label>
                <input type="date" name="date_of_birth" value={newFamily.date_of_birth} onChange={handleAddFamilyChange} className={errors.date_of_birth ? 'reviewers-input-error' : ''} />
                {errors.date_of_birth && <span className="reviewers-error-msg">{errors.date_of_birth}</span>}
              </div>
              <div className="reviewers-form-column">
                <label>{t('Marital Status')}</label>
                <select name="marital_status" value={newFamily.marital_status} onChange={handleAddFamilyChange} className={errors.marital_status ? 'reviewers-input-error' : ''}>
                  <option value="">{t('Select a marital status')}</option>
                  {maritalStatuses.map((s, i) => <option key={i} value={s}>{s}</option>)}
                </select>
                {errors.marital_status && <span className="reviewers-error-msg">{errors.marital_status}</span>}
                <label>{t('Number of Siblings')}</label>
                <input type="number" name="num_of_siblings" min="0" value={newFamily.num_of_siblings} onChange={handleAddFamilyChange} className={errors.num_of_siblings ? 'reviewers-input-error' : ''} />
                {errors.num_of_siblings && <span className="reviewers-error-msg">{errors.num_of_siblings}</span>}
                <label>{t('Gender')}</label>
                <select name="gender" value={newFamily.gender} onChange={handleAddFamilyChange}>
                  <option value="נקבה">{t('Female')}</option>
                  <option value="זכר">{t('Male')}</option>
                </select>
                <label>{t('ID')}</label>
                <input type="text" name="child_id" value={newFamily.child_id?.toString() || ''} onChange={handleAddFamilyChange} maxLength="9" placeholder="123456789" className={errors.child_id ? 'reviewers-input-error' : ''} />
                {errors.child_id && <span className="reviewers-error-msg">{errors.child_id}</span>}
                <label>{t('Registration Date')}</label>
                <input type="date" name="registration_date" value={newFamily.registration_date} onChange={handleAddFamilyChange} />
              </div>
              <div className="reviewers-form-column">
                <label>{t('Medical Diagnosis')}</label>
                <input type="text" name="medical_diagnosis" value={newFamily.medical_diagnosis} onChange={handleAddFamilyChange} />
                <label>{t('Diagnosis Date')}</label>
                <input type="date" name="diagnosis_date" value={newFamily.diagnosis_date} onChange={handleAddFamilyChange} />
                <label>{t('Current Medical State')}</label>
                <textarea name="current_medical_state" value={newFamily.current_medical_state} onChange={handleAddFamilyChange} className="reviewers-scrollable-textarea" />
                <label>{t('When Completed Treatments')}</label>
                <input type="date" name="when_completed_treatments" value={newFamily.when_completed_treatments} onChange={handleAddFamilyChange} />
                <label>{t('Additional Info')}</label>
                <textarea name="additional_info" value={newFamily.additional_info} onChange={handleAddFamilyChange} className="reviewers-scrollable-textarea" />
                <label>{t('Is In Frame')}</label>
                <textarea name="is_in_frame" value={newFamily.is_in_frame} onChange={handleAddFamilyChange} className="reviewers-scrollable-textarea" />
                <label>{t('Coordinator Comments')}</label>
                <textarea name="coordinator_comments" value={newFamily.coordinator_comments} onChange={handleAddFamilyChange} className="reviewers-scrollable-textarea" />
              </div>
              <div className="reviewers-form-column">
                <label>{t('Father Name')}</label>
                <input type="text" name="father_name" value={newFamily.father_name} onChange={handleAddFamilyChange} className={errors.father_name ? 'reviewers-input-error' : ''} />
                {errors.father_name && <span className="reviewers-error-msg">{errors.father_name}</span>}
                <label>{t('Father Phone')}</label>
                <input type="text" name="father_phone" value={newFamily.father_phone} onChange={handleAddFamilyChange} maxLength="10" className={errors.father_phone ? 'reviewers-input-error' : ''} />
                {errors.father_phone && <span className="reviewers-error-msg">{errors.father_phone}</span>}
                <label>{t('Mother Name')}</label>
                <input type="text" name="mother_name" value={newFamily.mother_name} onChange={handleAddFamilyChange} />
                <label>{t('Mother Phone')}</label>
                <input type="text" name="mother_phone" value={newFamily.mother_phone} onChange={handleAddFamilyChange} maxLength="10" className={errors.mother_phone ? 'reviewers-input-error' : ''} />
                {errors.mother_phone && <span className="reviewers-error-msg">{errors.mother_phone}</span>}
              </div>
              <div className="reviewers-form-column">
                <label>{t('Has Completed Treatments')}</label>
                <select name="has_completed_treatments" value={newFamily.has_completed_treatments ? 'Yes' : 'No'} onChange={e => handleAddFamilyChange({ target: { name: 'has_completed_treatments', value: e.target.value === 'Yes' } })}>
                  <option value="No">{t('No')}</option>
                  <option value="Yes">{t('Yes')}</option>
                </select>
                <label>{t('Need Review')}</label>
                <select name="need_review" value={newFamily.need_review ? 'Yes' : 'No'} onChange={e => handleAddFamilyChange({ target: { name: 'need_review', value: e.target.value === 'Yes' } })}>
                  <option value="Yes">{t('Yes')}</option>
                  <option value="No">{t('No')}</option>
                </select>
                <label>{t('Details for Tutoring')}</label>
                <textarea name="details_for_tutoring" value={newFamily.details_for_tutoring} onChange={handleAddFamilyChange} className="reviewers-scrollable-textarea" />
                <label>{t('Tutoring Status')}</label>
                <select name="tutoring_status" value={newFamily.tutoring_status} onChange={handleAddFamilyChange} className={errors.tutoring_status ? 'reviewers-input-error' : ''}>
                  <option value="">{t('Select a tutoring status')}</option>
                  {tutoringStatuses.map((s, i) => <option key={i} value={s}>{formatStatus(s)}</option>)}
                </select>
                {errors.tutoring_status && <span className="reviewers-error-msg">{errors.tutoring_status}</span>}
                <label>{t('Responsible Coordinator')}</label>
                {autoAssignedCoordinator && <div className="reviewers-auto-assigned-note">✨ שויך אוטומטית</div>}
                <select name="responsible_coordinator" value={newFamily.responsible_coordinator} onChange={handleAddFamilyChange} className={errors.responsible_coordinator ? 'reviewers-input-error' : ''} required>
                  <option value="ללא">ללא (אין רכז)</option>
                  {availableCoordinators.map((c, i) => <option key={i} value={c.staff_id}>{c.name}</option>)}
                </select>
                {errors.responsible_coordinator && <span className="reviewers-error-msg">{errors.responsible_coordinator}</span>}
                <label>{t('Status')}</label>
                <select name="status" value={newFamily.status} onChange={handleAddFamilyChange} className={errors.status ? 'reviewers-input-error' : ''}>
                  {statuses.map((s, i) => <option key={i} value={s}>{s}</option>)}
                </select>
                {errors.status && <span className="reviewers-error-msg">{errors.status}</span>}
              </div>
              <div className="reviewers-form-actions">
                <button type="submit">{t('Update Family')}</button>
                <button type="button" onClick={closeEditModal}>{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Family info modal (read-only) */}
      {selectedFamily && (
        <div className="reviewers-modal">
          <div className="reviewers-modal-content">
            <span className="reviewers-close" onClick={closeFamilyDetails}>&times;</span>
            <h2>{t('Family Details')} {selectedFamily.last_name}</h2>
            <div className="family-details-grid">
              <p>{t('ID')}: {selectedFamily.id}</p>
              <p>{t('Full Name')}: {selectedFamily.first_name} {selectedFamily.last_name}</p>
              <p>{t('Registration Date')}: {selectedFamily.registration_date || '---'}</p>
              <p>{t('Status')}: {formatStatus(selectedFamily.status)}</p>
              <p>{t('Child Phone')}: {selectedFamily.child_phone_number || '---'}</p>
              <p>{t('Gender')}: {selectedFamily.gender ? t('Female') : t('Male')}</p>
              <p>{t('Date of Birth')}: {selectedFamily.date_of_birth || '---'}</p>
              <p>{t('Medical Diagnosis')}: {selectedFamily.medical_diagnosis || '---'}</p>
              <p>{t('Diagnosis Date')}: {selectedFamily.diagnosis_date || '---'}</p>
              <p>{t('Marital Status')}: {selectedFamily.marital_status || '---'}</p>
              <p>{t('Number of Siblings')}: {selectedFamily.num_of_siblings || '---'}</p>
              <p>{t('Tutoring Status')}: {formatStatus(selectedFamily.tutoring_status)}</p>
              <p>{t('Treating Hospital')}: {selectedFamily.treating_hospital || '---'}</p>
              <p>{t('Current Medical State')}: {selectedFamily.current_medical_state || '---'}</p>
              <p>{t('When Completed Treatments')}: {selectedFamily.when_completed_treatments || '---'}</p>
              <p>{t('Responsible Coordinator')}: {selectedFamily.responsible_coordinator || '---'}</p>
              <p>{t('Father Name')}: {selectedFamily.father_name || '---'}</p>
              <p>{t('Father Phone')}: {selectedFamily.father_phone || '---'}</p>
              <p>{t('Mother Name')}: {selectedFamily.mother_name || '---'}</p>
              <p>{t('Mother Phone')}: {selectedFamily.mother_phone || '---'}</p>
              <p>{t('Has Completed Treatments')}: {selectedFamily.has_completed_treatments ? t('Yes') : t('No')}</p>
              <p>{t('Need Review')}: {selectedFamily.need_review ? t('Yes') : t('No')}</p>
              <p>{t('Is In Frame')}: {selectedFamily.is_in_frame || '---'}</p>
              <p>{t('Coordinator Comments')}: {selectedFamily.coordinator_comments || '---'}</p>
              <p>{t('Additional Info')}: {selectedFamily.additional_info || '---'}</p>
              <p>{t('Details for Tutoring')}: {selectedFamily.details_for_tutoring || '---'}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button
                className="filter-button"
                onClick={() => {
                  closeFamilyDetails();
                  // Optional: You could trigger edit mode here if needed
                  // For now, user can click the Edit button separately
                }}
              >
                {t('Close')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk assign modal */}
      {isBulkAssignOpen && (
        <div className="reviewers-modal">
          <div className="reviewers-modal-content reviewer-bulk-modal">
            <span className="reviewers-close" onClick={() => { setIsBulkAssignOpen(false); setBulkProgress(null); }}>&times;</span>
            <h2>שיוך {selectedTaskIds.size} משימות</h2>
            <label>שייך לעובד:</label>
            <Select
              options={staffOptions}
              value={bulkAssignee}
              onChange={setBulkAssignee}
              placeholder="בחר עובד..."
              isClearable
              noOptionsMessage={() => 'אין עובדים זמינים'}
              styles={{ menu: base => ({ ...base, direction: 'rtl', textAlign: 'right' }) }}
              isDisabled={!!bulkProgress}
            />
            {bulkProgress && (
              <div className="reviewer-bulk-progress">
                <div className="reviewer-bulk-progress__label">
                  מעבד... {bulkProgress.done} / {bulkProgress.total}
                </div>
                <div className="reviewer-bulk-progress__track">
                  <div
                    className="reviewer-bulk-progress__fill"
                    style={{ width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <div className="reviewers-form-actions" style={{ marginTop: '20px' }}>
              <button onClick={handleBulkAssignConfirm} disabled={!bulkAssignee || !!bulkProgress}>
                {bulkProgress ? 'מעבד...' : 'שייך'}
              </button>
              <button type="button" onClick={() => { setIsBulkAssignOpen(false); setBulkProgress(null); }} disabled={!!bulkProgress}>ביטול</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReviewerPage;
