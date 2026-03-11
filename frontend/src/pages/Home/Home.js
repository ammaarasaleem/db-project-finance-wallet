import React, { useState, useEffect } from 'react';
import TaskForm from '../../components/TaskForm/TaskForm';
import TaskList from '../../components/TaskList/TaskList';
import './Home.css';

const Home = () => {
    const [message, setMessage] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        fetch('http://localhost:5000')
            .then((response) => response.text())
            .then((data) => setMessage(data))
            .catch((err) => console.error(err));
    }, []);

    const handleTaskAdded = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="home-container">
            <header className="home-header">
                <h1>Task Management</h1>
                <p className="status-message">{message || 'Backend is not running'}</p>
            </header>
            <main className="home-main">
                <section className="form-section">
                    <h2>Create New Task</h2>
                    <TaskForm onTaskAdded={handleTaskAdded} />
                </section>
                <section className="list-section">
                    <h2>Your Tasks</h2>
                    <TaskList key={refreshKey} />
                </section>
            </main>
        </div>
    );
};

export default Home;
