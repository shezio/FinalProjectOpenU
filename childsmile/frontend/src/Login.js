import React, { useState } from 'react';
import axios from './axiosConfig';  // Import the configured Axios instance
import Header from './Header';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';  // Use useNavigate instead of useHistory

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    console.log('Username:', username);
    console.log('Password:', password);

    try {
      const response = await axios.post('/api/login/', { username, password });
      console.log('Login successful:', response.data);
      setSuccess(t(response.data.message));
      setError('');
      // store the usernname in local storage without the '_' - replace with space
      localStorage.setItem('username', username.replace(/_/g, ' '));

      // Fetch permissions after successful login
      const permissionsResponse = await axios.get('/api/permissions/');
      console.log('Permissions:', permissionsResponse.data);
      localStorage.setItem('permissions', JSON.stringify(permissionsResponse.data.permissions));

      // Navigate to tasks page
      navigate('/tasks');

    } catch (err) {
      console.error('Login error:', err);
      setError(t(err.response?.data?.error || 'An error occurred. Please try again.'));
      setSuccess('');
    }
  };

  return (
    <div className="main-content">
      <Header />
      <div className="login-container">
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder={t("שם משתמש")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t("סיסמה")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">{t("כניסה")}</button>
          <span>{t("או")}</span>
          <button type="button">{t("הירשם")}</button>
          <button className="google-login">{t("התחבר עם חשבון גוגל")}</button>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        </form>
      </div>
    </div>
  );
};

export default Login;