import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { getStaff, getChildren, getTutors, getChildFullName, getTutorFullName, getPendingTutors, getPendingTutorFullName } from '../components/utils';  // Import utility functions for fetching data
import '../styles/common.css';
import '../styles/tasks.css';
import Select from 'react-select';  // Import react-select
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// import i18n from C:\Dev\FinalProjectOpenU\childsmile\frontend\src\i18n.js
import { showErrorToast } from '../components/toastUtils'; // Import the error toast utility function
import { useTranslation } from 'react-i18next'; // Import translation hook
import "../i18n"; // Import i18n configuration

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
  const [filteredTaskTypes, setFilteredTaskTypes] = useState([]); // Filtered task types for the dropdown
  const [permissions, setPermissions] = useState([]); // User permissions
  const [staffOptions, setStaffOptions] = useState([]);
  const [childrenOptions, setChildrenOptions] = useState([]);
  const [tutorsOptions, setTutorsOptions] = useState([]);
  const [pendingTutorsOptions, setPendingTutorsOptions] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [selectedPendingTutor, setSelectedPendingTutor] = useState(null); // State for selected pending tutor
  const [selectedTaskType, setSelectedTaskType] = useState(null);
  const [loading, setLoading] = useState(tasks.length === 0); // Only if no data is loaded from cache
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility state
  const [errors, setErrors] = useState({}); // Track validation errors
  const [selectedFilter, setSelectedFilter] = useState(''); // Default filter is empty (show all)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false); // Modal visibility
  const [selectedStatus, setSelectedStatus] = useState(''); // Selected status
  const [taskToUpdate, setTaskToUpdate] = useState(null); // Task being updated
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Edit modal visibility
  const [taskToEdit, setTaskToEdit] = useState(null); // Task being edited
  const [dueDate, setDueDate] = useState(''); // Due date state

  const getTaskBgColor = (dueDateStr, status) => {
    if (status === "הושלמה") return "#d4edda"; // Pale green if completed
    
    if (!dueDateStr) return "#fff";
    // Parse "DD/MM/YYYY" format
    const [day, month, year] = dueDateStr.split('/').map(Number);
    if (!day || !month || !year) return "#fff";
    const dueDate = new Date(year, month - 1, day);
    const now = new Date();
    // Remove time part for comparison
    now.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < now) {
      return "#ffcccc"; // Red for overdue
    }
    // Check if due this week (Sunday-Saturday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    if (dueDate >= weekStart && dueDate <= weekEnd) {
      return "#fff7cc"; // Yellow for this week
    }
    return "#fff"; // Pale white for future
  };

  const fetchData = async (forceFetch = false) => {
    // If not forcing a fetch and tasks already exist in local storage, skip fetching
    setLoading(true); // Show loading spinner while fetching data

    try {
      if (forceFetch) {
        // Clear local storage for the resources being fetched
        localStorage.removeItem('tasks');
        localStorage.removeItem('taskTypes');
        localStorage.removeItem('staffOptions');
        localStorage.removeItem('childrenOptions');
        localStorage.removeItem('tutorsOptions');
        localStorage.removeItem('pendingTutorsOptions');
      }
      const [tasksResponse, staffOptions, childrenOptions, tutorsOptions, pendingTutorsOptions] = await Promise.all([
        axios.get('/api/tasks/').catch((error) => {
          console.error('Error fetching tasks:', error);
          showErrorToast(t, 'Error fetching tasks', error); // Use the reusable function
          return { data: { tasks: [], task_types: [] } }; // Fallback response
        }),
        getStaff().catch((error) => {
          console.error('Error fetching staff:', error);
          showErrorToast(t, 'Error fetching staff', error); // Use the reusable function
          return [];
        }),
        getChildren().catch((error) => {
          console.error('Error fetching children:', error);
          showErrorToast(t, 'Error fetching children', error); // Use the reusable function
          return [];
        }),
        getTutors().catch((error) => {
          console.error('Error fetching tutors:', error);
          showErrorToast(t, 'Error fetching tutors', error); // Use the reusable function
          return [];
        }),
        getPendingTutors().catch((error) => {
          console.error('Error fetching pending tutors:', error);
          showErrorToast(t, 'Error fetching pending tutors', error); // Use the reusable function
          return [];
        }),
      ]);

      const newTasks = tasksResponse.data.tasks || [];
      const newTaskTypes = tasksResponse.data.task_types || [];
      const cachedPermissions = JSON.parse(localStorage.getItem('permissions')) || [];
      const newPendingTutors = pendingTutorsOptions;

      // Always update staff, children, and tutors options
      setStaffOptions(staffOptions);
      setChildrenOptions(childrenOptions);
      setTutorsOptions(tutorsOptions);
      setPendingTutorsOptions(newPendingTutors);
      setPermissions(cachedPermissions);

      const filteredTypes = newTaskTypes.filter((taskType) =>
        cachedPermissions.some(
          (permission) =>
            permission.resource === taskType.resource &&
            permission.action === taskType.action
        )
      );
      setFilteredTaskTypes(filteredTypes);

      // Compare fetched data with local storage data
      const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
      const storedTaskTypes = JSON.parse(localStorage.getItem('taskTypes')) || [];

      const isTasksDifferent = JSON.stringify(newTasks) !== JSON.stringify(storedTasks);
      const isTaskTypesDifferent = JSON.stringify(newTaskTypes) !== JSON.stringify(storedTaskTypes);

      // Update state and local storage only if there is a difference
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
    } catch (error) {
      console.error('Error fetching data:', error);
      showErrorToast(t, 'Error fetching data', error); // Use the reusable function
    } finally {
      setLoading(false); // Turn off the spinner after the request is complete
    }
  };

  useEffect(() => {
    fetchData(); // Fetch data only if tasks are not already in local storage
  }, []); // Empty dependency array ensures this runs only once on page load

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTasks(items);
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
    // Validate required fields
    if (!selectedTaskType) {
      newErrors.type = "זהו שדה חובה";
    }
    if (!document.getElementById('due_date').value) {
      newErrors.due_date = "זהו שדה חובה";
    }
    if (!selectedStaff) {
      newErrors.assigned_to = "זהו שדה חובה";
    }

    // If there are errors, update the state and stop submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear errors if validation passes
    setErrors({});
    const taskData = {
      due_date: document.getElementById('due_date').value,
      assigned_to: selectedStaff?.value,
      child: selectedChild?.value,
      tutor: selectedTutor?.value,
      pending_tutor: selectedPendingTutor?.value, // Send the correct pending_tutor_id
      type: selectedTaskType?.value, // Send the task type ID
    };

    try {
      const response = await axios.post('/api/tasks/create/', taskData);
      console.log('Task created:', response.data);

      if (response.status === 201) {
        setIsModalOpen(false); // Close the modal
        toast.success(t('Task created successfully')); // Show success toast
        await fetchData(true); // Force fetch to reload tasks
      }
    } catch (error) {
      console.error('Error creating task:', error);
      showErrorToast(t, 'Error creating task', error); // Use the reusable function
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`/api/tasks/delete/${taskId}/`); // Delete the task from the server
      setTasks(tasks.filter((task) => task.id !== taskId)); // Update the local state
      toast.success(t('Task deleted successfully')); // Show success toast
      await fetchData(true); // Force fetch to reload tasks
    } catch (error) {
      console.error('Error deleting task:', error);
      showErrorToast(t, 'Error deleting task', error); // Use the reusable function
    }
  };

  // func to update only status when עדכן סטטוס is clicked
  const handleUpdateStatus = (task) => {
    setTaskToUpdate(task); // Set the task being updated
    setIsStatusModalOpen(true); // Open the modal
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedStatus) {
      toast.error(t('Please select a status')); // Show error if no status is selected
      return;
    }

    try {
      await axios.put(`/api/tasks/update-status/${taskToUpdate.id}/`, { status: selectedStatus }); // Update the task status on the server
      toast.success(t('Task updated successfully')); // Show success toast
      setIsStatusModalOpen(false); // Close the modal
      await fetchData(true); // Force fetch to reload tasks
    } catch (error) {
      console.error('Error updating task:', error);
      showErrorToast(t, 'Error updating task', error); // Use the reusable function
    }
  };

  const handleEditTask = (task) => {
    setTaskToEdit(task); // Set the task being edited
    setSelectedTaskType({ value: task.type, label: getTaskTypeName(task.type) }); // Pre-fill task type
    setSelectedStaff({ value: task.assignee, label: task.assignee }); // Pre-fill assigned staff
    setSelectedChild(childrenOptions.find((child) => child.value === task.child) || null); // Pre-fill child
    setSelectedTutor(tutorsOptions.find((tutor) => tutor.value === task.tutor) || null); // Pre-fill tutor
    setSelectedPendingTutor(pendingTutorsOptions.find((pendingTutor) => pendingTutor.value === task.pending_tutor) || null); // Pre-fill pending tutor
    setDueDate(''); // Clear the due date field
    setIsEditModalOpen(true); // Open the edit modal
  };

  const handleUpdateTask = async () => {
    const newErrors = {};
    // Validate required fields
    if (!selectedTaskType) {
      newErrors.type = "זהו שדה חובה";
    }
    if (!document.getElementById('due_date').value) {
      newErrors.due_date = "זהו שדה חובה";
    }
    if (!selectedStaff) {
      newErrors.assigned_to = "זהו שדה חובה";
    }

    // If there are errors, update the state and stop submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear errors if validation passes
    setErrors({});
    const updatedTaskData = {
      description: taskToEdit.description, // Keep the existing description
      due_date: document.getElementById('due_date').value,
      assigned_to: selectedStaff?.value,
      child: selectedChild?.value,
      tutor: selectedTutor?.value,
      pending_tutor: selectedPendingTutor?.value,
      type: selectedTaskType?.value, // Send the task type ID
      status: taskToEdit.status, // Keep the existing status
    };

    try {
      const response = await axios.put(`/api/tasks/update/${taskToEdit.id}/`, updatedTaskData);
      console.log('Task updated:', response.data);

      if (response.status === 200) {
        setIsEditModalOpen(false); // Close the modal
        toast.success(t('Task updated successfully')); // Show success toast
        await fetchData(true); // Force fetch to reload tasks
      }
    } catch (error) {
      console.error('Error updating task:', error);
      showErrorToast(t, 'Error updating task', error); // Use the reusable function
    }
  };

  return (
    <div className="tasks-main-content">
      <Sidebar />
      <InnerPageHeader title="לוח משימות" />
      <ToastContainer
        position="top-center" // Center the toast
        autoClose={2000} // Auto-close after 3 seconds
        hideProgressBar={false} // Show the progress bar
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        className="toast-rtl" // Apply the RTL class to all toasts
        rtl={true} // Ensure progress bar moves from left to right
      />
      {loading && <div className="loader">{t("Loading data...")}</div>}
      {/* Spinner displayed until data is loaded */}
      {!loading && (
        <>
          <div className="tasks-page-content">
            <div className="filter-create-container">
              <div className="create-task">
                <button
                  onClick={() => {
                    handleClosePopup(); // Clear all fields before opening the modal
                    setIsModalOpen(true);
                  }}
                >
                  {t('Create New Task')}
                </button>
              </div>
              <div className="filter">
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)} // Update the filter state
                >
                  <option value="">{t("All Tasks - Click to filter by type")}</option>
                  {filteredTaskTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">{t("All Statuses - Click to filter by status")}</option>
                  <option value="לא הושלמה">{t("לא הושלמה")}</option>
                  <option value="בביצוע">{t("בביצוע")}</option>
                  <option value="הושלמה">{t("הושלמה")}</option>
                </select>
              </div>
              <div className="refresh">
                <button onClick={() => fetchData(true)}>{t("Refresh Task List")}</button> {/* Force fetch data */}
              </div>
            </div>
            <div className="tasks-layout">
              <div className="tasks-container-wrapper">
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="tasks" direction="horizontal">
                    {(provided) => (
                      <div
                        className="tasks-container"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {tasks.length === 0 ? (
                          <div className="no-tasks">אין כרגע משימות לביצוע</div>
                        ) : (
                          tasks
                            .filter(
                              (task) =>
                                (!selectedFilter || task.type === parseInt(selectedFilter)) &&
                                (!selectedStatus || task.status === selectedStatus)
                            )
                            .map((task, index) => (
                              <Draggable
                                key={task.id}
                                draggableId={task.id.toString()}
                                index={index}
                              >
                                {(provided) => (
                                  <div
                                    className="task"
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      backgroundColor: getTaskBgColor(task.due_date, task.status),
                                      ...provided.draggableProps.style
                                    }}
                                  >
                                    <h2>{task.description}</h2>
                                    <p>
                                      יש לבצע עד: {task.due_date}
                                    </p>
                                    <p>סטטוס: {task.status}</p>
                                    <p className='strong-p'>לביצוע על ידי: {task.assignee}</p>
                                    <div className="actions">
                                      <button onClick={() => handleTaskClick(task)}>מידע</button>
                                      <button onClick={() => handleEditTask(task)}>ערוך</button>
                                      <button onClick={() => handleUpdateStatus(task)}>עדכן סטטוס</button>
                                      <button onClick={() => handleDeleteTask(task.id)}>מחק</button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          </div>
          {isStatusModalOpen && (
            <div className="modal show" id="status-update-modal">
              <div className="modal-content">
                <span className="close" onClick={() => setIsStatusModalOpen(false)}>&times;</span>
                <h2>{t('Update Task Status')}</h2>
                <p>{t('Select a new status for the task')}:</p>
                <div className="status-dropdown">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="" disabled>
                      {t('Select a status')}
                    </option>
                    <option value="לא הושלמה">{t('לא הושלמה')}</option>
                    <option value="בביצוע">{t('בביצוע')}</option>
                    <option value="הושלמה">{t('הושלמה')}</option>
                  </select>
                </div>
                <button onClick={handleConfirmStatusUpdate}>{t('בצע עדכון')}</button>
              </div>
            </div>
          )}
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
                  value={dueDate} // Bind to state
                  onChange={(e) => setDueDate(e.target.value)} // Update state on change
                  style={{
                    borderColor: errors.due_date ? 'red' : '',
                  }}
                />
                {errors.due_date && <p className="error-text">{errors.due_date}</p>}
                <label>{t('Assigned To')}</label>
                <Select
                  id="assigned_to"
                  options={staffOptions}
                  value={selectedStaff}
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
                <label>{t('Child')}</label>
                <Select
                  id="child"
                  options={childrenOptions}
                  value={selectedChild}
                  onChange={setSelectedChild}
                  placeholder={t('Select Child')} // Add the translated placeholder
                  isSearchable
                  isClearable
                />
                <label>{t('Tutor')}</label>
                <Select
                  id="tutor"
                  options={tutorsOptions}
                  value={selectedTutor}
                  onChange={setSelectedTutor}
                  placeholder={t('Select Tutor')} // Add the translated placeholder
                  isSearchable
                  isClearable
                />
                <label>{t('Pending Tutor')}</label>
                <Select
                  id="pending_tutor"
                  options={pendingTutorsOptions}
                  value={selectedPendingTutor}
                  onChange={setSelectedPendingTutor}
                  placeholder={t('Select Pending Tutor')} // Add the translated placeholder
                  isSearchable
                  isClearable
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
                  placeholder={t('Select Task Type')} // Add the translated placeholder
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
                <Select
                  id="assigned_to"
                  options={staffOptions}
                  value={selectedStaff}
                  onChange={setSelectedStaff}
                  placeholder={t('Select Assignee')} // Add the translated placeholder
                  isSearchable
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: errors.assigned_to ? 'red' : base.borderColor,
                    }),
                  }}
                />
                {errors.assigned_to && <p className="error-text">{errors.assigned_to}</p>}
                <label>ילד</label>
                <Select
                  id="child"
                  options={childrenOptions}
                  value={selectedChild}
                  onChange={setSelectedChild}
                  placeholder={t('Select Child')} // Add the translated placeholder
                  isSearchable
                  isClearable
                />
                <label>חונך</label>
                <Select
                  id="tutor"
                  options={tutorsOptions}
                  value={selectedTutor}
                  onChange={setSelectedTutor}
                  placeholder={t('Select Tutor')} // Add the translated placeholder
                  isSearchable
                  isClearable
                />
                <label>מועמד לחונכות</label>
                <Select
                  id="pending_tutor"
                  options={pendingTutorsOptions}
                  value={selectedPendingTutor}
                  onChange={setSelectedPendingTutor}
                  placeholder={t('Select Pending Tutor')} // Add the translated placeholder
                  isSearchable
                  isClearable
                />
                <button onClick={handleSubmitTask}>צור</button>
              </div>
            </div>
          )}
          {selectedTask && (
            <div className="task-popup">
              <div className="task-popup-content">
                <h2>{selectedTask.description}</h2>
                <p>יש לבצע עד: {selectedTask.due_date}</p>
                <p>סטטוס: {selectedTask.status}</p>
                <p>נוצרה ב: {selectedTask.created}</p>
                <p>עודכנה ב: {selectedTask.updated}</p>
                <p>סוג משימה: {getTaskTypeName(selectedTask.type)}</p>
                <p>לביצוע על ידי: {selectedTask.assignee}</p>
                <p>חניך: {getChildFullName(selectedTask.child, childrenOptions)}</p>
                <p>חונך: {getTutorFullName(selectedTask.tutor, tutorsOptions)}</p>
                <p>מועמד לחונכות: {getPendingTutorFullName(selectedTask.pending_tutor, pendingTutorsOptions)}</p>
                <button onClick={handleClosePopup}>סגור</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Tasks;