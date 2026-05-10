CREATE DATABASE finance_wallet;
GO
USE finance_wallet;
GO


CREATE TABLE Users (
    user_id       INT            PRIMARY KEY IDENTITY(1,1),
    username      VARCHAR(50)    NOT NULL UNIQUE,
    email         VARCHAR(100)   NOT NULL UNIQUE,
    phone         VARCHAR(20),
    password_hash VARCHAR(255)   NOT NULL,
    avatar_url    VARCHAR(500)   DEFAULT NULL,          -- optional profile picture
    is_active     BIT            NOT NULL DEFAULT 1,    -- soft-delete support
    created_at    DATETIME       DEFAULT CURRENT_TIMESTAMP
);
GO

CREATE TABLE Wallets (
    wallet_id   INT             PRIMARY KEY IDENTITY(1,1),
    user_id     INT             NOT NULL UNIQUE,
    balance     DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    currency    VARCHAR(10)     NOT NULL DEFAULT 'USD',
    updated_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT Wallets_balance_non_negative CHECK (balance >= 0),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
GO

CREATE TABLE Friendships (
    friendship_id  INT         PRIMARY KEY IDENTITY(1,1),
    user_id        INT         NOT NULL,
    friend_id      INT         NOT NULL,
    status         VARCHAR(20) DEFAULT 'pending'
                               CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at     DATETIME    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)   REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES Users(user_id) ON DELETE NO ACTION,
    UNIQUE (user_id, friend_id)
);
GO

CREATE TABLE Transactions (
    transaction_id   INT             PRIMARY KEY IDENTITY(1,1),
    sender_id        INT             NOT NULL,
    receiver_id      INT             NOT NULL,
    amount           DECIMAL(12, 2)  NOT NULL CHECK (amount > 0),
    type             VARCHAR(20)     NOT NULL
                                     -- UPDATED: added 'deposit' and 'withdrawal' to support wallet funding
                                     CHECK (type IN ('transfer','bill_split','loan','loan_repayment','deposit','withdrawal')),
    status           VARCHAR(50)     NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending','completed','failed','cancelled')),
    note             VARCHAR(255),
    created_at       DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES Users(user_id),
    FOREIGN KEY (receiver_id) REFERENCES Users(user_id)
);
GO

CREATE TABLE BillSplits (
    split_id        INT             PRIMARY KEY IDENTITY(1,1),
    created_by      INT             NOT NULL,
    total_amount    DECIMAL(12, 2)  NOT NULL CHECK (total_amount > 0),
    description     VARCHAR(255),
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);
GO

CREATE TABLE BillSplitParticipants (
    participant_id   INT             PRIMARY KEY IDENTITY(1,1),
    split_id         INT             NOT NULL,
    user_id          INT             NOT NULL,
    amount_owed      DECIMAL(12, 2)  NOT NULL CHECK (amount_owed > 0),
    is_paid          BIT             DEFAULT 0,
    transaction_id   INT,
    FOREIGN KEY (split_id)       REFERENCES BillSplits(split_id)    ON DELETE CASCADE,
    FOREIGN KEY (user_id)        REFERENCES Users(user_id),
    FOREIGN KEY (transaction_id) REFERENCES Transactions(transaction_id)
);
GO

CREATE TABLE Loans (
    loan_id        INT             PRIMARY KEY IDENTITY(1,1),
    lender_id      INT             NOT NULL,
    borrower_id    INT             NOT NULL,
    amount         DECIMAL(12, 2)  NOT NULL CHECK (amount > 0),
    amount_repaid  DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    due_date       DATE,
    status         VARCHAR(25)     NOT NULL DEFAULT 'requested'
                                   CHECK (status IN ('requested','active','repaid','rejected')),
    note           VARCHAR(255),
    created_at     DATETIME        DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT Loans_repaid_not_exceed CHECK (amount_repaid <= amount),
    FOREIGN KEY (lender_id)   REFERENCES Users(user_id),
    FOREIGN KEY (borrower_id) REFERENCES Users(user_id)
);
GO

CREATE TABLE KhataGroups (
    Id                 INT              PRIMARY KEY IDENTITY(1,1),
    CreatorId          INT              NOT NULL,
    Name               NVARCHAR(255)    NOT NULL,
    ContributionAmount DECIMAL(19,4)    NOT NULL CHECK (ContributionAmount > 0),
    CycleType          NVARCHAR(20)     NOT NULL DEFAULT 'Monthly'
                                        CHECK (CycleType IN ('Monthly','Weekly')),
    StartDate          DATE             NOT NULL,
    IsActive           BIT              NOT NULL DEFAULT 1,
    CreatedOn          DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    FOREIGN KEY (CreatorId) REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE TABLE KhataMembers (
    GroupId   INT      NOT NULL,
    UserId    INT      NOT NULL,
    TurnOrder SMALLINT NOT NULL,
    JoinedOn  DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT KhataMembers_PK         PRIMARY KEY (GroupId, UserId),
    CONSTRAINT KhataMembers_FK_Groups  FOREIGN KEY (GroupId) REFERENCES KhataGroups(Id) ON DELETE CASCADE,
    CONSTRAINT KhataMembers_FK_Users   FOREIGN KEY (UserId)  REFERENCES Users(user_id)  ON DELETE NO ACTION,
    CONSTRAINT KhataMembers_Uniq_Order UNIQUE (GroupId, TurnOrder)
);
GO

CREATE TABLE Contributions (
    Id          BIGINT           PRIMARY KEY IDENTITY(1,1),
    GroupId     INT              NOT NULL,
    UserId      INT              NOT NULL,
    CycleNumber SMALLINT         NOT NULL CHECK (CycleNumber > 0),
    AmountPaid  DECIMAL(19,4)    NOT NULL CHECK (AmountPaid > 0),
    PaidOn      DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT Contributions_FK_Members FOREIGN KEY (GroupId, UserId)
        REFERENCES KhataMembers(GroupId, UserId) ON DELETE CASCADE,
    CONSTRAINT Contributions_NoDuplicate UNIQUE (GroupId, UserId, CycleNumber)
);
GO

-- NORMALIZATION FIX (3NF): removed user_Name column.
-- user_Name was transitively dependent: id → userID → user_Name.
-- username is now retrieved via JOIN with Users table.
CREATE TABLE savingVault (
    id           INT              PRIMARY KEY IDENTITY(1,1),
    userID       INT              NOT NULL,
    targetAmount DECIMAL(19,4)    NOT NULL CHECK (targetAmount > 0),
    savedAmount  DECIMAL(19,4)    NOT NULL DEFAULT 0 CHECK (savedAmount >= 0),
    deadline     DATE,
    isAchieved   BIT              NOT NULL DEFAULT 0,
    createdON    DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT vault_fk_user FOREIGN KEY (userID) REFERENCES Users(user_id) ON DELETE CASCADE
);
GO

CREATE TABLE FixedSalary (
    salary_id  INT               PRIMARY KEY IDENTITY(1,1),
    user_id    INT               NOT NULL UNIQUE,
    amount     DECIMAL(12, 2)    NOT NULL CHECK (amount > 0),
    currency   VARCHAR(10)       NOT NULL DEFAULT 'USD',
    pay_day    TINYINT           NOT NULL CHECK (pay_day BETWEEN 1 AND 31),
    is_active  BIT               NOT NULL DEFAULT 1,
    created_at DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FixedSalary_FK_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
GO

CREATE TABLE FixedExpenses (
    expense_id INT               PRIMARY KEY IDENTITY(1,1),
    user_id    INT               NOT NULL,
    title      NVARCHAR(100)     NOT NULL,
    amount     DECIMAL(12, 2)    NOT NULL CHECK (amount > 0),
    category   NVARCHAR(50)      DEFAULT 'General',
    due_day    TINYINT           NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    is_active  BIT               NOT NULL DEFAULT 1,
    created_at DATETIMEOFFSET(5) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FixedExpenses_FK_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
GO



-- TRIGGER 1: Auto-update Wallets.updated_at on balance change
CREATE TRIGGER trg_Wallets_UpdateUpdatedAt
ON Wallets
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Wallets
    SET    updated_at = CURRENT_TIMESTAMP
    FROM   Wallets
    INNER JOIN inserted ON Wallets.wallet_id = inserted.wallet_id;
END;
GO

-- TRIGGER 2: Auto-mark saving vault as achieved when savedAmount >= targetAmount
CREATE TRIGGER trg_SavingVault_CheckAchieved
ON savingVault
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE savingVault
    SET    isAchieved = 1
    FROM   savingVault
    INNER JOIN inserted ON savingVault.id = inserted.id
    WHERE  inserted.savedAmount >= inserted.targetAmount
      AND  savingVault.isAchieved = 0;
END;
GO

-- TRIGGER 3: Auto-mark loan as 'repaid' when amount_repaid reaches full amount
CREATE TRIGGER trg_Loans_AutoRepaid
ON Loans
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Loans
    SET    status = 'repaid'
    FROM   Loans
    INNER JOIN inserted ON Loans.loan_id = inserted.loan_id
    WHERE  inserted.amount_repaid >= inserted.amount
      AND  inserted.status = 'active';
END;
GO

-- TRIGGER 4: Prevent a user from sending a friend request to themselves
CREATE TRIGGER trg_Friendships_NoSelfFriend
ON Friendships
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted WHERE user_id = friend_id)
    BEGIN
        RAISERROR('A user cannot add themselves as a friend.', 16, 1);
        RETURN;
    END
    INSERT INTO Friendships (user_id, friend_id, status)
    SELECT user_id, friend_id, status FROM inserted;
END;
GO



-- VIEW 1: Full user wallet summary
CREATE VIEW vw_UserWalletSummary AS
SELECT
    u.user_id,
    u.username,
    u.email,
    u.phone,
    w.balance,
    w.currency,
    w.updated_at AS wallet_last_updated
FROM Users u
JOIN Wallets w ON u.user_id = w.user_id
WHERE u.is_active = 1;
GO

-- VIEW 2: Active loans
CREATE VIEW vw_ActiveLoans AS
SELECT
    l.loan_id,
    lender.username                        AS lender,
    borrower.username                      AS borrower,
    l.amount,
    l.amount_repaid,
    (l.amount - l.amount_repaid)           AS remaining,
    l.due_date,
    l.status,
    l.note,
    l.created_at,
    CASE WHEN l.due_date < CAST(GETDATE() AS DATE)
         AND l.status = 'active'
         THEN 1 ELSE 0 END                 AS is_overdue
FROM Loans l
JOIN Users lender   ON l.lender_id   = lender.user_id
JOIN Users borrower ON l.borrower_id = borrower.user_id
WHERE l.status IN ('active', 'requested');
GO

-- VIEW 3: Unpaid bill shares
CREATE VIEW vw_UnpaidBillShares AS
SELECT
    bsp.participant_id,
    u.username       AS participant,
    bs.description   AS bill_description,
    bs.total_amount,
    bsp.amount_owed,
    creator.username AS bill_created_by,
    bs.created_at
FROM BillSplitParticipants bsp
JOIN BillSplits bs   ON bs.split_id   = bsp.split_id
JOIN Users u         ON u.user_id     = bsp.user_id
JOIN Users creator   ON creator.user_id = bs.created_by
WHERE bsp.is_paid = 0;
GO

-- VIEW 4: Khata group overview
CREATE VIEW vw_KhataGroupOverview AS
SELECT
    kg.Id                                                    AS group_id,
    kg.Name                                                  AS group_name,
    creator.username                                         AS created_by,
    kg.ContributionAmount,
    kg.CycleType,
    kg.StartDate,
    kg.IsActive,
    COUNT(DISTINCT km.UserId)                                AS total_members,
    COALESCE(SUM(c.AmountPaid), 0)                          AS total_collected
FROM KhataGroups kg
JOIN Users creator        ON kg.CreatorId = creator.user_id
LEFT JOIN KhataMembers km ON kg.Id        = km.GroupId
LEFT JOIN Contributions c ON kg.Id        = c.GroupId
GROUP BY kg.Id, kg.Name, creator.username,
         kg.ContributionAmount, kg.CycleType,
         kg.StartDate, kg.IsActive;
GO

-- VIEW 5: Vault progress
-- NORMALIZATION FIX: removed sv.user_Name, now uses u.username via JOIN
CREATE VIEW vw_VaultProgress AS
SELECT
    sv.id                                                           AS vault_id,
    u.username,
    u.username                                                      AS vault_name,
    sv.targetAmount,
    sv.savedAmount,
    CAST(sv.savedAmount * 100.0 / sv.targetAmount AS DECIMAL(5,2)) AS progress_percent,
    sv.deadline,
    sv.isAchieved,
    CASE WHEN sv.deadline < CAST(GETDATE() AS DATE)
         AND sv.isAchieved = 0
         THEN 1 ELSE 0 END                                         AS is_overdue
FROM savingVault sv
JOIN Users u ON sv.userID = u.user_id;
GO

-- VIEW 6: Financial health
CREATE VIEW vw_FinancialHealth AS
SELECT
    u.user_id,
    u.username,
    w.balance                                                   AS wallet_balance,
    COALESCE(fs.amount, 0)                                      AS monthly_salary,
    COALESCE(exp_total.total_expenses, 0)                       AS monthly_expenses,
    COALESCE(fs.amount, 0) - COALESCE(exp_total.total_expenses, 0) AS disposable_income,
    COALESCE(loan_owed.total_owed, 0)                           AS total_loans_owed,
    COALESCE(loan_lent.total_lent, 0)                           AS total_loans_lent_out
FROM Users u
JOIN Wallets w ON u.user_id = w.user_id
LEFT JOIN FixedSalary fs ON u.user_id = fs.user_id AND fs.is_active = 1
LEFT JOIN (
    SELECT user_id, SUM(amount) AS total_expenses
    FROM FixedExpenses WHERE is_active = 1
    GROUP BY user_id
) exp_total ON u.user_id = exp_total.user_id
LEFT JOIN (
    SELECT borrower_id, SUM(amount - amount_repaid) AS total_owed
    FROM Loans WHERE status = 'active'
    GROUP BY borrower_id
) loan_owed ON u.user_id = loan_owed.borrower_id
LEFT JOIN (
    SELECT lender_id, SUM(amount - amount_repaid) AS total_lent
    FROM Loans WHERE status = 'active'
    GROUP BY lender_id
) loan_lent ON u.user_id = loan_lent.lender_id
WHERE u.is_active = 1;
GO



-- SP 1: Register a new user and auto-create their wallet
CREATE PROCEDURE sp_RegisterUser
    @username      VARCHAR(50),
    @email         VARCHAR(100),
    @phone         VARCHAR(20),
    @password_hash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM Users WHERE email = @email OR username = @username)
    BEGIN
        RAISERROR('Username or email already exists.', 16, 1);
        RETURN;
    END

    DECLARE @new_user_id INT;

    INSERT INTO Users (username, email, phone, password_hash)
    VALUES (@username, @email, @phone, @password_hash);

    SET @new_user_id = SCOPE_IDENTITY();

    INSERT INTO Wallets (user_id, balance, currency)
    VALUES (@new_user_id, 0.00, 'USD');

    SELECT @new_user_id AS user_id, @username AS username, @email AS email;
END;
GO

-- SP 2: Transfer money between wallets
CREATE PROCEDURE sp_TransferMoney
    @sender_id   INT,
    @receiver_id INT,
    @amount      DECIMAL(12,2),
    @note        VARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        IF @amount <= 0
        BEGIN
            RAISERROR('Amount must be greater than zero.', 16, 1);
            ROLLBACK; RETURN;
        END

        DECLARE @sender_balance DECIMAL(12,2);
        SELECT @sender_balance = balance FROM Wallets WHERE user_id = @sender_id;

        IF @sender_balance < @amount
        BEGIN
            RAISERROR('Insufficient balance.', 16, 1);
            ROLLBACK; RETURN;
        END

        UPDATE Wallets SET balance = balance - @amount WHERE user_id = @sender_id;
        UPDATE Wallets SET balance = balance + @amount WHERE user_id = @receiver_id;

        INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note)
        VALUES (@sender_id, @receiver_id, @amount, 'transfer', 'completed', @note);

        COMMIT;
        SELECT SCOPE_IDENTITY() AS transaction_id, 'Transfer successful' AS message;
    END TRY
    BEGIN CATCH
        ROLLBACK;
        THROW;
    END CATCH
END;
GO

-- SP 3: Approve a loan
CREATE PROCEDURE sp_ApproveLoan
    @loan_id   INT,
    @lender_id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        DECLARE @borrower_id INT, @amount DECIMAL(12,2), @status VARCHAR(25);

        SELECT @borrower_id = borrower_id,
               @amount      = amount,
               @status      = status
        FROM Loans
        WHERE loan_id = @loan_id AND lender_id = @lender_id;

        IF @borrower_id IS NULL
        BEGIN
            RAISERROR('Loan not found or not yours to approve.', 16, 1);
            ROLLBACK; RETURN;
        END

        IF @status <> 'requested'
        BEGIN
            RAISERROR('Loan is not in requested state.', 16, 1);
            ROLLBACK; RETURN;
        END

        DECLARE @lender_balance DECIMAL(12,2);
        SELECT @lender_balance = balance FROM Wallets WHERE user_id = @lender_id;

        IF @lender_balance < @amount
        BEGIN
            RAISERROR('Insufficient balance to approve this loan.', 16, 1);
            ROLLBACK; RETURN;
        END

        UPDATE Wallets SET balance = balance - @amount WHERE user_id = @lender_id;
        UPDATE Wallets SET balance = balance + @amount WHERE user_id = @borrower_id;
        UPDATE Loans   SET status  = 'active'           WHERE loan_id = @loan_id;

        INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note)
        VALUES (@lender_id, @borrower_id, @amount, 'loan', 'completed', 'Loan approved');

        COMMIT;
        SELECT 'Loan approved and funds transferred.' AS message;
    END TRY
    BEGIN CATCH
        ROLLBACK;
        THROW;
    END CATCH
END;
GO

-- SP 4: Repay a loan
CREATE PROCEDURE sp_RepayLoan
    @loan_id     INT,
    @borrower_id INT,
    @amount      DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        DECLARE @lender_id      INT,
                @loan_amount    DECIMAL(12,2),
                @already_repaid DECIMAL(12,2),
                @loan_status    VARCHAR(25);

        SELECT @lender_id      = lender_id,
               @loan_amount    = amount,
               @already_repaid = amount_repaid,
               @loan_status    = status
        FROM Loans
        WHERE loan_id = @loan_id AND borrower_id = @borrower_id;

        IF @lender_id IS NULL
            BEGIN RAISERROR('Loan not found.', 16, 1); ROLLBACK; RETURN; END

        IF @loan_status <> 'active'
            BEGIN RAISERROR('Loan is not active.', 16, 1); ROLLBACK; RETURN; END

        IF @amount > (@loan_amount - @already_repaid)
            BEGIN RAISERROR('Repayment exceeds remaining balance.', 16, 1); ROLLBACK; RETURN; END

        DECLARE @borrower_balance DECIMAL(12,2);
        SELECT @borrower_balance = balance FROM Wallets WHERE user_id = @borrower_id;

        IF @borrower_balance < @amount
            BEGIN RAISERROR('Insufficient wallet balance.', 16, 1); ROLLBACK; RETURN; END

        UPDATE Wallets SET balance = balance - @amount WHERE user_id = @borrower_id;
        UPDATE Wallets SET balance = balance + @amount WHERE user_id = @lender_id;
        UPDATE Loans   SET amount_repaid = amount_repaid + @amount WHERE loan_id = @loan_id;

        INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note)
        VALUES (@borrower_id, @lender_id, @amount, 'loan_repayment', 'completed', 'Loan repayment');

        COMMIT;

        DECLARE @remaining DECIMAL(12,2) = @loan_amount - @already_repaid - @amount;
        SELECT 'Repayment recorded.' AS message, @remaining AS remaining_balance;
    END TRY
    BEGIN CATCH
        ROLLBACK;
        THROW;
    END CATCH
END;
GO

-- SP 5: Create a bill split
CREATE PROCEDURE sp_CreateBillSplit
    @created_by   INT,
    @total_amount DECIMAL(12,2),
    @description  VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO BillSplits (created_by, total_amount, description)
    VALUES (@created_by, @total_amount, @description);

    SELECT SCOPE_IDENTITY() AS split_id;
END;
GO

-- SP 6: Pay a bill share
CREATE PROCEDURE sp_PayBillShare
    @split_id INT,
    @user_id  INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        DECLARE @amount_owed DECIMAL(12,2),
                @is_paid     BIT,
                @creator_id  INT;

        SELECT @amount_owed = bsp.amount_owed,
               @is_paid     = bsp.is_paid,
               @creator_id  = bs.created_by
        FROM BillSplitParticipants bsp
        JOIN BillSplits bs ON bs.split_id = bsp.split_id
        WHERE bsp.split_id = @split_id AND bsp.user_id = @user_id;

        IF @amount_owed IS NULL
            BEGIN RAISERROR('Not a participant of this bill.', 16, 1); ROLLBACK; RETURN; END

        IF @is_paid = 1
            BEGIN RAISERROR('Share already paid.', 16, 1); ROLLBACK; RETURN; END

        DECLARE @balance DECIMAL(12,2);
        SELECT @balance = balance FROM Wallets WHERE user_id = @user_id;

        IF @balance < @amount_owed
            BEGIN RAISERROR('Insufficient balance.', 16, 1); ROLLBACK; RETURN; END

        UPDATE Wallets SET balance = balance - @amount_owed WHERE user_id = @user_id;
        UPDATE Wallets SET balance = balance + @amount_owed WHERE user_id = @creator_id;

        INSERT INTO Transactions (sender_id, receiver_id, amount, type, status, note)
        VALUES (@user_id, @creator_id, @amount_owed, 'bill_split', 'completed', 'Bill split payment');

        DECLARE @tx_id INT = SCOPE_IDENTITY();

        UPDATE BillSplitParticipants
        SET    is_paid = 1, transaction_id = @tx_id
        WHERE  split_id = @split_id AND user_id = @user_id;

        COMMIT;
        SELECT 'Payment recorded.' AS message, @tx_id AS transaction_id;
    END TRY
    BEGIN CATCH
        ROLLBACK;
        THROW;
    END CATCH
END;
GO

-- SP 7: Deposit to vault
CREATE PROCEDURE sp_DepositToVault
    @vault_id INT,
    @user_id  INT,
    @amount   DECIMAL(19,4)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        DECLARE @target DECIMAL(19,4), @saved DECIMAL(19,4), @achieved BIT;

        SELECT @target   = targetAmount,
               @saved    = savedAmount,
               @achieved = isAchieved
        FROM savingVault
        WHERE id = @vault_id AND userID = @user_id;

        IF @target IS NULL
            BEGIN RAISERROR('Vault not found.', 16, 1); ROLLBACK; RETURN; END

        IF @achieved = 1
            BEGIN RAISERROR('Vault goal already achieved.', 16, 1); ROLLBACK; RETURN; END

        DECLARE @balance DECIMAL(12,2);
        SELECT @balance = balance FROM Wallets WHERE user_id = @user_id;

        IF @balance < @amount
            BEGIN RAISERROR('Insufficient wallet balance.', 16, 1); ROLLBACK; RETURN; END

        UPDATE Wallets     SET balance     = balance - @amount     WHERE user_id = @user_id;
        UPDATE savingVault SET savedAmount = savedAmount + @amount  WHERE id      = @vault_id;
        -- trg_SavingVault_CheckAchieved trigger auto-marks achieved

        COMMIT;

        DECLARE @new_saved DECIMAL(19,4) = @saved + @amount;
        SELECT @new_saved AS new_saved_amount,
               CAST(@new_saved * 100.0 / @target AS DECIMAL(5,2)) AS progress_percent;
    END TRY
    BEGIN CATCH
        ROLLBACK;
        THROW;
    END CATCH
END;
GO

-- SP 8: Full financial report
-- NORMALIZATION FIX: replaced user_Name with u.username via JOIN
CREATE PROCEDURE sp_GetUserFinancialReport
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Wallet balance
    SELECT balance, currency FROM Wallets WHERE user_id = @user_id;

    -- Salary info
    SELECT amount AS salary, pay_day, currency
    FROM FixedSalary WHERE user_id = @user_id AND is_active = 1;

    -- Expenses breakdown by category
    SELECT category, SUM(amount) AS total
    FROM FixedExpenses
    WHERE user_id = @user_id AND is_active = 1
    GROUP BY category;

    -- Active loans (as borrower)
    SELECT loan_id, lender_id, amount, amount_repaid,
           (amount - amount_repaid) AS remaining, due_date
    FROM Loans
    WHERE borrower_id = @user_id AND status = 'active';

    -- Saving vaults progress (JOIN replaces user_Name)
    SELECT u.username AS vault_name, sv.targetAmount, sv.savedAmount,
           CAST(sv.savedAmount * 100.0 / sv.targetAmount AS DECIMAL(5,2)) AS progress_percent,
           sv.deadline, sv.isAchieved
    FROM savingVault sv
    JOIN Users u ON sv.userID = u.user_id
    WHERE sv.userID = @user_id;

    -- Last 5 transactions
    SELECT TOP 5 t.type, t.amount, t.status, t.created_at,
           s.username AS sender, r.username AS receiver
    FROM Transactions t
    JOIN Users s ON t.sender_id   = s.user_id
    JOIN Users r ON t.receiver_id = r.user_id
    WHERE t.sender_id = @user_id OR t.receiver_id = @user_id
    ORDER BY t.created_at DESC;
END;
GO


-- ── SAMPLE DATA ──────────────────────────────────────────────

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
    (1, 2,  50.00, 'transfer',       'completed', 'Coffee money'),
    (3, 1, 200.00, 'transfer',       'completed', 'Rent contribution'),
    (2, 3,  30.00, 'bill_split',     'completed', 'Dinner split'),
    (2, 1, 100.00, 'loan',           'completed', 'Loan from Alice'),
    (2, 1,  40.00, 'loan_repayment', 'completed', 'Partial repayment');

INSERT INTO BillSplits (created_by, total_amount, description) VALUES
    (1, 120.00, 'Team dinner at Roma'),
    (3,  60.00, 'Movie night snacks'),
    (2, 120.00, 'Friday match');

INSERT INTO BillSplitParticipants (split_id, user_id, amount_owed, is_paid, transaction_id) VALUES
    (1, 1, 30.00, 1, NULL),
    (1, 2, 30.00, 1, 3),
    (1, 3, 30.00, 0, NULL),
    (1, 4, 30.00, 0, NULL),
    (2, 3, 20.00, 1, NULL),
    (2, 4, 20.00, 0, NULL);

INSERT INTO Loans (lender_id, borrower_id, amount, amount_repaid, due_date, status, note) VALUES
    (1, 2, 100.00, 40.00, '2026-06-01', 'active', 'Loan for car repair'),
    (3, 4,  50.00,  0.00, '2026-04-15', 'active', 'Emergency loan'),
    (2, 1,  75.00, 75.00, '2026-02-01', 'repaid', 'Concert tickets');

INSERT INTO FixedSalary (user_id, amount, currency, pay_day) VALUES
    (1, 3000.00, 'USD',  1),
    (2, 2500.00, 'USD',  5),
    (3, 4000.00, 'USD',  1),
    (4, 1800.00, 'USD', 10);

INSERT INTO FixedExpenses (user_id, title, amount, category, due_day, is_active) VALUES
    (1, 'Rent',           1200.00, 'Housing',        1, 1),
    (1, 'Netflix',          15.00, 'Subscriptions',  3, 1),
    (1, 'Electricity',     120.00, 'Utilities',      7, 1),
    (1, 'Gym Membership',   50.00, 'Health',        10, 1),
    (2, 'Rent',            900.00, 'Housing',        1, 1),
    (2, 'Internet',         60.00, 'Utilities',      5, 1),
    (2, 'Spotify',          10.00, 'Subscriptions',  8, 1),
    (3, 'Mortgage',       2000.00, 'Housing',        1, 1),
    (3, 'Car Insurance',   250.00, 'Insurance',     15, 1),
    (3, 'Electricity',     180.00, 'Utilities',      7, 1),
    (3, 'Netflix',          15.00, 'Subscriptions',  3, 0),
    (4, 'Rent',            700.00, 'Housing',        1, 1),
    (4, 'Phone Bill',       45.00, 'Utilities',     20, 1);

INSERT INTO KhataGroups (CreatorId, Name, ContributionAmount, CycleType, StartDate) VALUES
    (1, 'Monthly Committee', 500.00, 'Monthly', '2026-04-01');

INSERT INTO KhataMembers (GroupId, UserId, TurnOrder) VALUES
    (1, 1, 1), (1, 2, 2), (1, 3, 3), (1, 4, 4);

INSERT INTO Contributions (GroupId, UserId, CycleNumber, AmountPaid) VALUES
    (1, 1, 1, 500.00);

-- NORMALIZATION FIX: no user_Name in INSERT
INSERT INTO savingVault (userID, targetAmount, savedAmount, deadline) VALUES
    (1, 1000.00, 200.00, '2026-12-01'),
    (2,  500.00,  50.00, '2026-09-01'),
    (3, 1500.00, 900.00, '2026-07-01');
GO


-- ── QUERIES ───────────────────────────────────────────────────

-- Q1: Use wallet summary view
SELECT * FROM vw_UserWalletSummary;

-- Q2: Use active loans view — filter by user
SELECT * FROM vw_ActiveLoans WHERE lender = 'alice' OR borrower = 'alice';

-- Q3: Use financial health view
SELECT * FROM vw_FinancialHealth ORDER BY disposable_income DESC;

-- Q4: Use vault progress view — only in-progress vaults
SELECT * FROM vw_VaultProgress WHERE isAchieved = 0 ORDER BY progress_percent DESC;

-- Q5: Use Khata overview view
SELECT * FROM vw_KhataGroupOverview;

-- Q6: Unpaid bill shares
SELECT * FROM vw_UnpaidBillShares;

-- Q7: Execute transfer stored procedure
EXEC sp_TransferMoney @sender_id=1, @receiver_id=2, @amount=75.00, @note='Groceries';

-- Q8: Execute full financial report
EXEC sp_GetUserFinancialReport @user_id = 1;

-- Q9: Approve a loan
EXEC sp_ApproveLoan @loan_id=1, @lender_id=1;

-- Q10: Deposit to vault
EXEC sp_DepositToVault @vault_id=1, @user_id=1, @amount=150.00;

-- Q11: Top spenders (salary vs expenses)
SELECT username, monthly_salary, monthly_expenses,
       disposable_income,
       CAST(disposable_income * 100.0 / NULLIF(monthly_salary,0) AS DECIMAL(5,2)) AS savings_rate_pct
FROM vw_FinancialHealth
WHERE monthly_salary > 0
ORDER BY savings_rate_pct DESC;

-- Q12: Overdue loans
SELECT * FROM vw_ActiveLoans WHERE is_overdue = 1;

-- Q13: Overdue saving vaults
SELECT * FROM vw_VaultProgress WHERE is_overdue = 1;

-- Q14: Khata members who haven't paid cycle 1
SELECT u.username
FROM KhataMembers km
JOIN Users u ON km.UserId = u.user_id
WHERE km.GroupId = 1
  AND km.UserId NOT IN (
      SELECT UserId FROM Contributions
      WHERE GroupId = 1 AND CycleNumber = 1
  );

-- Q15: Monthly expense breakdown per user
SELECT u.username, fe.category, SUM(fe.amount) AS category_total
FROM FixedExpenses fe
JOIN Users u ON fe.user_id = u.user_id
WHERE fe.is_active = 1
GROUP BY u.username, fe.category
ORDER BY u.username, category_total DESC;