import React, { useState } from 'react';
import axios from './axiosConfig';  // Import the configured Axios instance
import Header from './Header';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('Form submitted');  // Debugging log
    console.log('Username:', username);  // Debugging log
    console.log('Password:', password);  // Debugging log
    try {
      const response = await axios.post('/api/login/', { username, password });
      console.log('Response:', response);  // Debugging log
      alert(response.data.message);
    } catch (err) {
      console.log('Error:', err);  // Debugging log
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('An error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="main-content">
      <Header />
      <div className="login-container">
        <form noValidate onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="שם משתמש"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">כניסה</button>
          <span>או</span>
          <button type="button">הירשם</button>
          <button className="google-login">התחבר עם חשבון גוגל</button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default Login;