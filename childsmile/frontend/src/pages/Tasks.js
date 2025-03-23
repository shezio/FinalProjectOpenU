import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import '../styles/common.css';
import '../styles/tasks.css';

const initialTasks = [
  { id: '1', title: 'משימה 1', details: 'פרטי המשימה...' },
  { id: '2', title: 'משימה 2', details: 'פרטי המשימה...' },
  { id: '3', title: 'משימה 3', details: 'פרטי המשימה...' },
  /*add 6 more tasks*/
  { id: '4', title: 'משימה 4', details: 'פרטי המשימה...' },
  { id: '5', title: 'משימה 5', details: 'פרטי המשימה...' },
  { id: '6', title: 'משימה 6', details: 'פרטי המשימה...' },
  { id: '7', title: 'משימה 7', details: 'פרטי המשימה...' },
  { id: '8', title: 'משימה 8', details: 'פרטי המשימה...' },
  { id: '9', title: 'משימה 9', details: 'פרטי המשימה...' },
  { id: '10', title: 'משימה 10', details: 'פרטי המשימה...' },
  /*add 6 more tasks*/
  { id: '11', title: 'משימה 11', details: 'פרטי המשימה...' },
  { id: '12', title: 'משימה 12', details: 'פרטי המשימה...' },
  { id: '13', title: 'משימה 13', details: 'פרטי המשימה...' },
];

const Tasks = () => {
  const [tasks, setTasks] = useState(initialTasks);

  // Handle reordering when a drag ends
  const onDragEnd = (result) => {
    if (!result.destination) return; // If dropped outside, do nothing
  
    const updatedTasks = [...tasks];
    const [movedTask] = updatedTasks.splice(result.source.index, 1);
  
    // Reverse the index order since it's RTL
    let newIndex = result.destination.index;
  
    // Insert at the correct index without shifting right
    updatedTasks.splice(newIndex, 0, movedTask);
  
    setTasks(updatedTasks);
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
      <Droppable droppableId="tasksGrid" direction="horizontal" mode="virtual">
      {(provided) => (
          <div
            className="tasks"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                {(provided) => (
                  <div
                    className="task"
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <h2>{task.title}</h2>
                    <p>{task.description}</p>
                    <div className="actions">
                      <button>ערוך</button>
                      <button>עדכן</button>
                      <button>מחק</button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder} {/* Keeps layout spacing intact */}
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
