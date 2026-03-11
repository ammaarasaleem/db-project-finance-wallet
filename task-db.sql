create database taskDB
go

use taskDB
go

CREATE TABLE Tasks (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

INSERT INTO Tasks (title, description) VALUES
('Fix Backend Bug', 'Resolve the API response issue for task updates.'),
('Design UI Mockups', 'Create wireframes for the dashboard redesign.'),
('Database Optimization', 'Improve query performance and add indexes.'),
('Write Documentation', 'Complete API documentation for task endpoints.'),
('Team Meeting', 'Discuss sprint progress and upcoming milestones.');

go
CREATE PROCEDURE CreateTask
    @title NVARCHAR(255),
    @description NVARCHAR(255)
AS
BEGIN
    INSERT INTO tasks (title, description) VALUES (@title, @description);
END


ALTER AUTHORIZATION ON DATABASE::taskDb TO sa;