import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig'; 
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { getStaff, getChildren, getTutors } from '../components/task_utils';  // Import utility functions for fetching data
import '../styles/common.css';
import '../styles/tasks.css';
import Select from 'react-select';  // Import react-select

const Tasks = () => {
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
  const [staffOptions, setStaffOptions] = useState([]);
  const [childrenOptions, setChildrenOptions] = useState([]);
  const [tutorsOptions, setTutorsOptions] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [selectedTaskType, setSelectedTaskType] = useState(null);
  const [loading, setLoading] = useState(tasks.length === 0); // Only if no data is loaded from cache
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility state

  const fetchData = async () => {
    try {
      const [tasksResponse, staffOptions, childrenOptions, tutorsOptions] = await Promise.all([
        axios.get('/api/tasks/').catch((error) => {
          console.error('Error fetching tasks:', error);
          return { data: { tasks: [], task_types: [] } }; // Fallback response
        }),
        getStaff().catch((error) => {
          console.error('Error fetching staff:', error);
          return [];
        }),
        getChildren().catch((error) => {
          console.error('Error fetching children:', error);
          return [];
        }),
        getTutors().catch((error) => {
          console.error('Error fetching tutors:', error);
          return [];
        }),
      ]);

      setTasks(tasksResponse.data.tasks || []);
      setTaskTypes(tasksResponse.data.task_types || []);
      setStaffOptions(staffOptions);
      setChildrenOptions(childrenOptions);
      setTutorsOptions(tutorsOptions);

      // Save tasks and task types to local storage
      localStorage.setItem('tasks', JSON.stringify(tasksResponse.data.tasks || []));
      localStorage.setItem('taskTypes', JSON.stringify(tasksResponse.data.task_types || []));
      localStorage.setItem('staffOptions', JSON.stringify(staffOptions));
      localStorage.setItem('childrenOptions', JSON.stringify(childrenOptions));
      localStorage.setItem('tutorsOptions', JSON.stringify(tutorsOptions));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false); // Turn off the spinner after the request is complete
    }
  };

  useEffect(() => {
    if (tasks.length === 0) {
      fetchData(); // Fetch data only if the cache is empty
    } else {
      setLoading(false); // If data exists in cache, no need to load
    }
  }, []);

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
  };

  const handleSubmitTask = async () => {
    const taskData = {
      due_date: document.getElementById('due_date').value,
      assigned_to: selectedStaff?.value,
      child: selectedChild?.value,
      tutor: selectedTutor?.value,
      type: selectedTaskType?.value, // Send the task type ID
    };

    try {
      const response = await axios.post('/api/tasks/create/', taskData);
      console.log('Task created:', response.data);

      // Reload all tasks after creating a new one
      await fetchData();

      setIsModalOpen(false); // Close the modal
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  return (
    <div className="main-content">
      <Sidebar />
      <InnerPageHeader title="לוח משימות" />
      {loading && <div className="loader">הנתונים בטעינה...</div>} {/* Spinner displayed until data is loaded */}
      {!loading && (
        <>
          <div className="page-content">
            <div className="filter">
              <select>
                <option value="">סנן לפי סוג משימה</option>
                {taskTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="tasks" direction="horizontal">
              {(provided) => (
                <div className="tasks-container" ref={provided.innerRef} {...provided.droppableProps}>
                  {tasks.length === 0 ? (
                    <div className="no-tasks">אין כרגע משימות לביצוע</div>
                  ) : (
                    tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                        {(provided) => (
                          <div className="task"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}>
                            <h2>{task.description}</h2>
                            <p>יש לבצע עד: {task.due_date} ({task.due_date_hebrew})</p>
                            <p>סטטוס: {task.status}</p>
                            <div className="actions">
                              <button onClick={() => handleTaskClick(task)}>מידע</button>
                              <button>ערוך</button>
                              <button>עדכן</button>
                              <button>מחק</button>
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
          <div className="create-task">
            <button onClick={() => setIsModalOpen(true)}>צור משימה חדשה</button>
          </div>
          {isModalOpen && (
            <div className={`modal show`} id="create-task-modal">
              <div className="modal-content">
                <span className="close" onClick={() => setIsModalOpen(false)}>&times;</span>
                <h2>יצירת משימה חדשה</h2>
                <label>סוג משימה</label>
                <Select
                  id="type"
                  options={taskTypes.map((type) => ({ value: type.id, label: type.name }))}
                  value={selectedTaskType}
                  onChange={setSelectedTaskType}
                  isSearchable
                />
                <label>תאריך סופי לביצוע</label>
                <input type="date" id="due_date" />
                <br />
                <label>משוייך ל</label>
                <Select
                  id="assigned_to"
                  options={staffOptions}
                  value={selectedStaff}
                  onChange={setSelectedStaff}
                  isSearchable
                />
                <label>ילד</label>
                <Select
                  id="child"
                  options={childrenOptions}
                  value={selectedChild}
                  onChange={setSelectedChild}
                  isSearchable
                />
                <label>חונך</label>
                <Select
                  id="tutor"
                  options={tutorsOptions}
                  value={selectedTutor}
                  onChange={setSelectedTutor}
                  isSearchable
                />
                <button onClick={handleSubmitTask}>צור</button>
              </div>
            </div>
          )}
                {selectedTask && (
          <div className="task-popup">
            <div className="task-popup-content">
              <h2>{selectedTask.description}</h2>
              <p>יש לבצע עד: {selectedTask.due_date} ({selectedTask.due_date_hebrew})</p>
              <p>סטטוס: {selectedTask.status}</p>
              <p>נוצרה ב: {selectedTask.created} ({selectedTask.created_hebrew})</p>
              <p>עודכנה ב: {selectedTask.updated} ({selectedTask.updated_hebrew})</p>
              <p>סוג משימה: {getTaskTypeName(selectedTask.type)}</p>
              <p>לביצוע על ידי: {selectedTask.assignee}</p>
              <p>חניך: {selectedTask.child}</p>
              <p>חונך: {selectedTask.tutor}</p>
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