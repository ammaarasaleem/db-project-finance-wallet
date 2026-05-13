# FinTrack — Finance Wallet Application

 A full-stack finance management web application for peer-to-peer transactions, bill splitting, loan tracking, saving goals, and rotating savings groups.

 ## Features

| Feature | Description |
|---------|-------------|
| **User Authentication** | JWT-based registration and login with bcrypt password hashing |
| **Digital Wallet** | Deposit funds and transfer money to other users by username |
| **Transaction History** | Filterable, paginated history of all wallet activity |
| **Bill Splits** | Create bills, assign participant shares, track paid/unpaid status |
| **Peer Loans** | Request, approve, reject, and repay loans between users |
| **Saving Vaults** | Personal savings goals with automatic completion detection |
| **Khata Groups** | Rotating savings committee system with cycle-based contributions |
| **Financial Overview** | Dashboard showing salary, expenses, disposable income, and loan summary |
| **Friend Management** | Send, accept, and manage friend connections |


# Sample Project – Setup Guide

Follow the steps below to run the project on your system.

## 1. Configure SQL Server
Configure your SQL Server for Node.js by following the instructions in the **shared PDF**.

## 2. Clone the Repository

```bash
git clone https://github.com/Abdur-Rehman15/sample-project-db.git
```

## 3. Add Environment File
Place the **shared `.env` file** inside the `backend` folder.

## 4. Navigate to the Project Folder

```bash
cd sample-project-db
```

## 5. Setup and Run Backend

Go to the backend folder and install dependencies:

```bash
cd backend
npm install
```

Run the backend server:

```bash
node server.js
```

## 6. Setup and Run Frontend

Open another terminal and navigate to the frontend folder:

```bash
cd frontend
npm install
npm run start
```

The project should now be running successfully.
