use taskDB

CREATE TABLE Tasks (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

UPDATE Tasks SET title = 'abc', description = 'hello' WHERE id = 2


INSERT INTO Tasks (title, description) VALUES
('Fix Backend Bug', 'Resolve the API response issue for task updates.'),
('Design UI Mockups', 'Create wireframes for the dashboard redesign.'),
('Database Optimization', 'Improve query performance and add indexes.'),
('Write Documentation', 'Complete API documentation for task endpoints.'),
('Team Meeting', 'Discuss sprint progress and upcoming milestones.');


CREATE PROCEDURE CreateTask
    @title NVARCHAR(255),
    @description NVARCHAR(255)
AS
BEGIN
    INSERT INTO tasks (title, description) VALUES (@title, @description);
END

drop proc CreateTask

SELECT * FROM Tasks

delete from Tasks where id>6


EXEC CreateTask 'Test Title', 'Test Description';



ALTER AUTHORIZATION ON DATABASE::taskDb TO sa;





