import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from '../axiosConfig';  // Import the configured Axios instance
import '../styles/common.css';
import '../styles/tasks.css';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await axios.get('/api/tasks/');
        setTasks(response.data.tasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    fetchTasks();
  }, []);

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTasks(items);
  };

  return (
    <div className="main-content">
      <Sidebar />
      <InnerPageHeader title="לוח משימות" />
      <div className="page-content">
        <div className="filter">
          <select>
            <option value="">סנן לפי סוג משימה</option>
            <option value="type1">סוג 1</option>
            <option value="type2">סוג 2</option>
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
                        <h2>{task.title}</h2>
                        <p>{task.details}</p>
                        <div className="actions">
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
        <button>צור משימה חדשה</button>
      </div>
    </div>
  );
};

export default Tasks;