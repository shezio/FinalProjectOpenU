import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from '../axiosConfig';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { getStaff, getChildren, getTutors, getChildFullName, getTutorFullName, getPendingTutors, getGeneralVolunteersNotPending, isTutorOrGeneralVolunteer, isGuestUser,getStaffUserNamesAndRoles } from '../components/utils';
import '../styles/common.css';
import '../styles/tasks.css';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { showErrorToast, showWarningToast } from '../components/toastUtils';
import { useTranslation } from 'react-i18next';
import "../i18n";
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';

const statusColumns = [
  { key: "לא הושלמה", label: "לא הושלמה" },
  { key: "בביצוע", label: "בביצוע" },
  { key: "הושלמה", label: "הושלמה" }
];

// A review-talk task flagged "המשך בירור" (set from the Reviewers page) has no
// column of its own on this board (by design — NPO request managed via ReviewerPage).
// Group it under "בביצוע" so it stays visible here instead of silently
// disappearing — it's a pre-completion state.
const statusMatchesColumn = (status, colKey) =>
  status === colKey || (colKey === 'בביצוע' && status === 'המשך בירור');

const getFirstDayOfMonth = () => {
  const now = new Date();
  // Get the last day of the previous month by setting day to 0 of current month
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const day = String(lastDayPrevMonth.getDate()).padStart(2, '0');
  const month = String(lastDayPrevMonth.getMonth() + 1).padStart(2, '0');
  const year = lastDayPrevMonth.getFullYear();
  return `${year}-${month}-${day}`;
};

const getLastDayOfMonth = () => {
  const now = new Date();
  // Get the last day of the current month by setting day to 0 of next month
  const lastDayCurrMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const day = String(lastDayCurrMonth.getDate()).padStart(2, '0');
  const month = String(lastDayCurrMonth.getMonth() + 1).padStart(2, '0');
  const year = lastDayCurrMonth.getFullYear();
  return `${year}-${month}-${day}`;
};

const Tasks = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('taskTypes')) || [];
    } catch {
      return [];
    }
  });
  const [filteredTaskTypes, setFilteredTaskTypes] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [childrenOptions, setChildrenOptions] = useState([]);
  const [tutorsOptions, setTutorsOptions] = useState([]);
  const [pendingTutorsOptions, setPendingTutorsOptions] = useState([]);
  const [generalVolunteersNotPending, setGeneralVolunteersNotPending] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [selectedPendingTutor, setSelectedPendingTutor] = useState(null);
  const [selectedTaskType, setSelectedTaskType] = useState(null);
  const [loading, setLoading] = useState(tasks.length === 0);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedFilter, setSelectedFilter] = useState('');
  const [selectedChildFilter, setSelectedChildFilter] = useState('');
  const [selectedTaskTypeFilters, setSelectedTaskTypeFilters] = useState({});
  // Admin-only "show only my tasks" toggle. When on it overrides every filter
  // (dates, type, child) so an admin sees just their own assigned tasks.
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [taskToUpdate, setTaskToUpdate] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isRejectRegistrationModalOpen, setIsRejectRegistrationModalOpen] = useState(false);
  const [rejectionReasonOption, setRejectionReasonOption] = useState('');
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [staffUserNamesAndRoles, setStaffUserNamesAndRoles] = useState([]);
  const [explanation, setExplanation] = useState("");
  const [selectedDateField, setSelectedDateField] = useState('due_date');
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  const [filtering, setFiltering] = useState(false);
  const [isTaskTypeFilterOpen, setIsTaskTypeFilterOpen] = useState(false);
  const [taskTypeSearch, setTaskTypeSearch] = useState('');
  const menuRef = useRef();
  const taskTypeFilterRef = useRef();
  const location = useLocation();
  const navigate = useNavigate();

  // Only-Tutor / Only-General-Volunteer users must not access the Tasks page.
  // The nav entry is hidden in Sidebar, but login redirects to /tasks
  // unconditionally (and the URL is reachable directly), so guard here too.
  // Definition mirrors Sidebar's isOnlyTutorOrVolunteer.
  useEffect(() => {
    const origUsername = localStorage.getItem('origUsername') || '';
    const staffList = JSON.parse(localStorage.getItem('staff') || '[]');
    const roles = staffList.find((s) => s.username === origUsername)?.roles || [];
    // "only tutor/volunteer" = has EXACTLY ONE role and it is Tutor or General Volunteer
    const isOnlyTutorOrVolunteer = roles.length === 1 && (roles[0] === 'Tutor' || roles[0] === 'General Volunteer');
    if (isOnlyTutorOrVolunteer) {
      navigate('/feedbacks', { replace: true });
    }
  }, [navigate]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      // Check if click is on the dropdown portal or button
      const isDropdownClick = event.target.closest('.status-checkboxes-dropdown') || 
                             event.target.closest('.status-filter-button');
      if (taskTypeFilterRef.current && !taskTypeFilterRef.current.contains(event.target) && !isDropdownClick) {
        setIsTaskTypeFilterOpen(false);
        setTaskTypeSearch('');
      }
    };
    if (menuOpen || isTaskTypeFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen, isTaskTypeFilterOpen]);

  // Close menu when selecting a new task
  useEffect(() => {
    setMenuOpen(false);
  }, [selectedTask]);


  const getPendingOrGeneralTutorFullName = (pendingTutor, pendingTutorsOptions, generalVolunteersNotPending, t) => {
    // If pendingTutor is an object, try to find by id or by name
    if (pendingTutor && typeof pendingTutor === 'object') {
      // Try to find by PK (id)
      let option = pendingTutorsOptions.find(opt => opt.value === pendingTutor.id);
      if (option) return option.label;
      // Try to find by name in general volunteers
      option = (generalVolunteersNotPending || []).map(vol => ({
        value: vol.id,
        label: `${vol.first_name} ${vol.last_name} - ${t('General Volunteer')}`,
      })).find(opt => opt.value === pendingTutor.id);
      return option ? option.label : `${pendingTutor.first_name} ${pendingTutor.surname}`;
    }
    // If pendingTutor is a number (PK)
    let option = pendingTutorsOptions.find(opt => opt.value === pendingTutor);
    if (option) return option.label;
    option = (generalVolunteersNotPending || []).map(vol => ({
      value: vol.id,
      label: `${vol.first_name} ${vol.last_name} - ${t('General Volunteer')}`,
    })).find(opt => opt.value === pendingTutor);
    return option ? option.label : "---";
  };

  const getTaskBgColor = (dueDateStr, status) => {
    if (status === "הושלמה") return "#d4edda";
    if (!dueDateStr) return "#fff";
    const [day, month, year] = dueDateStr.split('/').map(Number);
    if (!day || !month || !year) return "#fff";
    const dueDate = new Date(year, month - 1, day);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < now) {
      return "#ffcccc";
    }
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    if (dueDate >= weekStart && dueDate <= weekEnd) {
      return "#fff7cc";
    }
    return "#fff";
  };

  const fetchData = async (forceFetch = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('date_field', selectedDateField);
      // "Show only my tasks" overrides the date pickers — fetch the full range
      // so an admin sees every task assigned to them regardless of the filters.
      params.append('start_date', showOnlyMyTasks ? '2000-01-01' : startDate);
      params.append('end_date', showOnlyMyTasks ? '2100-12-31' : endDate);
      if (selectedFilter && !showOnlyMyTasks) {
        params.append('task_type_id', selectedFilter);
      }
      const tasksUrl = `/api/tasks/?${params.toString()}`;
      const [tasksResponse, staffOptions, childrenOptions, tutorsOptions, pendingTutorsOptions, generalVolunteersNotPending, staffUserNamesAndRoles] = await Promise.all([
        axios.get(tasksUrl).catch((error) => {
          console.error('Error fetching tasks:', error);
          showErrorToast(t, 'Error fetching tasks', error);
          return { data: { tasks: [], task_types: [] } };
        }),
        getStaff().catch((error) => {
          console.error('Error fetching staff:', error);
          showErrorToast(t, 'Error fetching staff', error);
          return [];
        }),
        getChildren().catch((error) => {
          console.error('Error fetching children:', error);
          showErrorToast(t, 'Error fetching children', error);
          return [];
        }),
        getTutors().catch((error) => {
          console.error('Error fetching tutors:', error);
          showErrorToast(t, 'Error fetching tutors', error);
          return [];
        }),
        getPendingTutors().catch((error) => {
          console.error('Error fetching pending tutors:', error);
          showErrorToast(t, 'Error fetching pending tutors', error);
          return [];
        }),
        getGeneralVolunteersNotPending().catch((error) => {
          console.error('Error fetching general volunteers not pending:', error);
          showErrorToast(t, 'Error fetching general volunteers not pending', error);
          return [];
        }),
        getStaffUserNamesAndRoles().catch((error) => {
          console.error('Error fetching staff usernames and roles:', error);
          showErrorToast(t, 'Error fetching staff usernames and roles', error);
          return [];
        }),
      ]);

      const newTasks = tasksResponse.data.tasks || [];
      const newTaskTypes = tasksResponse.data.task_types || [];
      const cachedPermissions = JSON.parse(localStorage.getItem('permissions')) || [];
      const newPendingTutors = pendingTutorsOptions;
      const newGeneralVolunteersNotPending = generalVolunteersNotPending;
      const newStaffUserNamesAndRoles = staffUserNamesAndRoles;

      setStaffOptions(staffOptions);
      // Trim children labels to the part before the first ' - ' so the dropdown shows only the name
      const trimmedChildrenOptions = (childrenOptions || []).map(c => ({
        ...c,
        label: (c.label || '').split(' - ')[0].trim(),
      }));
      setChildrenOptions(trimmedChildrenOptions);
      setTutorsOptions(tutorsOptions);
      setPendingTutorsOptions(newPendingTutors);
      setGeneralVolunteersNotPending(newGeneralVolunteersNotPending);
      setPermissions(cachedPermissions);
      setStaffUserNamesAndRoles(newStaffUserNamesAndRoles);

      // Dev + liam tasks are admin-only: keep them out of the create/edit type
      // dropdown and the (non-admin) filter dropdown for everyone else. Compute
      // admin status from the freshly-fetched roles (state isn't updated yet).
      const currentUsernameLocal = localStorage.getItem('username');
      const currentStaffUserLocal = newStaffUserNamesAndRoles.find(u => u.username === currentUsernameLocal);
      const isAdminLocal = !!currentStaffUserLocal && (
        currentStaffUserLocal.roles.includes('System Administrator') ||
        currentStaffUserLocal.roles.includes('Viewer')
      );

      const filteredTypes = newTaskTypes.filter((taskType) =>
        cachedPermissions.some(
          (permission) =>
            permission.resource === taskType.resource &&
            permission.action === taskType.action
        ) &&
        taskType.name !== "ראיון מועמד לחונכות" && // Exclude interview task
        taskType.name !== "התאמת חניך" && // Exclude tutee match task
        // Dev/Liam tasks are admin-only
        (isAdminLocal || (taskType.name !== 'משימת פיתוח' && taskType.name !== 'משימת ליאם'))
        // Note: "צירוף משפחה לקבוצה" and "הסרת משפחה מקבוצה" are INCLUDED in filters
      );
      setFilteredTaskTypes(filteredTypes);

      // Always set tasks and taskTypes from backend, never from localStorage
      setTasks(newTasks);
      setTaskTypes(newTaskTypes);
      // Remove all localStorage.setItem for tasks and taskTypes
      localStorage.setItem('staffOptions', JSON.stringify(staffOptions));
      localStorage.setItem('childrenOptions', JSON.stringify(trimmedChildrenOptions));
      localStorage.setItem('tutorsOptions', JSON.stringify(tutorsOptions));
      localStorage.setItem('pendingTutorsOptions', JSON.stringify(newPendingTutors));
      localStorage.setItem('generalVolunteersNotPending', JSON.stringify(newGeneralVolunteersNotPending));
      localStorage.setItem('staffUserNamesAndRoles', JSON.stringify(newStaffUserNamesAndRoles));
    } catch (error) {
      console.error('Error fetching data:', error);
      showErrorToast(t, 'Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData(true); // force fetch every time the route changes
  }, [location.pathname]);

  // Re-fetch tasks when date field, date range, or task type filter changes
  useEffect(() => {
    fetchData(true);
  }, [selectedDateField, startDate, endDate, selectedFilter, showOnlyMyTasks]);

  // Initialize task type filters for admins - review task unchecked, others checked by default
  useEffect(() => {
    if (isUserAdmin() && taskTypes.length > 0) {
      const newFilters = {};
      taskTypes
        .filter(type => type.name !== "ראיון מועמד לחונכות" && type.name !== "התאמת חניך")
        .forEach(type => {
          // Check if this is a review task (סקירה חודשית or similar)
          const isReviewTask = type.name && type.name.includes('שיחת ביקורת');
          newFilters[type.id] = !isReviewTask; // Review task = false, others = true
        });
      setSelectedTaskTypeFilters(newFilters);
    }
  }, [taskTypes]);

  // Auto-assign שלמה בונצל when dev task type is selected
  useEffect(() => {
    if (selectedTaskType?.label === 'משימת פיתוח') {
      const shlomo = staffOptions.find(s =>
        s.label && s.label.includes('שלמה') && s.label.includes('בונצל')
      );
      if (shlomo) setSelectedStaff(shlomo);
    }
  }, [selectedTaskType, staffOptions]);

  // Auto-assign ליאם אביבי when liam task type is selected (mirrors dev task)
  useEffect(() => {
    if (selectedTaskType?.label === 'משימת ליאם') {
      const liam = staffOptions.find(s =>
        s.label && s.label.includes('ליאם') && s.label.includes('אביבי')
      );
      if (liam) setSelectedStaff(liam);
    }
  }, [selectedTaskType, staffOptions]);

  // Combine pending tutors and general volunteers for the dropdown
  const groupedPendingTutorOptions = [
    {
      label: t('Pending Tutors'),
      options: pendingTutorsOptions,
    },
    {
      label: t('General Volunteers'),
      options: (generalVolunteersNotPending || []).map(vol => ({
        ...vol,
        label: `${vol.label.split(' - ')[0]} - ${t('General Volunteer')}`,
      })),
    }
  ];

  const isUserAdmin = () => {
    const username = localStorage.getItem('username');
    const staffUser = staffUserNamesAndRoles.find(user => user.username === username);
    return staffUser && (staffUser.roles.includes('System Administrator') || staffUser.roles.includes('Viewer'));
  };

  const isUserVolunteerCoordinator = () => {
    const username = localStorage.getItem('username');
    const staffUser = staffUserNamesAndRoles.find(user => user.username === username);
    return staffUser && staffUser.roles.includes('Volunteer Coordinator');
  };

  const canManageRegistrationApproval = () => {
    return isUserAdmin() || isUserVolunteerCoordinator();
  };

  // Group tasks by status for Kanban columns
  const currentUsername = localStorage.getItem('username');
  const tasksByStatus = statusColumns.reduce((acc, col) => {
    acc[col.key] = tasks
      .filter((task) => {
        // Non-admins must never see (or open) dev/liam tasks anywhere on the board.
        if (!isUserAdmin() && (task.type_name === 'משימת פיתוח' || task.type_name === 'משימת ליאם')) {
          return false;
        }
        // "Show only my tasks" (admins) overrides every other filter — just the
        // current user's own OPEN assigned tasks (done tasks are hidden — no need).
        return showOnlyMyTasks
          ? task.assignee === currentUsername && statusMatchesColumn(task.status, col.key) && task.status !== 'הושלמה'
          : (!selectedFilter || task.type === parseInt(selectedFilter)) &&
            (!selectedChildFilter || task.child === parseInt(selectedChildFilter)) &&
            // For admins: apply task type filters; for non-admins: show all
            (isUserAdmin() ? selectedTaskTypeFilters[task.type] !== false : true) &&
            statusMatchesColumn(task.status, col.key);
      });
    return acc;
  }, {});

  // Kanban drag and drop logic
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) {
      setIsDragging(false); // <-- Ensure this runs before return
      return;
    }

    // Get the column indices
    const sourceColIdx = statusColumns.findIndex(col => col.key === source.droppableId);
    const destColIdx = statusColumns.findIndex(col => col.key === destination.droppableId);

    // Prevent moving to a previous column (left)
    if (destColIdx < sourceColIdx) {
      setIsDragging(false); // <-- Ensure this runs before return
      setTimeout(() => {
        showWarningToast(t, 'Cannot move task to a previous column', "");
      }, 0);
      return;
    }

    // Prevent skipping a status (e.g. "לא הושלמה" straight to "הושלמה") - must pass through "בביצוע"
    if (destColIdx - sourceColIdx > 1) {
      setIsDragging(false); // <-- Ensure this runs before return
      setTimeout(() => {
        showWarningToast(t, 'Cannot skip a status', "");
      }, 0);
      return;
    }

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const taskId = parseInt(draggableId, 10);

    // Only update if moved to a different column
    if (source.droppableId !== destination.droppableId) {
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: destination.droppableId } : task
        )
      );
      try {
        await axios.put(`/api/tasks/update-status/${taskId}/`, { status: destination.droppableId });
        toast.success(t('Task updated successfully')); // <-- Add this line
        
        await fetchData(true);
      } catch (error) {
        showErrorToast(t, 'Error updating task status', error);
        await fetchData(true);
      }
    }
  };

  const getTaskTypeName = (typeId) => {
    const taskType = taskTypes.find((type) => type.id === typeId);
    return taskType ? taskType.name : '';
  };

  // Check if task is a monthly family review task
  const isMonthlyReviewTask = (taskDescription) => {
    return taskDescription && taskDescription.includes('Monthly family review talk for');
  };

  // Extract child name and last review date from monthly review task description
  const parseMonthlyReviewTask = (taskDescription) => {
    // Description format: "Monthly family review talk for {child_name} - Last talk: {date} - Conduct check-up call with family"
    const regex = /Monthly family review talk for (.+?) - Last talk: (.+?) - Conduct check-up call with family/;
    const match = taskDescription.match(regex);
    
    if (match) {
      return {
        childName: match[1],
        lastReviewDate: match[2],
        isMonthly: true
      };
    }
    return { isMonthly: false };
  };

  // Get display description for monthly review tasks
  const getDisplayDescription = (task) => {
    if (isMonthlyReviewTask(task.description)) {
      const parsed = parseMonthlyReviewTask(task.description);
      if (parsed.isMonthly) {
        return `${t('Monthly family review talk for')} ${parsed.childName}`;
      }
    }
    return task.description;
  };

  // Get last review date for monthly review tasks or from API field for audit call tasks
  const getLastReviewDate = (task) => {
    // First, try to use the API field for any audit call task
    if (task.child_last_review_talk_conducted) {
      return task.child_last_review_talk_conducted;
    }
    // Fallback: parse from monthly review task description
    if (isMonthlyReviewTask(task.description)) {
      const parsed = parseMonthlyReviewTask(task.description);
      if (parsed.isMonthly) {
        return parsed.lastReviewDate;
      }
    }
    return null;
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleClosePopup = () => {
    setSelectedTask(null);
    setSelectedTaskType(null);
    setSelectedStaff(null);
    setSelectedChild(null);
    setSelectedTutor(null);
    setSelectedPendingTutor(null);
    setDueDate('');
    setErrors({});
    setExplanation("");
  };

  const handleSubmitTask = async () => {
    const newErrors = {};
    if (!selectedTaskType) {
      newErrors.type = "זהו שדה חובה";
    }
    if (!document.getElementById('due_date').value) {
      newErrors.due_date = "זהו שדה חובה";
    }
    const dueDateValue = document.getElementById('due_date').value;
    if (dueDateValue) {
      const today = new Date();
      const dueDate = new Date(dueDateValue);
      if (isNaN(dueDate.getTime())) {
        newErrors.due_date = t("Due date must be a valid date.");
      } else {
        // Normalize times to midnight for accurate year comparison
        today.setHours(0,0,0,0);
        dueDate.setHours(0,0,0,0);
        const timeDiff = dueDate - today;
        const oneMonthInMs = 30 * 24 * 60 * 60 * 1000;
        if (timeDiff < 0 || timeDiff > oneMonthInMs) {
          newErrors.due_date = t("Due date must be in the future and up to 1 month from now.");
        }
      }
    }
    if (!selectedStaff) {
      newErrors.assigned_to = "זהו שדה חובה";
    }
    // Enforce pending_tutor if task type is "ראיון מועמד לחונכות"
    if (
      selectedTaskType &&
      (taskTypes.find(t => t.id === selectedTaskType.value)?.name === "ראיון מועמד לחונכות") &&
      !selectedPendingTutor
    ) {
      newErrors.pending_tutor = "זהו שדה חובה";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    // Only include child/tutor if NOT "הוספת משפחה"
    const taskTypeName = taskTypes.find(t => t.id === selectedTaskType.value)?.name;
    const taskData = {
      due_date: document.getElementById('due_date').value,
      assigned_to: selectedStaff?.value,
      type: selectedTaskType?.value,
      explanation: explanation,
    };
    if (taskTypeName !== "הוספת משפחה") {
      taskData.child = selectedChild?.value;
      taskData.tutor = selectedTutor?.value;
    }
    if (taskTypeName === "ראיון מועמד לחונכות") {
      taskData.pending_tutor = selectedPendingTutor?.value;
    }

    try {
      const response = await axios.post('/api/tasks/create/', taskData);
      if (response.status === 201) {
        setIsModalOpen(false);
        toast.success(t('Task created successfully'));
        await fetchData(true);
      }
    } catch (error) {
      showErrorToast(t, 'Error creating task', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`/api/tasks/delete/${taskId}/`);
      setTasks(tasks.filter((task) => task.id !== taskId));
      toast.success(t('Task deleted successfully'));
      handleClosePopup(); // <-- Close split view
      await fetchData(true);
    } catch (error) {
      showErrorToast(t, 'Error deleting task', error);
    }
  };

  const handleUpdateStatus = (task) => {
    setTaskToUpdate(task);
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedStatus) {
      toast.error(t('Please select a status'));
      return;
    }
    try {
      await axios.put(`/api/tasks/update-status/${taskToUpdate.id}/`, { status: selectedStatus });
      toast.success(t('Task updated successfully'));
      setIsStatusModalOpen(false);
      
      await fetchData(true);
    } catch (error) {
      showErrorToast(t, 'Error updating task', error);
    }
  };

  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setSelectedTaskType({ value: task.type, label: getTaskTypeName(task.type) });
    setSelectedStaff({ value: task.assignee, label: task.assignee });
    setSelectedChild(childrenOptions.find((child) => child.value === task.child) || null);
    setSelectedTutor(tutorsOptions.find((tutor) => tutor.value === task.tutor) || null);

    // Fix: Only try to get id if task.pending_tutor is not null/undefined
    let pendingTutorId = null;
    if (task.pending_tutor) {
      pendingTutorId = typeof task.pending_tutor === 'object' ? task.pending_tutor.id : task.pending_tutor;
    }

    let pendingTutorOption = null;
    if (pendingTutorId) {
      pendingTutorOption = pendingTutorsOptions.find(opt => Number(opt.value) === Number(pendingTutorId));
      if (!pendingTutorOption) {
        // Fallback: create a minimal option so the Select can display it
        pendingTutorOption = {
          value: pendingTutorId,
          label: typeof task.pending_tutor === 'object'
            ? `${task.pending_tutor.first_name} ${task.pending_tutor.surname || task.pending_tutor.last_name || ''}`
            : `ID ${pendingTutorId}`,
        };
      }
    }
    setSelectedPendingTutor(pendingTutorOption);

    setDueDate('');
    setExplanation(task.explanation || '');
    setIsEditModalOpen(true);
  };

  const handleMoveBackToTodo = async (task) => {
    try {
      await axios.put(`/api/tasks/update-status/${task.id}/`, { status: 'לא הושלמה' });
      toast.success(t('Task moved back to Todo'));
      await fetchData(true);
    } catch (error) {
      showErrorToast(t, 'Error moving task back to Todo', error);
    }
  };

  const handleUpdateTask = async () => {
    const newErrors = {};
    if (!selectedTaskType) {
      newErrors.type = "זהו שדה חובה";
    }
    if (!document.getElementById('due_date').value) {
      newErrors.due_date = "זהו שדה חובה";
    }
    if (!selectedStaff) {
      newErrors.assigned_to = "זהו שדה חובה";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const taskTypeName = taskTypes.find(t => t.id === selectedTaskType.value)?.name;
    const updatedTaskData = {
      description: taskToEdit.description,
      due_date: document.getElementById('due_date').value,
      assigned_to: selectedStaff?.value,
      type: selectedTaskType?.value,
      explanation: explanation,
    };
    if (taskTypeName !== "הוספת משפחה") {
      updatedTaskData.child = selectedChild?.value;
      updatedTaskData.tutor = selectedTutor?.value;
    }
    if (taskTypeName === "ראיון מועמד לחונכות") {
      updatedTaskData.pending_tutor = selectedPendingTutor?.value;
    }

    try {
      const response = await axios.put(`/api/tasks/update/${taskToEdit.id}/`, updatedTaskData);
      if (response.status === 200) {
        setIsEditModalOpen(false);
        toast.success(t('Task updated successfully'));
        handleClosePopup();
        await fetchData(true);
      }
    } catch (error) {
      showErrorToast(t, 'Error updating task', error);
    }
  };

  const isInterviewTask = (typeId) => {
    const type = taskTypes.find(t => t.id === typeId);
    return type && type.name === "ראיון מועמד לחונכות";
  };

  const isFamilyAdditionTask = (typeId) => {
    const type = taskTypes.find(t => t.id === typeId);
    return type && type.name === "הוספת משפחה";
  };

  // NEW: Helper function to check if task is "התאמת חניך" (Tutee Match)
  const isTuteeMatchTask = (typeId) => {
    const type = taskTypes.find(t => t.id === typeId);
    return type && type.name === "התאמת חניך";
  };

  // Helper to check by type_name directly
  const isTuteeMatchTaskByName = (typeName) => {
    return typeName === "התאמת חניך";
  };

  // Helper to check if task is "צירוף משפחה לקבוצה" (Family Group Assignment)
  const isFamilyGroupAssignmentTaskByName = (typeName) => {
    return typeName === "צירוף משפחה לקבוצה";
  };

  // Helper to check if task is "הסרת משפחה מקבוצה" (Remove Family from Group)
  const isRemoveFamilyFromGroupTaskByName = (typeName) => {
    return typeName === "הסרת משפחה מקבוצה";
  };

  // Helper to check if task is an expense refund task
  const isRefundTaskByName = (typeName) => {
    return typeName.includes("החזר");
  };

  // Helper to check if task is a dev task
  const isDevTaskByName = (typeName) => {
    return typeName === 'משימת פיתוח';
  };

  // Helper to check if task is a liam task (mirrors dev task, no notifications)
  const isLiamTaskByName = (typeName) => {
    return typeName === 'משימת ליאם';
  };

  // Dev + liam tasks share the rich-text explanation editor and a forced,
  // self-assigned owner (dev → שלמה בונצל, liam → ליאם אביבי).
  const isRichTaskLabel = (label) => label === 'משימת פיתוח' || label === 'משימת ליאם';
  const richTaskAssigneeName = (label) =>
    label === 'משימת פיתוח' ? 'שלמה בונצל' : label === 'משימת ליאם' ? 'ליאם אביבי' : '';

  // Renders a plain-text explanation as rich text (bullets, numbered lists, checkboxes)
  // onToggleCheckbox: optional callback(lineIndex, newText) to allow toggling checkboxes
  const renderRichExplanation = (text, onToggleCheckbox) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const trimmed = line.trimStart();
      // Checkbox unchecked: "[ ] ..."
      if (/^\[ \]/.test(trimmed)) {
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '3px' }}>
            <input
              type="checkbox"
              style={{ marginTop: '3px', flexShrink: 0, cursor: onToggleCheckbox ? 'pointer' : 'default' }}
              onChange={() => onToggleCheckbox && onToggleCheckbox(i, line.replace('[ ]', '[x]'))}
            />
            <span>{trimmed.replace(/^\[ \]\s*/, '')}</span>
          </div>
        );
      }
      // Checkbox checked: "[x] ..."
      if (/^\[x\]/i.test(trimmed)) {
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '3px' }}>
            <input
              type="checkbox"
              defaultChecked
              style={{ marginTop: '3px', flexShrink: 0, cursor: onToggleCheckbox ? 'pointer' : 'default' }}
              onChange={() => onToggleCheckbox && onToggleCheckbox(i, line.replace(/\[x\]/i, '[ ]'))}
            />
            <span style={{ textDecoration: 'line-through', color: '#888' }}>{trimmed.replace(/^\[x\]\s*/i, '')}</span>
          </div>
        );
      }
      // Unordered bullet: "- ..." or "* ..."
      if (/^[-*]\s+/.test(trimmed)) {
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '3px', paddingRight: '4px' }}>
            <span style={{ flexShrink: 0, fontWeight: 'bold' }}>•</span>
            <span>{trimmed.replace(/^[-*]\s+/, '')}</span>
          </div>
        );
      }
      // Numbered list: "1. ..." or "12. ..."
      if (/^\d+\.\s+/.test(trimmed)) {
        const num = trimmed.match(/^(\d+)\./)[1];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '3px', paddingRight: '4px' }}>
            <span style={{ flexShrink: 0, minWidth: '18px', fontWeight: 'bold' }}>{num}.</span>
            <span>{trimmed.replace(/^\d+\.\s+/, '')}</span>
          </div>
        );
      }
      // Plain text (empty line → spacer)
      if (trimmed === '') return <div key={i} style={{ height: '6px' }} />;
      return <div key={i} style={{ marginBottom: '3px' }}>{trimmed}</div>;
    });
  };

  const isRegistrationApprovalTask = (typeId) => {
    const type = taskTypes.find(t => t.id === typeId);
    return type && type.name === "אישור הרשמה";
  };

  // Helper function to check by type_name from task object
  const isRegistrationApprovalTaskByName = (typeName) => {
    return typeName === "אישור הרשמה";
  };

  // Helper function to format ISO datetime
  const formatISODateTime = (isoString) => {
    if (!isoString) return '---';
    try {
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return isoString;
    }
  };

  // Helper function to translate user_info field names and values
  const translateUserInfoField = (key, value) => {
    // Skip approval_level - don't display it in UI
    if (key === 'approval_level') {
      return null;
    }

    const fieldTranslations = {
      'ID': t('ID'),
      'age': t('Age'),
      'city': t('City'),
      'email': t('Email'),
      'phone': t('Phone'),
      'gender': t('Gender'),
      'full_name': t('Full Name'),
      'created_at': t('Created At'),
      'want_tutor': t('Wants to be Tutor'),
    };

    let displayValue = value;
    
    // Handle datetime fields
    if (key === 'created_at') {
      displayValue = formatISODateTime(value);
    }
    // Handle gender (convert false/true to Hebrew)
    else if (key === 'gender') {
      if (value === false || value === 'false' || value === '0') {
        displayValue = t('Male');
      } else if (value === true || value === 'true' || value === '1') {
        displayValue = t('Female');
      }
    }
    // Handle boolean fields
    else if (key === 'want_tutor' && typeof value === 'boolean') {
      displayValue = value ? t('Yes') : t('No');
    }
    // Handle arrays
    else if (Array.isArray(value)) {
      displayValue = value.join(', ');
    }
    // Handle null/undefined
    else if (value === null || value === undefined) {
      displayValue = '---';
    }

    const translatedKey = fieldTranslations[key] || key;
    return { key: translatedKey, value: displayValue };
  };

  const openRejectRegistrationModal = (task) => {
    if (!isUserAdmin()) {
      showErrorToast(t, 'Only administrators can reject registrations', '');
      return;
    }
    setTaskToDelete(task);
    setRejectionReasonOption('');
    setRejectionReasonText('');
    setIsRejectRegistrationModalOpen(true);
  };

  const closeRejectRegistrationModal = () => {
    setTaskToDelete(null);
    setRejectionReasonOption('');
    setRejectionReasonText('');
    setIsRejectRegistrationModalOpen(false);
  };

  const confirmRejectRegistration = async () => {
    if (!taskToDelete) return;
    
    let finalReason = rejectionReasonOption;
    if (rejectionReasonOption === 'other') {
      finalReason = rejectionReasonText.trim();
      if (!finalReason || finalReason.length === 0) {
        toast.error(t('Please provide a rejection reason'));
        return;
      }
      if (finalReason.length > 200) {
        toast.error(t('Rejection reason must not exceed 200 characters'));
        return;
      }
    } else if (!finalReason) {
      toast.error(t('Please select a rejection reason'));
      return;
    }
    
    try {
      await axios.delete(`/api/tasks/delete/${taskToDelete.id}/`, {
        data: { rejection_reason: finalReason }
      });
      toast.success(t('Registration rejected and user deleted'));
      closeRejectRegistrationModal();
      await fetchData(true);
    } catch (error) {
      showErrorToast(t, 'Error rejecting registration', error);
    }
  };

  const openDeleteModal = (task) => {
    // For registration approval tasks, open rejection modal instead
    if (isRegistrationApprovalTaskByName(task.type_name)) {
      openRejectRegistrationModal(task);
      return;
    }
    
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setTaskToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    await handleDeleteTask(taskToDelete.id);
    closeDeleteModal();
  };

  const handleTaskTypeFilterChange = (taskTypeId) => {
    setSelectedTaskTypeFilters(prev => ({
      ...prev,
      [taskTypeId]: !prev[taskTypeId]
    }));
  };

  // Calculate dropdown position for fixed positioning
  const getDropdownPosition = () => {
    if (!taskTypeFilterRef.current) return { top: 0, left: 0 };
    const button = taskTypeFilterRef.current.querySelector('.status-filter-button');
    if (!button) return { top: 0, left: 0 };
    const rect = button.getBoundingClientRect();
    const dropdownWidth = 220;
    const viewportWidth = window.innerWidth;
    let left = rect.left;
    if (left + dropdownWidth > viewportWidth - 8) {
      left = Math.max(8, rect.right - dropdownWidth);
    }
    return {
      top: `${rect.bottom + 8}px`,
      left: `${left}px`,
      maxWidth: `${viewportWidth - 16}px`
    };
  };

  const handleFilter = () => {
    setFiltering(true);
    fetchData(true).finally(() => setFiltering(false));
  };

  return (
    <div className="tasks-main-content">
      <Sidebar className={isDragging ? "sidebar--dragging" : ""} />
      <InnerPageHeader title="לוח משימות" />
      {loading && <div className="loader">{t("Loading data...")}</div>}
      {!loading && (
        <>
          <div className="tasks-page-content">
            <div className="filter-create-container">
              <div className="create-task">
                <button
                  onClick={() => {
                    handleClosePopup();
                    setSelectedPendingTutor(null); // <-- Add this line
                    setIsModalOpen(true);
                  }}
                >
                  {t('Create New Task')}
                </button>
              </div>
              <div className="filter" style={{ display: isUserAdmin() ? 'none' : 'block' }}>
                <select
                  value={selectedFilter}
                  onChange={(e) => {
                    handleClosePopup(); // Close split view when filter changes
                    setSelectedFilter(e.target.value);
                    setSelectedChildFilter(''); // Reset child filter when task type changes
                  }}
                >
                  <option value="">{t("All Tasks - Click to filter by type")}</option>
                  {filteredTaskTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Task Type Filter - Admin gets checkboxes, Non-admin gets dropdown */}
              {isUserAdmin() && (
                // Admin: Task Type Filter Checkboxes Dropdown
                <div className="status-filter" ref={taskTypeFilterRef}>
                  <button 
                    className="status-filter-button"
                    onClick={() => {
                      setIsTaskTypeFilterOpen(!isTaskTypeFilterOpen);
                      setTaskTypeSearch('');
                    }}
                  >
                    סנן לפי סוג
                    <span className={`status-filter-chevron ${isTaskTypeFilterOpen ? 'open' : ''}`}>▼</span>
                  </button>
                  {isTaskTypeFilterOpen && ReactDOM.createPortal(
                    <div className="status-checkboxes-dropdown" style={getDropdownPosition()}>
                      {/* Search + select-all + uncheck-all row */}
                      {(() => {
                        const adminTaskTypes = taskTypes.filter(t => t.name !== "ראיון מועמד לחונכות" && t.name !== "התאמת חניך");
                        const allChecked = adminTaskTypes.length > 0 && adminTaskTypes.every(type => selectedTaskTypeFilters[type.id] !== false);
                        const someChecked = adminTaskTypes.some(type => selectedTaskTypeFilters[type.id] !== false);
                        return (
                          <div className="task-type-filter-header">
                            <label
                              className="task-type-filter-select-all"
                              onClick={e => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                onChange={e => {
                                  e.stopPropagation();
                                  const newFilters = {};
                                  adminTaskTypes.forEach(type => { newFilters[type.id] = e.target.checked; });
                                  setSelectedTaskTypeFilters(newFilters);
                                }}
                              />
                            </label>
                            <input
                              type="text"
                              placeholder="חיפוש..."
                              value={taskTypeSearch}
                              onChange={e => setTaskTypeSearch(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="task-type-filter-search"
                              autoFocus
                            />
                            <button
                              className="task-type-filter-clear-btn"
                              onClick={e => {
                                e.stopPropagation();
                                const cleared = {};
                                adminTaskTypes.forEach(type => { cleared[type.id] = false; });
                                setSelectedTaskTypeFilters(cleared);
                              }}
                              title="בטל סימון לכל"
                            >
                              נקה הכל
                            </button>
                          </div>
                        );
                      })()}
                      {/* Scrollable list */}
                      <div className="task-type-filter-list">
                        {taskTypes
                          .filter(type => type.name !== "ראיון מועמד לחונכות" && type.name !== "התאמת חניך")
                          .filter(type => !taskTypeSearch || type.name.includes(taskTypeSearch))
                          .map((type) => (
                            <label key={type.id} className="status-checkbox-label">
                              <input
                                type="checkbox"
                                checked={selectedTaskTypeFilters[type.id] !== false}
                                onChange={() => handleTaskTypeFilterChange(type.id)}
                              />
                              <span>{type.name}</span>
                            </label>
                          ))}
                        {taskTypes
                          .filter(type => type.name !== "ראיון מועמד לחונכות" && type.name !== "התאמת חניך")
                          .filter(type => !taskTypeSearch || type.name.includes(taskTypeSearch)).length === 0 && (
                          <div className="task-type-filter-empty">לא נמצאו תוצאות</div>
                        )}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              )}
              <div className="refresh">
                <button onClick={() => fetchData(true)}>{t("Refresh Task List")}</button>
              </div>
              {/* Admin-only: show only tasks assigned to me, ignoring every filter */}
              {isUserAdmin() && (
                <div className="refresh show-my-tasks">
                  <button
                    className={showOnlyMyTasks ? 'show-my-tasks-btn active' : 'show-my-tasks-btn'}
                    onClick={() => setShowOnlyMyTasks(prev => !prev)}
                    title="הצג רק משימות שמשויכות אליי — מבטל את כל הסינונים"
                  >
                    {showOnlyMyTasks ? 'הצג את כל המשימות' : 'הצג רק את המשימות שלי'}
                  </button>
                </div>
              )}
              {/* Manual trigger for monthly review task creation — dev/admin only */}
              {process.env.REACT_APP_TRIGGER_MONTHLY_CREATOR === 'true' && isUserAdmin() && (
                <div className="refresh">
                  <button
                    title="הפעל יצירת משימות ביקורת חודשיות ידנית"
                    style={{ background: '#7c3aed', color: 'white' }}
                    onClick={async () => {
                      try {
                        toast.info('⏳ מפעיל יצירת משימות ביקורת...', { autoClose: 3000 });
                        const res = await axios.post('/api/tasks/check-monthly-review/');
                        const d = res.data;
                        const skipStr = d.skip_reasons
                          ? Object.entries(d.skip_reasons).map(([k,v]) => `${k}:${v}`).join(', ')
                          : '';
                        toast.success(
                          `✅ נבדקו: ${d.families_checked} | נוצרו: ${d.tasks_created} | דולגו: ${d.tasks_skipped}${skipStr ? ` (${skipStr})` : ''}`,
                          { autoClose: 10000 }
                        );
                        if (d.tasks_created > 0) fetchData(true);
                      } catch (err) {
                        const msg = err.response?.data?.error || err.response?.data?.status || err.message;
                        showErrorToast(t, `שגיאה: ${msg}`, '');
                      }
                    }}
                  >
                    🔄 הפעל משימות ביקורת
                  </button>
                </div>
              )}
              <div className="actions">
                <label htmlFor="date-field">{t("Filter by field")}</label>
                <div className="filter">
                  <select
                    id="date-field"
                    value={selectedDateField}
                    onChange={e => setSelectedDateField(e.target.value)}
                    disabled={showOnlyMyTasks}
                  >
                    <option value="due_date">{t('Due Date')}</option>
                    <option value="created_at">{t('Created At')}</option>
                    <option value="updated_at">{t('Updated At')}</option>
                  </select>
                </div>
                <label htmlFor="date-from">{t("From")}</label>
                <input
                  type="date"
                  id="date-from"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="date-input"
                  disabled={showOnlyMyTasks}
                />
                <label htmlFor="date-to">{t("To")}</label>
                <input
                  type="date"
                  id="date-to"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="date-input"
                  disabled={showOnlyMyTasks}
                />
              </div>
            </div>
            {/* Kanban Board */}
            <div className="split-view"
              onClick={() => selectedTask && handleClosePopup()}
              style={{ position: 'relative' }}
            >
              <div className="kanban-board">
                <DragDropContext
                  onDragEnd={result => {
                    setIsDragging(false);
                    onDragEnd(result);
                  }}
                  onDragStart={() => setIsDragging(true)}
                >
                  <div className="kanban-columns">
                    {statusColumns.map((col) => (
                      <Droppable droppableId={col.key} key={col.key}>
                        {(provided) => (
                          <div className="kanban-column" ref={provided.innerRef} {...provided.droppableProps}>
                            <h3>{t(col.label)}</h3>
                            <div className="kanban-cards">
                              {tasksByStatus[col.key].length === 0 ? (
                                <div className="no-tasks">{t("No tasks currently displayed for this status")}</div>
                              ) : (
                                tasksByStatus[col.key].map((task, index) => (
                                  <Draggable 
                                    key={task.id} 
                                    draggableId={task.id.toString()} 
                                    index={index}
                                    isDragDisabled={isRegistrationApprovalTask(task.type) && !canManageRegistrationApproval()}
                                  >
                                    {(provided, snapshot) => (
                                      <div
                                        className="task-card"
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...(isRegistrationApprovalTask(task.type) && !canManageRegistrationApproval() ? {} : provided.dragHandleProps)}
                                        style={{
                                          backgroundColor: getTaskBgColor(task.due_date, task.status),
                                          ...provided.draggableProps.style
                                        }}
                                        onClick={e => {
                                          e.stopPropagation();
                                          setSelectedTask(task);
                                        }}
                                      >
                                        <h2>{getDisplayDescription(task)}</h2>
                                        <p>יש לבצע עד: {task.due_date}</p>
                                        {getLastReviewDate(task) && (
                                          <p>{t('Last review date')}: {getLastReviewDate(task)}</p>
                                        )}
                                        {!snapshot.isDragging && (
                                          <p>סטטוס: {task.status}</p>
                                        )}
                                        <p className='strong-p'>לביצוע על ידי: {task.assignee.replace(/_/g, ' ')}</p>
                                        {task.type_name === 'שיחת ביקורת' && (() => {
                                          if (task.status === 'הושלמה') return null;
                                          // Only show link if last conducted talk was 3+ months ago (or never)
                                          const threeMonthsAgo = new Date();
                                          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                                          let lastTalkDate = null;
                                          const lastTalkStr = task.child_last_review_talk_conducted;
                                          if (lastTalkStr) {
                                            if (/^\d{2}\/\d{2}\/\d{4}$/.test(lastTalkStr)) {
                                              const [d, m, y] = lastTalkStr.split('/');
                                              lastTalkDate = new Date(`${y}-${m}-${d}`);
                                            } else {
                                              lastTalkDate = new Date(lastTalkStr);
                                            }
                                          }
                                          // If there's a recent talk (within 3 months), don't show the link
                                          if (lastTalkDate && !isNaN(lastTalkDate.getTime()) && lastTalkDate > threeMonthsAgo) return null;
                                          const childName = getChildFullName(task.child, childrenOptions);
                                          const nameForFilter = childName !== '---' ? childName : (parseMonthlyReviewTask(task.description)?.childName || '');
                                          if (!nameForFilter) return null;
                                          return (
                                            <button
                                              className="review-page-link-btn"
                                              onClick={e => {
                                                e.stopPropagation();
                                                navigate('/reviewer', { state: { family: nameForFilter } });
                                              }}
                                              style={{ marginTop: '6px', fontSize: '0.78rem', background: 'transparent', color: '#1a3a5c', border: '1px solid #1a3a5c', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontWeight: '600' }}
                                            >
                                              ← שיחות ביקורת
                                            </button>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </Draggable>
                                ))
                              )}
                            </div>
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </DragDropContext>
              </div>
              {selectedTask && (
                <div
                  className="task-details-panel"
                  tabIndex={0}
                  onClick={e => e.stopPropagation()}
                  style={{ height: isRegistrationApprovalTaskByName(selectedTask.type_name) && selectedTask.user_info ? '160%' : '100%', 
                  overflowY: (isRegistrationApprovalTaskByName(selectedTask.type_name) && selectedTask.user_info) || window.innerHeight < document.documentElement.scrollHeight ? 'scroll' : 'auto'
                   }}
                >
                  <button className="close-btn" onClick={handleClosePopup}>×</button>
                  <button className="menu-btn" onClick={() => setMenuOpen(v => !v)}>⋮</button>
                  {menuOpen && (
                    <div className="dropdown-menu" ref={menuRef}>
                      {isRegistrationApprovalTaskByName(selectedTask.type_name) ? (
                        <>
                          {isUserAdmin() ? (
                            <>
                              <button
                                disabled={selectedTask.status === "הושלמה"}
                                className={selectedTask.status === "הושלמה" ? "disabled-btn" : ""}
                                onClick={() => { setMenuOpen(false); openDeleteModal(selectedTask); }}
                              >
                                {t('מחק')}
                              </button>
                            </>
                          ) : (
                            <p style={{ color: '#999', padding: '10px', margin: 0 }}>
                              {t('Only administrators can manage registration approvals')}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            disabled={selectedTask.status === "הושלמה" || isGuestUser()}
                            className={selectedTask.status === "הושלמה" || isGuestUser() ? "disabled-btn" : ""}
                            onClick={() => { setMenuOpen(false); handleEditTask(selectedTask); }}
                          >
                            {t('ערוך')}
                          </button>
                          {selectedTask.status === "בביצוע" && (
                            <button
                              disabled={isGuestUser()}
                              className={isGuestUser() ? "disabled-btn" : ""}
                              onClick={() => {
                                setMenuOpen(false);
                                handleMoveBackToTodo(selectedTask);
                              }}
                            >
                              {t('back to Todo')}
                            </button>
                          )}
                          <button onClick={() => { setMenuOpen(false); openDeleteModal(selectedTask); }} disabled={isGuestUser()}>{t('מחק')}</button>
                        </>
                      )}
                    </div>
                  )}
                  <div className="task-details-content">
                    <h2>{getDisplayDescription(selectedTask)}</h2>
                    <p>יש לבצע עד: {selectedTask.due_date}</p>
                    {getLastReviewDate(selectedTask) && (
                      <p>{t('Last review date')}: {getLastReviewDate(selectedTask)}</p>
                    )}
                    <p>סטטוס: {selectedTask.status}</p>
                    <p>נוצרה ב: {selectedTask.created}</p>
                    <p>עודכנה ב: {selectedTask.updated}</p>
                    <p>סוג משימה: {getTaskTypeName(selectedTask.type)}</p>
                    <p>לביצוע על ידי: {selectedTask.assignee.replace(/_/g, ' ')}</p>
                    {/* Show Child and Tutor only if NOT special task types */}
                    {!isInterviewTask(selectedTask.type) && !isFamilyAdditionTask(selectedTask.type) && !isRegistrationApprovalTaskByName(selectedTask.type_name) && !isTuteeMatchTaskByName(selectedTask.type_name) && !isFamilyGroupAssignmentTaskByName(selectedTask.type_name) && !isRemoveFamilyFromGroupTaskByName(selectedTask.type_name) && !isRefundTaskByName(selectedTask.type_name) && !isDevTaskByName(selectedTask.type_name) && !isLiamTaskByName(selectedTask.type_name) && (
                      <>
                        <p>חניך: {getChildFullName(selectedTask.child, childrenOptions)}</p>
                        <p>חונך: {getTutorFullName(selectedTask.tutor, tutorsOptions)}</p>
                        <p>שם האב: {selectedTask.father_name || '---'}</p>
                        <p>טלפון האב: {selectedTask.father_phone || '---'}</p>
                        <p>שם האם: {selectedTask.mother_name || '---'}</p>
                        <p>טלפון האם: {selectedTask.mother_phone || '---'}</p>
                      </>
                    )}
                    {/* Show Pending Tutor only if IS "ראיון מועמד לחונכות" */}
                    {isInterviewTask(selectedTask.type) && (
                      <p>
                        מועמד לחונכות: {getPendingOrGeneralTutorFullName(
                          selectedTask.pending_tutor,
                          pendingTutorsOptions,
                          generalVolunteersNotPending,
                          t)}
                      </p>
                    )}
                    {/* NEW: Show Tutee Match info for "התאמת חניך" tasks */}
                    {isTuteeMatchTaskByName(selectedTask.type_name) && (
                      <>
                        <h3>{t("Tutee Match Details")}</h3>
                        <p><strong>חונך:</strong> {selectedTask.tutee_match_info?.tutor_name || "---"}</p>
                        <p><strong>טלפון חונך:</strong> {selectedTask.tutee_match_info?.tutor_phone || "---"}</p>
                        <p><strong>חניך:</strong> {selectedTask.tutee_match_info?.child_name || "---"}</p>
                        <p><strong>כשירות:</strong> <span style={{ 
                          color: selectedTask.tutee_match_info?.eligibility === "עבר ראיון" ? "green" : "orange",
                          fontWeight: "bold"
                        }}>{selectedTask.tutee_match_info?.eligibility || "---"}</span></p>
                      </>
                    )}
                    {/* Show initial family data fields only for "הוספת משפחה" */}
                    {isFamilyAdditionTask(selectedTask.type) && (
                      <>
                        <h3>{t("Initial Family Details")}</h3>
                        <p>שמות: {selectedTask.names ? selectedTask.names : "---"}</p>
                        <p>טלפונים: {selectedTask.phones ? selectedTask.phones : "---"}</p>
                        <p>מידע נוסף: {selectedTask.other_information ? selectedTask.other_information : "---"}</p>
                      </>
                    )}
                    {/* Show user info for "אישור הרשמה" registration approval tasks */}
                    {isRegistrationApprovalTaskByName(selectedTask.type_name) && selectedTask.user_info && (
                      <>
                        <h3>{t("User Information")}</h3>
                        {Object.entries(selectedTask.user_info).map(([key, value]) => {
                          const translated = translateUserInfoField(key, value);
                          if (!translated) return null; // Skip fields that return null (like approval_level)
                          const { key: translatedKey, value: translatedValue } = translated;
                          return (
                            <p key={key}>
                              <strong>{translatedKey}:</strong> {translatedValue}
                            </p>
                          );
                        })}
                      </>
                    )}
                    {/* Show family details for "צירוף משפחה לקבוצה" task */}
                    {selectedTask.type_name === "צירוף משפחה לקבוצה" && selectedTask.family_details && (
                      <>
                        <h3>{t("Family Details for Group Assignment")}</h3>
                        <p><strong>שם הילד/ה:</strong> {selectedTask.family_details.child_name || "---"}</p>
                        <p><strong>גיל:</strong> {selectedTask.family_details.age_display || "---"}</p>
                        <p><strong>מין:</strong> {translateUserInfoField('gender', selectedTask.family_details.gender)?.value || "---"}</p>
                        <p><strong>עיר:</strong> {selectedTask.family_details.city || "---"}</p>
                        <p><strong>טלפון הורים:</strong> {selectedTask.family_details.parent_phone || "---"}</p>
                        <p><strong>בית חולים:</strong> {selectedTask.family_details.hospital || "---"}</p>
                        <p><strong>מצב חונכות:</strong> {selectedTask.family_details.tutoring_status || "---"}</p>
                        <p><strong>תאריך הרשמה:</strong> {selectedTask.family_details.registration_date || "---"}</p>
                      </>
                    )}
                    {/* Show family details for "הסרת משפחה מקבוצה" task */}
                    {selectedTask.type_name === "הסרת משפחה מקבוצה" && selectedTask.family_details && (
                      <>
                        <h3>{t("Family Details for Group Removal")}</h3>
                        <p><strong>שם הילד/ה:</strong> {selectedTask.family_details.child_name || "---"}</p>
                        <p><strong>גיל:</strong> {selectedTask.family_details.age_display || "---"}</p>
                        <p><strong>מין:</strong> {translateUserInfoField('gender', selectedTask.family_details.gender)?.value || "---"}</p>
                        <p><strong>עיר:</strong> {selectedTask.family_details.city || "---"}</p>
                        <p><strong>טלפון הורים:</strong></p>
                        <p><strong>טלפון האב:</strong> {selectedTask.family_details.father_phone || "---"}</p>
                        <p><strong>טלפון האם:</strong> {selectedTask.family_details.mother_phone || "---"}</p>
                        <p><strong>בית חולים:</strong> {selectedTask.family_details.hospital || "---"}</p>
                        <p><strong>סטטוס משפחה:</strong> {selectedTask.family_details.status || "---"}</p>
                        <p><strong>תאריך הרשמה:</strong> {selectedTask.family_details.registration_date || "---"}</p>
                      </>
                    )}
                    {/* Show explanation field — but not for refund tasks (explanation is the /refunds?highlight URL) */}
                    {selectedTask.explanation && !isRefundTaskByName(selectedTask.type_name) && !isDevTaskByName(selectedTask.type_name) && !isLiamTaskByName(selectedTask.type_name) && (
                      <p><strong>הסבר:</strong> {selectedTask.explanation}</p>
                    )}
                    {/* Dev/Liam task: rich-text explanation (bullets, numbered, checkboxes) */}
                    {(isDevTaskByName(selectedTask.type_name) || isLiamTaskByName(selectedTask.type_name)) && selectedTask.explanation && (
                      <div style={{ marginTop: '10px' }}>
                        <strong>פירוט משימה:</strong>
                        <div style={{
                          marginTop: '6px',
                          padding: '10px 14px',
                          background: '#f4f7fb',
                          borderRadius: '6px',
                          border: '1px solid #d0daea',
                          fontSize: '0.92rem',
                          lineHeight: '1.6',
                          direction: 'rtl',
                          textAlign: 'right',
                        }}>
                          {renderRichExplanation(selectedTask.explanation, (lineIdx, newLine) => {
                            const lines = (selectedTask.explanation || '').split('\n');
                            lines[lineIdx] = newLine;
                            setSelectedTask(prev => ({ ...prev, explanation: lines.join('\n') }));
                          })}
                        </div>
                      </div>
                    )}
                    {/* Refund task: show description + navigate button */}
                    {isRefundTaskByName(selectedTask.type_name) && (
                      <>
                        {selectedTask.explanation && (() => {
                          // Description format: "בקשת החזר הוצאות - {staff_full_name} - {amount}₪"
                          // Extract the requester name (middle segment between first and second " - ")
                          const descParts = (selectedTask.description || '').split(' - ');
                          const requesterName = descParts.length >= 2 ? descParts[1].trim() : '';
                          return (
                            <button
                              className="review-page-link-btn"
                              onClick={e => {
                                e.stopPropagation();
                                navigate('/refunds', { state: { search: requesterName } });
                              }}
                              style={{ marginTop: '8px', fontSize: '0.82rem', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 12px', cursor: 'pointer', fontWeight: '600' }}
                            >
                              ← עבור לדף החזרי הוצאות
                            </button>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {isEditModalOpen && (
            <div className={`modal show`} id="edit-task-modal">
              <div className="modal-content">
                <span className="close" onClick={() => setIsEditModalOpen(false)}>&times;</span>
                <h2>{t('Edit Task')}</h2>
                <label>{t('Task Type')}</label>
                <Select
                  id="type"
                  options={filteredTaskTypes.map((type) => ({ value: type.id, label: type.name }))}
                  value={selectedTaskType}
                  onChange={setSelectedTaskType}
                  isSearchable
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: errors.type ? 'red' : base.borderColor,
                    }),
                  }}
                />
                {errors.type && <p className="error-text">{errors.type}</p>}
                <label>{t('Due Date')}</label>
                <input
                  type="date"
                  id="due_date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    borderColor: errors.due_date ? 'red' : '',
                  }}
                />
                {errors.due_date && <p className="error-text">{errors.due_date}</p>}
                <label>{t('Assigned To')}</label>
                {console.log(
                  "staffOptions for assigned_to",
                  staffOptions.map(staff => ({ label: staff.label, role: staff.role }))
                )}
                <Select
                  id="assigned_to"
                  options={
                    isInterviewTask(selectedTaskType?.value)
                      ? staffOptions.filter(staff => !isTutorOrGeneralVolunteer(staff))
                      : staffOptions
                  } value={selectedStaff}
                  onChange={setSelectedStaff}
                  isSearchable
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: errors.assigned_to ? 'red' : base.borderColor,
                    }),
                  }}
                />
                {errors.assigned_to && <p className="error-text">{errors.assigned_to}</p>}
                {!isInterviewTask(selectedTaskType?.value) && !isFamilyAdditionTask(selectedTaskType?.value) && selectedTaskType?.label !== "הסרת משפחה מקבוצה" && (
                  <>
                    <label>{t('Child')}</label>
                    <Select
                      id="child"
                      options={childrenOptions}
                      value={selectedChild}
                      onChange={setSelectedChild}
                      placeholder={t('Select Child')}
                      isSearchable
                      isClearable
                    />
                    <label>{t('Tutor')}</label>
                    <Select
                      id="tutor"
                      options={tutorsOptions}
                      value={selectedTutor}
                      onChange={setSelectedTutor}
                      placeholder={t('Select Tutor')}
                      isSearchable
                      isClearable
                    />
                  </>
                )}
                {isInterviewTask(selectedTaskType?.value) && (
                  <>
                    <label>מועמד לחונכות</label>
                    <Select
                      id="pending_tutor"
                      options={groupedPendingTutorOptions}
                      value={selectedPendingTutor}
                      onChange={setSelectedPendingTutor}
                      placeholder={t('Select Pending Tutor')}
                      isSearchable
                      isClearable
                      isDisabled={selectedTask.status === 'הושלמה' || selectedTask.status === 'בביצוע'}
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: errors.pending_tutor ? 'red' : base.borderColor,
                        }),
                      }}
                    />
                    {errors.pending_tutor && <p className="error-text">{errors.pending_tutor}</p>}
                  </>
                )}
                {/* Explanation field */}
                <label>{isRichTaskLabel(selectedTaskType?.label) ? 'פירוט המשימה:' : 'הסבר:'}</label>
                {isRichTaskLabel(selectedTaskType?.label) && (
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    {[
                      { label: '• רשימה', insert: '- ' },
                      { label: '1. ממוספר', insert: '1. ' },
                      { label: '☐ משימה', insert: '[ ] ' },
                      { label: '☑ בוצע', insert: '[x] ' },
                    ].map(({ label, insert }) => (
                      <button
                        key={insert}
                        type="button"
                        onClick={() => {
                          const ta = document.getElementById('edit-dev-task-explanation');
                          if (!ta) return;
                          const lineStart = explanation.slice(0, ta.selectionStart).lastIndexOf('\n') + 1;
                          const newVal = explanation.slice(0, lineStart) + insert + explanation.slice(lineStart);
                          setExplanation(newVal);
                          setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = lineStart + insert.length; }, 0);
                        }}
                        style={{ fontSize: '0.78rem', padding: '3px 9px', borderRadius: '4px', border: '1px solid #c5d0e6', background: '#f0f4ff', cursor: 'pointer', color: '#1a3a5c' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  id="edit-dev-task-explanation"
                  className="scrollable-textarea"
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  style={isRichTaskLabel(selectedTaskType?.label) ? { minHeight: '120px', resize: 'vertical' } : {}}
                />
                <button onClick={handleUpdateTask}>{t('Update Task')}</button>
              </div>
            </div>
          )}
          {isModalOpen && (
            <div className={`modal show`} id="create-task-modal">
              <div className="modal-content">
                <span className="close" onClick={() => setIsModalOpen(false)}>&times;</span>
                <h2>יצירת משימה חדשה</h2>
                <label>סוג משימה</label>
                <Select
                  id="type"
                  options={filteredTaskTypes.map((type) => ({ value: type.id, label: type.name }))}
                  value={selectedTaskType}
                  onChange={setSelectedTaskType}
                  isSearchable
                  placeholder={t('Select Task Type')}
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: errors.type ? 'red' : base.borderColor,
                    }),
                  }}
                />
                {errors.type && <p className="error-text">{errors.type}</p>}
                <label>תאריך סופי לביצוע</label>
                <input
                  type="date"
                  id="due_date"
                  style={{
                    borderColor: errors.due_date ? 'red' : '',
                  }}
                />
                {errors.due_date && <p className="error-text">{errors.due_date}</p>}
                <label>משוייך ל</label>
                {console.log(
                  "staffOptions for assigned_to",
                  staffOptions.map(staff => ({ label: staff.label, role: staff.role }))
                )}
                {isRichTaskLabel(selectedTaskType?.label) ? (
                  <div style={{ padding: '8px 12px', background: '#f0f4ff', borderRadius: '6px', border: '1px solid #c5d0e6', color: '#1a3a5c', fontWeight: '600', marginBottom: '4px' }}>
                    {richTaskAssigneeName(selectedTaskType?.label)}
                  </div>
                ) : (
                <Select
                  id="assigned_to"
                  options={
                    isInterviewTask(selectedTaskType?.value)
                      ? staffOptions.filter(staff => !isTutorOrGeneralVolunteer(staff))
                      : staffOptions
                  }
                  value={selectedStaff}
                  onChange={setSelectedStaff}
                  placeholder={t('Select Assignee')}
                  isSearchable
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: errors.assigned_to ? 'red' : base.borderColor,
                    }),
                  }}
                />
                )}
                {errors.assigned_to && <p className="error-text">{errors.assigned_to}</p>}
                {!isInterviewTask(selectedTaskType?.value) && !isFamilyAdditionTask(selectedTaskType?.value) && selectedTaskType?.label !== "הסרת משפחה מקבוצה" && !isRichTaskLabel(selectedTaskType?.label) && (
                  <>
                    <label>ילד</label>
                    <Select
                      id="child"
                      options={childrenOptions}
                      value={selectedChild}
                      onChange={setSelectedChild}
                      placeholder={t('Select Child')}
                      isSearchable
                      isClearable
                    />
                    <label>חונך</label>
                    <Select
                      id="tutor"
                      options={tutorsOptions}
                      value={selectedTutor}
                      onChange={setSelectedTutor}
                      placeholder={t('Select Tutor')}
                      isSearchable
                      isClearable
                    />
                  </>
                )}
                {isInterviewTask(selectedTaskType?.value) && (
                  <>
                    <label>מועמד לחונכות</label>
                    <Select
                      id="pending_tutor"
                      options={groupedPendingTutorOptions}
                      value={selectedPendingTutor}
                      onChange={setSelectedPendingTutor}
                      placeholder={t('Select Pending Tutor')}
                      isSearchable
                      isClearable
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: errors.pending_tutor ? 'red' : base.borderColor,
                        }),
                      }}
                    />
                    {errors.pending_tutor && <p className="error-text">{errors.pending_tutor}</p>}
                  </>
                )}
                {/* Explanation field */}
                <label>{isRichTaskLabel(selectedTaskType?.label) ? 'פירוט המשימה:' : 'הסבר:'}</label>
                {isRichTaskLabel(selectedTaskType?.label) && (
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    {[
                      { label: '• רשימה', insert: '- ' },
                      { label: '1. ממוספר', insert: '1. ' },
                      { label: '☐ משימה', insert: '[ ] ' },
                      { label: '☑ בוצע', insert: '[x] ' },
                    ].map(({ label, insert }) => (
                      <button
                        key={insert}
                        type="button"
                        onClick={() => {
                          const ta = document.getElementById('dev-task-explanation');
                          if (!ta) return;
                          const start = ta.selectionStart;
                          const end = ta.selectionEnd;
                          const before = explanation.slice(0, start);
                          const after = explanation.slice(end);
                          // Insert at start of current line
                          const lineStart = before.lastIndexOf('\n') + 1;
                          const newVal = explanation.slice(0, lineStart) + insert + explanation.slice(lineStart);
                          setExplanation(newVal);
                          setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = lineStart + insert.length; }, 0);
                        }}
                        style={{ fontSize: '0.78rem', padding: '3px 9px', borderRadius: '4px', border: '1px solid #c5d0e6', background: '#f0f4ff', cursor: 'pointer', color: '#1a3a5c' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  id="dev-task-explanation"
                  className="scrollable-textarea"
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  style={isRichTaskLabel(selectedTaskType?.label) ? { minHeight: '120px', resize: 'vertical' } : {}}
                />
                <button onClick={handleSubmitTask} disabled={isGuestUser()}>צור</button>
              </div>
            </div>
          )}
          {isDeleteModalOpen && taskToDelete && (
            <Modal
              isOpen={isDeleteModalOpen}
              onRequestClose={closeDeleteModal}
              contentLabel="Delete Confirmation"
              className="delete-modal"
              overlayClassName="delete-modal-overlay"
            >
              <h2>{t('Are you sure you want to delete this task?')}</h2>
              <p style={{ color: 'red', fontWeight: 'bold' }}>
                {taskToDelete && isInterviewTask(taskToDelete.type)
                  ? t('Deleting an interview task will also remove the candidate from the pending tutors list')
                  : t('Deleting a task will remove all associated data')
                }
                <br /><br />
                {t('This action cannot be undone')}
                <br />
              </p>
              <div className="modal-actions">
                <button onClick={confirmDeleteTask} className="yes-button">
                  {t('Yes')}
                </button>
                <button onClick={closeDeleteModal} className="no-button">
                  {t('No')}
                </button>
              </div>
            </Modal>
          )}
          {isRejectRegistrationModalOpen && taskToDelete && (
            <Modal
              isOpen={isRejectRegistrationModalOpen}
              onRequestClose={closeRejectRegistrationModal}
              contentLabel="Reject Registration"
              className="delete-modal"
              overlayClassName="delete-modal-overlay"
            >
              <h2>{t('Reject Registration')}</h2>
              <p style={{ color: 'red', fontWeight: 'bold', marginBottom: '20px' }}>
                {t('Deleting this task will permanently remove the user from the system and delete all associated data.')}
                <br /><br />
                {t('This action cannot be undone')}
              </p>

              <h3 className='rejection-reason'>{t('Rejection Reason')}</h3>
              <div style={{ marginBottom: '15px' }}>
                <label className='rejection-reason'>
                  <input
                    type="radio"
                    name="rejection_reason"
                    value="regret"
                    checked={rejectionReasonOption === 'regret'}
                    onChange={(e) => setRejectionReasonOption(e.target.value)}
                  />
                  {t('Registered user regrets')}
                  <br />
                </label>
                <label className='rejection-reason'>
                  <input
                    type="radio"
                    name="rejection_reason"
                    value="breach"
                    checked={rejectionReasonOption === 'breach'}
                    onChange={(e) => setRejectionReasonOption(e.target.value)}
                  />
                  {t('Unfamiliar activity possible breach/spam/bot attack')}
                  <br />
                </label>
                <label className='rejection-reason'>
                  <input
                    type="radio"
                    name="rejection_reason"
                    value="other"
                    checked={rejectionReasonOption === 'other'}
                    onChange={(e) => setRejectionReasonOption(e.target.value)}
                  />
                  {t('Other')}
                  <br />
                </label>
              </div>

              {rejectionReasonOption === 'other' && (
                <div style={{ marginBottom: '15px' }}>
                  <textarea
                    value={rejectionReasonText}
                    onChange={(e) => setRejectionReasonText(e.target.value)}
                    placeholder={t('Please provide a reason (max 200 characters)')}
                    maxLength={200}
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      fontFamily: 'Arial, sans-serif',
                      resize: 'vertical',
                      fontSize: '24px',
                    }}
                  />
                  <p style={{ fontSize: '24px', color: '#666', marginTop: '5px' }}>
                    {rejectionReasonText.length}/200
                  </p>
                </div>
              )}

              <div className="modal-actions">
                <button onClick={confirmRejectRegistration} className="yes-button">
                  {t('Yes, Reject')}
                </button>
                <button onClick={closeRejectRegistrationModal} className="no-button">
                  {t('Cancel')}
                </button>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
};

export default Tasks;