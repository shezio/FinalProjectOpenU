import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from '../axiosConfig';  // Import the configured Axios instance
import '../styles/common.css';
import '../styles/tasks.css';

const Tasks = () => {
  const [tasks, setTasks] = useState(JSON.parse(localStorage.getItem('tasks')) || []);  // טעינת נתונים מקומית
  const [taskTypes, setTaskTypes] = useState(JSON.parse(localStorage.getItem('taskTypes')) || []);
  const [loading, setLoading] = useState(tasks.length === 0); // רק אם אין נתונים נטענים מהמטמון
  const [selectedTask, setSelectedTask] = useState(null);


  useEffect(() => {
    document.body.style.zoom = "80%"; // Set browser zoom to 67%
    const fetchTasks = async () => {
      try {
        const response = await axios.get('/api/tasks/');
        setTasks(response.data.tasks);
        setTaskTypes(response.data.task_types);

        // שמירת הנתונים ב-Cache
        localStorage.setItem('tasks', JSON.stringify(response.data.tasks));
        localStorage.setItem('taskTypes', JSON.stringify(response.data.task_types));

      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false); // מכבים את הספינר אחרי שהבקשה הסתיימה
      }
    };

    if (tasks.length === 0) {
      fetchTasks(); // מבצע בקשה רק אם המטמון ריק
    } else {
      setLoading(false); // אם יש נתונים במטמון, אין צורך להפעיל טעינה
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
  /* default zoom 1.5 on this page */
  
  return (
    <div className="main-content">
      <Sidebar />
      <InnerPageHeader title="לוח משימות" />
      {loading && <div className="loader">הנתונים בטעינה...</div>} {/* ספינר יוצג עד שהנתונים נטענים */}
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
            <button disabled={loading}>צור משימה חדשה</button>  {/* Disable button while loading */}
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
};

export default Tasks;