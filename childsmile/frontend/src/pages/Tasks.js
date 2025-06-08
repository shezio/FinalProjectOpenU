import React, { useState, useEffect, useRef } from 'react';
import axios from '../axiosConfig';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { getStaff, getChildren, getTutors, getChildFullName, getTutorFullName, getPendingTutors, getGeneralVolunteersNotPending, isTutorOrGeneralVolunteer } from '../components/utils';
import '../styles/common.css';
import '../styles/tasks.css';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { showErrorToast, showWarningToast } from '../components/toastUtils';
import { useTranslation } from 'react-i18next';
import "../i18n";
import { useLocation } from 'react-router-dom';

const statusColumns = [
  { key: "לא הושלמה", label: "לא הושלמה" },
  { key: "בביצוע", label: "בביצוע" },
  { key: "הושלמה", label: "הושלמה" }
];

const Tasks = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tasks')) || [];
    } catch {
      return [];
    }
  });
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
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [taskToUpdate, setTaskToUpdate] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const menuRef = useRef();
  const location = useLocation();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

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
      if (forceFetch) {
        localStorage.removeItem('tasks');
        localStorage.removeItem('taskTypes');
        localStorage.removeItem('staffOptions');
        localStorage.removeItem('childrenOptions');
        localStorage.removeItem('tutorsOptions');
        localStorage.removeItem('pendingTutorsOptions');
        localStorage.removeItem('generalVolunteersNotPending');
      }
      const [tasksResponse, staffOptions, childrenOptions, tutorsOptions, pendingTutorsOptions, generalVolunteersNotPending] = await Promise.all([
        axios.get('/api/tasks/').catch((error) => {
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
      ]);

      const newTasks = tasksResponse.data.tasks || [];
      const newTaskTypes = tasksResponse.data.task_types || [];
      const cachedPermissions = JSON.parse(localStorage.getItem('permissions')) || [];
      const newPendingTutors = pendingTutorsOptions;
      const newGeneralVolunteersNotPending = generalVolunteersNotPending;

      setStaffOptions(staffOptions);
      setChildrenOptions(childrenOptions);
      setTutorsOptions(tutorsOptions);
      setPendingTutorsOptions(newPendingTutors);
      setGeneralVolunteersNotPending(newGeneralVolunteersNotPending);
      setPermissions(cachedPermissions);

      const filteredTypes = newTaskTypes.filter((taskType) =>
        cachedPermissions.some(
          (permission) =>
            permission.resource === taskType.resource &&
            permission.action === taskType.action
        )
      );
      setFilteredTaskTypes(filteredTypes);

      const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
      const storedTaskTypes = JSON.parse(localStorage.getItem('taskTypes')) || [];

      const isTasksDifferent = JSON.stringify(newTasks) !== JSON.stringify(storedTasks);
      const isTaskTypesDifferent = JSON.stringify(newTaskTypes) !== JSON.stringify(storedTaskTypes);

      if (isTasksDifferent) {
        setTasks(newTasks);
        localStorage.setItem('tasks', JSON.stringify(newTasks));
      }
      if (isTaskTypesDifferent) {
        setTaskTypes(newTaskTypes);
        localStorage.setItem('taskTypes', JSON.stringify(newTaskTypes));
      }
      localStorage.setItem('staffOptions', JSON.stringify(staffOptions));
      localStorage.setItem('childrenOptions', JSON.stringify(childrenOptions));
      localStorage.setItem('tutorsOptions', JSON.stringify(tutorsOptions));
      localStorage.setItem('pendingTutorsOptions', JSON.stringify(newPendingTutors));
      localStorage.setItem('generalVolunteersNotPending', JSON.stringify(newGeneralVolunteersNotPending));
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

  // Group tasks by status for Kanban columns
  const tasksByStatus = statusColumns.reduce((acc, col) => {
    acc[col.key] = tasks
      .filter(
        (task) =>
          (!selectedFilter || task.type === parseInt(selectedFilter)) &&
          task.status === col.key
      );
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
  };

  const handleSubmitTask = async () => {
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
    setIsEditModalOpen(true);
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
      status: taskToEdit.status,
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

  return (
    <div className="tasks-main-content">
      <Sidebar className={isDragging ? "sidebar--dragging" : ""} />
      <InnerPageHeader title="לוח משימות" />
      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        className="toast-rtl"
        rtl={true}
      />
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
              <div className="filter">
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                >
                  <option value="">{t("All Tasks - Click to filter by type")}</option>
                  {filteredTaskTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="refresh">
                <button onClick={() => fetchData(true)}>{t("Refresh Task List")}</button>
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
                                  <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        className="task-card"
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                          backgroundColor: getTaskBgColor(task.due_date, task.status),
                                          ...provided.draggableProps.style
                                        }}
                                        onClick={e => {
                                          e.stopPropagation();
                                          setSelectedTask(task);
                                        }}
                                      >
                                        <h2>{task.description}</h2>
                                        <p>יש לבצע עד: {task.due_date}</p>
                                        {!snapshot.isDragging && (
                                          <p>סטטוס: {task.status}</p>
                                        )}
                                        <p className='strong-p'>לביצוע על ידי: {task.assignee}</p>
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
                >
                  <button className="close-btn" onClick={handleClosePopup}>×</button>
                  <button className="menu-btn" onClick={() => setMenuOpen(v => !v)}>⋮</button>
                  {menuOpen && (
                    <div className="dropdown-menu" ref={menuRef}>
                      <button
                        disabled={selectedTask.status === "הושלמה"}
                        className={selectedTask.status === "הושלמה" ? "disabled-btn" : ""}
                        onClick={() => { setMenuOpen(false); handleEditTask(selectedTask); }}
                      >
                        {t('ערוך')}
                      </button>
                      <button onClick={() => { setMenuOpen(false); handleDeleteTask(selectedTask.id); }}>{t('מחק')}</button>
                    </div>
                  )}
                  <div className="task-details-content">
                    <h2>{selectedTask.description}</h2>
                    <p>יש לבצע עד: {selectedTask.due_date}</p>
                    <p>סטטוס: {selectedTask.status}</p>
                    <p>נוצרה ב: {selectedTask.created}</p>
                    <p>עודכנה ב: {selectedTask.updated}</p>
                    <p>סוג משימה: {getTaskTypeName(selectedTask.type)}</p>
                    <p>לביצוע על ידי: {selectedTask.assignee}</p>
                    {/* Show Child and Tutor only if NOT "ראיון מועמד לחונכות" */}
                    {!isInterviewTask(selectedTask.type) && !isFamilyAdditionTask(selectedTask.type) && (
                      <>
                        <p>חניך: {getChildFullName(selectedTask.child, childrenOptions)}</p>
                        <p>חונך: {getTutorFullName(selectedTask.tutor, tutorsOptions)}</p>
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
                    {/* Show initial family data fields only for "הוספת משפחה" */}
                    {isFamilyAdditionTask(selectedTask.type) && (
                      <>
                        <h3>{t("Initial Family Details")}</h3>
                        <p>שמות: {selectedTask.names ? selectedTask.names : "---"}</p>
                        <p>טלפונים: {selectedTask.phones ? selectedTask.phones : "---"}</p>
                        <p>מידע נוסף: {selectedTask.other_information ? selectedTask.other_information : "---"}</p>
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
                {!isInterviewTask(selectedTaskType?.value) && !isFamilyAdditionTask(selectedTaskType?.value) && (
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
                {isFamilyAdditionTask(selectedTaskType?.value) && (
                  <>
                    <h3>{t("Initial Family Details")}</h3>
                    <p>שמות: {selectedTask.names ? selectedTask.names : "---"}</p>
                    <p>טלפונים: {selectedTask.phones ? selectedTask.phones : "---"}</p>
                    <p>מידע נוסף: {selectedTask.other_information ? selectedTask.other_information : "---"}</p>
                  </>
                )}
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
                {errors.assigned_to && <p className="error-text">{errors.assigned_to}</p>}
                {!isInterviewTask(selectedTaskType?.value) && !isFamilyAdditionTask(selectedTaskType?.value) && (
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
                <button onClick={handleSubmitTask}>צור</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Tasks;