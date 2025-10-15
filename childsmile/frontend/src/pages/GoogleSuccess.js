import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GoogleSuccess = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupGoogleSession = async () => {
      try {
        // Call the new API to setup session for Google user
        const response = await axios.post('/api/google-login-success/');
        
        if (response.data.user_id) {
          // Store user info like regular login
          localStorage.setItem('username', response.data.username);
          localStorage.setItem('origUsername', response.data.username);
          
          // Get permissions
          const permissionsResponse = await axios.get('/api/permissions/');
          localStorage.setItem('permissions', JSON.stringify(permissionsResponse.data.permissions));
          
          // Get staff data
          const staffResponse = await axios.get('/api/staff/');
          const staffs = (staffResponse.data.staff || []).map(s => ({
            id: s.id,
            username: s.username,
            roles: s.roles || [],
          }));
          localStorage.setItem('staff', JSON.stringify(staffs));
          
          // Navigate to tasks
          navigate('/tasks');
        }
      } catch (error) {
        console.error('Google login setup failed:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    setupGoogleSession();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>{t('Setting up your account...')}</h2>
        <p>{t('Please wait while we complete your Google login.')}</p>
      </div>
    );
  }

  return null; // Will redirect automatically
};

export default GoogleSuccess;