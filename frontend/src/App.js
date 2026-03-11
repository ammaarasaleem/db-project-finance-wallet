import React, {useState, useEffect} from 'react';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';

function App(){

  const[message, setMessage]=useState('');

  useEffect(()=>{
    fetch('http://localhost:5000')
    .then((response)=>response.text())
    .then((data)=>setMessage(data));
  },[]);

  return(
    <div style={{textAlign: 'center',marginTop: '50px'}}>
      <h1>React Frontend</h1>
      <p>{message}</p>
      <h1>Task Management</h1>
      <TaskForm />
      <TaskList />
    </div>
  );
}

export default App;