import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from '../axiosConfig';  // Import the configured Axios instance
import '../styles/common.css';
import '../styles/tasks.css';
import Select from 'react-select';  // Import react-select

const Tasks = () => {
  const [tasks, setTasks] = useState(JSON.parse(localStorage.getItem('tasks')) || []);  // Load data from local storage
  const [taskTypes, setTaskTypes] = useState(JSON.parse(localStorage.getItem('taskTypes')) || []);
  const [staffOptions, setStaffOptions] = useState([]);
  const [childrenOptions, setChildrenOptions] = useState([]);
  const [tutorsOptions, setTutorsOptions] = useState([]);
  const [taskTypesOptions, setTaskTypesOptions] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [selectedTaskType, setSelectedTaskType] = useState(null);
  const [loading, setLoading] = useState(tasks.length === 0); // Only if no data is loaded from cache
  const [selectedTask, setSelectedTask] = useState(null);

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

  const getStaff = async () => {
    const response = await axios.get('/api/users/');
    return response.data.users.map((user) => ({
      value: user.id,
      label: `${user.first_name} ${user.last_name} - ${user.role}`,
    }));
  };

  const getChildren = async () => {
    const response = await axios.get('/api/children/');
    return response.data.children.map((child) => ({
      value: child.id,
      label: `${child.first_name} ${child.last_name} - ${child.tutoring_status}`,
    }));
  };

  const getTutors = async () => {
    const response = await axios.get('/api/tutors/');
    return response.data.tutors.map((tutor) => ({
      value: tutor.id,
      label: `${tutor.first_name} ${tutor.last_name} - ${tutor.tutorship_status}`,
    }));
  };

  const getTaskTypes = async () => {
    const response = await axios.get('/api/task_types/');
    return response.data.task_types.map((type) => ({
      value: type.id,
      label: type.name,
    }));
  };

  const handleSubmitTask = () => {
    const taskData = {
      description: document.getElementById('description').value,
      due_date: document.getElementById('due_date').value,
      assigned_to: selectedStaff.value,
      child: selectedChild.value,
      tutor: selectedTutor.value,
      type: selectedTaskType.value,
    };

    axios.post('/api/tasks/create', taskData).then((response) => {
      console.log('Task created:', response.data);
      document.getElementById('create-task-modal').style.display = 'none';
    }).catch((error) => {
      console.error('Error creating task:', error);
    });
  };

  useEffect(() => {
    document.body.style.zoom = "80%"; // Set browser zoom to 80%
    const fetchData = async () => {
      try {
        const [tasksResponse, staffOptions, childrenOptions, tutorsOptions, taskTypesOptions] = await Promise.all([
          axios.get('/api/tasks/'),
          getStaff(),
          getChildren(),
          getTutors(),
          getTaskTypes()
        ]);

        setTasks(tasksResponse.data.tasks);
        setTaskTypes(tasksResponse.data.task_types);
        setStaffOptions(staffOptions);
        setChildrenOptions(childrenOptions);
        setTutorsOptions(tutorsOptions);
        setTaskTypesOptions(taskTypesOptions);

        // Save tasks and task types to local storage
        localStorage.setItem('tasks', JSON.stringify(tasksResponse.data.tasks));
        localStorage.setItem('taskTypes', JSON.stringify(tasksResponse.data.task_types));

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false); // Turn off the spinner after the request is complete
      }
    };

    if (tasks.length === 0) {
      fetchData(); // Fetch data only if the cache is empty
    } else {
      setLoading(false); // If data exists in cache, no need to load
    }
  }, []);

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
            <button onClick={() => document.getElementById('create-task-modal').style.display = 'block'}>צור משימה חדשה</button>
          </div>
          <div className="modal" id="create-task-modal">
            <div className="modal-content">
              <span className="close" onClick={() => document.getElementById('create-task-modal').style.display = 'none'}>&times;</span>
              <h2>יצירת משימה חדשה</h2>
              <label>תיאור</label>
              <input type="text" id="description" />
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
              <label>סוג משימה</label>
              <Select
                id="type"
                options={taskTypesOptions}
                value={selectedTaskType}
                onChange={setSelectedTaskType}
                isSearchable
              />
              <button onClick={handleSubmitTask}>צור</button>
            </div>
          </div>
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
}

export default Tasks;