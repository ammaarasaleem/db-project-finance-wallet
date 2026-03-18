create database finance_wallet;
use finance_wallet;
CREATE TABLE Users (
    user_id       INT            PRIMARY KEY identity(1,1),
    username      VARCHAR(50)    NOT NULL UNIQUE,
    email         VARCHAR(100)   NOT NULL UNIQUE,
    phone         VARCHAR(20),
    password_hash VARCHAR(255)   NOT NULL,
    created_at    DATETIME       DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Wallets (
    wallet_id   INT             PRIMARY KEY identity(1,1),
    user_id     INT             NOT NULL UNIQUE,
    balance     DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    currency    VARCHAR(10)     NOT NULL DEFAULT 'USD',
    updated_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TRIGGER trg_Wallets_UpdateUpdatedAt
ON Wallets
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Wallets
    SET updated_at = CURRENT_TIMESTAMP
    FROM Wallets
    INNER JOIN inserted ON Wallets.wallet_id = inserted.wallet_id;
END;
GO


CREATE TABLE Friendships (
    friendship_id  INT   PRIMARY KEY identity(1,1),
    user_id        INT   NOT NULL,
    friend_id      INT   NOT NULL,
    status         varchar(20) default'pending'check (status in  ('pending', 'accepted', 'blocked') ),
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id)   REFERENCES Users(user_id) ON DELETE CASCADE,
     FOREIGN KEY (friend_id) REFERENCES Users(user_id) ON DELETE No action,
    UNIQUE (user_id, friend_id)
);

CREATE TABLE Transactions (
    transaction_id   INT             PRIMARY KEY identity(1,1),
    sender_id        INT             NOT NULL,
    receiver_id      INT             NOT NULL,
    amount           DECIMAL(12, 2)  NOT NULL CHECK (amount > 0),
    type             varchar(20) check(type in ('transfer', 'bill_split', 'loan', 'loan_repayment')) NOT NULL,
    status           varchar(50) default'pending' check(status in ('pending', 'completed', 'failed', 'cancelled'))      NOT NULL,
    note             VARCHAR(255),
    created_at       DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES Users(user_id),
    FOREIGN KEY (receiver_id) REFERENCES Users(user_id)
);

CREATE TABLE BillSplits (
    split_id        INT             PRIMARY KEY identity(1,1),
    created_by      INT             NOT NULL,
    total_amount    DECIMAL(12, 2)  NOT NULL CHECK (total_amount > 0),
    description     VARCHAR(255),
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

CREATE TABLE BillSplitParticipants (
    participant_id   INT             PRIMARY KEY identity(1,1),
    split_id         INT             NOT NULL,
    user_id          INT             NOT NULL,
    amount_owed      DECIMAL(12, 2)  NOT NULL CHECK (amount_owed > 0),
    is_paid          Bit        DEFAULT 0,
    transaction_id   INT,                        -- filled once the user pays
    FOREIGN KEY (split_id)       REFERENCES BillSplits(split_id)   ON DELETE CASCADE,
    FOREIGN KEY (user_id)        REFERENCES Users(user_id),
    FOREIGN KEY (transaction_id) REFERENCES Transactions(transaction_id)
);

CREATE TABLE Loans (
    loan_id        INT             PRIMARY KEY identity(1,1),
    lender_id      INT             NOT NULL,
    borrower_id    INT             NOT NULL,
    amount         DECIMAL(12, 2)  NOT NULL CHECK (amount > 0),
    amount_repaid  DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    due_date       DATE,
    status         varchar(25) default 'requested' check(status in ('requested', 'active', 'repaid', 'rejected')) NOT NULL,
    note           VARCHAR(255),
    created_at     DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lender_id)   REFERENCES Users(user_id),
    FOREIGN KEY (borrower_id) REFERENCES Users(user_id)
);

CREATE TABLE KhataGroups
(
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    CreatorId     INT           NOT NULL,
    Name          NVARCHAR(255) NOT NULL,
    ContributionAmount DECIMAL(19,4) NOT NULL,     -- amount each member pays per cycle
    CycleType     NVARCHAR(20)  NOT NULL DEFAULT 'Monthly',  -- Monthly / Weekly
    StartDate     DATE          NOT NULL,
    IsActive      BIT           NOT NULL DEFAULT 1,
    CreatedOn     DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT KhataGroups_FK_Creator CHECK (ContributionAmount > 0),
    CONSTRAINT KhataGroups_FK_Users   FOREIGN KEY (CreatorId) REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE TABLE KhataMembers
(
    GroupId   INT NOT NULL,
    UserId    INT NOT NULL,
    TurnOrder SMALLINT NOT NULL,                  -- position in payout order
    JoinedOn  DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT KhataMembers_PK           PRIMARY KEY (GroupId, UserId),
    CONSTRAINT KhataMembers_FK_Groups    FOREIGN KEY (GroupId) REFERENCES KhataGroups(Id) ON DELETE CASCADE,
    CONSTRAINT KhataMembers_FK_Users     FOREIGN KEY (UserId)  REFERENCES Users(user_id)   ON DELETE NO ACTION,
    CONSTRAINT KhataMembers_Uniq_Order   UNIQUE (GroupId, TurnOrder)
);
GO

CREATE TABLE Contributions
(
    Id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    GroupId     INT            NOT NULL,
    UserId      INT            NOT NULL,
    CycleNumber SMALLINT       NOT NULL,           -- which cycle (1, 2, 3...)
    AmountPaid  DECIMAL(19,4)  NOT NULL,
    PaidOn      DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT Contributions_FK_Members FOREIGN KEY (GroupId, UserId) REFERENCES KhataMembers(GroupId, UserId) ON DELETE CASCADE,
    CONSTRAINT Contributions_Check_Amount CHECK (AmountPaid > 0)
);
GO
create table savingVault(
id int primary key identity(1,1),
userID int,
user_Name nvarchar(225) not null,
targetAmount decimal(19,4) check(targetAmount>0) not null ,
savedAmount decimal(19,4) check (savedAmount>=0) not null default 0,
deadline date,
isAchieved bit not null default 0,
createdON DATETIMEOFFSET(5) not null default SYSDATETIMEOFFSET(),
constraint vault_fk_user foreign key (userID) references Users(user_id) on delete cascade,


);

CREATE TABLE FixedSalary (
    salary_id      INT              PRIMARY KEY IDENTITY(1,1),
    user_id        INT              NOT NULL UNIQUE,  -- one salary record per user
    amount         DECIMAL(12, 2)   NOT NULL CHECK (amount > 0),
    currency       VARCHAR(10)      NOT NULL DEFAULT 'USD',
    pay_day        TINYINT          NOT NULL CHECK (pay_day BETWEEN 1 AND 31), -- day of month salary arrives
    is_active      BIT              NOT NULL DEFAULT 1,
    created_at     DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at     DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FixedSalary_FK_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE FixedExpenses (
    expense_id     INT              PRIMARY KEY IDENTITY(1,1),
    user_id        INT              NOT NULL,
    title          NVARCHAR(100)    NOT NULL,               -- e.g. 'Rent', 'Netflix'
    amount         DECIMAL(12, 2)   NOT NULL CHECK (amount > 0),
    category       NVARCHAR(50)     DEFAULT 'General',      -- e.g. 'Utilities', 'Subscriptions'
    due_day        TINYINT          NOT NULL CHECK (due_day BETWEEN 1 AND 31), -- day of month it's due
    is_active      BIT              NOT NULL DEFAULT 1,
    created_at     DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FixedExpenses_FK_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
-- Data entry

INSERT INTO Users (username, email, phone, password_hash) VALUES
    ('alice',   'alice@email.com',   '555-0101', 'hashed_pw_1'),
    ('bob',     'bob@email.com',     '555-0102', 'hashed_pw_2'),
    ('charlie', 'charlie@email.com', '555-0103', 'hashed_pw_3'),
    ('diana',   'diana@email.com',   '555-0104', 'hashed_pw_4');

INSERT INTO Wallets (user_id, balance, currency) VALUES
    (1, 1500.00, 'USD'),
    (2,  800.00, 'USD'),
    (3, 2000.00, 'USD'),
    (4,  300.00, 'USD');

INSERT INTO Friendships (user_id, friend_id, status) VALUES
    (1, 2, 'accepted'),
    (1, 3, 'accepted'),
    (2, 3, 'accepted'),
    (3, 4, 'pending');

INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note) VALUES
    (1, 2,  50.00, 'transfer',        'completed', 'Coffee money'),
    (3, 1, 200.00, 'transfer',        'completed', 'Rent contribution'),
    (2, 3,  30.00, 'bill_split',      'completed', 'Dinner split'),
    (2, 1, 100.00, 'loan',            'completed', 'Loan from Alice'),
    (2, 1,  40.00, 'loan_repayment',  'completed', 'Partial repayment');

    select * from transactions;

INSERT INTO BillSplits (created_by, total_amount, description) VALUES
    (1, 120.00, 'Team dinner at Roma'),
    (3  ,60.00, 'Movie night snacks');
INSERT INTO BillSplits(created_by,total_amount,description) VALUES 
    (2, 120.00, 'Friday match');
    select * from BillSplits;

INSERT INTO BillSplitParticipants (split_id, user_id, amount_owed, is_paid, transaction_id) VALUES
    (1, 1,  30.00, 1,  NULL),
    (1, 2,  30.00, 1,  3),
    (1, 3,  30.00, 0, NULL),
    (1, 4,  30.00, 0, NULL),
    (2, 3,  20.00, 1,  NULL),
    (2, 4,  20.00, 0, NULL);

INSERT INTO Loans (lender_id, borrower_id, amount, amount_repaid, due_date, status, note) VALUES
    (1, 2, 100.00, 40.00, '2026-06-01', 'active',   'Loan for car repair'),
    (3, 4,  50.00,  0.00, '2026-04-15', 'active',   'Emergency loan'),
    (2, 1,  75.00, 75.00, '2026-02-01', 'repaid',   'Concert tickets');

INSERT INTO FixedSalary (user_id, amount, currency, pay_day, is_active) VALUES
    (1, 3000.00, 'USD', 1,  1),   
    (2, 2500.00, 'USD', 5,  1),   
    (3, 4000.00, 'USD', 1,  1),  
    (4, 1800.00, 'USD', 10, 1);  

INSERT INTO FixedExpenses (user_id, title, amount, category, due_day, is_active) VALUES

    (1, 'Rent',          1200.00, 'Housing',       1,  1),
    (1, 'Netflix',         15.00, 'Subscriptions', 3,  1),
    (1, 'Electricity',    120.00, 'Utilities',     7,  1),
    (1, 'Gym Membership',  50.00, 'Health',        10, 1),
    (2, 'Rent',           900.00, 'Housing',       1,  1),
    (2, 'Internet',        60.00, 'Utilities',     5,  1),
    (2, 'Spotify',         10.00, 'Subscriptions', 8,  1),
    (3, 'Mortgage',      2000.00, 'Housing',       1,  1),
    (3, 'Car Insurance',  250.00, 'Insurance',     15, 1),
    (3, 'Electricity',    180.00, 'Utilities',     7,  1),
    (3, 'Netflix',         15.00, 'Subscriptions', 3,  0), 
    (4, 'Rent',           700.00, 'Housing',       1,  1),
    (4, 'Phone Bill',      45.00, 'Utilities',     20, 1);
    select * from FixedExpenses;


-- Queries

-- 1. View wallet balance for a user
SELECT u.username, w.balance, w.currency
FROM Users u
JOIN Wallets w ON u.user_id = w.user_id
WHERE u.username = 'alice';

-- 2. List all completed transactions for a user (sent or received)
SELECT t.transaction_id, t.type, t.amount, t.status, t.note, t.created_at,
       s.username AS sender, r.username AS receiver
FROM Transactions t
JOIN Users s ON t.sender_id   = s.user_id
JOIN Users r ON t.receiver_id = r.user_id
WHERE t.sender_id = 1 OR t.receiver_id = 1
ORDER BY t.created_at DESC;

-- 3. List all friends of a user (accepted only)
SELECT u.username, u.email
FROM Friendships f
JOIN Users u ON u.user_id = f.friend_id
WHERE f.user_id = 1 AND f.status = 'accepted';

-- 4. View unpaid bill-split shares for a user
SELECT bs.description, bs.total_amount, bsp.amount_owed
FROM BillSplitParticipants bsp
JOIN BillSplits bs ON bs.split_id = bsp.split_id
WHERE bsp.user_id = 3 AND bsp.is_paid = 0;

-- 5. View all active loans involving a user (as lender or borrower)
SELECT l.loan_id,
       lender.username   AS lender,
       borrower.username AS borrower,
       l.amount,
       l.amount_repaid,
       (l.amount - l.amount_repaid) AS remaining,
       l.due_date,
       l.status,
       l.note
FROM Loans l
JOIN Users lender   ON l.lender_id   = lender.user_id
JOIN Users borrower ON l.borrower_id = borrower.user_id
WHERE (l.lender_id = 1 OR l.borrower_id = 1) AND l.status = 'active';

-- 6. Send money: deduct from sender, credit receiver, record transaction
UPDATE Wallets SET balance = balance - 50.00 WHERE user_id = 1;
UPDATE Wallets SET balance = balance + 50.00 WHERE user_id = 2;
INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note)
VALUES (1, 2, 50.00, 'transfer', 'completed', 'Paying back for groceries');

-- 7. Mark a bill-split share as paid
UPDATE BillSplitParticipants
SET is_paid = 1, transaction_id = 3
WHERE split_id = 1 AND user_id = 3;

-- 8. Record a loan repayment
UPDATE Loans
SET amount_repaid = amount_repaid + 40.00,
    status = CASE WHEN amount_repaid + 40.00 >= amount THEN 'repaid' ELSE status END
WHERE loan_id = 1;

-- 9. Cancel a pending loan request
UPDATE Loans SET status = 'rejected' WHERE loan_id = 2 AND status = 'requested';

-- 10. Delete a friendship
DELETE FROM Friendships
WHERE (user_id = 1 AND friend_id = 2)
   OR (user_id = 2 AND friend_id = 1);

-- 11. Search transactions by type for a user

SELECT * FROM Transactions
WHERE (sender_id = 2 OR receiver_id = 2) AND type = 'loan';

-- 12. Total amount owed to a user across all active loans
SELECT SUM(amount - amount_repaid) AS total_owed_to_user
FROM Loans
WHERE lender_id = 1 AND status = 'active';

--13. create a saving vault for a user
INSERT INTO savingVault (userID, user_Name, targetAmount, savedAmount, deadline)
VALUES (1, 'Emergency Fund', 1000.00, 200.00, '2026-12-01');

--14.View all saving vaults of a user
SELECT id, user_Name, targetAmount, savedAmount, deadline, isAchieved
FROM savingVault
WHERE userID = 1;

--15. Deposit money into a saving vault
UPDATE savingVault
SET savedAmount = savedAmount + 100
WHERE id = 1;

--16. Check vault progress
SELECT user_Name,
       targetAmount,
       savedAmount,
       (savedAmount * 100.0 / targetAmount) AS progress_percentage
FROM savingVault
WHERE userID = 1;

--17. Mark vault goal achieved automatically
UPDATE savingVault
SET isAchieved = 1
WHERE savedAmount >= targetAmount;

--18. Create a Khata group
INSERT INTO KhataGroups (CreatorId, Name, ContributionAmount, CycleType, StartDate)
VALUES (1, 'Monthly Committee', 500.00, 'Monthly', '2026-04-01');
-- 19. Add members to Khata group
INSERT INTO KhataMembers (GroupId, UserId, TurnOrder)
VALUES
(1, 1, 1),
(1, 2, 2),
(1, 3, 3),
(1, 4, 4);

--20. Record a contribution
INSERT INTO Contributions (GroupId, UserId, CycleNumber, AmountPaid)
VALUES (1, 1, 1, 500.00);

--21. View all members of a Khata group
SELECT u.username, km.TurnOrder
FROM KhataMembers km
JOIN Users u ON km.UserId = u.user_id
WHERE km.GroupId = 1
ORDER BY km.TurnOrder;

--22. View contributions of a group
SELECT u.username, c.CycleNumber, c.AmountPaid, c.PaidOn
FROM Contributions c
JOIN Users u ON c.UserId = u.user_id
WHERE c.GroupId = 1
ORDER BY c.CycleNumber;

--23. Calculate total collected in a Khata group
SELECT GroupId, SUM(AmountPaid) AS total_collected
FROM Contributions
WHERE GroupId = 1
GROUP BY GroupId;

--24. Find members who have NOT paid for a cycle
SELECT u.username
FROM KhataMembers km
JOIN Users u ON km.UserId = u.user_id
WHERE km.GroupId = 1
AND km.UserId NOT IN (
    SELECT UserId
    FROM Contributions
    WHERE GroupId = 1 AND CycleNumber = 1
);

--25. View transaction history for a user
SELECT *
FROM Transactions
WHERE sender_id = 1 OR receiver_id = 1
ORDER BY created_at DESC;

--26. Check total money sent by a user
SELECT SUM(amount) AS total_sent
FROM Transactions
WHERE sender_id = 1 AND status = 'completed';

--27. Check total money received by a user
SELECT SUM(amount) AS total_received
FROM Transactions
WHERE receiver_id = 1 AND status = 'completed';

--28. View all friends of a user
SELECT u.username
FROM Friendships f
JOIN Users u ON f.friend_id = u.user_id
WHERE f.user_id = 1 AND status = 'accepted';

--29 view salary by joining salary with user info
SELECT
    u.username,
    u.email,
    fs.amount   AS monthly_salary,
    fs.currency,
    fs.pay_day,
    fs.is_active
FROM FixedSalary fs
JOIN Users u ON u.user_id = fs.user_id
ORDER BY fs.amount DESC;
GO

--30 Get Salary details for a specific user
SELECT
    u.username,
    fs.amount,
    fs.currency,
    fs.pay_day
FROM FixedSalary fs
JOIN Users u ON u.user_id = fs.user_id
WHERE u.username = 'alice';
GO

-- 31 Giving alice a salary raise
UPDATE FixedSalary
SET amount     = 3500.00,
    updated_at = SYSDATETIMEOFFSET()
WHERE user_id = 1;
GO

--32 Total salary payout across all active users
SELECT
    COUNT(*)        AS users_on_payroll,
    SUM(amount)     AS total_monthly_salary_outflow,
    AVG(amount)     AS average_salary,
    MIN(amount)     AS lowest_salary,
    MAX(amount)     AS highest_salary
FROM FixedSalary
WHERE is_active = 1;
GO

--33  remove a cancelled fixed expense permanently
DELETE FROM FixedExpenses
WHERE user_id = 3 AND title = 'Netflix' AND is_active = 0;