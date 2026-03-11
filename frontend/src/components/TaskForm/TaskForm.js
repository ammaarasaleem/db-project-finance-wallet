import React, { useState } from 'react';
import './TaskForm.css';

const TaskForm = ({ onTaskAdded }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await fetch('http://localhost:5000/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description })
            });
            setTitle('');
            setDescription('');
            if (onTaskAdded) {
                onTaskAdded();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className="task-form" onSubmit={handleSubmit}>
            <div className="input-group">
                <label htmlFor="title">Title</label>
                <input
                    id="title"
                    type="text"
                    placeholder="e.g. Complete my project"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
            </div>
            <div className="input-group">
                <label htmlFor="description">Description</label>
                <input
                    id="description"
                    type="text"
                    placeholder="e.g. I have to complete my DB project by myself"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />
            </div>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Task'}
            </button>
        </form>
    );
};

export default TaskForm;
