import React, { useEffect, useState } from 'react';
import './TaskList.css';

const TaskList = () => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:5000/api/tasks')
            .then(res => res.json())
            .then(data => {
                setTasks(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
                setIsLoading(false);
            });
    }, []);

    const deleteTask = async (id) => {
        await fetch(`http://localhost:5000/api/tasks/${id}`, { method: 'DELETE' });
        setTasks(tasks.filter(task => task.id !== id));
    };

    if (isLoading) {
        return <div className="loading-state">Loading tasks...</div>;
    }

    if (tasks.length === 0) {
        return <div className="empty-state">No tasks yet. Create one above!</div>;
    }

    return (
        <div className="task-list">
            {tasks.map(task => (
                <div className="task-card" key={task.id}>
                    <div className="task-content">
                        <h3 className="task-title">{task.title}</h3>
                        <p className="task-desc">{task.description}</p>
                    </div>
                    <button className="delete-btn" onClick={() => deleteTask(task.id)} aria-label="Delete task">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
};

export default TaskList;
