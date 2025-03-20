import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import '../styles/common.css';
import '../styles/tasks.css';

const initialTasks = [
  { id: '1', title: 'משימה 1', details: 'פרטי המשימה...' },
  { id: '2', title: 'משימה 2', details: 'פרטי המשימה...' },
  { id: '3', title: 'משימה 3', details: 'פרטי המשימה...' }
];

const Tasks = () => {
  const [tasks, setTasks] = useState(initialTasks);

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
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
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
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
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
